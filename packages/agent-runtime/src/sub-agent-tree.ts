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
import { type Api, clampThinkingLevel, type Model, type Usage } from "@earendil-works/pi-ai";
import { ToolPermission } from "@pi-harness/policy";
import {
  createFindSkillTool,
  createGetSkillTool,
  createLoadSkillPolicy,
  createLoadSkillTool,
  createRequestUserInputTool,
  createSubAgentToolRegistrations,
  type RequestUserInputData,
  type SendAgentMessageInput,
  type SkillRegistry,
  type SpawnAgentInput,
  type StopAgentInput,
  SubAgentType,
  type ToolRegistration,
  ToolRegistry,
  type UserInputToolResult,
  type WaitAgentsInput,
} from "@pi-harness/tools";
import { projectContext } from "./context/context-pipeline.js";
import { createAgent } from "./create-agent.js";
import { type AgentEventAdapterContext, adaptAgentEvent } from "./event-adapter.js";
import {
  type ContextCompactedData,
  type HarnessEventDraft,
  HarnessEventType,
  type RunId,
  type SubAgentStartedData,
  SubAgentStatus,
  type SubAgentStatus as SubAgentStatusValue,
  type SubAgentTerminalData,
} from "./harness-event.js";
import {
  applyModelResponsePreferences,
  type OutputDetail,
  type ReasoningSummary,
} from "./model-response-preferences.js";
import { buildSubAgentPrompt } from "./prompts/sub-agent-prompt.js";
import { type ThinkingLevel, ThinkingLevel as ThinkingLevels } from "./thinking-level.js";
import { RunMode } from "./user-input.js";
import { estimateContextUsage } from "./utils/context-usage.js";
import { createRunToolSnapshot } from "./utils/run-tool-snapshot.js";

/**
 * EXCLUDED_CHILD_TOOLS 是“子 Agent 不能直接继承的工具”
 * EXPLORER_TOOLS 是“探索型子 Agent 能用的只读工具”
 *
 * 也就是分子agent类型有不同的tool列表：
 * explorer 不能用 MCP 工具，也不能编辑文件，只能用指定的只读工具；
 * worker 可以使用父 Agent 已有的 MCP 和编辑文件工具，实际执行时仍要经过权限检查和必要的审批
 */
const EXPLORER_TOOLS = new Set([
  "read_file",
  "view_image",
  "read_document",
  "view_pdf_page",
  "list_files",
  "search_text",
  "web_search",
  "web_fetch",
]);
const EXCLUDED_CHILD_TOOLS = new Set([
  "update_plan",
  "update_todos",
  "restore_context_checkpoint",
  "reset_working_state",
  "request_user_input",
  "search_session_history",
  "skill_creator",
  "find_skill",
  "get_skill",
  "load_skill",
  "spawn_agent",
  "wait_agents",
  "send_agent_message",
  "stop_agent",
]);
const MAX_DIRECT_CHILDREN = 3;
const MAX_DEPTH = 2;
const MAX_DURATION_MS = 30 * 60_000;
const MAX_RESULT_LENGTH = 4_000;

interface Execution {
  agent: Agent;
  adapterContext: AgentEventAdapterContext;
  agentType: SubAgentType;
  abortRequested: boolean;
  children: Set<string>;
  compactionUsages: Usage[];
  completion: Promise<void>;
  delivered: boolean;
  executionId: string;
  name: string;
  requestCount: number;
  parentExecutionId: string | null;
  registry: ToolRegistry;
  skillRegistry: SkillRegistry | null;
  releaseSlot: () => void;
  status: SubAgentStatusValue;
  task: string;
  terminal: SubAgentTerminalData | null;
  timer: ReturnType<typeof setTimeout>;
  timedOut: boolean;
  unsubscribe: () => void;
}

