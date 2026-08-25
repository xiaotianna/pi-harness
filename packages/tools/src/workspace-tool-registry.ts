import { ToolPermission } from "@pi-harness/policy";
import type { WorkspaceToolContext } from "./lib/tool-context.js";
import { ToolRegistry } from "./lib/tool-registry.js";
import { createEditFileTool } from "./tools/edit-file.js";
import { createListFilesTool } from "./tools/list-files.js";
import { createReadFileTool } from "./tools/read-file.js";
import { createRunCommandTool } from "./tools/run-command.js";
import { createSearchTextTool } from "./tools/search-text.js";
import { createWriteFileTool } from "./tools/write-file.js";

const BUILT_IN_SOURCE = "built_in";
const DEFAULT_TOOL_TIMEOUT_MS = 30_000;
const RUN_COMMAND_TIMEOUT_MS = 610_000;

export function createWorkspaceToolRegistry(context: WorkspaceToolContext): ToolRegistry {
  const readOnlyPolicy = { permission: ToolPermission.READ_ONLY } as const;
  return new ToolRegistry([
    {
      policy: readOnlyPolicy,
      source: BUILT_IN_SOURCE,
      timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
      tool: createReadFileTool(context),
    },
    {
      policy: readOnlyPolicy,
      source: BUILT_IN_SOURCE,
      timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
      tool: createListFilesTool(context),
    },
    {
      policy: readOnlyPolicy,
      source: BUILT_IN_SOURCE,
      timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
      tool: createSearchTextTool(context),
    },
    {
      policy: {
        allowMissing: false,
        permission: ToolPermission.WORKSPACE_WRITE,
        summary: "修改现有文件",
      },
      source: BUILT_IN_SOURCE,
      timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
      tool: createEditFileTool(context),
    },
    {
      policy: {
        allowMissing: true,
        permission: ToolPermission.WORKSPACE_WRITE,
        summary: "创建或覆盖文件",
      },
      source: BUILT_IN_SOURCE,
      timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
      tool: createWriteFileTool(context),
    },
    {
      policy: { permission: ToolPermission.SHELL },
      source: BUILT_IN_SOURCE,
      timeoutMs: RUN_COMMAND_TIMEOUT_MS,
      tool: createRunCommandTool(context),
    },
  ]);
}
