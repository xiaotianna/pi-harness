import { randomUUID } from "node:crypto";
import type {
  AfterToolCallContext,
  Agent,
  AgentEvent,
  AgentMessage,
  BeforeToolCallContext,
  BeforeToolCallResult,
  StreamFn,
} from "@earendil-works/pi-agent-core";
import { type Api, clampThinkingLevel, type Model } from "@earendil-works/pi-ai";
import { type ApprovalPolicyValue, evaluateToolCall, ToolPolicyDecision } from "@pi-harness/policy";
import { readFileChangeDetails, type ToolRegistry } from "@pi-harness/tools";
import { createAutoFollowUpHandler } from "./auto-follow-up.js";
import { adaptAgentEvent } from "./event-adapter.js";
import {
  ApprovalDecision,
  type ApprovalRequestedData,
  type ApprovalResolvedData,
  type FileChangedData,
  type HarnessEvent,
  type HarnessEventDraft,
  HarnessEventType,
  type RunId,
  type RunInteractionData,
  type SessionId,
} from "./harness-event.js";
import type { ThinkingLevel } from "./thinking-level.js";
import type { ToolApprovalRequester } from "./tool-approval.js";

export interface StartRunInput {
  approvalPolicy: ApprovalPolicyValue;
  model: Model<Api>;
  modelId: string;
  prompt: string;
  providerId: string;
  runId: RunId;
  streamFn: StreamFn;
  systemPrompt: string;
  thinkingLevel: ThinkingLevel;
}

export type HarnessEventListener = (event: HarnessEvent) => Promise<void> | void;

interface ActiveRun {
  approvalPolicy: ApprovalPolicyValue;
  handleAutoFollowUp: ReturnType<typeof createAutoFollowUpHandler>;
  modelId: string;
  providerId: string;
  runId: RunId;
}

// 一个 Session 对应一个 RunCoordinator，它管理 run 的生命周期、事件转换与发布
export class RunCoordinator {
  private activeRun: ActiveRun | null = null;
  private readonly executionGuard: ToolRegistry["executionGuard"];
  private nextSeq: number;
  private readonly pendingFileChanges = new Map<string, readonly FileChangedData[]>();
  private readonly unsubscribe: () => void;

  public constructor(
    private readonly sessionId: SessionId,
    private readonly agent: Agent,
    private readonly toolRegistry: ToolRegistry,
    initialSeq: number,
    private readonly onEvent: HarnessEventListener,
    private readonly workspaceRoot: string,
    private readonly protectedPaths: readonly string[],
    private readonly requestToolApproval: ToolApprovalRequester,
  ) {
    this.executionGuard = toolRegistry.executionGuard;
    this.nextSeq = initialSeq + 1;
    this.agent.beforeToolCall = (context, signal) => this.handleBeforeToolCall(context, signal);
    this.agent.afterToolCall = (context) => this.handleAfterToolCall(context);
    // 构造时会订阅 pi Agent 事件
    this.unsubscribe = agent.subscribe((event) => this.handleAgentEvent(event));
  }

  private async emit(draft: HarnessEventDraft, runId: RunId): Promise<void> {
    const event: HarnessEvent = {
      data: draft.data,
      id: randomUUID(),
      runId,
      seq: this.nextSeq,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      type: draft.type,
    };
    this.nextSeq += 1;
    await this.onEvent(event);
  }

