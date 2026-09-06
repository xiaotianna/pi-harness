import {
  ApprovalDecision,
  type ApprovalDecision as ApprovalDecisionValue,
  type ApprovalResponseDecision,
  type HumanInputHandle,
  type HumanInputRequest,
  type HumanInputRequester,
  UserInputRequestKind,
  UserInputResponseAction,
  type UserInputSubmission,
  type UserInputToolResult,
} from "@pi-harness/agent-runtime";
import type {
  ToolApprovalHandle,
  ToolApprovalRequest,
  ToolApprovalRequester,
} from "@pi-harness/agent-runtime/tool-approval";

const APPROVAL_TIMEOUT_MS = 5 * 60_000;
const INPUT_TIMEOUT_MS = 24 * 60 * 60_000;
const RESOLVED_ID_RETENTION_MS = 10 * 60_000;

export const HumanInteractionErrorCode = {
  CONFLICT: "HUMAN_INTERACTION_ALREADY_RESOLVED",
  INVALID: "HUMAN_INTERACTION_INVALID",
  NOT_FOUND: "HUMAN_INTERACTION_NOT_FOUND",
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

export interface PendingUserInput extends HumanInputRequest {
  expiresAt: number;
}

interface PendingApprovalEntry {
  cancel: (reason?: unknown) => void;
  removeAbortListener: () => void;
  request: PendingToolApproval;
  resolve: (decision: ApprovalDecisionValue) => void;
  timeout: NodeJS.Timeout;
}

interface PendingInputEntry {
  cancel: (reason?: unknown) => void;
  removeAbortListener: () => void;
  request: PendingUserInput;
  resolve: (result: UserInputToolResult) => void;
  timeout: NodeJS.Timeout;
}

export class HumanInteractionService {
  private readonly pendingApprovals = new Map<string, PendingApprovalEntry>();
  private readonly pendingInputs = new Map<string, PendingInputEntry>();
  private readonly resolvedIds = new Set<string>();

  public requestApproval: ToolApprovalRequester = (request, signal): ToolApprovalHandle => {
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
      const entry = this.pendingApprovals.get(request.approvalId);
      if (entry === undefined) return;
      clearTimeout(entry.timeout);
      this.pendingApprovals.delete(request.approvalId);
      entry.removeAbortListener();
      rejectResult(reason);
    };
    const abort = () => cancel(signal?.reason);
    const timeout = setTimeout(
      () => this.settleApproval(request.approvalId, ApprovalDecision.EXPIRED),
      APPROVAL_TIMEOUT_MS,
    );
    timeout.unref();
    this.pendingApprovals.set(request.approvalId, {
      cancel,
      removeAbortListener: () => signal?.removeEventListener("abort", abort),
      request: { ...request, expiresAt },
      resolve: resolveResult,
      timeout,
    });
    signal?.addEventListener("abort", abort, { once: true });

    return { cancel, expiresAt, result };
  };

  public requestInput: HumanInputRequester = (request, signal): HumanInputHandle => {
    signal?.throwIfAborted();
    const expiresAt = Date.now() + INPUT_TIMEOUT_MS;
    let resolveResult!: (result: UserInputToolResult) => void;
    let rejectResult!: (reason?: unknown) => void;
    const result = new Promise<UserInputToolResult>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    void result.catch(() => undefined);

    const cancel = (reason: unknown = new DOMException("用户输入已取消", "AbortError")) => {
      const entry = this.pendingInputs.get(request.inputId);
      if (entry === undefined) return;
      clearTimeout(entry.timeout);
      this.pendingInputs.delete(request.inputId);
      entry.removeAbortListener();
      rejectResult(reason);
    };
    const abort = () => cancel(signal?.reason);
    const timeout = setTimeout(() => {
      const entry = this.pendingInputs.get(request.inputId);
      if (entry === undefined) return;
      clearTimeout(entry.timeout);
      entry.removeAbortListener();
      this.pendingInputs.delete(request.inputId);
      this.rememberResolved(request.inputId);
      resolveResult({ status: "expired" });
    }, INPUT_TIMEOUT_MS);
    timeout.unref();
    const pendingRequest: PendingUserInput = { ...request, expiresAt };
    const eventRequest = {
      expiresAt,
      inputId: request.inputId,
      ...(request.kind === undefined ? {} : { kind: request.kind }),
      ...(request.plan === undefined ? {} : { plan: request.plan }),
      questions: request.questions,
    };
    this.pendingInputs.set(request.inputId, {
      cancel,
      removeAbortListener: () => signal?.removeEventListener("abort", abort),
      request: pendingRequest,
      resolve: resolveResult,
      timeout,
    });
    signal?.addEventListener("abort", abort, { once: true });

    return { cancel, expiresAt, request: eventRequest, result };
  };

  public getCurrentApproval(sessionId: string, runId: string): PendingToolApproval | null {
    return (
      [...this.pendingApprovals.values()].find(
        ({ request }) => request.sessionId === sessionId && request.runId === runId,
      )?.request ?? null
    );
  }

  public getCurrentInput(sessionId: string, runId: string): PendingUserInput | null {
    return (
      [...this.pendingInputs.values()].find(
        ({ request }) => request.sessionId === sessionId && request.runId === runId,
      )?.request ?? null
    );
  }

  public resolveApproval(
    sessionId: string,
    runId: string,
    approvalId: string,
    decision: ApprovalResponseDecision,
  ): void {
    const entry = this.requireEntry(this.pendingApprovals, approvalId);
    if (entry.request.sessionId !== sessionId || entry.request.runId !== runId) {
      throw new HumanInteractionServiceError(
        HumanInteractionErrorCode.NOT_FOUND,
        "待处理的工具审批不存在",
      );
    }
    this.settleApproval(approvalId, decision);
  }

  public resolveInput(
    sessionId: string,
    runId: string,
    inputId: string,
    submission: UserInputSubmission,
  ): void {
    const entry = this.requireEntry(this.pendingInputs, inputId);
    if (entry.request.sessionId !== sessionId || entry.request.runId !== runId) {
      throw new HumanInteractionServiceError(
        HumanInteractionErrorCode.NOT_FOUND,
        "待处理的用户输入不存在",
      );
    }
    if (
      submission.action === UserInputResponseAction.CONFIRM_PLAN &&
      entry.request.kind !== UserInputRequestKind.PLAN_REVIEW
    ) {
      throw new HumanInteractionServiceError(
        HumanInteractionErrorCode.INVALID,
        "当前交互不是计划确认",
      );
    }
    if (submission.plan !== undefined && entry.request.kind !== UserInputRequestKind.PLAN_REVIEW) {
      throw new HumanInteractionServiceError(
        HumanInteractionErrorCode.INVALID,
        "当前交互不能修改计划",
      );
    }
    const questionsById = new Map(
      entry.request.questions.map((question) => [question.id, question]),
    );
    if (
      submission.answers.length !== entry.request.questions.length ||
      new Set(submission.answers.map(({ questionId }) => questionId)).size !==
        submission.answers.length
    ) {
      throw new HumanInteractionServiceError(HumanInteractionErrorCode.INVALID, "请回答所有问题");
    }
    for (const answer of submission.answers) {
      const question = questionsById.get(answer.questionId);
      if (
        question === undefined ||
        !answer.value.trim() ||
        (answer.selectedOption === undefined &&
          answer.selectedOptions === undefined &&
          (answer.value.length > 4_000 ||
            (question.allowCustomInput === false &&
              entry.request.kind !== UserInputRequestKind.PLAN_REVIEW))) ||
        (answer.selectedOption !== undefined && answer.selectedOptions !== undefined) ||
        (answer.selectedOptions !== undefined &&
          (!question.multiSelect ||
            answer.selectedOptions.length === 0 ||
            new Set(answer.selectedOptions).size !== answer.selectedOptions.length ||
            answer.selectedOptions.some(
              (selected) => !question.options.some(({ label }) => label === selected),
            ))) ||
        (answer.selectedOption !== undefined &&
          !question.options.some(({ label }) => label === answer.selectedOption))
      ) {
        throw new HumanInteractionServiceError(
          HumanInteractionErrorCode.INVALID,
          "用户输入与当前问题不匹配",
        );
      }
    }
    clearTimeout(entry.timeout);
    entry.removeAbortListener();
    this.pendingInputs.delete(inputId);
    this.rememberResolved(inputId);
    entry.resolve({ ...submission, status: "submitted" });
  }

  public close(): void {
    for (const entry of [...this.pendingApprovals.values()]) entry.cancel();
    for (const entry of [...this.pendingInputs.values()]) entry.cancel();
    this.resolvedIds.clear();
  }

  private requireEntry<T>(entries: Map<string, T>, id: string): T {
    const entry = entries.get(id);
    if (entry !== undefined) return entry;
    if (this.resolvedIds.has(id)) {
      throw new HumanInteractionServiceError(HumanInteractionErrorCode.CONFLICT, "交互已经处理");
    }
    throw new HumanInteractionServiceError(
      HumanInteractionErrorCode.NOT_FOUND,
      "待处理的交互不存在",
    );
  }

  private settleApproval(approvalId: string, decision: ApprovalDecisionValue): void {
    const entry = this.pendingApprovals.get(approvalId);
    if (entry === undefined) return;
    clearTimeout(entry.timeout);
    entry.removeAbortListener();
    this.pendingApprovals.delete(approvalId);
    this.rememberResolved(approvalId);
    entry.resolve(decision);
  }

  private rememberResolved(id: string): void {
    this.resolvedIds.add(id);
    const forget = setTimeout(() => this.resolvedIds.delete(id), RESOLVED_ID_RETENTION_MS);
    forget.unref();
  }
}
