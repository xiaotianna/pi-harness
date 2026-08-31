import { resolveWorkspacePath } from "@pi-harness/policy";
import type {
  ContextCheckpointRestoreHandler,
  SessionHistorySearchHandler,
  WorkingStateResetHandler,
} from "../tools/context-runtime.js";
import type { PlanUpdateHandler } from "../tools/planner.js";
import type { TodoUpdateHandler } from "../tools/todos.js";

// 保存固定的 globalRoot、workspaceRoot 和受保护路径。
export interface WorkspaceToolContext {
  globalRoot: string;
  isSkillEnabled?: (directory: string) => boolean;
  onContextCheckpointRestored?: ContextCheckpointRestoreHandler;
  onPlanUpdated?: PlanUpdateHandler;
  onSessionHistorySearched?: SessionHistorySearchHandler;
  onTodosUpdated?: TodoUpdateHandler;
  onWorkingStateReset?: WorkingStateResetHandler;
  protectedPaths?: readonly string[];
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
