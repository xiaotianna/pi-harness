import type { AgentTool } from "@earendil-works/pi-agent-core";
import { ToolPermission } from "@pi-harness/policy";
import { type Static, Type } from "typebox";
import type { ToolRegistration } from "../lib/tool-registry.js";

// 子agent类型
export const SubAgentType = {
  EXPLORER: "explorer", // 负责调查，例如搜索代码、读取文件、整理发现；不能改文件或运行 Shell 命令
  WORKER: "worker", // 负责执行任务，例如修改代码；但每次操作仍要遵守当前工作区的权限和审批规则
} as const;
export type SubAgentType = (typeof SubAgentType)[keyof typeof SubAgentType];

// 决定给正在运行的子 Agent 发新消息时，怎么处理它当前的工作
export const SubAgentDelivery = {
  FOLLOW_UP: "follow_up", // 让它完成当前这一轮，再处理新消息
  STEER: "steer", // 让它停下当前这一轮，按新消息调整方向
} as const;
export type SubAgentDelivery =
  (typeof SubAgentDelivery)[keyof typeof SubAgentDelivery];

// 决定 wait_agents 等到什么时候返回
export const SubAgentWaitReturn = {
  ALL: "all", // 指定的子 Agent 全部结束才返回
  ANY: "any", // 指定的子 Agent 中至少一个结束就返回，同时告诉你哪些已结束、哪些仍在运行
} as const;
export type SubAgentWaitReturn =
  (typeof SubAgentWaitReturn)[keyof typeof SubAgentWaitReturn];

const ExecutionIdSchema = Type.String({ maxLength: 64, minLength: 1 });
const SpawnAgentParameters = Type.Object({
  agentType: Type.Union([
    Type.Literal(SubAgentType.EXPLORER),
    Type.Literal(SubAgentType.WORKER),
  ]),
  modelId: Type.Optional(Type.String({ maxLength: 256, minLength: 1 })),
  name: Type.String({ maxLength: 80, minLength: 1 }),
  task: Type.String({ maxLength: 8_000, minLength: 1 }),
});
const WaitAgentsParameters = Type.Object({
  executionIds: Type.Array(ExecutionIdSchema, {
    minItems: 1,
    uniqueItems: true,
  }),
  returnOn: Type.Union([
    Type.Literal(SubAgentWaitReturn.ALL),
    Type.Literal(SubAgentWaitReturn.ANY),
  ]),
});
const SendAgentMessageParameters = Type.Object({
  delivery: Type.Union([
    Type.Literal(SubAgentDelivery.STEER),
    Type.Literal(SubAgentDelivery.FOLLOW_UP),
  ]),
  executionId: ExecutionIdSchema,
  message: Type.String({ maxLength: 8_000, minLength: 1 }),
});
const StopAgentParameters = Type.Object({ executionId: ExecutionIdSchema });

export type SpawnAgentInput = Static<typeof SpawnAgentParameters>;
export type WaitAgentsInput = Static<typeof WaitAgentsParameters>;
export type SendAgentMessageInput = Static<typeof SendAgentMessageParameters>;
export type StopAgentInput = Static<typeof StopAgentParameters>;

export interface SubAgentToolHandlers {
  // 创建子 Agent
  spawn(
    toolCallId: string,
    input: SpawnAgentInput,
    signal?: AbortSignal,
  ): Promise<unknown>;
  // 等待指定子 Agent 完成
  wait(input: WaitAgentsInput, signal?: AbortSignal): Promise<unknown>;
  // 给运行中的子 Agent 发消息
  send(input: SendAgentMessageInput, signal?: AbortSignal): Promise<unknown>;
  // 停止子 Agent
  stop(input: StopAgentInput, signal?: AbortSignal): Promise<unknown>;
}

function asToolResult(result: unknown) {
  return {
    content: [{ text: JSON.stringify(result), type: "text" as const }],
    details: result,
  };
}

export function createSubAgentToolRegistrations(
  handlers: SubAgentToolHandlers,
): readonly ToolRegistration[] {
  const tools = [
    {
      description:
        "委派明确且独立的任务给子 Agent。explorer 只读取，worker 可按当前权限执行修改。返回 executionId 后子任务继续运行。",
      executionMode: "parallel",
      label: "Spawn agent",
      name: "spawn_agent",
      parameters: SpawnAgentParameters,
      async execute(
        toolCallId: string,
        input: SpawnAgentInput,
        signal?: AbortSignal,
      ) {
        return asToolResult(await handlers.spawn(toolCallId, input, signal));
      },
    },
    {
      description:
        "等待指定的直接子 Agent 完成。executionIds 必须使用 spawn_agent 返回的原始 ID；若 ID 写错，请用原 ID 重试，不要重新创建子任务。all 等待全部，any 等待至少一个。",
      executionMode: "parallel",
      label: "Wait for agents",
      name: "wait_agents",
      parameters: WaitAgentsParameters,
      async execute(
        _toolCallId: string,
        input: WaitAgentsInput,
        signal?: AbortSignal,
      ) {
        return asToolResult(await handlers.wait(input, signal));
      },
    },
    {
      description:
        "向正在运行的直接子 Agent 发送新指令。steer 中断当前轮，follow_up 排入后续轮。",
      executionMode: "parallel",
      label: "Message agent",
      name: "send_agent_message",
      parameters: SendAgentMessageParameters,
      async execute(
        _toolCallId: string,
        input: SendAgentMessageInput,
        signal?: AbortSignal,
      ) {
        return asToolResult(await handlers.send(input, signal));
      },
    },
    {
      description: "停止一个直接子 Agent 及其后代。",
      executionMode: "parallel",
      label: "Stop agent",
      name: "stop_agent",
      parameters: StopAgentParameters,
      async execute(
        _toolCallId: string,
        input: StopAgentInput,
        signal?: AbortSignal,
      ) {
        return asToolResult(await handlers.stop(input, signal));
      },
    },
  ];
  const waitTimeoutMs = 31 * 60_000;
  return tools.map((tool) => ({
    policy: { permission: ToolPermission.READ_ONLY },
    source: "built_in",
    timeoutMs: tool.name === "wait_agents" ? waitTimeoutMs : 30_000,
    tool: tool as unknown as AgentTool,
  }));
}
