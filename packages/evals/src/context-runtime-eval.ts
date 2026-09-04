import assert from "node:assert/strict";
import { appendFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentMessage, StreamFn } from "@earendil-works/pi-agent-core";
import {
  type Api,
  type AssistantMessage,
  type Context,
  createAssistantMessageEventStream,
  type Model,
  type SimpleStreamOptions,
} from "@earendil-works/pi-ai";
import { shouldResetWorkingStateForNewRun } from "@pi-harness/agent-runtime";
import { projectContext } from "@pi-harness/agent-runtime/context-pipeline";
import {
  type ContextCompactedData,
  ContextCompactionReason,
  ContextCompactionStrategy,
  type HarnessEvent,
  HarnessEventType,
} from "@pi-harness/agent-runtime/harness-event";
import {
  type HarnessUserMessage,
  isHarnessUserMessage,
} from "@pi-harness/agent-runtime/user-input";
import { SessionEventStore } from "@pi-harness/daemon/session-event-store";
import { attachSuccessfulTodoEvidence, TodoStatus } from "@pi-harness/tools";

const SESSION_ID = "123e4567-e89b-42d3-a456-426614174000";
const model: Model<Api> = {
  api: "openai-responses",
  baseUrl: "https://example.invalid",
  contextWindow: 6_000,
  cost: { cacheRead: 0, cacheWrite: 0, input: 0, output: 0 },
  id: "context-runtime-eval",
  input: ["text"],
  maxTokens: 1_000,
  name: "Context Runtime Eval",
  provider: "openai",
  reasoning: false,
};

function createAssistantResponse(
  text: string,
  stopReason: AssistantMessage["stopReason"] = "stop",
) {
  return {
    api: model.api,
    content: [{ text, type: "text" }],
    model: model.id,
    provider: model.provider,
    role: "assistant",
    stopReason,
    timestamp: Date.now(),
    usage: {
      cacheRead: 0,
      cacheWrite: 0,
      cost: { cacheRead: 0, cacheWrite: 0, input: 0, output: 0, total: 0 },
      input: 100,
      output: 50,
      totalTokens: 150,
    },
  } satisfies AssistantMessage;
}

function createStreamFn(
  responses: readonly unknown[],
  observedOptions: SimpleStreamOptions[] = [],
  observedContexts: Context[] = [],
): StreamFn {
  let callIndex = 0;
  return (_model, context, options) => {
    observedContexts.push(context);
    if (options !== undefined) observedOptions.push(options);
    const response = createAssistantResponse(
      JSON.stringify(responses[Math.min(callIndex, responses.length - 1)]),
    );
    callIndex += 1;
    const stream = createAssistantMessageEventStream();
    queueMicrotask(() => stream.end(response));
    return stream;
  };
}

function createHistory(blocks: number, offset = 0): AgentMessage[] {
  const messages: AgentMessage[] = Array.from({ length: blocks }, (_, index) => ({
    content: [{ text: `历史阶段 ${offset + index} ${"长上下文".repeat(160)}`, type: "text" }],
    role: "user",
    timestamp: offset + index + 1,
  }));
  messages.push(
    {
      api: model.api,
      content: [
        {
          arguments: { path: "README.md" },
          id: `atomic-call-${offset}`,
          name: "read_file",
          type: "toolCall",
        },
      ],
      model: model.id,
      provider: model.provider,
      role: "assistant",
      stopReason: "toolUse",
      timestamp: offset + blocks + 1,
      usage: {
        cacheRead: 0,
        cacheWrite: 0,
        cost: { cacheRead: 0, cacheWrite: 0, input: 0, output: 0, total: 0 },
        input: 0,
        output: 0,
        totalTokens: 0,
      },
    },
    {
      content: [{ text: "README 内容", type: "text" }],
      isError: false,
      role: "toolResult",
      timestamp: offset + blocks + 2,
      toolCallId: `atomic-call-${offset}`,
      toolName: "read_file",
    },
  );
  return messages;
}

