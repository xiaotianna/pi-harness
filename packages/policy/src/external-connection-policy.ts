import { type ToolPolicyDecision as Decision, ToolPolicyDecision } from "./tool-policy.js";

export interface ExternalConnectionPolicyInput {
  enabled: boolean;
  configurationRevision: number;
  isConfigurationTrusted: boolean;
  requiresIsolation: boolean;
  isIsolationAvailable: boolean;
}

export type ExternalConnectionPolicyResult =
  | { decision: typeof ToolPolicyDecision.ALLOW }
  | { decision: Exclude<Decision, typeof ToolPolicyDecision.ALLOW>; reason: string };

/** 启动授权只允许建立连接，不能扩大为服务器全部工具的执行授权。 */
export function evaluateExternalConnection(
  input: ExternalConnectionPolicyInput,
): ExternalConnectionPolicyResult {
  if (!input.enabled) {
    return { decision: ToolPolicyDecision.DENY, reason: "MCP 服务已禁用" };
  }
  if (!Number.isSafeInteger(input.configurationRevision) || input.configurationRevision < 1) {
    return { decision: ToolPolicyDecision.DENY, reason: "MCP 配置版本无效" };
  }
  if (input.requiresIsolation && !input.isIsolationAvailable) {
    return { decision: ToolPolicyDecision.DENY, reason: "当前环境不支持配置要求的 MCP 进程隔离" };
  }
  if (!input.isConfigurationTrusted) {
    return { decision: ToolPolicyDecision.ASK, reason: "请先确认当前 MCP 服务的连接或启动配置" };
  }
  return { decision: ToolPolicyDecision.ALLOW };
}