export interface SubAgentTreeOptions {
  rootAgent: Agent;
  rootRegistry: ToolRegistry;
  skillRegistry?: SkillRegistry;
  runId: RunId;
  model: Model<Api>;
  modelId: string;
  outputDetail: OutputDetail;
  reasoningSummary: ReasoningSummary;
  thinkingLevel: ThinkingLevel;
  streamFn: StreamFn;
  systemPrompt: string;
  workspaceRoot: string;
  mode: RunMode;
  isPlanApproved(): boolean;
  emit(draft: HarnessEventDraft): Promise<void>;
  beforeToolCall(
    context: BeforeToolCallContext,
    registry: ToolRegistry,
    executionId: string,
    signal?: AbortSignal,
    skillRegistry?: SkillRegistry,
  ): Promise<BeforeToolCallResult | undefined>;
  afterToolCall(context: AfterToolCallContext, executionId: string): Promise<void>;
  flushToolChanges(toolCallId: string, executionId: string): Promise<void>;
  requestUserInput(
    executionId: string,
    data: RequestUserInputData,
    signal?: AbortSignal,
  ): Promise<UserInputToolResult>;
  setExecutionHooks(
    registry: ToolRegistry,
    executionId: string,
    skillRegistry?: SkillRegistry,
  ): void;
  acquireSlot(): (() => void) | null;
  resolveModel(modelId: string): Promise<Model<Api>>;
}

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal === undefined) return promise;
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

function finalText(messages: readonly AgentMessage[]): string {
  const assistant = [...messages].reverse().find((message) => message.role === "assistant");
  if (assistant?.role !== "assistant") return "";
  return assistant.content
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n")
    .slice(0, MAX_RESULT_LENGTH);
}

function failureCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  for (const code of ["SUBAGENT_CONTEXT_EXCEEDED", "SUBAGENT_LIMIT_REACHED", "SUBAGENT_TIMEOUT"]) {
    if (message.startsWith(`${code}:`)) return code;
  }
  return "SUBAGENT_MODEL_FAILED";
}

function totalUsage(messages: readonly AgentMessage[], compactionUsages: readonly Usage[]): Usage {
  const total: Usage = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
  const usages = [
    ...messages.flatMap((message) => (message.role === "assistant" ? [message.usage] : [])),
    ...compactionUsages,
  ];
  for (const usage of usages) {
    total.input += usage.input;
    total.output += usage.output;
    total.cacheRead += usage.cacheRead;
    total.cacheWrite += usage.cacheWrite;
    total.totalTokens += usage.totalTokens;
    total.cost.input += usage.cost.input;
    total.cost.output += usage.cost.output;
    total.cost.cacheRead += usage.cost.cacheRead;
    total.cost.cacheWrite += usage.cost.cacheWrite;
    total.cost.total += usage.cost.total;
    if (usage.reasoning !== undefined) total.reasoning = (total.reasoning ?? 0) + usage.reasoning;
  }
  return total;
}

export class SubAgentTree {
  private readonly executions = new Map<string, Execution>();
  private readonly rootChildren = new Set<string>();
  private readonly pendingSpawns = new Map<string, Promise<{ executionId: string }>>();
  private readonly reservations = new Map<string, number>();

  public constructor(private readonly options: SubAgentTreeOptions) {}

  private directChildren(parentExecutionId: string | null): Set<string> {
    if (parentExecutionId === null) return this.rootChildren;
    const parent = this.executions.get(parentExecutionId);
    if (parent === undefined) throw new Error("SUBAGENT_NOT_FOUND: 子 Agent 不存在");
    return parent.children;
  }

  private requireDirectChild(parentExecutionId: string | null, executionId: string): Execution {
    const child = this.executions.get(executionId);
    if (child === undefined || child.parentExecutionId !== parentExecutionId) {
      const candidate = [...this.directChildren(parentExecutionId)].find((id) =>
        id.startsWith(executionId.slice(0, 8)),
      );
      throw new Error(
        `SUBAGENT_NOT_FOUND: 请使用 spawn_agent 返回的 executionId 重试${candidate ? `，可能是 ${candidate}` : ""}`,
      );
    }
    return child;
  }