  // 工具调用前
  private async handleBeforeToolCall(
    context: BeforeToolCallContext,
    signal?: AbortSignal,
  ): Promise<BeforeToolCallResult | undefined> {
    const activeRun = this.activeRun;
    if (activeRun === null) return { block: true, reason: "当前没有活动 Run" };

    // 在工具真正执行前，根据工具权限和参数，决定“直接允许、直接拒绝，还是请求用户审批”
    const policy = await evaluateToolCall({
      approvalPolicy: activeRun.approvalPolicy,
      arguments: context.args, // 模型传给工具的参数
      policy: this.toolRegistry.get(context.toolCall.name)?.policy, // 工具权限
      protectedPaths: this.protectedPaths,
      workspaceRoot: this.workspaceRoot,
    });
    // 阻止工具
    if (policy.decision === ToolPolicyDecision.DENY) {
      return { block: true, reason: policy.reason };
    }
    // 自动允许副作用时仍执行重复调用保护；只读工具不需要指纹。
    if (policy.decision === ToolPolicyDecision.ALLOW) {
      if (policy.fingerprint === undefined) return undefined;
      const toolCallFingerprint = this.executionGuard.createFingerprint(
        context.toolCall.name,
        context.args,
        policy.fingerprint,
      );
      const blockReason = this.executionGuard.getBlockReason(
        context.toolCall.id,
        toolCallFingerprint,
      );
      if (blockReason !== null) return { block: true, reason: blockReason };
      this.executionGuard.recordApproved(context.toolCall.id, toolCallFingerprint);
      return undefined;
    }

    const toolCallFingerprint = this.executionGuard.createFingerprint(
      context.toolCall.name,
      context.args,
      policy.fingerprint,
    );
    const blockReason = this.executionGuard.getBlockReason(
      context.toolCall.id,
      toolCallFingerprint,
    );
    if (blockReason !== null) return { block: true, reason: blockReason };

    const approvalId = randomUUID();
    const request = {
      approvalId,
      risk: policy.risk,
      runId: activeRun.runId,
      sessionId: this.sessionId,
      summary: policy.summary,
      target: policy.target,
      toolCallId: context.toolCall.id,
      toolName: context.toolCall.name,
    };
    const approval = this.requestToolApproval(request, signal);

    try {
      /**
       * 这些emit的作用：记录并通知“Run 正在等待审批，以及审批已经结束”，根据emit的type参数来区分
       * 执行时间线：
       *  发送 approval.requested
          发送 run.awaiting_input
          等待 approval.result
          发送 approval.resolved
          发送 run.resumed
          继续或阻止工具
       */
      // 表示产生了一项待处理审批，数据用于 Web 展示审批卡片
      await this.emit(
        {
          data: {
            approvalId,
            expiresAt: approval.expiresAt,
            risk: request.risk,
            summary: request.summary,
            target: request.target,
            toolCallId: request.toolCallId,
            toolName: request.toolName,
          } satisfies ApprovalRequestedData,
          type: HarnessEventType.APPROVAL_REQUESTED,
        },
        activeRun.runId,
      );
      // 表示当前 Run 进入“等待用户输入”状态
      await this.emit(
        {
          data: { interactionId: approvalId, kind: "tool_approval" } satisfies RunInteractionData,
          type: HarnessEventType.RUN_AWAITING_INPUT,
        },
        activeRun.runId,
      );

      /**
       * 核心：真正让工具调用暂停的是这句，而不是 emit()
       * 原理：后端通过创建一个未完成的Promise（apps/daemon/src/services/human-interaction-service.ts）
       *  const result = new Promise<ApprovalDecisionValue>((resolve, reject) => {
            resolveResult = resolve;
            rejectResult = reject;
          });
       *  当前runtime的状态不变，只有当后端的Proimise结束后，改变的状态传入到runtime中才能继续执行
       */
      const decision = await approval.result;
      // 记录审批最终结果
      await this.emit(
        {
          data: {
            approvalId,
            decision,
            toolCallId: context.toolCall.id,
            toolName: context.toolCall.name,
          } satisfies ApprovalResolvedData,
          type: HarnessEventType.APPROVAL_RESOLVED,
        },
        activeRun.runId,
      );
      // 表示 Run 已经离开等待状态
      await this.emit(
        {
          data: { interactionId: approvalId, kind: "tool_approval" } satisfies RunInteractionData,
          type: HarnessEventType.RUN_RESUMED,
        },
        activeRun.runId,
      );

      // 决定是否执行工具，返回 undefined，表示不阻止工具，继续执行。
      if (decision === ApprovalDecision.APPROVED) {
        const currentPolicy = await evaluateToolCall({
          approvalPolicy: activeRun.approvalPolicy,
          arguments: context.args,
          policy: this.toolRegistry.get(context.toolCall.name)?.policy,
          protectedPaths: this.protectedPaths,
          workspaceRoot: this.workspaceRoot,
        });
        if (
          currentPolicy.decision !== ToolPolicyDecision.ASK ||
          currentPolicy.fingerprint !== policy.fingerprint ||
          currentPolicy.summary !== policy.summary ||
          currentPolicy.target !== policy.target
        ) {
          return { block: true, reason: "审批期间工具目标已变化，请重新读取后再修改" };
        }
        const currentBlockReason = this.executionGuard.getBlockReason(
          context.toolCall.id,
          toolCallFingerprint,
        );
        if (currentBlockReason !== null) {
          return { block: true, reason: currentBlockReason };
        }
        this.executionGuard.recordApproved(context.toolCall.id, toolCallFingerprint);
        return undefined;
      }
      return {
        block: true,
        reason: decision === ApprovalDecision.EXPIRED ? "工具审批已超时" : "用户拒绝了工具审批",
      };
    } catch (error: unknown) {
      approval.cancel();
      throw error;
    }
  }

