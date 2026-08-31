import assert from "node:assert/strict";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";
import { projectContext } from "@pi-harness/agent-runtime/context-pipeline";
import { ContextCompactionStrategy } from "@pi-harness/agent-runtime/harness-event";
import type { HarnessUserMessage } from "@pi-harness/agent-runtime/user-input";
import { SessionEventStore } from "@pi-harness/daemon/session-event-store";
import { createHarnessModels, loadBuiltInProvider } from "@pi-harness/providers";

function readRequiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

async function createLongTaskHistory(): Promise<{ messages: AgentMessage[]; source: string }> {
  const sessionsPath = process.env.PI_HARNESS_EVAL_SESSIONS_PATH?.trim();
  const sessionId = process.env.PI_HARNESS_EVAL_SESSION_ID?.trim();
  if ((sessionsPath === undefined) !== (sessionId === undefined)) {
    throw new Error("PI_HARNESS_EVAL_SESSIONS_PATH 与 PI_HARNESS_EVAL_SESSION_ID 必须同时提供");
  }
  const restoredMessages =
    sessionsPath === undefined || sessionId === undefined
      ? []
      : [...(await new SessionEventStore(sessionsPath).load(sessionId)).messages];
  const messages: AgentMessage[] = [
    ...restoredMessages,
    {
      content: [{ text: "初始决策是 DECISION-OLD-RED。", type: "text" }],
      role: "user",
      timestamp: 1,
    },
  ];
  for (let index = 0; index < 40; index += 1) {
    messages.push({
      content: [{ text: `实现阶段 ${index} ${"真实长任务上下文".repeat(80)}`, type: "text" }],
      role: "user",
      timestamp: index + 2,
    });
  }
  const attachmentMessage = {
    attachments: [{ mimeType: "text/markdown", name: "spec.md", size: 99 }],
    content: [
      {
        text: "用户纠正：DECISION-FINAL-BLUE 取代旧决策。附件规定 ATTACHMENT-SPEC-99。",
        type: "text",
      },
    ],
    displayText: "按附件修正",
    role: "user",
    timestamp: 100,
  } satisfies HarnessUserMessage;
  messages.push(attachmentMessage, {
    content: [{ text: "FAILURE-TIMEOUT-17：工具超时，尚未完成。", type: "text" }],
    isError: true,
    role: "toolResult",
    timestamp: 101,
    toolCallId: "live-failed-tool",
    toolName: "run_command",
  });
  for (let index = 0; index < 60; index += 1) {
    messages.push({
      content: [{ text: `后续阶段 ${index} ${"继续实现并记录状态".repeat(80)}`, type: "text" }],
      role: "user",
      timestamp: index + 102,
    });
  }
  return {
    messages,
    source: restoredMessages.length === 0 ? "built-in-long-task" : `session:${sessionId}`,
  };
}

const providerId = readRequiredEnvironment("PI_HARNESS_EVAL_PROVIDER");
const modelId = readRequiredEnvironment("PI_HARNESS_EVAL_MODEL");
const contextWindow = Number(process.env.PI_HARNESS_EVAL_CONTEXT_WINDOW ?? 12_000);
if (!Number.isSafeInteger(contextWindow) || contextWindow < 6_000) {
  throw new Error("PI_HARNESS_EVAL_CONTEXT_WINDOW 必须是至少 6000 的整数");
}

const provider = await loadBuiltInProvider(providerId);
const models = createHarnessModels([provider]);
if (!(await models.checkAuth(providerId))) {
  throw new Error(`Provider ${providerId} 未从环境变量获得有效认证`);
}
const sourceModel = models.getModel(providerId, modelId);
if (!sourceModel) throw new Error(`模型 ${providerId}/${modelId} 不存在`);
const model = {
  ...sourceModel,
  contextWindow,
  maxTokens: Math.min(sourceModel.maxTokens, 2_048),
} satisfies Model<Api>;

const history = await createLongTaskHistory();
const result = await projectContext({
  activeRunStartMessageIndex: 0,
  checkpoint: null,
  messages: history.messages,
  model,
  plan: null,
  sessionId: `live-eval-${Date.now()}`,
  streamFn: models.streamSimple.bind(models),
  systemPrompt: "评估真实 Provider 的长任务上下文压缩质量",
  todos: null,
  tools: [],
});
assert.ok(result.compacted, "真实长任务未触发压缩，请调低 PI_HARNESS_EVAL_CONTEXT_WINDOW");
assert.equal(result.compacted.compactionStrategy, ContextCompactionStrategy.MODEL);
const checkpoint = result.compacted.checkpoint;
assert.ok(checkpoint.decisions.some((item) => item.includes("DECISION-FINAL-BLUE")));
assert.ok(!checkpoint.decisions.some((item) => item.includes("DECISION-OLD-RED")));
assert.ok(JSON.stringify(checkpoint).includes("ATTACHMENT-SPEC-99"));
assert.ok(JSON.stringify(checkpoint).includes("FAILURE-TIMEOUT-17"));

process.stdout.write(
  `${JSON.stringify({
    afterTokens: result.compacted.afterTokens,
    beforeTokens: result.compacted.beforeTokens,
    model: `${providerId}/${modelId}`,
    passed: true,
    source: history.source,
  })}\n`,
);