  public async spawn(
    parentExecutionId: string | null,
    parentToolCallId: string,
    input: SpawnAgentInput,
    signal?: AbortSignal,
  ): Promise<{ executionId: string }> {
    signal?.throwIfAborted();
    const parent = parentExecutionId === null ? null : this.executions.get(parentExecutionId);
    if (parentExecutionId !== null && parent?.status !== SubAgentStatus.RUNNING) {
      throw new Error("SUBAGENT_NOT_ACTIVE: 父执行已结束");
    }
    const depth = parentExecutionId === null ? 1 : parent?.parentExecutionId === null ? 2 : 3;
    if (depth > MAX_DEPTH) throw new Error("SUBAGENT_DEPTH_EXCEEDED: 最多允许两层子 Agent");
    if (parent?.agentType === SubAgentType.EXPLORER && input.agentType !== SubAgentType.EXPLORER) {
      throw new Error("SUBAGENT_ROLE_DENIED: explorer 只能委派 explorer");
    }
    if (
      this.options.mode === RunMode.PLAN &&
      !this.options.isPlanApproved() &&
      input.agentType === SubAgentType.WORKER
    ) {
      throw new Error("SUBAGENT_ROLE_DENIED: Plan 尚未确认执行");
    }
    const key = JSON.stringify([
      parentExecutionId,
      input.agentType,
      input.modelId ?? this.options.modelId,
      input.name,
      input.task,
    ]);
    const existing = [...this.directChildren(parentExecutionId)]
      .map((id) => this.executions.get(id))
      .find(
        (child) =>
          child?.status === SubAgentStatus.RUNNING &&
          child.agentType === input.agentType &&
          child.adapterContext.modelId === (input.modelId ?? this.options.modelId) &&
          child.name === input.name &&
          child.task === input.task,
      );
    if (existing) return { executionId: existing.executionId };
    const pending = this.pendingSpawns.get(key);
    if (pending) return abortable(pending, signal);
    const spawned = this.spawnReserved(
      parentExecutionId,
      parentToolCallId,
      input,
      parent ?? null,
      signal,
    );
    this.pendingSpawns.set(key, spawned);
    try {
      return await spawned;
    } finally {
      if (this.pendingSpawns.get(key) === spawned) this.pendingSpawns.delete(key);
    }
  }

