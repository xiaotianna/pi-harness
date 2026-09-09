import type { ToolRegistry } from "@pi-harness/tools";
import type { RunToolDefinition } from "../harness-event.js";

export function createRunToolSnapshot(registry: ToolRegistry): RunToolDefinition[] {
  return registry.tools.map(({ description, name, parameters, label }) => ({
    description,
    name,
    parameters,
    displayName: label,
    source: registry.get(name)?.source ?? "built_in",
  }));
}
