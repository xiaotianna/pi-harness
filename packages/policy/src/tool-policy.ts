import { stat } from "node:fs/promises";
import { relative } from "node:path";
import { ApprovalPolicy, type ApprovalPolicy as ApprovalPolicyValue } from "./approval-policy.js";
import {
  type CommandPrefixRule,
  isCommandAllowedByPrefixes,
  isCriticalDestructiveCommand,
  readApplicableCommandPrefix,
} from "./command-policy.js";
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
  SKILL_ACTIVATION: "skill_activation",
  READ_ONLY: "read_only", // 只读工具，自动放行
  WORKSPACE_WRITE: "workspace_write", // 修改 workspace 内文件的工具，需要用户审批
  SHELL: "shell", // 执行 Shell 命令的工具，需要用户审批
  USER_APPROVAL: "user_approval",
} as const;

interface ToolApprovalGrant {
  allowSession?: boolean;
  fingerprint: string;
  risk: string;
  summary: string;
  target: string;
}

export type ToolPolicy =
  | {
      allowInFullAccess?: boolean;
      permission: typeof ToolPermission.USER_APPROVAL;
      resolveGrant: (
        args: unknown,
        signal?: AbortSignal,
      ) => ToolApprovalGrant | Promise<ToolApprovalGrant>;
    }
  | {
      permission: typeof ToolPermission.SKILL_ACTIVATION;
      resolveGrant: (
        args: unknown,
      ) => Promise<{ fingerprint: string; target: string; summary: string; risk: string } | null>;
    }
  | { permission: typeof ToolPermission.READ_ONLY }
  | { permission: typeof ToolPermission.SHELL }
  | {
      allowMissing: boolean;
      permission: typeof ToolPermission.WORKSPACE_WRITE;
      resolveTarget?: (argumentsValue: unknown) => ToolWriteTarget | null;
      risk: string;
      summary: string;
    };

export type ToolWriteTarget = { path: string } | { fingerprint: string; target: string };

export type ToolPolicyResult =
  | { decision: typeof ToolPolicyDecision.ALLOW; fingerprint?: string }
  | { decision: typeof ToolPolicyDecision.DENY; reason: string }
  | {
      decision: typeof ToolPolicyDecision.ASK;
      fingerprint: string;
      risk: string;
      summary: string;
      target: string;
      allowSession?: boolean;
      commandPrefix?: CommandPrefixRule;
      allowAiApproval?: boolean;
    };