  private async spawnReserved(
    parentExecutionId: string | null,
    parentToolCallId: string,
    input: SpawnAgentInput,
    parent: Execution | null,
    signal?: AbortSignal,
  ): Promise<{ executionId: string }> {
    const children = this.directChildren(parentExecutionId);
    const activeChildren = [...children].filter(
      (id) => this.executions.get(id)?.status === SubAgentStatus.RUNNING,
    ).length;
    const reservationKey = parentExecutionId ?? "root";
    if (activeChildren + (this.reservations.get(reservationKey) ?? 0) >= MAX_DIRECT_CHILDREN) {
      throw new Error(
        `SUBAGENT_LIMIT_REACHED: 当前 Agent 同时运行的子任务已达 ${MAX_DIRECT_CHILDREN} 个，请等待一个完成后重试`,
      );
    }
    const releaseSlot = this.options.acquireSlot();
    if (releaseSlot === null)
      throw new Error("SUBAGENT_LIMIT_REACHED: daemon 子任务并发已满，请等待后重试");
    this.reservations.set(reservationKey, (this.reservations.get(reservationKey) ?? 0) + 1);
    const executionId = randomUUID();
    let unsubscribe: (() => void) | undefined;
    let startedPersisted = false;
    try {
      let model: Model<Api>;
      try {
        model =
          input.modelId === undefined || input.modelId === this.options.modelId
            ? this.options.model
            : await this.options.resolveModel(input.modelId);
      } catch {
        throw new Error("SUBAGENT_MODEL_FAILED: 无法使用指定模型");
      }
      if (!model.input.includes("text"))
        throw new Error("SUBAGENT_MODEL_FAILED: 模型不支持文本输入");
      signal?.throwIfAborted();
      const started: SubAgentStartedData = {
        agentType: input.agentType,
        executionId,
        modelId: input.modelId ?? this.options.modelId,
        name: input.name,
        parentToolCallId,
        task: input.task,
        ...(parentExecutionId === null ? {} : { parentExecutionId }),
      };
      await this.options.emit({ type: HarnessEventType.SUBAGENT_STARTED, data: started });
      startedPersisted = true;
      const sourceRegistry = parent?.registry ?? this.options.rootRegistry;
      const skillRegistry = (parent?.skillRegistry ?? this.options.skillRegistry)?.fork() ?? null;
      const raw: ToolRegistration[] = sourceRegistry.rawRegistrations
        .filter((registration) => !EXCLUDED_CHILD_TOOLS.has(registration.tool.name))
        .filter(
          (registration) =>
            input.agentType === SubAgentType.WORKER ||
            (EXPLORER_TOOLS.has(registration.tool.name) &&
              registration.policy.permission === ToolPermission.READ_ONLY),
        )
        .map((registration) => ({
          ...registration,
          tool: {
            ...registration.tool,
            execute: (toolCallId, params, toolSignal, onUpdate) =>
              registration.tool.execute(
                `${executionId}:${toolCallId}`,
                params,
                toolSignal,
                onUpdate,
              ),
          },
        }));
      const registry = new ToolRegistry([
        ...raw,
        ...(input.agentType === SubAgentType.WORKER && skillRegistry !== null
          ? [
              {
                policy: { permission: ToolPermission.READ_ONLY },
                source: "built_in",
                timeoutMs: 30_000,
                tool: createFindSkillTool(skillRegistry),
              },
              {
                policy: { permission: ToolPermission.READ_ONLY },
                source: "built_in",
                timeoutMs: 30_000,
                tool: createGetSkillTool(skillRegistry),
              },
              {
                policy: createLoadSkillPolicy(skillRegistry),
                source: "built_in",
                timeoutMs: 30_000,
                tool: createLoadSkillTool(skillRegistry, () => model.input.includes("image")),
              },
            ]
          : []),
        {
          policy: { permission: ToolPermission.READ_ONLY },
          source: "built_in",
          timeoutMs: 24 * 60 * 60_000 + 60_000,
          tool: createRequestUserInputTool((data, requestSignal) =>
            this.options.requestUserInput(executionId, data, requestSignal),
          ),
        },
        ...createSubAgentToolRegistrations(this.handlers(executionId)),
      ]);
      this.options.setExecutionHooks(registry, executionId, skillRegistry ?? undefined);
      const agent = createAgent({
        messages: [],
        model,
        sessionId: executionId,
        systemPrompt: buildSubAgentPrompt(
          this.options.systemPrompt,
          input.agentType,
          this.options.workspaceRoot,
        ),
        streamFn: this.options.streamFn,
        tools: registry.tools,
      });
      const thinkingLevel = clampThinkingLevel(model, this.options.thinkingLevel);
      agent.state.thinkingLevel = thinkingLevel;
      let requestCount = 0;
      agent.streamFunction = async (requestModel, context, streamOptions) => {
        requestCount += 1;
        const current = this.executions.get(executionId);
        if (current) current.requestCount = requestCount;
        await this.options.emit({
          type: HarnessEventType.SUBAGENT_CONTEXT_USAGE_SNAPSHOT,
          data: {
            executionId,
            ...(parentExecutionId === null ? {} : { parentExecutionId }),
            ...estimateContextUsage(context, []),
          },
        });
        return this.options.streamFn(requestModel, context, {
          ...streamOptions,
          cacheRetention: "long",
          onPayload: async (payload, payloadModel) => {
            const transformed =
              (await streamOptions?.onPayload?.(payload, payloadModel)) ?? payload;
            return applyModelResponsePreferences(
              transformed,
              payloadModel,
              this.options.outputDetail,
              this.options.reasoningSummary,
              thinkingLevel !== ThinkingLevels.OFF,
            );
          },
          sessionId: executionId,
        });
      };
      let checkpoint: ContextCompactedData | null = null;
      agent.transformContext = async (messages, contextSignal) => {
        const projected = await projectContext({
          activeRunStartMessageIndex: 0,
          checkpoint,
          messages,
          model,
          onCompactionStarted: async () => {
            requestCount += 1;
            const current = this.executions.get(executionId);
            if (current) current.requestCount = requestCount;
          },
          plan: null,
          todos: null,
          sessionId: executionId,
          ...(contextSignal === undefined ? {} : { signal: contextSignal }),
          streamFn: this.options.streamFn,
          systemPrompt: agent.state.systemPrompt,
          tools: agent.state.tools,
        });
        if (projected.error) throw new Error(`SUBAGENT_CONTEXT_EXCEEDED: ${projected.error}`);
        if (projected.compacted) {
          checkpoint = projected.compacted;
          if (projected.compacted.compactionUsage) {
            this.executions
              .get(executionId)
              ?.compactionUsages.push(projected.compacted.compactionUsage);
          }
          await this.options.emit({
            type: HarnessEventType.SUBAGENT_CONTEXT_COMPACTED,
            data: {
              executionId,
              ...(parentExecutionId === null ? {} : { parentExecutionId }),
              ...projected.compacted,
            },
          });
        }
        return projected.messages;
      };
      agent.beforeToolCall = (context, toolSignal) =>
        this.options.beforeToolCall(
          context,
          registry,
          executionId,
          toolSignal,
          skillRegistry ?? undefined,
        );
      agent.afterToolCall = async (context) => {
        await this.options.afterToolCall(context, executionId);
        return undefined;
      };
      unsubscribe = agent.subscribe((event) => this.handleEvent(executionId, event));
      const timer = setTimeout(() => {
        const current = this.executions.get(executionId);
        if (current !== undefined) {
          current.timedOut = true;
          for (const childId of current.children) this.abortSubtree(childId);
        }
        agent.abort();
      }, MAX_DURATION_MS);
      const execution: Execution = {
        agent,
        adapterContext: {
          contexts: [],
          maxTokens: model.maxTokens,
          modelId: input.modelId ?? this.options.modelId,
          mode: this.options.mode,
          providerId: model.provider,
          systemPrompt: agent.state.systemPrompt,
          thinkingLevel,
          tools: createRunToolSnapshot(registry),
        },
        agentType: input.agentType,
        abortRequested: false,
        children: new Set(),
        compactionUsages: [],
        completion: Promise.resolve(),
        delivered: false,
        executionId,
        name: input.name,
        parentExecutionId,
        registry,
        skillRegistry,
        releaseSlot,
        requestCount: 0,
        status: SubAgentStatus.RUNNING,
        task: input.task,
        terminal: null,
        timer,
        timedOut: false,
        unsubscribe,
      };
      this.executions.set(executionId, execution);
      children.add(executionId);
      this.reservations.set(reservationKey, (this.reservations.get(reservationKey) ?? 1) - 1);
      execution.completion = this.run(execution, input.task);
      return { executionId };
    } catch (error: unknown) {
      unsubscribe?.();
      releaseSlot();
      this.reservations.set(reservationKey, (this.reservations.get(reservationKey) ?? 1) - 1);
      if (startedPersisted) {
        await this.options.emit({
          type: HarnessEventType.SUBAGENT_FAILED,
          data: {
            executionId,
            ...(parentExecutionId === null ? {} : { parentExecutionId }),
            endedAt: Date.now(),
            errorCode: "SUBAGENT_MODEL_FAILED",
            requestCount: 0,
          } satisfies SubAgentTerminalData,
        });
      }
      if (startedPersisted) throw new Error("SUBAGENT_MODEL_FAILED: 子 Agent 启动失败");
      throw error;
    }
  }

