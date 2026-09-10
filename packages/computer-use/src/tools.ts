import type { AgentTool } from "@earendil-works/pi-agent-core";
import { ToolPermission, type ToolPolicy } from "@pi-harness/policy";
import { Type } from "typebox";
import type { ComputerUseClient } from "./client.js";
import { ComputerActionKind, ComputerActionSchema, type ComputerObservation } from "./protocol.js";

const ObserveParameters = Type.Object({
  includeScreenshot: Type.Optional(
    Type.Boolean({ description: "是否同时返回当前前台窗口截图，默认 true" }),
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

export const computerObservePolicy = {
  allowInFullAccess: true,
  permission: ToolPermission.USER_APPROVAL,
  resolveGrant: () => ({
    allowSession: true,
    fingerprint: "computer_observe:current_foreground_window",
    risk: "该操作会读取当前前台窗口的可访问性结构，并可能截取窗口画面。",
    summary: "观察当前前台窗口",
    target: "当前前台窗口",
  }),
} as const satisfies ToolPolicy;

export const computerActPolicy = {
  allowInFullAccess: true,
  permission: ToolPermission.USER_APPROVAL,
  resolveGrant: () => ({
    allowSession: true,
    fingerprint: "computer_act:current_foreground_window",
    risk: "该操作会向当前前台应用发送点击、键盘、滚动或可访问性动作，可能更改应用数据。",
    summary: "操作当前前台窗口",
    target: "当前前台窗口",
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
      "观察 Mac 当前前台窗口，返回一张静态截图和带稳定元素编号的 Accessibility Tree。执行动作后必须重新观察。",
    executionMode: "sequential",
    label: "Observe computer",
    name: "computer_observe",
    parameters: ObserveParameters,
    async execute(_toolCallId, input, signal) {
      const observation = await client.observe(
        scopeId,
        input.includeScreenshot === undefined ? {} : { includeScreenshot: input.includeScreenshot },
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
    description: `操作 Mac 当前前台窗口。优先使用 ${ComputerActionKind.PRESS}/${ComputerActionKind.SET_VALUE} 的元素编号；坐标使用 Accessibility Tree 中的全局逻辑坐标。动作完成后调用 computer_observe。`,
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
