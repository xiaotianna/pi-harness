import type { AgentTool } from "@earendil-works/pi-agent-core";
import { createEditFileTool } from "./edit-file.js";
import { createListFilesTool } from "./list-files.js";
import { createReadFileTool } from "./read-file.js";
import { createRunCommandTool } from "./run-command.js";
import { createSearchTextTool } from "./search-text.js";
import type { WorkspaceToolContext } from "../lib/tool-context.js";
import { createWriteFileTool } from "./write-file.js";

export function createWorkspaceTools(context: WorkspaceToolContext): AgentTool[] {
  return [
    createReadFileTool(context),
    createListFilesTool(context),
    createSearchTextTool(context),
    createEditFileTool(context),
    createWriteFileTool(context),
    createRunCommandTool(context),
  ];
}

export { createEditFileTool } from "./edit-file.js";
export { createListFilesTool } from "./list-files.js";
export { createReadFileTool } from "./read-file.js";
export { createRunCommandTool } from "./run-command.js";
export { createSearchTextTool } from "./search-text.js";
export type { WorkspaceToolContext } from "../lib/tool-context.js";
export type { FileChangeDetails } from "../utils/file.js";
export { createWriteFileTool } from "./write-file.js";