  private handlers(parentExecutionId: string | null) {
    return {
      spawn: (toolCallId: string, input: SpawnAgentInput, signal?: AbortSignal) =>
        this.spawn(parentExecutionId, toolCallId, input, signal),
      wait: (input: WaitAgentsInput, signal?: AbortSignal) =>
        this.wait(parentExecutionId, input, signal),
      send: (input: SendAgentMessageInput, signal?: AbortSignal) =>
        this.send(parentExecutionId, input, signal),
      stop: (input: StopAgentInput, signal?: AbortSignal) =>
        this.stop(parentExecutionId, input.executionId, signal),
    };
  }

  public rootHandlers() {
    return this.handlers(null);
  }

  public getParentExecutionId(executionId: string): string | null {
    return this.executions.get(executionId)?.parentExecutionId ?? null;
  }

  private async handleEvent(executionId: string, event: AgentEvent): Promise<void> {
    if (event.type === "agent_start" || event.type === "agent_end") return;
    const execution = this.executions.get(executionId);
    if (execution === undefined) return;
    const draft = adaptAgentEvent(event, execution.adapterContext);
    if (draft === null) return;
    const typeByRootType: Partial<
      Record<string, (typeof HarnessEventType)[keyof typeof HarnessEventType]>
    > = {
      [HarnessEventType.MESSAGE_STARTED]: HarnessEventType.SUBAGENT_MESSAGE_STARTED,
      [HarnessEventType.MESSAGE_DELTA]: HarnessEventType.SUBAGENT_MESSAGE_DELTA,
      [HarnessEventType.MESSAGE_COMPLETED]: HarnessEventType.SUBAGENT_MESSAGE_COMPLETED,
      [HarnessEventType.TOOL_STARTED]: HarnessEventType.SUBAGENT_TOOL_STARTED,
      [HarnessEventType.TOOL_UPDATED]: HarnessEventType.SUBAGENT_TOOL_UPDATED,
      [HarnessEventType.TOOL_COMPLETED]: HarnessEventType.SUBAGENT_TOOL_COMPLETED,
      [HarnessEventType.TOOL_FAILED]: HarnessEventType.SUBAGENT_TOOL_FAILED,
    };
    const childType = typeByRootType[draft.type];
    if (childType === undefined) return;
    const parentExecutionId = this.getParentExecutionId(executionId);
    const parent = parentExecutionId === null ? {} : { parentExecutionId };
    const data = draft.type.startsWith("message.")
      ? draft.type === HarnessEventType.MESSAGE_DELTA
        ? { executionId, ...parent, ...(draft.data as object) }
        : { executionId, ...parent, message: draft.data }
      : { executionId, ...parent, ...(draft.data as object) };
    await this.options.emit({ type: childType, data });
    if (event.type === "tool_execution_end") {
      await this.options.flushToolChanges(event.toolCallId, executionId);
    }
  }

