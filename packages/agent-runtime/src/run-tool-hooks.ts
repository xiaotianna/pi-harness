import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import type {
  AfterToolCallContext,
  Agent,
  AgentMessage,
  BeforeToolCallContext,
  BeforeToolCallResult,
  StreamFn,
} from "@earendil-works/pi-agent-core";
import {
  ApprovalPolicy,
  type ApprovalPolicyValue,
  evaluateToolCall,
  resolveWorkspacePath,
  ToolPermission,
  ToolPolicyDecision,
} from "@pi-harness/policy";
import {
  type FileChangeDetails,
  readFileChangeDetails,
  type SkillRegistry,
  type ToolRegistry,
} from "@pi-harness/tools";
import {
  ApprovalDecision,
  type ApprovalRequestedData,
  ApprovalRequestKind,
  type ApprovalRequestKind as ApprovalRequestKindValue,
  type ApprovalResolvedData,
  type FileChangedData,
  type HarnessEvent,
  type HarnessEventDraft,
  HarnessEventType,
  isApprovalGranted,
  type RunId,
  type RunInteractionData,
  type SessionId,
} from "./harness-event.js";
import {
  buildToolApprovalPrompt,
  parseToolApprovalResponse,
  TOOL_APPROVAL_SYSTEM_PROMPT,
} from "./prompts/tool-approval-prompt.js";
import type { ToolApprovalRequester } from "./tool-approval.js";
import { RunMode } from "./user-input.js";

const TOOL_APPROVAL_MAX_TOKENS = 64;
const TOOL_APPROVAL_TIMEOUT_MS = 20_000;

export interface RunToolContext {
  approvalPolicy: ApprovalPolicyValue;
  isPlanApproved: boolean;
  mode: RunMode;
  runId: RunId;
  streamFn: StreamFn;
}

interface RunToolHooksOptions {
  agent: Agent;
  emit(draft: HarnessEventDraft, runId: RunId): Promise<HarnessEvent>;
  getActiveRun(): RunToolContext | null;
  getAllowedCommandPrefixes(): readonly (readonly string[])[];
  protectedPaths: readonly string[];
  requestToolApproval: ToolApprovalRequester;
  sessionId: SessionId;
  skillRegistry?: SkillRegistry;
  toolRegistry: ToolRegistry;
  workspaceRoot: string;
}

export class RunToolHooks {
  public readonly successfulToolCallIds = new Set<string>();
  private readonly pendingFileChanges = new Map<string, readonly FileChangedData[]>();
  private readonly sessionApprovedFingerprints = new Set<string>();
  private readonly sessionApprovedNetworkTargets = new Set<string>();
  private readonly callFingerprints = new Map<string, string | undefined>();
  private readonly readFingerprints = new Map<string, string | null>();
  private readonly pendingReadFingerprints = new Map<string, string | null>();

  /** 保存工具运行所需的依赖，并立即安装执行前后的安全检查。 */
  public constructor(private readonly options: RunToolHooksOptions) {
    this.setToolExecutionHooks(options.toolRegistry);
  }

  /** 从恢复出的完整消息里找回成功工具调用 ID，供 Todos 的完成证据使用。 */
  public restoreSuccessfulCalls(messages: readonly AgentMessage[]): void {
    this.successfulToolCallIds.clear();
    for (const message of messages) {
      if (message.role === "toolResult" && !message.isError) {
        this.successfulToolCallIds.add(message.toolCallId);
      }
    }
  }

  /** 新 Run 开始时重置重复调用保护，旧 Run 的调用不应拦住新任务。 */
  public resetForRun(): void {
    this.options.toolRegistry.executionGuard.reset();
  }

  /** Run 结束后清理临时指纹、文件变更和重复调用记录；会话级授权继续保留。 */
  public finishRun(): void {
    this.options.toolRegistry.executionGuard.reset();
    this.pendingFileChanges.clear();
    this.callFingerprints.clear();
    this.readFingerprints.clear();
    this.pendingReadFingerprints.clear();
  }

  /** 用 executionId 给嵌套执行的 toolCallId 分区，避免相同 ID 串到另一条调用。 */
  private callKey(toolCallId: string, executionId?: string): string {
    return `${executionId ?? "root"}:${toolCallId}`;
  }

