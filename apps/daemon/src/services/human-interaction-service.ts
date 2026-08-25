import {
  ApprovalDecision,
  type ApprovalDecision as ApprovalDecisionValue,
  type ApprovalResponseDecision,
} from "@pi-harness/agent-runtime/harness-event";
import type {
  ToolApprovalHandle,
  ToolApprovalRequest,
  ToolApprovalRequester,
} from "@pi-harness/agent-runtime/tool-approval";

const APPROVAL_TIMEOUT_MS = 5 * 60_000;
const RESOLVED_ID_RETENTION_MS = 10 * 60_000;

export const HumanInteractionErrorCode = {
  CONFLICT: "APPROVAL_ALREADY_RESOLVED",
  NOT_FOUND: "APPROVAL_NOT_FOUND",
} as const;

export type HumanInteractionErrorCode =
  (typeof HumanInteractionErrorCode)[keyof typeof HumanInteractionErrorCode];

export class HumanInteractionServiceError extends Error {
  public constructor(
    public readonly code: HumanInteractionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "HumanInteractionServiceError";
  }
}

export interface PendingToolApproval extends ToolApprovalRequest {
  expiresAt: number;
}

interface PendingEntry {
  cancel: (reason?: unknown) => void;
  removeAbortListener: () => void;
  request: PendingToolApproval;
  resolve: (decision: ApprovalDecisionValue) => void;
  timeout: NodeJS.Timeout;
}

export class HumanInteractionService {
  private readonly pending = new Map<string, PendingEntry>();
  private readonly resolvedIds = new Set<string>();

  public request: ToolApprovalRequester = (request, signal): ToolApprovalHandle => {
    signal?.throwIfAborted();
    const expiresAt = Date.now() + APPROVAL_TIMEOUT_MS;
    let resolveResult!: (decision: ApprovalDecisionValue) => void;
    let rejectResult!: (reason?: unknown) => void;
    const result = new Promise<ApprovalDecisionValue>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    void result.catch(() => undefined);

    const cancel = (reason: unknown = new DOMException("工具审批已取消", "AbortError")) => {
      const entry = this.pending.get(request.approvalId);
      if (entry === undefined) return;
      clearTimeout(entry.timeout);
      this.pending.delete(request.approvalId);
      entry.removeAbortListener();
      rejectResult(reason);
    };
    const abort = () => cancel(signal?.reason);
    const timeout = setTimeout(
      () => this.settle(request.approvalId, ApprovalDecision.EXPIRED),
      APPROVAL_TIMEOUT_MS,
    );
    timeout.unref();
    const entry: PendingEntry = {
      cancel,
      removeAbortListener: () => signal?.removeEventListener("abort", abort),
      request: { ...request, expiresAt },
      resolve: resolveResult,
      timeout,
    };
    this.pending.set(request.approvalId, entry);
    signal?.addEventListener("abort", abort, { once: true });

    return { cancel, expiresAt, result };
  };

  public getCurrent(sessionId: string, runId: string): PendingToolApproval | null {
    return (
      [...this.pending.values()].find(
        ({ request }) => request.sessionId === sessionId && request.runId === runId,
      )?.request ?? null
    );
  }

  public resolve(
    sessionId: string,
    runId: string,
    approvalId: string,
    decision: ApprovalResponseDecision,
  ): void {
    const entry = this.pending.get(approvalId);
    if (entry === undefined) {
      if (this.resolvedIds.has(approvalId)) {
        throw new HumanInteractionServiceError(
          HumanInteractionErrorCode.CONFLICT,
          "工具审批已经处理",
        );
      }
      throw new HumanInteractionServiceError(
        HumanInteractionErrorCode.NOT_FOUND,
        "待处理的工具审批不存在",
      );
    }
    if (entry.request.sessionId !== sessionId || entry.request.runId !== runId) {
      throw new HumanInteractionServiceError(
        HumanInteractionErrorCode.NOT_FOUND,
        "待处理的工具审批不存在",
      );
    }
    this.settle(approvalId, decision);
  }

  public close(): void {
    for (const entry of [...this.pending.values()]) entry.cancel();
    this.resolvedIds.clear();
  }

  private settle(approvalId: string, decision: ApprovalDecisionValue): void {
    const entry = this.pending.get(approvalId);
    if (entry === undefined) return;
    clearTimeout(entry.timeout);
    entry.removeAbortListener();
    this.pending.delete(approvalId);
    this.resolvedIds.add(approvalId);
    const forget = setTimeout(() => this.resolvedIds.delete(approvalId), RESOLVED_ID_RETENTION_MS);
    forget.unref();
    entry.resolve(decision);
  }
}