  private async run(execution: Execution, task: string): Promise<void> {
    try {
      await execution.agent.prompt(task);
      while (!execution.abortRequested && !execution.timedOut) {
        while (execution.agent.hasQueuedMessages()) await execution.agent.continue();
        await this.join(execution.executionId, execution.agent);
        if (!execution.agent.hasQueuedMessages()) break;
      }
      if (execution.abortRequested || execution.timedOut) {
        await Promise.allSettled(
          [...execution.children].map((id) => this.executions.get(id)?.completion),
        );
      }
      const last = execution.agent.state.messages.at(-1);
      if (execution.timedOut) throw new Error("SUBAGENT_TIMEOUT: 子 Agent 执行超时");
      if (last?.role === "assistant" && last.stopReason === "error") {
        throw new Error(last.errorMessage ?? "SUBAGENT_MODEL_FAILED: 子 Agent 模型调用失败");
      }
      const isAborted =
        execution.abortRequested || (last?.role === "assistant" && last.stopReason === "aborted");
      if (!isAborted && !finalText(execution.agent.state.messages).trim()) {
        throw new Error("SUBAGENT_MODEL_FAILED: 子 Agent 没有有效结果");
      }
      const type = isAborted
        ? HarnessEventType.SUBAGENT_ABORTED
        : HarnessEventType.SUBAGENT_COMPLETED;
      const terminal: SubAgentTerminalData = {
        executionId: execution.executionId,
        ...(execution.parentExecutionId === null
          ? {}
          : { parentExecutionId: execution.parentExecutionId }),
        endedAt: Date.now(),
        requestCount: execution.requestCount,
        usage: totalUsage(execution.agent.state.messages, execution.compactionUsages),
        ...(isAborted
          ? { errorCode: "SUBAGENT_ABORTED" }
          : { resultSummary: finalText(execution.agent.state.messages) }),
      };
      await this.options.emit({ type, data: terminal });
      execution.status = isAborted ? SubAgentStatus.ABORTED : SubAgentStatus.COMPLETED;
      execution.terminal = terminal;
    } catch (error: unknown) {
      const isAborted = execution.abortRequested;
      const terminal: SubAgentTerminalData = {
        executionId: execution.executionId,
        ...(execution.parentExecutionId === null
          ? {}
          : { parentExecutionId: execution.parentExecutionId }),
        endedAt: Date.now(),
        requestCount: execution.requestCount,
        usage: totalUsage(execution.agent.state.messages, execution.compactionUsages),
        errorCode: isAborted
          ? "SUBAGENT_ABORTED"
          : execution.timedOut
            ? "SUBAGENT_TIMEOUT"
            : failureCode(error),
      };
      await this.options.emit({
        type: isAborted ? HarnessEventType.SUBAGENT_ABORTED : HarnessEventType.SUBAGENT_FAILED,
        data: terminal,
      });
      execution.status = isAborted ? SubAgentStatus.ABORTED : SubAgentStatus.FAILED;
      execution.terminal = terminal;
    } finally {
      clearTimeout(execution.timer);
      execution.unsubscribe();
      execution.releaseSlot();
    }
  }

