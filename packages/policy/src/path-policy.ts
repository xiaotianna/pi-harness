import { isAbsolute, resolve } from "node:path";
import { invalidPath, PathPolicyError, PathPolicyErrorCode } from "./path-policy-error.js";
import { canonicalizePath, isPathWithin } from "./utils/path.js";

export interface ResolveWorkspacePathInput {
  allowMissing?: boolean;
  path: string;
  protectedPaths?: readonly string[];
  workspaceRoot: string;
}

/** 在审批前和执行前复用同一套真实路径检查，拒绝 workspace 与受保护数据越界。 */
export async function resolveWorkspacePath(input: ResolveWorkspacePathInput): Promise<string> {
  const requestedPath = input.path.trim();
  if (!requestedPath) throw invalidPath("路径不能为空");

  const workspaceRoot = await canonicalizePath(resolve(input.workspaceRoot), false);
  const addressedPath = isAbsolute(requestedPath)
    ? resolve(requestedPath)
    : resolve(workspaceRoot, requestedPath);

  if (!isPathWithin(workspaceRoot, addressedPath)) {
    throw new PathPolicyError(PathPolicyErrorCode.OUTSIDE_WORKSPACE, "拒绝访问 workspace 外部路径");
  }

  const target = await canonicalizePath(addressedPath, input.allowMissing ?? false);
  if (!isPathWithin(workspaceRoot, target)) {
    throw new PathPolicyError(
      PathPolicyErrorCode.OUTSIDE_WORKSPACE,
      "拒绝通过符号链接访问 workspace 外部路径",
    );
  }

  for (const protectedPath of input.protectedPaths ?? []) {
    const canonicalProtectedPath = await canonicalizePath(resolve(protectedPath), true);
    if (isPathWithin(canonicalProtectedPath, target)) {
      throw new PathPolicyError(PathPolicyErrorCode.PROTECTED, "拒绝访问 daemon 受保护数据");
    }
  }

  return target;
}