export interface EvaluateToolCallInput {
  approvalPolicy: ApprovalPolicyValue;
  signal?: AbortSignal;
  isSkillToolPreapproved?: boolean;
  allowedCommandPrefixes?: readonly CommandPrefixRule[];
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

function readArgument(argumentsValue: unknown, name: string): unknown {
  if (typeof argumentsValue !== "object" || argumentsValue === null) return undefined;
  return name in argumentsValue ? (argumentsValue as Record<string, unknown>)[name] : undefined;
}

async function resolveWorkspaceTarget(
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
      // 用户批准后重新计算；目标变化时阻止旧写入，由 Agent 重新读取后再修改和审批。
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

/** 在工具真正执行前，根据工具权限、参数和 Session 审批策略决定允许、拒绝或询问。
 * 只读工具自动放行；文件写入与 Shell 在完成边界校验后按审批策略处理。
 * 审批流程：
 *  没有注册策略
      → DENY
    READ_ONLY
      → ALLOW
    WORKSPACE_WRITE
      → 校验写入目标
      → workspace 内写入在 request_approval 时 ASK
      → workspace 外写入仅在 full_access 时 ALLOW
    SHELL
      → 读取 arguments.command
      → 校验 workspace
      → full_access 或命中已允许命令前缀时 ALLOW，否则 ASK
 * */
export async function evaluateToolCall(input: EvaluateToolCallInput): Promise<ToolPolicyResult> {
  if (input.policy === undefined) {
    return { decision: ToolPolicyDecision.DENY, reason: "工具未注册执行策略" };
  }

  switch (input.policy.permission) {
    case ToolPermission.USER_APPROVAL: {
      const grant = await input.policy.resolveGrant(input.arguments, input.signal);
      if (
        input.policy.allowInFullAccess === true &&
        input.approvalPolicy === ApprovalPolicy.FULL_ACCESS
      ) {
        return { decision: ToolPolicyDecision.ALLOW, fingerprint: grant.fingerprint };
      }
      return { ...grant, decision: ToolPolicyDecision.ASK };
    }
    case ToolPermission.SKILL_ACTIVATION: {
      const grant = await input.policy.resolveGrant(input.arguments);
      if (grant === null) return { decision: ToolPolicyDecision.ALLOW };
      if (input.approvalPolicy === ApprovalPolicy.FULL_ACCESS)
        return { decision: ToolPolicyDecision.ALLOW, fingerprint: grant.fingerprint };
      return { ...grant, decision: ToolPolicyDecision.ASK };
    }
    case ToolPermission.READ_ONLY:
      return { decision: ToolPolicyDecision.ALLOW };
    case ToolPermission.WORKSPACE_WRITE: {
      const target = input.policy.resolveTarget
        ? input.policy.resolveTarget(input.arguments)
        : { path: readStringArgument(input.arguments, "path") ?? "" };
      if (target === null) {
        return { decision: ToolPolicyDecision.DENY, reason: "文件工具缺少有效写入目标" };
      }
      if (!("path" in target)) {
        if (input.approvalPolicy === ApprovalPolicy.FULL_ACCESS) {
          return { decision: ToolPolicyDecision.ALLOW, fingerprint: target.fingerprint };
        }
        return {
          decision: ToolPolicyDecision.ASK,
          fingerprint: target.fingerprint,
          risk: input.policy.risk,
          summary: input.policy.summary,
          target: target.target,
        };
      }
      if (!target.path) {
        return { decision: ToolPolicyDecision.DENY, reason: "文件工具缺少有效写入目标" };
      }
      const resolvedTarget = await resolveWorkspaceTarget(
        input,
        target.path,
        input.policy.allowMissing,
      );
      if (
        input.approvalPolicy !== ApprovalPolicy.REQUEST_APPROVAL ||
        input.isSkillToolPreapproved === true
      ) {
        return { decision: ToolPolicyDecision.ALLOW, fingerprint: resolvedTarget.fingerprint };
      }
      return {
        decision: ToolPolicyDecision.ASK,
        fingerprint: resolvedTarget.fingerprint,
        risk: input.policy.risk,
        summary: input.policy.summary,
        target: resolvedTarget.target,
      };
    }
    case ToolPermission.SHELL: {
      const command = readStringArgument(input.arguments, "command");
      if (command === null) {
        return { decision: ToolPolicyDecision.DENY, reason: "命令工具缺少有效命令" };
      }
      const { fingerprint } = await resolveWorkspaceTarget(input, ".", false);
      if (isCriticalDestructiveCommand(command, input.workspaceRoot)) {
        return {
          allowAiApproval: false,
          allowSession: false,
          decision: ToolPolicyDecision.ASK,
          fingerprint,
          risk: "该命令会递归删除工作区或仓库根目录；即使启用 full_access 也必须逐次确认。",
          summary: command,
          target: ".",
        };
      }
      if (input.approvalPolicy === ApprovalPolicy.FULL_ACCESS) {
        return { decision: ToolPolicyDecision.ALLOW, fingerprint };
      }
      if (
        input.isSkillToolPreapproved === true ||
        isCommandAllowedByPrefixes(command, input.allowedCommandPrefixes ?? [])
      ) {
        return { decision: ToolPolicyDecision.ALLOW, fingerprint };
      }
      const commandPrefix = readApplicableCommandPrefix(
        command,
        readArgument(input.arguments, "prefixRule"),
      );
      return {
        allowSession: false,
        ...(commandPrefix === null ? {} : { commandPrefix }),
        decision: ToolPolicyDecision.ASK,
        fingerprint,
        risk: "Shell 命令在沙箱中运行，可能修改工作区文件、启动子进程，并访问沙箱策略允许的网络地址。",
        summary: command,
        target: ".",
      };
    }
  }
}
