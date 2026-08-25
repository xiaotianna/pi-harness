import { Agent, type AgentMessage, type StreamFn } from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";
import { createWorkspaceTools } from "@pi-harness/tools";
import type { SessionId } from "./harness-event.js";

export interface CreateAgentInput {
  messages: readonly AgentMessage[];
  model: Model<Api>;
  protectedPaths: readonly string[];
  sessionId: SessionId;
  systemPrompt: string;
  streamFn: StreamFn;
  workspaceRoot: string;
}

export function createAgent(input: CreateAgentInput): Agent {
  return new Agent({
    // agent当前的数据
    initialState: {
      // 从 Session JSONL 恢复的历史消息
      messages: [...input.messages],
      // 本次要使用的模型定义
      model: input.model,
      systemPrompt: input.systemPrompt,
      tools: createWorkspaceTools({
        protectedPaths: input.protectedPaths,
        workspaceRoot: input.workspaceRoot,
      }),
    },
    // 把 Agent 绑定到 Session
    sessionId: input.sessionId,
    // 真正发送模型请求函数
    streamFn: input.streamFn,
    // parallel并行执行工具，设置为默认并行，但是工具可以设置自己的executionMode
    toolExecution: "parallel",
  });
}
