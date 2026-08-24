import { Agent, type AgentMessage, type StreamFn } from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";
import type { SessionId } from "./harness-event.js";

export interface CreateAgentInput {
  messages: readonly AgentMessage[];
  model: Model<Api>;
  sessionId: SessionId;
  streamFn: StreamFn;
  systemPrompt: string;
}

/** 创建第一阶段的无工具 Agent；Tool、Policy 与 Context hook 在后续阶段注入。 */
export function createAgent(input: CreateAgentInput): Agent {
  return new Agent({
    initialState: {
      messages: [...input.messages],
      model: input.model,
      systemPrompt: input.systemPrompt,
      thinkingLevel: "off",
      tools: [],
    },
    sessionId: input.sessionId,
    streamFn: input.streamFn,
    toolExecution: "parallel",
  });
}
