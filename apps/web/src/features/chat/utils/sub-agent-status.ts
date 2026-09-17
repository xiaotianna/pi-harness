import { HarnessEventType, SubAgentStatus } from "@pi-harness/agent-runtime/harness-event";

export const SUB_AGENT_STATUS_LABEL = {
  [SubAgentStatus.RUNNING]: "运行中",
  [SubAgentStatus.COMPLETED]: "已完成",
  [SubAgentStatus.FAILED]: "失败",
  [SubAgentStatus.ABORTED]: "已中止",
} as const;

export function subAgentStatusFromTerminal(type: HarnessEventType | undefined): SubAgentStatus {
  if (type === HarnessEventType.SUBAGENT_COMPLETED) return SubAgentStatus.COMPLETED;
  if (type === HarnessEventType.SUBAGENT_FAILED) return SubAgentStatus.FAILED;
  if (type === HarnessEventType.SUBAGENT_ABORTED) return SubAgentStatus.ABORTED;
  return SubAgentStatus.RUNNING;
}
