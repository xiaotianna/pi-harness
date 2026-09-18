import type { SubAgentStartedData, SubAgentStatus } from "@pi-harness/agent-runtime/harness-event";

export type SubAgentListAgent = SubAgentStartedData & { status: SubAgentStatus };

export interface SubAgentTreeNode {
  agent: SubAgentListAgent;
  children: SubAgentTreeNode[];
}

export function buildSubAgentTree(agents: readonly SubAgentListAgent[]): SubAgentTreeNode[] {
  const nodes = new Map<string, SubAgentTreeNode>();
  for (const agent of agents) nodes.set(agent.executionId, { agent, children: [] });
  const roots: SubAgentTreeNode[] = [];

  for (const agent of agents) {
    const node = nodes.get(agent.executionId);
    if (!node) continue;
    const parent = agent.parentExecutionId ? nodes.get(agent.parentExecutionId) : undefined;
    if (parent && parent !== node && parent.agent.parentExecutionId !== agent.executionId) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
