import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { ToolRegistry } from "@pi-harness/tools";
import type { RunToolDefinition } from "../harness-event.js";

export function createRunToolSnapshot(
  registry: ToolRegistry,
  tools: readonly AgentTool[] = registry.tools,
): RunToolDefinition[] {
  return tools.map(({ description, name, parameters, label }) => ({
    description,
    name,
    parameters,
    displayName: label,
    source: registry.get(name)?.source ?? "built_in",
  }));
}