  /** 给文件内容算一个“指纹”，以后用它判断文件是否被改过；不存在用 null 表示。 */
  private async fileFingerprint(path: string, signal: AbortSignal): Promise<string | null> {
    try {
      const hash = createHash("sha256");
      for await (const chunk of createReadStream(path, { signal })) hash.update(chunk);
      return hash.digest("hex");
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
      throw error;
    }
  }

  /** 从工具参数提取路径，并在实际访问前重新检查工作区及受保护路径边界。 */
  private async toolPath(params: unknown, allowMissing: boolean): Promise<string> {
    if (
      typeof params !== "object" ||
      params === null ||
      !("path" in params) ||
      typeof params.path !== "string"
    ) {
      throw new Error("WORKSPACE_CHANGED: 文件工具缺少路径");
    }
    return resolveWorkspacePath({
      path: params.path,
      workspaceRoot: this.options.workspaceRoot,
      protectedPaths: this.options.protectedPaths,
      ...(allowMissing ? { allowMissing: true } : {}),
    });
  }

  /**
   * 给工具装两道“门”：审批通过是一道门，真正动手前还要再检查一次。
   * 顺序是：审批时保存目标指纹 → beforeExecute 重新评估策略和文件版本 → 工具执行
   * → afterExecute 确认读取未被改动，或记录写入后的新版本。
   * 例如 A 读完文件后 B 改了它，A 随后 edit_file 会被拦下，必须重新读取。
   * run_command 可能修改任意已读文件，因此执行后会清空本次执行的读取指纹。
   */
  public setToolExecutionHooks(
    registry: ToolRegistry,
    executionId?: string,
    skillRegistry = this.options.skillRegistry,
  ): void {
    registry.setExecutionHooks({
      executionKey: async (toolName, params) =>
        toolName === "edit_file" || toolName === "write_file"
          ? this.toolPath(params, toolName === "write_file")
          : undefined,
      beforeExecute: async (toolName, toolCallId, params, signal) => {
        const key = this.callKey(toolCallId, executionId);
        if (toolName === "read_file") {
          const path = await this.toolPath(params, false);
          this.pendingReadFingerprints.set(key, await this.fileFingerprint(path, signal));
          return;
        }
        const activeRun = this.options.getActiveRun();
        const registration = registry.get(toolName);
        if (
          activeRun === null ||
          registration === undefined ||
          registration.policy.permission === ToolPermission.READ_ONLY
        )
          return;
        const current = await evaluateToolCall({
          approvalPolicy: activeRun.approvalPolicy,
          allowedCommandPrefixes: this.options.getAllowedCommandPrefixes(),
          isSkillToolPreapproved:
            (await skillRegistry?.isToolPreapproved(toolName, params, signal)) ?? false,
          arguments: params,
          policy: registration.policy,
          protectedPaths: this.options.protectedPaths,
          workspaceRoot: this.options.workspaceRoot,
          signal,
        });
        if (
          current.decision === ToolPolicyDecision.DENY ||
          current.fingerprint !== this.callFingerprints.get(key)
        ) {
          throw new Error("WORKSPACE_CHANGED: 审批后目标发生变化，请重新读取后执行");
        }
        if (toolName === "edit_file" || toolName === "write_file") {
          const path = await this.toolPath(params, toolName === "write_file");
          const currentFingerprint = await this.fileFingerprint(path, signal);
          const readKey = `${executionId ?? "root"}:${path}`;
          const observed = this.readFingerprints.get(readKey);
          if (
            currentFingerprint !== null &&
            (observed === undefined || observed !== currentFingerprint)
          ) {
            throw new Error("WORKSPACE_CHANGED: 文件已变化，请重新读取后修改");
          }
        }
      },
      afterExecute: async (toolName, toolCallId, params, signal) => {
        const key = this.callKey(toolCallId, executionId);
        if (toolName === "read_file") {
          const path = await this.toolPath(params, false);
          const current = await this.fileFingerprint(path, signal);
          if (current !== this.pendingReadFingerprints.get(key)) {
            throw new Error("WORKSPACE_CHANGED: 读取期间文件发生变化，请重新读取");
          }
          this.readFingerprints.set(`${executionId ?? "root"}:${path}`, current);
          this.pendingReadFingerprints.delete(key);
        } else if (toolName === "edit_file" || toolName === "write_file") {
          const path = await this.toolPath(params, false);
          this.readFingerprints.set(
            `${executionId ?? "root"}:${path}`,
            await this.fileFingerprint(path, signal),
          );
        } else if (toolName === "run_command") {
          for (const readKey of this.readFingerprints.keys()) {
            if (readKey.startsWith(`${executionId ?? "root"}:`))
              this.readFingerprints.delete(readKey);
          }
        }
        this.callFingerprints.delete(key);
      },
    });
  }

