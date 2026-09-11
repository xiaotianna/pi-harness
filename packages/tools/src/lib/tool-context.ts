import type { SandboxCredential } from "@pi-harness/policy";
import { resolveWorkspacePath } from "@pi-harness/policy";
import type { SkillDefinition } from "../skills/types.js";
import type {
  ContextCheckpointRestoreHandler,
  SessionHistorySearchHandler,
  WorkingStateResetHandler,
} from "../tools/context-runtime.js";
import type { PlanUpdateHandler } from "../tools/planner.js";
import type { UserInputRequestHandler } from "../tools/request-user-input.js";
import type { TodoUpdateHandler } from "../tools/todos.js";
import type { FileChangeDetails } from "../utils/file.js";

// 保存固定的 globalRoot、workspaceRoot 和受保护路径。
export interface WorkspaceToolContext {
  getRegisteredGlobalSkills?: () => readonly SkillDefinition[];
  getSandboxCredentials?: () => readonly SandboxCredential[];
  globalRoot: string;
  isSkillEnabled?: (directory: string) => boolean;
  onContextCheckpointRestored?: ContextCheckpointRestoreHandler;
  onCommandFileChangesDetected?: (input: {
    changes: readonly FileChangeDetails[];
    toolCallId: string;
  }) => void;
  onHostExecutionRequested?: (
    input: {
      command: string;
      changedFileCount: number;
      reason: string;
      toolCallId: string;
    },
    signal?: AbortSignal,
  ) => Promise<boolean>;
  onPlanUpdated?: PlanUpdateHandler;
  onNetworkAccessRequested?: (
    input: { host: string; port?: number; toolCallId: string },
    signal?: AbortSignal,
  ) => Promise<boolean>;
  onUserInputRequested?: UserInputRequestHandler;
  onSessionHistorySearched?: SessionHistorySearchHandler;
  onTodosUpdated?: TodoUpdateHandler;
  onWorkingStateReset?: WorkingStateResetHandler;
  protectedPaths?: readonly string[];
  skillGatewayToken?: string;
  skillGatewayUrl?: string;
  webSearchUrl: string;
  supportsImageInput?: () => boolean;
  workspaceRoot: string;
}

// 调用 Policy 校验路径，阻止访问 workspace 外部或 daemon 私有目录。
export async function resolveToolPath(
  context: WorkspaceToolContext,
  path: string,
  allowMissing = false,
): Promise<string> {
  return resolveWorkspacePath({
    ...(allowMissing ? { allowMissing: true } : {}),
    path,
    ...(context.protectedPaths === undefined ? {} : { protectedPaths: context.protectedPaths }),
    workspaceRoot: context.workspaceRoot,
  });
}