  // 工具执行成功后捕获其一项或多项文件变更，等待对应 tool_execution_end 后顺序发出。
  private async handleAfterToolCall(context: AfterToolCallContext): Promise<undefined> {
    if (context.isError) return undefined;
    const fileChanges = readFileChangeDetails(context.result.details);
    if (fileChanges.length === 0) return undefined;
    this.pendingFileChanges.set(
      context.toolCall.id,
      fileChanges.map((fileChange) => ({
        ...fileChange,
        toolCallId: context.toolCall.id,
        toolName: context.toolCall.name,
      })),
    );
    return undefined;
  }

  /**
   * 是 RunCoordinator 接收单个 Pi Agent 事件的统一入口，按顺序完成：
   *  1. 获取当前活动 run。
      2. 将 Pi 原始事件转换为 HarnessEvent。
      3. 补充 id、seq、sessionId、runId 等运行上下文。
      4. 通过 onEvent 发布事件。
      5. 交给当前 run 的自动续轮 handler 处理。
   */
  private async handleAgentEvent(event: AgentEvent): Promise<void> {
    const activeRun = this.activeRun;
    if (activeRun === null) return;
    const draft = adaptAgentEvent(event, activeRun);
    if (draft === null) return;

    await this.emit(draft, activeRun.runId);
    if (event.type === "tool_execution_end") {
      const fileChanges = this.pendingFileChanges.get(event.toolCallId);
      if (fileChanges !== undefined) {
        this.pendingFileChanges.delete(event.toolCallId);
        for (const fileChange of fileChanges) {
          await this.emit(
            { data: fileChange, type: HarnessEventType.FILE_CHANGED },
            activeRun.runId,
          );
        }
      }
    }
    activeRun.handleAutoFollowUp(event);
  }

  public get activeProviderId(): string | null {
    return this.activeRun?.providerId ?? null;
  }

  public get activeRunId(): RunId | null {
    return this.activeRun?.runId ?? null;
  }

  public async start(input: StartRunInput): Promise<void> {
    if (this.activeRun !== null || this.agent.state.isStreaming) {
      throw new Error(`Session ${this.sessionId} already has an active run`);
    }

    this.agent.state.model = input.model;
    this.agent.state.thinkingLevel = clampThinkingLevel(input.model, input.thinkingLevel);
    this.agent.state.systemPrompt = input.systemPrompt;
    this.agent.streamFunction = input.streamFn;
    this.executionGuard.reset();
    this.activeRun = {
      approvalPolicy: input.approvalPolicy,
      handleAutoFollowUp: createAutoFollowUpHandler((message) => this.agent.followUp(message)),
      modelId: input.modelId,
      providerId: input.providerId,
      runId: input.runId,
    };

    try {
      await this.agent.prompt(input.prompt);
    } finally {
      this.executionGuard.reset();
      this.pendingFileChanges.clear();
      this.activeRun = null;
    }
  }

  public abort(runId: RunId): boolean {
    if (this.activeRun?.runId !== runId) return false;
    this.agent.abort();
    return true;
  }

  public steer(runId: RunId, message: AgentMessage): boolean {
    if (this.activeRun?.runId !== runId) return false;
    this.agent.steer(message);
    return true;
  }

  // 将当前活动 run 的消息追加到 Agent 的 follow-up 队列
  public followUp(runId: RunId, message: AgentMessage): boolean {
    if (this.activeRun?.runId !== runId) return false;
    this.agent.followUp(message);
    return true;
  }

  public async close(): Promise<void> {
    this.agent.abort();
    await this.agent.waitForIdle();
    this.unsubscribe();
  }
}