  /**
   * auto_approve 下向模型询问一次有限范围的工具风险判断。
   * 超时、模型错误或中止都不会变成许可；中止会继续向上抛出供 Run 处理。
   */
  private async requestAiToolApproval(
    input: { risk: string; summary: string; target: string; toolName: string },
    signal?: AbortSignal,
  ): Promise<{ commandPrefix: readonly string[] | null; isAllowed: boolean }> {
    const activeRun = this.options.getActiveRun();
    if (activeRun === null) return { commandPrefix: null, isAllowed: false };
    const timeoutSignal = AbortSignal.timeout(TOOL_APPROVAL_TIMEOUT_MS);
    const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    try {
      const stream = await activeRun.streamFn(
        this.options.agent.state.model,
        {
          messages: [
            {
              content: buildToolApprovalPrompt(input),
              role: "user",
              timestamp: Date.now(),
            },
          ],
          systemPrompt: TOOL_APPROVAL_SYSTEM_PROMPT,
        },
        {
          maxRetries: 0,
          maxTokens: TOOL_APPROVAL_MAX_TOKENS,
          signal: requestSignal,
          timeoutMs: TOOL_APPROVAL_TIMEOUT_MS,
        },
      );
      const response = await stream.result();
      if (response.stopReason === "aborted" || response.stopReason === "error") {
        return { commandPrefix: null, isAllowed: false };
      }
      return parseToolApprovalResponse(
        response.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join(""),
        input.toolName === "run_command" ? input.summary : "",
      );
    } catch {
      signal?.throwIfAborted();
      return { commandPrefix: null, isAllowed: false };
    }
  }

