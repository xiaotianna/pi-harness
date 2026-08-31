import { ToolPermission } from "@pi-harness/policy";
import type { WorkspaceToolContext } from "./lib/tool-context.js";
import { type ToolRegistration, ToolRegistry } from "./lib/tool-registry.js";
import { SkillRegistry } from "./skill-registry.js";
import { createFindSkillTool } from "./skills/find-skill.js";
import { createGetSkillTool } from "./skills/get-skill.js";
import { createLoadSkillTool } from "./skills/load-skill.js";
import { createSkillCreatorTool, skillCreatorToolPolicy } from "./skills/skill-creator.js";
import {
  createResetWorkingStateTool,
  createRestoreContextCheckpointTool,
  createSearchSessionHistoryTool,
} from "./tools/context-runtime.js";
import { createEditFileTool } from "./tools/edit-file.js";
import { createListFilesTool } from "./tools/list-files.js";
import { createUpdatePlanTool } from "./tools/planner.js";
import { createReadDocumentTool } from "./tools/read-document.js";
import { createReadFileTool } from "./tools/read-file.js";
import { createRunCommandTool } from "./tools/run-command.js";
import { createSearchTextTool } from "./tools/search-text.js";
import { createUpdateTodosTool } from "./tools/todos.js";
import { createViewImageTool } from "./tools/view-image.js";
import { createViewPdfPageTool } from "./tools/view-pdf-page.js";
import { createWriteFileTool } from "./tools/write-file.js";

const BUILT_IN_SOURCE = "built_in";
const DEFAULT_TOOL_TIMEOUT_MS = 30_000;
const DOCUMENT_TOOL_TIMEOUT_MS = 60_000;
const RUN_COMMAND_TIMEOUT_MS = 610_000;

export function createWorkspaceToolRegistry(context: WorkspaceToolContext): ToolRegistry {
  const readOnlyPolicy = { permission: ToolPermission.READ_ONLY } as const;
  const skillRegistry = new SkillRegistry(context);
  const builtInTools: ToolRegistration[] = [
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
      tool: createViewImageTool(context),
    },
    {
      policy: readOnlyPolicy,
      source: BUILT_IN_SOURCE,
      timeoutMs: DOCUMENT_TOOL_TIMEOUT_MS,
      tool: createReadDocumentTool(context),
    },
    {
      policy: readOnlyPolicy,
      source: BUILT_IN_SOURCE,
      timeoutMs: DOCUMENT_TOOL_TIMEOUT_MS,
      tool: createViewPdfPageTool(context),
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
        risk: "该操作会修改 workspace 内的文件内容。",
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
        risk: "该操作会修改 workspace 内的文件内容。",
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
  ];
  const builtInSkills: ToolRegistration[] = [
    {
      policy: readOnlyPolicy,
      source: BUILT_IN_SOURCE,
      timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
      tool: createFindSkillTool(skillRegistry),
    },
    {
      policy: readOnlyPolicy,
      source: BUILT_IN_SOURCE,
      timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
      tool: createGetSkillTool(skillRegistry),
    },
    {
      policy: readOnlyPolicy,
      source: BUILT_IN_SOURCE,
      timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
      tool: createLoadSkillTool(skillRegistry),
    },
    {
      policy: skillCreatorToolPolicy,
      source: BUILT_IN_SOURCE,
      timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
      tool: createSkillCreatorTool(skillRegistry),
    },
  ];
  const controlTools: ToolRegistration[] = [
    ...(context.onSessionHistorySearched === undefined
      ? []
      : [
          {
            policy: readOnlyPolicy,
            source: BUILT_IN_SOURCE,
            timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
            tool: createSearchSessionHistoryTool(context.onSessionHistorySearched),
          },
        ]),
    ...(context.onPlanUpdated === undefined
      ? []
      : [
          {
            policy: readOnlyPolicy,
            source: BUILT_IN_SOURCE,
            timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
            tool: createUpdatePlanTool(context.onPlanUpdated),
          },
        ]),
    ...(context.onTodosUpdated === undefined
      ? []
      : [
          {
            policy: readOnlyPolicy,
            source: BUILT_IN_SOURCE,
            timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
            tool: createUpdateTodosTool(context.onTodosUpdated),
          },
        ]),
    ...(context.onContextCheckpointRestored === undefined
      ? []
      : [
          {
            policy: readOnlyPolicy,
            source: BUILT_IN_SOURCE,
            timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
            tool: createRestoreContextCheckpointTool(context.onContextCheckpointRestored),
          },
        ]),
    ...(context.onWorkingStateReset === undefined
      ? []
      : [
          {
            policy: readOnlyPolicy,
            source: BUILT_IN_SOURCE,
            timeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
            tool: createResetWorkingStateTool(context.onWorkingStateReset),
          },
        ]),
  ];
  return new ToolRegistry([...builtInTools, ...builtInSkills, ...controlTools]);
}