function createCheckpoint(overrides: Partial<ContextCompactedData> = {}): ContextCompactedData {
  return {
    afterTokens: 100,
    beforeTokens: 500,
    checkpoint: {
      blockers: [],
      completed: ["阶段完成"],
      constraints: ["必须保留 CANARY-42"],
      decisions: ["继续使用事件溯源"],
      nextAction: "继续下一阶段",
      objective: "验证 JSONL 恢复",
      pending: ["下一阶段"],
    },
    compactedMessageCount: 1,
    coveredMessageRange: { end: 1, start: 0 },
    sourceMessageCount: 1,
    ...overrides,
  };
}

function createEvent(seq: number, type: HarnessEvent["type"], data: unknown): HarnessEvent {
  return {
    data,
    id: `eval-event-${seq}`,
    seq,
    sessionId: SESSION_ID,
    timestamp: seq,
    type,
  };
}

async function evaluateJsonlRecovery(): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "pi-harness-context-eval-"));
  try {
    const first = createCheckpoint({ compactionId: "checkpoint-1" });
    const second = createCheckpoint({
      checkpoint: { ...first.checkpoint, nextAction: "运行重启恢复评估" },
      compactionId: "checkpoint-2",
      previousCompactionId: "checkpoint-1",
    });
    const writer = new SessionEventStore(directory);
    await writer.initialize();
    await writer.append(
      createEvent(1, HarnessEventType.MESSAGE_COMPLETED, {
        content: [{ text: "开始恢复评估", type: "text" }],
        role: "user",
        timestamp: 1,
      }),
    );
    await writer.append(createEvent(2, HarnessEventType.CONTEXT_COMPACTED, first));
    await writer.append(createEvent(3, HarnessEventType.CONTEXT_COMPACTED, second));
    await writer.append(
      createEvent(4, HarnessEventType.MESSAGE_COMPLETED, {
        content: [{ text: "恢复前的后续分支", type: "text" }],
        role: "user",
        timestamp: 4,
      }),
    );
    await writer.append(
      createEvent(5, HarnessEventType.CONTEXT_CHECKPOINT_RESTORED, { sourceEventSeq: 2 }),
    );

    const restarted = new SessionEventStore(directory);
    const restored = await restarted.load(SESSION_ID);
    assert.equal(restored.contextCheckpoint?.compactionId, "checkpoint-1");
    assert.equal(restored.contextCheckpointEventSeq, 2);
    assert.equal(restored.contextCheckpointHistory.length, 2);
    assert.equal(restored.contextCheckpointTailStartMessageIndex, 2);

    await appendFile(join(directory, `${SESSION_ID}.jsonl`), '{"crash":', "utf8");
    const afterCrash = await new SessionEventStore(directory).load(SESSION_ID);
    assert.equal(afterCrash.lastPersistedSeq, 5);
    assert.equal(afterCrash.contextCheckpoint?.compactionId, "checkpoint-1");
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

async function evaluateCompactionScenarios(): Promise<void> {
  assert.equal(
    shouldResetWorkingStateForNewRun(
      { plan: [{ status: "completed", step: "完成" }], updatedAt: 1 },
      {
        todos: [{ content: "完成", id: "done", status: TodoStatus.COMPLETED }],
        updatedAt: 1,
      },
    ),
    true,
  );
  assert.equal(
    shouldResetWorkingStateForNewRun(
      { plan: [{ status: "in_progress", step: "继续" }], updatedAt: 1 },
      null,
    ),
    true,
  );
  assert.equal(shouldResetWorkingStateForNewRun(null, null), false);
  const todoState = attachSuccessfulTodoEvidence(
    {
      todos: [{ content: "验证自动 evidence", id: "evidence", status: TodoStatus.COMPLETED }],
      updatedAt: 1,
    },
    ["successful-call"],
  );
  assert.deepEqual(todoState.todos[0]?.evidence, ["tool:successful-call"]);
  assert.throws(() =>
    attachSuccessfulTodoEvidence(
      {
        todos: [{ content: "验证拒绝无证据完成", id: "missing", status: TodoStatus.COMPLETED }],
        updatedAt: 1,
      },
      [],
    ),
  );

  const responses = [
    {
      blockers: [],
      completed: ["完成第一阶段"],
      constraints: ["必须保留 CANARY-42"],
      decisions: ["继续使用事件溯源"],
      nextAction: "继续第二阶段",
      objective: "验证长上下文连续性",
      pending: ["第二阶段"],
    },
    {
      blockers: ["FAILURE-TIMEOUT-17 仍需重试"],
      completed: ["完成第二阶段"],
      constraints: ["必须保留 CANARY-42"],
      decisions: ["DECISION-FINAL-BLUE"],
      nextAction: "输出评估结果",
      objective: "验证用户纠正与失败恢复",
      pending: ["重试失败工具"],
    },
  ] as const;
  const observedOptions: SimpleStreamOptions[] = [];
  const observedContexts: Context[] = [];
  const streamFn = createStreamFn(responses, observedOptions, observedContexts);
  const firstHistory = createHistory(14);
  const first = await projectContext({
    activeRunStartMessageIndex: 0,
    compactionReason: ContextCompactionReason.MILESTONE,
    checkpoint: null,
    messages: firstHistory,
    model,
    plan: null,
    sessionId: SESSION_ID,
    streamFn,
    systemPrompt: "评估上下文运行时",
    todos: null,
    tools: [],
  });
  assert.ok(first.compacted, "首次长上下文应触发压缩");
  assert.equal(first.compacted.compactionReason, ContextCompactionReason.MILESTONE);
  assert.equal(first.compacted.compactionStrategy, ContextCompactionStrategy.MODEL);
  assert.ok(first.compacted.beforeTokens > first.compacted.afterTokens);
  const firstCoveredEnd = first.compacted.coveredMessageRange?.end;
  if (firstCoveredEnd === undefined) throw new Error("首次压缩缺少消息范围");
  assert.equal(observedContexts[0]?.systemPrompt, "评估上下文运行时");
  assert.deepEqual(observedContexts[0]?.tools, []);
  assert.deepEqual(
    observedContexts[0]?.messages.slice(0, -1),
    firstHistory.slice(0, firstCoveredEnd),
  );

  const stableCheckpoint = createCheckpoint();
  const stableMessages: AgentMessage[] = [
    { content: [{ text: "已压缩的旧消息", type: "text" }], role: "user", timestamp: 1 },
    { content: [{ text: "保持稳定的热尾部", type: "text" }], role: "user", timestamp: 2 },
  ];
  const projectStableCheckpoint = (updatedAt: number) =>
    projectContext({
      activeRunStartMessageIndex: 1,
      checkpoint: stableCheckpoint,
      messages: stableMessages,
      model,
      plan: { plan: [{ status: "in_progress", step: "继续" }], updatedAt },
      sessionId: SESSION_ID,
      streamFn,
      systemPrompt: "评估上下文运行时",
      todos: null,
      tools: [],
    });
  assert.deepEqual(
    (await projectStableCheckpoint(1)).messages,
    (await projectStableCheckpoint(2)).messages,
  );

  const restoredProjection = await projectContext({
    activeRunStartMessageIndex: 2,
    checkpoint: createCheckpoint(),
    checkpointTailStartMessageIndex: 2,
    messages: [
      { content: [{ text: "旧 checkpoint 消息", type: "text" }], role: "user", timestamp: 1 },
      { content: [{ text: "已回退的后续分支", type: "text" }], role: "user", timestamp: 2 },
      { content: [{ text: "回退后的新请求", type: "text" }], role: "user", timestamp: 3 },
    ],
    model,
    plan: null,
    sessionId: SESSION_ID,
    streamFn,
    systemPrompt: "评估上下文运行时",
    todos: null,
    tools: [],
  });
  assert.ok(!JSON.stringify(restoredProjection.messages).includes("已回退的后续分支"));
  assert.ok(JSON.stringify(restoredProjection.messages).includes("回退后的新请求"));

  const attachmentMessage = {
    attachments: [{ mimeType: "text/markdown", name: "spec.md", size: 99 }],
    content: [
      {
        text: "用户纠正：DECISION-FINAL-BLUE 取代 DECISION-OLD-RED。附件约束 ATTACHMENT-SPEC-99。",
        type: "text",
      },
    ],
    displayText: "按附件修正方案",
    role: "user",
    timestamp: 500,
  } satisfies HarnessUserMessage;
  const failedToolMessages: AgentMessage[] = [
    {
      api: model.api,
      content: [
        {
          arguments: { command: "slow" },
          id: "failed-call",
          name: "run_command",
          type: "toolCall",
        },
      ],
      model: model.id,
      provider: model.provider,
      role: "assistant",
      stopReason: "toolUse",
      timestamp: 501,
      usage: {
        cacheRead: 0,
        cacheWrite: 0,
        cost: { cacheRead: 0, cacheWrite: 0, input: 0, output: 0, total: 0 },
        input: 0,
        output: 0,
        totalTokens: 0,
      },
    },
    {
      content: [{ text: "FAILURE-TIMEOUT-17", type: "text" }],
      isError: true,
      role: "toolResult",
      timestamp: 502,
      toolCallId: "failed-call",
      toolName: "run_command",
    },
  ];
  const secondHistory = [
    ...firstHistory,
    {
      content: [
        { text: "用户纠正：DECISION-FINAL-BLUE 取代 DECISION-OLD-RED。", type: "text" as const },
      ],
      role: "user" as const,
      timestamp: 499,
    },
    ...failedToolMessages,
    ...createHistory(12, 600),
    attachmentMessage,
  ];
  const second = await projectContext({
    activeRunStartMessageIndex: secondHistory.length - 1,
    checkpoint: first.compacted,
    messages: secondHistory,
    model,
    plan: null,
    sessionId: SESSION_ID,
    streamFn,
    systemPrompt: "评估上下文运行时",
    todos: null,
    tools: [],
  });
  assert.ok(second.compacted, "新增历史后应再次触发压缩");
  assert.ok(second.compacted.checkpoint.constraints.includes("必须保留 CANARY-42"));
  assert.deepEqual(second.compacted.checkpoint.decisions, ["DECISION-FINAL-BLUE"]);
  assert.ok(
    !second.compacted.checkpoint.decisions.some((item) => item.includes("DECISION-OLD-RED")),
  );
  assert.ok(
    second.compacted.checkpoint.blockers.some((item) => item.includes("FAILURE-TIMEOUT-17")),
  );
  assert.equal(second.compacted.previousCompactionId, first.compacted.compactionId);
  assert.ok(
    observedOptions.every(
      (options) => options.cacheRetention === "long" && options.sessionId === SESSION_ID,
    ),
  );
  assert.ok(second.messages.some((message) => isHarnessUserMessage(message)));

  const timeout = await projectContext({
    activeRunStartMessageIndex: secondHistory.length - 1,
    checkpoint: first.compacted,
    messages: secondHistory,
    model,
    plan: null,
    sessionId: SESSION_ID,
    streamFn: () => {
      throw new DOMException("compaction timed out", "TimeoutError");
    },
    systemPrompt: "评估上下文运行时",
    todos: null,
    tools: [],
  });
  assert.equal(timeout.compacted?.compactionStrategy, ContextCompactionStrategy.FALLBACK);
  assert.ok(timeout.compacted?.checkpoint.constraints.includes("必须保留 CANARY-42"));

  const atomicTail = first.messages.filter(
    (message) =>
      (message.role === "assistant" &&
        message.content.some((part) => part.type === "toolCall" && part.id === "atomic-call-0")) ||
      (message.role === "toolResult" && message.toolCallId === "atomic-call-0"),
  );
  assert.equal(atomicTail.length, 2);
}

await evaluateCompactionScenarios();
await evaluateJsonlRecovery();
process.stdout.write(
  `${JSON.stringify({
    attachments: true,
    corrections: true,
    failedTools: true,
    jsonlRestartRestore: true,
    promptCache: true,
    stableCheckpointPrefix: true,
    repeatedCompaction: true,
    taskBoundaryReset: true,
    timeoutFallback: true,
  })}\n`,
);