  /**
   * Agent 调用工具时的“门卫”：先检查 Plan 模式和 Policy，再处理重复调用与已有会话授权；
   * 仍需审批时才询问 AI 或用户。审批期间目标可能变化，因此获批后还要重新评估。
   * 例如批准修改 A 文件，不意味着等待审批时被替换成 B 文件后也能执行。
   * 返回 block 会阻止工具；返回 undefined 才继续进入实际执行阶段的二次检查。
   */
  // 工具调用前
  public async handleBeforeToolCall(
    context: BeforeToolCallContext,
    signal?: AbortSignal,
    registry: ToolRegistry = this.options.toolRegistry,
    executionId?: string,
    skillRegistry = this.options.skillRegistry,
  ): Promise<BeforeToolCallResult | undefined> {
    const activeRun = this.options.getActiveRun();
    if (activeRun === null) return { block: true, reason: "当前没有活动 Run" };

    const registration = registry.get(context.toolCall.name);
    const executionGuard = registry.executionGuard;
    if (
      activeRun.mode === RunMode.PLAN &&
      !activeRun.isPlanApproved &&
      registration?.policy.permission !== ToolPermission.READ_ONLY &&
      !(
        registration?.policy.permission === ToolPermission.SKILL_ACTIVATION &&
        typeof context.args === "object" &&
        context.args !== null &&
        (!("approveTools" in context.args) || context.args.approveTools !== true)
      )
    ) {
      return { block: true, reason: "Plan 尚未由用户确认，当前只允许读取和规划" };
    }

    // 在工具真正执行前，根据工具权限和参数，决定“直接允许、直接拒绝，还是请求用户审批”
    const policy = await evaluateToolCall({
      approvalPolicy: activeRun.approvalPolicy,
      allowedCommandPrefixes: this.options.getAllowedCommandPrefixes(),
      isSkillToolPreapproved:
        (await skillRegistry?.isToolPreapproved(context.toolCall.name, context.args, signal)) ??
        false,
      ...(signal ? { signal } : {}),
      arguments: context.args, // 模型传给工具的参数
      policy: registration?.policy, // 工具权限
      protectedPaths: this.options.protectedPaths,
      workspaceRoot: this.options.workspaceRoot,
    });
    if (
      registration?.policy.permission !== ToolPermission.READ_ONLY &&
      policy.decision !== ToolPolicyDecision.DENY
    ) {
      this.callFingerprints.set(this.callKey(context.toolCall.id, executionId), policy.fingerprint);
    }
    const allowRepeatedCalls =
      registration?.policy.permission === ToolPermission.USER_APPROVAL &&
      registration.policy.allowRepeatedCalls === true;
    // 阻止工具
    if (policy.decision === ToolPolicyDecision.DENY) {
      return { block: true, reason: policy.reason };
    }
    // 自动允许副作用时仍执行重复调用保护；只读工具不需要指纹。
    if (policy.decision === ToolPolicyDecision.ALLOW) {
      if (policy.fingerprint === undefined) return undefined;
      const toolCallFingerprint = executionGuard.createFingerprint(
        context.toolCall.name,
        context.args,
        policy.fingerprint,
      );
      const blockReason = executionGuard.getBlockReason(
        context.toolCall.id,
        toolCallFingerprint,
        allowRepeatedCalls,
      );
      if (blockReason !== null) return { block: true, reason: blockReason };
      executionGuard.recordApproved(context.toolCall.id, toolCallFingerprint);
      return undefined;
    }

    const toolCallFingerprint = executionGuard.createFingerprint(
      context.toolCall.name,
      context.args,
      policy.fingerprint,
    );
    const sessionApprovalFingerprint =
      policy.sessionFingerprint === undefined
        ? toolCallFingerprint
        : executionGuard.createFingerprint(context.toolCall.name, null, policy.sessionFingerprint);
    const blockReason = executionGuard.getBlockReason(
      context.toolCall.id,
      toolCallFingerprint,
      allowRepeatedCalls,
    );
    if (blockReason !== null) return { block: true, reason: blockReason };
    if (this.sessionApprovedFingerprints.has(sessionApprovalFingerprint)) {
      executionGuard.recordApproved(context.toolCall.id, toolCallFingerprint);
      return undefined;
    }

    const aiApproval =
      activeRun.approvalPolicy === ApprovalPolicy.AUTO_APPROVE &&
      (registration?.policy.permission === ToolPermission.SHELL ||
        policy.allowAiApproval === true) &&
      policy.allowAiApproval !== false
        ? await this.requestAiToolApproval(
            {
              risk: policy.risk,
              summary: policy.summary,
              target: policy.target,
              toolName: context.toolCall.name,
            },
            signal,
          )
        : null;
    if (aiApproval?.isAllowed === true) {
      const currentPolicy = await evaluateToolCall({
        approvalPolicy: activeRun.approvalPolicy,
        allowedCommandPrefixes: this.options.getAllowedCommandPrefixes(),
        isSkillToolPreapproved:
          (await skillRegistry?.isToolPreapproved(context.toolCall.name, context.args, signal)) ??
          false,
        ...(signal ? { signal } : {}),
        arguments: context.args,
        policy: registration?.policy,
        protectedPaths: this.options.protectedPaths,
        workspaceRoot: this.options.workspaceRoot,
      });
      if (
        currentPolicy.decision !== ToolPolicyDecision.ASK ||
        currentPolicy.allowAiApproval !== policy.allowAiApproval ||
        currentPolicy.fingerprint !== policy.fingerprint ||
        currentPolicy.summary !== policy.summary ||
        currentPolicy.target !== policy.target
      ) {
        return { block: true, reason: "AI 审批期间工具目标已变化，请重新读取后再执行" };
      }
      const currentBlockReason = executionGuard.getBlockReason(
        context.toolCall.id,
        toolCallFingerprint,
        allowRepeatedCalls,
      );
      if (currentBlockReason !== null) return { block: true, reason: currentBlockReason };
      executionGuard.recordApproved(context.toolCall.id, toolCallFingerprint);
      return undefined;
    }

    const approvalId = randomUUID();
    const commandPrefix = aiApproval === null ? policy.commandPrefix : aiApproval.commandPrefix;
    const request = {
      approvalId,
      ...(executionId === undefined ? {} : { executionId }),
      ...(policy.allowSimilar === undefined ? {} : { allowSimilar: policy.allowSimilar }),
      ...(policy.allowSession === undefined ? {} : { allowSession: policy.allowSession }),
      ...(commandPrefix === undefined || commandPrefix === null ? {} : { commandPrefix }),
      risk: policy.risk,
      runId: activeRun.runId,
      sessionId: this.options.sessionId,
      summary: policy.summary,
      target: policy.target,
      toolCallId: context.toolCall.id,
      toolName: context.toolCall.name,
    };
    const approval = this.options.requestToolApproval(request, signal);

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
      await this.options.emit(
        {
          data: {
            approvalId,
            ...(executionId === undefined ? {} : { executionId }),
            ...(request.allowSimilar === undefined ? {} : { allowSimilar: request.allowSimilar }),
            ...(request.allowSession === undefined ? {} : { allowSession: request.allowSession }),
            ...(request.commandPrefix === undefined
              ? {}
              : { commandPrefix: request.commandPrefix }),
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
      if (executionId === undefined) {
        await this.options.emit(
          {
            data: { interactionId: approvalId, kind: "tool_approval" } satisfies RunInteractionData,
            type: HarnessEventType.RUN_AWAITING_INPUT,
          },
          activeRun.runId,
        );
      }

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
      await this.options.emit(
        {
          data: {
            approvalId,
            ...(executionId === undefined ? {} : { executionId }),
            ...(decision === ApprovalDecision.APPROVED_SIMILAR &&
            request.commandPrefix !== undefined
              ? { commandPrefix: request.commandPrefix }
              : {}),
            decision,
            toolCallId: context.toolCall.id,
            toolName: context.toolCall.name,
          } satisfies ApprovalResolvedData,
          type: HarnessEventType.APPROVAL_RESOLVED,
        },
        activeRun.runId,
      );
      // 表示 Run 已经离开等待状态
      if (executionId === undefined) {
        await this.options.emit(
          {
            data: { interactionId: approvalId, kind: "tool_approval" } satisfies RunInteractionData,
            type: HarnessEventType.RUN_RESUMED,
          },
          activeRun.runId,
        );
      }

      // 决定是否执行工具，返回 undefined，表示不阻止工具，继续执行。
      if (isApprovalGranted(decision)) {
        if (
          decision === ApprovalDecision.APPROVED_SIMILAR &&
          registration?.policy.permission === ToolPermission.USER_APPROVAL &&
          registration.policy.storeGrant !== undefined
        ) {
          await registration.policy.storeGrant(context.args, signal);
        }
        const currentPolicy = await evaluateToolCall({
          approvalPolicy: activeRun.approvalPolicy,
          allowedCommandPrefixes: this.options.getAllowedCommandPrefixes(),
          isSkillToolPreapproved:
            (await skillRegistry?.isToolPreapproved(context.toolCall.name, context.args, signal)) ??
            false,
          ...(signal ? { signal } : {}),
          arguments: context.args,
          policy: registry.get(context.toolCall.name)?.policy,
          protectedPaths: this.options.protectedPaths,
          workspaceRoot: this.options.workspaceRoot,
        });
        const isUnchangedOneTimeApproval =
          (decision === ApprovalDecision.APPROVED ||
            decision === ApprovalDecision.APPROVED_SESSION) &&
          currentPolicy.decision === ToolPolicyDecision.ASK &&
          currentPolicy.fingerprint === policy.fingerprint &&
          currentPolicy.summary === policy.summary &&
          currentPolicy.target === policy.target;
        const isValidSessionApproval =
          decision !== ApprovalDecision.APPROVED_SESSION ||
          (policy.allowSession !== false &&
            currentPolicy.decision === ToolPolicyDecision.ASK &&
            currentPolicy.allowSession !== false &&
            currentPolicy.sessionFingerprint === policy.sessionFingerprint);
        const isStoredSimilarApproval =
          decision === ApprovalDecision.APPROVED_SIMILAR &&
          currentPolicy.decision === ToolPolicyDecision.ALLOW &&
          currentPolicy.fingerprint === policy.fingerprint;
        if ((!isUnchangedOneTimeApproval && !isStoredSimilarApproval) || !isValidSessionApproval) {
          return {
            block: true,
            reason: "审批期间工具目标已变化，请重新读取后再修改",
          };
        }
        const currentBlockReason = executionGuard.getBlockReason(
          context.toolCall.id,
          toolCallFingerprint,
          allowRepeatedCalls,
        );
        if (currentBlockReason !== null) {
          return { block: true, reason: currentBlockReason };
        }
        executionGuard.recordApproved(context.toolCall.id, toolCallFingerprint);
        if (decision === ApprovalDecision.APPROVED_SESSION) {
          this.sessionApprovedFingerprints.add(sessionApprovalFingerprint);
        }
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

  /**
   * run_command 首次访问某个 host:port 时单独征求许可。
   * 只有用户选择“本 Session 允许”才缓存该目标；普通单次批准下次仍会询问。
   */
  public async requestNetworkAccess(
    input: { host: string; port?: number; toolCallId: string },
    signal?: AbortSignal,
  ): Promise<boolean> {
    const delimiter = input.toolCallId.indexOf(":");
    const executionId = delimiter > 0 ? input.toolCallId.slice(0, delimiter) : undefined;
    const toolCallId =
      executionId === undefined ? input.toolCallId : input.toolCallId.slice(delimiter + 1);
    const target = `${input.host}:${input.port ?? "*"}`;
    if (this.sessionApprovedNetworkTargets.has(target)) return true;
    const decision = await this.requestToolExecutionApproval(
      {
        allowSession: true,
        risk: "这是该域名或 IP 的首次访问；允许后，本次命令可向该目标发送工作区数据。",
        summary: `访问 ${target}`,
        target,
        toolCallId,
        ...(executionId === undefined ? {} : { executionId }),
      },
      signal,
    );
    if (decision === ApprovalDecision.APPROVED_SESSION) {
      this.sessionApprovedNetworkTargets.add(target);
    }
    return isApprovalGranted(decision);
  }

  /**
   * 命令需要离开沙箱时，展示提权风险和首次执行造成的文件变化，再询问用户。
   * 这里不提供会话级放行；审批超时会抛出明确错误，供命令执行链停止提权。
   */
  public async requestHostExecution(
    input: {
      command: string;
      changedFileCount: number;
      reason: string;
      toolCallId: string;
    },
    signal?: AbortSignal,
  ): Promise<boolean> {
    const delimiter = input.toolCallId.indexOf(":");
    const executionId = delimiter > 0 ? input.toolCallId.slice(0, delimiter) : undefined;
    const toolCallId =
      executionId === undefined ? input.toolCallId : input.toolCallId.slice(delimiter + 1);
    const changedFilesRisk =
      input.changedFileCount === 0
        ? ""
        : ` 沙箱内的首次执行已修改 ${input.changedFileCount} 个可追踪文件，重跑可能重复产生副作用。`;
    const decision = await this.requestToolExecutionApproval(
      {
        allowSession: false,
        kind: ApprovalRequestKind.HOST_EXECUTION,
        preview: input.reason,
        risk: `提升后，原命令将不受文件系统和网络沙箱限制，并以 daemon 当前用户权限在宿主机执行。${changedFilesRisk}`,
        summary: input.command,
        target: "宿主机（当前用户权限）",
        toolCallId,
        ...(executionId === undefined ? {} : { executionId }),
      },
      signal,
    );
    if (decision === ApprovalDecision.EXPIRED) {
      throw new Error("HOST_EXECUTION_APPROVAL_EXPIRED: 宿主机执行审批已超时");
    }
    return isApprovalGranted(decision);
  }

  /** 暂存 Shell 命令报告的文件变化，等对应工具结束事件发出后再发布。 */
  public recordCommandFileChanges(input: {
    changes: readonly FileChangeDetails[];
    toolCallId: string;
  }): void {
    if (input.changes.length === 0) return;
    const delimiter = input.toolCallId.indexOf(":");
    const executionId = delimiter > 0 ? input.toolCallId.slice(0, delimiter) : undefined;
    const toolCallId =
      executionId === undefined ? input.toolCallId : input.toolCallId.slice(delimiter + 1);
    this.pendingFileChanges.set(
      input.toolCallId,
      input.changes.map((fileChange) => ({
        ...fileChange,
        ...(executionId === undefined ? {} : { executionId }),
        toolCallId,
        toolName: "run_command",
      })),
    );
  }

  /**
   * 执行中的 Shell 再次需要网络或宿主机权限时，走统一的人工审批时间线。
   * 创建审批 → 发 requested/awaiting 事件 → 等用户决定 → 发 resolved/resumed 事件。
   * 例如命令访问新域名，工具在这里暂停；只有批准后 requestNetworkAccess 才返回 true。
   * 嵌套执行有 executionId 时，等待状态由外层管理，这里只发审批本身的事件。
   */
  private async requestToolExecutionApproval(
    input: {
      executionId?: string;
      allowSession: boolean;
      kind?: ApprovalRequestKindValue;
      preview?: string;
      risk: string;
      summary: string;
      target: string;
      toolCallId: string;
    },
    signal?: AbortSignal,
  ): Promise<ApprovalDecision> {
    const activeRun = this.options.getActiveRun();
    if (activeRun === null) return ApprovalDecision.REJECTED;
    const approvalId = randomUUID();
    const request = {
      approvalId,
      ...(input.executionId === undefined ? {} : { executionId: input.executionId }),
      allowSession: input.allowSession,
      ...(input.kind === undefined ? {} : { kind: input.kind }),
      ...(input.preview === undefined ? {} : { preview: input.preview }),
      risk: input.risk,
      runId: activeRun.runId,
      sessionId: this.options.sessionId,
      summary: input.summary,
      target: input.target,
      toolCallId: input.toolCallId,
      toolName: "run_command",
    };
    const approval = this.options.requestToolApproval(request, signal);
    try {
      await this.options.emit(
        {
          data: {
            approvalId,
            ...(input.executionId === undefined ? {} : { executionId: input.executionId }),
            allowSession: input.allowSession,
            expiresAt: approval.expiresAt,
            ...(input.kind === undefined ? {} : { kind: input.kind }),
            ...(input.preview === undefined ? {} : { preview: input.preview }),
            risk: input.risk,
            summary: input.summary,
            target: input.target,
            toolCallId: input.toolCallId,
            toolName: "run_command",
          } satisfies ApprovalRequestedData,
          type: HarnessEventType.APPROVAL_REQUESTED,
        },
        activeRun.runId,
      );
      if (input.executionId === undefined)
        await this.options.emit(
          {
            data: { interactionId: approvalId, kind: "tool_approval" } satisfies RunInteractionData,
            type: HarnessEventType.RUN_AWAITING_INPUT,
          },
          activeRun.runId,
        );
      const decision = await approval.result;
      await this.options.emit(
        {
          data: {
            approvalId,
            ...(input.executionId === undefined ? {} : { executionId: input.executionId }),
            decision,
            toolCallId: input.toolCallId,
            toolName: "run_command",
          } satisfies ApprovalResolvedData,
          type: HarnessEventType.APPROVAL_RESOLVED,
        },
        activeRun.runId,
      );
      if (input.executionId === undefined)
        await this.options.emit(
          {
            data: { interactionId: approvalId, kind: "tool_approval" } satisfies RunInteractionData,
            type: HarnessEventType.RUN_RESUMED,
          },
          activeRun.runId,
        );
      return decision;
    } finally {
      approval.cancel();
    }
  }

  /** 成功的工具调用才记入证据；文件变化暂存，避免早于工具结束事件出现。 */
  // 工具执行成功后捕获其一项或多项文件变更，等待对应 tool_execution_end 后顺序发出。
  public async handleAfterToolCall(
    context: AfterToolCallContext,
    executionId?: string,
  ): Promise<undefined> {
    if (context.isError) return undefined;
    this.successfulToolCallIds.add(context.toolCall.id);
    const fileChanges = readFileChangeDetails(context.result.details);
    if (fileChanges.length === 0) return undefined;
    this.pendingFileChanges.set(
      executionId === undefined ? context.toolCall.id : `${executionId}:${context.toolCall.id}`,
      fileChanges.map((fileChange) => ({
        ...fileChange,
        ...(executionId === undefined ? {} : { executionId }),
        toolCallId: context.toolCall.id,
        toolName: context.toolCall.name,
      })),
    );
    return undefined;
  }

  /** 工具结束事件之后按原顺序发出暂存的 file.changed，并移除这批待发记录。 */
  public async flushFileChanges(
    toolCallId: string,
    runId: RunId,
    executionId?: string,
  ): Promise<void> {
    const key = executionId === undefined ? toolCallId : `${executionId}:${toolCallId}`;
    const fileChanges = this.pendingFileChanges.get(key);
    if (fileChanges === undefined) return;
    this.pendingFileChanges.delete(key);
    for (const fileChange of fileChanges) {
      await this.options.emit({ data: fileChange, type: HarnessEventType.FILE_CHANGED }, runId);
    }
  }
}
