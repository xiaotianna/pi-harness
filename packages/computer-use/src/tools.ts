import type { AgentTool } from "@earendil-works/pi-agent-core";
import { ToolPermission, type ToolPolicy } from "@pi-harness/policy";
import { Type } from "typebox";
import type { ComputerUseClient } from "./client.js";
import { ComputerActionKind, ComputerActionSchema, type ComputerObservation } from "./protocol.js";
import type { ComputerUseScriptRuntime } from "./script-runtime.js";

const ObserveParameters = Type.Object({
  app: Type.Optional(
    Type.String({
      description: "目标应用显示名称或 bundle ID；省略时观察当前前台应用",
      maxLength: 500,
      minLength: 1,
    }),
  ),
  includeScreenshot: Type.Optional(
    Type.Boolean({ description: "是否同时返回目标窗口截图，默认 true" }),
  ),
});

const ActParameters = Type.Object({
  action: ComputerActionSchema,
  observationId: Type.String({
    description: "最近一次 computer_observe 返回的 observationId",
    maxLength: 200,
    minLength: 1,
  }),
});

export const ComputerExecParametersSchema = Type.Object({
  app: Type.String({
    description: "目标应用的准确 bundle ID",
    maxLength: 500,
    minLength: 3,
  }),
  appName: Type.Optional(
    Type.String({ description: "用于审批界面显示的应用名称", maxLength: 200, minLength: 1 }),
  ),
  code: Type.String({
    description:
      "在持久化受限 JavaScript 环境中执行的代码。先 await cua.observe()，再使用 cua.press({elementId})、performAction({elementId,action})、setValue({elementId,value})、click({point,button?})、typeText(text)、pressKey({key,modifiers?})、scroll({point,deltaX,deltaY})、drag({from,to,durationMs?}) 或 wait(ms)。所有异步调用必须 await；没有 cua.find、cua.elements 或 setTimeout。",
    maxLength: 20_000,
    minLength: 1,
  }),
});

export const computerObservePolicy = {
  allowInFullAccess: true,
  allowRepeatedCalls: true,
  permission: ToolPermission.USER_APPROVAL,
  resolveGrant: (args: unknown) => {
    const target =
      typeof args === "object" && args !== null && "app" in args && typeof args.app === "string"
        ? args.app
        : "当前前台窗口";
    return {
      allowSession: false,
      fingerprint: `computer_observe:${target}`,
      risk: "该操作会读取目标窗口的可访问性结构，并可能截取窗口画面。",
      summary: "观察本机应用窗口",
      target,
    };
  },
} as const satisfies ToolPolicy;

export const computerActPolicy = {
  allowInFullAccess: true,
  permission: ToolPermission.USER_APPROVAL,
  resolveGrant: (args: unknown) => ({
    allowSession: false,
    fingerprint: `computer_act:${JSON.stringify(args)}`,
    risk: "该操作会向已观察的目标应用发送点击、键盘、滚动或可访问性动作，可能更改应用数据。",
    summary: "操作已观察的应用窗口",
    target: "已观察的应用窗口",
  }),
} as const satisfies ToolPolicy;

export type ComputerObservationDetails = Omit<ComputerObservation, "screenshot"> & {
  hasScreenshot: boolean;
};

function observationText(observation: ComputerObservation): string {
  const frame = observation.screenshotFrame;
  return JSON.stringify({
    accessibilityTree: observation.accessibilityTree,
    application: observation.application,
    observedAt: observation.observedAt,
    observationId: observation.observationId,
    screenshotFrame: frame,
    truncated: observation.truncated,
    windowId: observation.windowId,
    windowTitle: observation.windowTitle,
  });
}

export function createComputerObserveTool(
  client: ComputerUseClient,
  scopeId: string,
): AgentTool<typeof ObserveParameters, ComputerObservationDetails> {
  return {
    description:
      "观察指定 Mac 应用或当前前台窗口，返回一张静态截图和带稳定元素编号的 Accessibility Tree。执行动作后必须重新观察。",
    executionMode: "sequential",
    label: "Observe computer",
    name: "computer_observe",
    parameters: ObserveParameters,
    async execute(_toolCallId, input, signal) {
      const observation = await client.observe(
        scopeId,
        {
          ...(input.app === undefined ? {} : { app: input.app }),
          ...(input.includeScreenshot === undefined
            ? {}
            : { includeScreenshot: input.includeScreenshot }),
        },
        signal,
      );
      const { screenshot, ...observationDetails } = observation;
      const details: ComputerObservationDetails = {
        ...observationDetails,
        hasScreenshot: screenshot !== undefined,
      };
      return {
        content: [
          ...(screenshot === undefined ? [] : [screenshot]),
          { text: observationText(observation), type: "text" as const },
        ],
        details,
      };
    },
  };
}

export function createComputerActTool(
  client: ComputerUseClient,
  scopeId: string,
): AgentTool<typeof ActParameters, { observationId: string; performedAt: number }> {
  return {
    description: `操作已观察的 Mac 应用。优先使用 ${ComputerActionKind.PRESS}/${ComputerActionKind.SET_VALUE}/${ComputerActionKind.PERFORM_ACTION} 的元素编号；坐标使用 Accessibility Tree 中的全局逻辑坐标。动作完成后调用 computer_observe。`,
    executionMode: "sequential",
    label: "Control computer",
    name: "computer_act",
    parameters: ActParameters,
    async execute(_toolCallId, input, signal) {
      const result = await client.act(scopeId, input.observationId, input.action, signal);
      return {
        content: [{ text: JSON.stringify(result), type: "text" }],
        details: result,
      };
    },
  };
}

export function createComputerExecTool(
  runtime: ComputerUseScriptRuntime,
): AgentTool<
  typeof ComputerExecParametersSchema,
  { hasObservation: boolean; logs: readonly string[]; result: unknown }
> {
  return {
    description:
      "在受限且跨调用保持状态的 JavaScript 环境中控制一个已授权的 Mac 应用。先 await cua.observe()，从 accessibilityTree 字符串读取数字元素编号，再使用参数对象调用 cua.press/performAction/setValue 等动作；所有异步调用必须 await。每个动作自动重新观察。脚本不能访问 Node、Shell、文件系统或网络。",
    executionMode: "sequential",
    label: "Run computer script",
    name: "computer_exec",
    parameters: ComputerExecParametersSchema,
    async execute(_toolCallId, input, signal) {
      const result = await runtime.execute(input.app, input.code, signal);
      const observation = result.observation;
      const text = JSON.stringify({
        logs: result.logs,
        observation:
          observation === undefined
            ? undefined
            : {
                accessibilityTree: observation.accessibilityTree,
                application: observation.application,
                observedAt: observation.observedAt,
                observationId: observation.observationId,
                screenshotFrame: observation.screenshotFrame,
                truncated: observation.truncated,
                windowId: observation.windowId,
                windowTitle: observation.windowTitle,
              },
        result: result.result,
      });
      return {
        content: [
          ...(observation?.screenshot === undefined ? [] : [observation.screenshot]),
          { text, type: "text" as const },
        ],
        details: {
          hasObservation: observation !== undefined,
          logs: result.logs,
          result: result.result,
        },
      };
    },
  };
}
