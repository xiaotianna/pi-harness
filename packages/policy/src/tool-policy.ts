import { stat } from "node:fs/promises";
import { relative } from "node:path";
import { resolveWorkspacePath } from "./path-policy.js";

// 工具审批决策
export const ToolPolicyDecision = {
  ALLOW: "allow", // 自动允许
  ASK: "ask", // 请求用户审批
  DENY: "deny", // 直接拒绝
} as const;

export type ToolPolicyDecision = (typeof ToolPolicyDecision)[keyof typeof ToolPolicyDecision];

// 工具权限
export const ToolPermission = {
  READ_ONLY: "read_only", // 只读工具，自动放行
  WORKSPACE_WRITE: "workspace_write", // 修改 workspace 内文件的工具，需要用户审批
  SHELL: "shell", // 执行 Shell 命令的工具，需要用户审批
} as const;

export type ToolPolicy =
  | { permission: typeof ToolPermission.READ_ONLY }
  | { permission: typeof ToolPermission.SHELL }
  | {
      allowMissing: boolean;
      permission: typeof ToolPermission.WORKSPACE_WRITE;
      summary: string;
    };

export type ToolPolicyResult =
  | { decision: typeof ToolPolicyDecision.ALLOW }
  | { decision: typeof ToolPolicyDecision.DENY; reason: string }
  | {
      decision: typeof ToolPolicyDecision.ASK;
      fingerprint: string;
      risk: string;
      summary: string;
      target: string;
    };

export interface EvaluateToolCallInput {
  arguments: unknown;
  policy: ToolPolicy | undefined;
  protectedPaths?: readonly string[];
  workspaceRoot: string;
}

function readStringArgument(argumentsValue: unknown, name: string): string | null {
  if (typeof argumentsValue !== "object" || argumentsValue === null || !(name in argumentsValue)) {
    return null;
  }
  const value = (argumentsValue as Record<string, unknown>)[name];
  return typeof value === "string" ? value : null;
}

async function resolveTarget(
  input: EvaluateToolCallInput,
  path: string,
  allowMissing: boolean,
): Promise<{ fingerprint: string; target: string }> {
  const policyInput = {
    ...(allowMissing ? { allowMissing: true } : {}),
    path,
    ...(input.protectedPaths === undefined ? {} : { protectedPaths: input.protectedPaths }),
    workspaceRoot: input.workspaceRoot,
  };
  const [workspaceRoot, target] = await Promise.all([
    resolveWorkspacePath({ ...policyInput, allowMissing: false, path: "." }),
    resolveWorkspacePath(policyInput),
  ]);
  try {
    const metadata = await stat(target, { bigint: true });
    return {
      // 用于记录文件指纹，用户批准后重新计算。如果等待期间文件或目标发生变化，本次操作会被阻止，要求重新审批。
      fingerprint: [
        metadata.dev,
        metadata.ino,
        metadata.mode,
        metadata.size,
        metadata.mtimeNs,
        metadata.ctimeNs,
      ].join(":"),
      target: relative(workspaceRoot, target) || ".",
    };
  } catch (error: unknown) {
    if (allowMissing && error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { fingerprint: "missing", target: relative(workspaceRoot, target) || "." };
    }
    throw error;
  }
}

/** 在工具真正执行前，根据工具权限和参数，决定“直接允许、直接拒绝，还是请求用户审批”
 * 只读工具自动放行；所有文件写入和 Shell 命令都必须逐次审批。
 * 审批流程：
 *  没有注册策略
      → DENY
    READ_ONLY
      → ALLOW
    WORKSPACE_WRITE
      → 读取 arguments.path
      → 校验路径
      → ASK
    SHELL
      → 读取 arguments.command
      → 校验 workspace
      → ASK
 * */
export async function evaluateToolCall(input: EvaluateToolCallInput): Promise<ToolPolicyResult> {
  if (input.policy === undefined) {
    return { decision: ToolPolicyDecision.DENY, reason: "工具未注册执行策略" };
  }

  switch (input.policy.permission) {
    case ToolPermission.READ_ONLY:
      return { decision: ToolPolicyDecision.ALLOW };
    case ToolPermission.WORKSPACE_WRITE: {
      const path = readStringArgument(input.arguments, "path");
      if (path === null) {
        return { decision: ToolPolicyDecision.DENY, reason: "文件工具缺少有效路径" };
      }
      const { fingerprint, target } = await resolveTarget(input, path, input.policy.allowMissing);
      return {
        decision: ToolPolicyDecision.ASK,
        fingerprint,
        risk: "该操作会修改 workspace 内的文件内容。",
        summary: input.policy.summary,
        target,
      };
    }
    case ToolPermission.SHELL: {
      const command = readStringArgument(input.arguments, "command");
      if (command === null) {
        return { decision: ToolPolicyDecision.DENY, reason: "命令工具缺少有效命令" };
      }
      const { fingerprint } = await resolveTarget(input, ".", false);
      return {
        decision: ToolPolicyDecision.ASK,
        fingerprint,
        risk: "Shell 命令以当前用户权限运行，可能修改文件、启动子进程或访问 workspace 外部资源。",
        summary: command,
        target: ".",
      };
    }
  }
}