  private result(execution: Execution) {
    return { executionId: execution.executionId, status: execution.status, ...execution.terminal };
  }

  public async wait(
    parentExecutionId: string | null,
    input: WaitAgentsInput,
    signal?: AbortSignal,
  ) {
    const children = input.executionIds.map((id) => this.requireDirectChild(parentExecutionId, id));
    if (input.returnOn === "all") {
      await abortable(Promise.all(children.map((child) => child.completion)), signal);
    } else if (!children.some((child) => child.status !== SubAgentStatus.RUNNING)) {
      await abortable(Promise.race(children.map((child) => child.completion)), signal);
    }
    const ended = children.filter((child) => child.status !== SubAgentStatus.RUNNING);
    for (const child of ended) child.delivered = true;
    return {
      results: ended.map((child) => this.result(child)),
      running: children
        .filter((child) => child.status === SubAgentStatus.RUNNING)
        .map((child) => child.executionId),
    };
  }

  public async send(
    parentExecutionId: string | null,
    input: SendAgentMessageInput,
    signal?: AbortSignal,
  ) {
    signal?.throwIfAborted();
    const child = this.requireDirectChild(parentExecutionId, input.executionId);
    if (child.status !== SubAgentStatus.RUNNING)
      throw new Error("SUBAGENT_NOT_ACTIVE: 子 Agent 已结束");
    const message = {
      role: "user" as const,
      content: input.message,
      isInternal: true as const,
      timestamp: Date.now(),
    };
    if (input.delivery === "steer") {
      child.agent.steer(message);
      child.agent.abort();
    } else {
      child.agent.followUp(message);
    }
    return { executionId: input.executionId, delivered: input.delivery };
  }

  public async stop(parentExecutionId: string | null, executionId: string, signal?: AbortSignal) {
    signal?.throwIfAborted();
    const child = this.requireDirectChild(parentExecutionId, executionId);
    this.abortSubtree(executionId);
    await abortable(child.completion, signal);
    return this.result(child);
  }

  public async stopById(executionId: string): Promise<boolean> {
    const child = this.executions.get(executionId);
    if (child?.status !== SubAgentStatus.RUNNING) return false;
    this.abortSubtree(executionId);
    await child.completion;
    return true;
  }

  private abortSubtree(executionId: string): void {
    const child = this.executions.get(executionId);
    if (child === undefined) return;
    for (const descendant of child.children) this.abortSubtree(descendant);
    child.abortRequested = true;
    child.agent.abort();
  }

  public abortAll(): void {
    for (const executionId of this.rootChildren) this.abortSubtree(executionId);
  }

  public async waitForAll(): Promise<void> {
    await Promise.allSettled(
      [...this.executions.values()].map((execution) => execution.completion),
    );
  }

  public async join(
    parentExecutionId: string | null,
    agent: Agent,
    signal?: AbortSignal,
  ): Promise<void> {
    while (true) {
      signal?.throwIfAborted();
      const children = [...this.directChildren(parentExecutionId)].map((id) =>
        this.executions.get(id),
      );
      const active = children.filter(
        (child): child is Execution =>
          child !== undefined && child.status === SubAgentStatus.RUNNING,
      );
      await abortable(Promise.all(active.map((child) => child.completion)), signal);
      signal?.throwIfAborted();
      if (parentExecutionId !== null && this.executions.get(parentExecutionId)?.abortRequested)
        return;
      const undelivered = children.filter(
        (child): child is Execution => child !== undefined && !child.delivered,
      );
      if (undelivered.length === 0) return;
      for (const child of undelivered) child.delivered = true;
      const internalMessage = {
        role: "user",
        isInternal: true,
        timestamp: Date.now(),
        content: `子 Agent 结果：\n${undelivered.map((child) => JSON.stringify(this.result(child))).join("\n")}\n请综合这些结果继续完成任务。`,
      } as const;
      agent.followUp(internalMessage);
      await agent.continue();
    }
  }
}
