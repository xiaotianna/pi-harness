import type {
  ExternalToolPreparationFailure,
  PreparedExternalTools,
} from "@pi-harness/agent-runtime";
import { ToolPermission } from "@pi-harness/policy";
import { createToolFingerprint, type ToolRegistration } from "@pi-harness/tools";
import type { McpClientLease, McpClientManager } from "../mcp/client-manager.js";
import type { McpDiscovery } from "../mcp/discovery.js";
import { McpError, McpErrorCode } from "../mcp/errors.js";
import { describeMcpTool } from "../mcp/prompts/tool-description.js";
import { createMcpApprovalSummary } from "../mcp/utils/approval-summary.js";
import { redactMcpText } from "../mcp/utils/credential-redaction.js";
import { createMcpToolAlias } from "../mcp/utils/tool-alias.js";
import { readMcpToolResult } from "../mcp/utils/tool-result.js";
import { compileMcpToolSchema, normalizeMcpToolSchema } from "../mcp/utils/tool-schema.js";
import type { SessionRepository } from "../storage/database.js";
import type { McpServerService } from "./mcp-server-service.js";

export class McpToolService {
  public constructor(
    private readonly servers: McpServerService,
    private readonly clients: McpClientManager,
    private readonly discovery: McpDiscovery,
    private readonly sessions: SessionRepository,
  ) {}

  public readonly prepare = async (
    sessionId: string,
    workspaceRoot: string,
    signal: AbortSignal,
  ): Promise<PreparedExternalTools> => {
    const session = this.sessions.find(sessionId);
    if (!session || session.workspaceRoot !== workspaceRoot)
      throw new McpError(McpErrorCode.NOT_FOUND, "MCP 会话上下文不可用");
    const failures: ExternalToolPreparationFailure[] = [];
    const leases: McpClientLease[] = [];
    const registrations: ToolRegistration[] = [];
    try {
      for (const server of this.servers.list()) {
        if (!server.enabled || !server.isTrusted) continue;
        let lease: McpClientLease | undefined;
        const registrationStart = registrations.length;
        try {
          const context = this.servers.authorizeConnection(server.id, sessionId, workspaceRoot);
          const acquiredLease = await this.clients.acquire(context, signal);
          lease = acquiredLease;
          const catalog = await this.discovery.discover(acquiredLease, signal, true);
          for (const tool of catalog.tools) {
            const serializedDefinition = JSON.stringify(tool);
            if (redactMcpText(serializedDefinition, context.credential) !== serializedDefinition)
              throw new McpError(
                McpErrorCode.CREDENTIAL_INVALID,
                "MCP 工具定义包含连接凭据，已阻止暴露给模型",
              );
            if (tool.name.length > 512)
              throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 工具名称超过长度限制");
            const schema = compileMcpToolSchema(tool.inputSchema);
            if (tool.outputSchema) normalizeMcpToolSchema(tool.outputSchema);
            const definitionHash = createToolFingerprint(tool);
            const identity = createToolFingerprint([
              server.id,
              server.revision,
              context.credential?.identity ?? null,
              context.credential?.revision ?? null,
              definitionHash,
            ]);
            const verify = async (args: unknown, requestSignal: AbortSignal): Promise<void> => {
              requestSignal.throwIfAborted();
              this.servers.verifyContext(context);
              if (!schema.validate(args).valid)
                throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 工具参数不符合 schema");
              const current = await this.discovery.discover(acquiredLease, requestSignal, true);
              const currentTool = current.tools.find((item) => item.name === tool.name);
              if (
                current.generation !== acquiredLease.catalogGeneration ||
                !currentTool ||
                createToolFingerprint(currentTool) !== definitionHash
              )
                throw new McpError(
                  McpErrorCode.CONFIG_CONFLICT,
                  "MCP 工具定义已变更，请开始新一轮运行",
                );
              this.servers.verifyContext(context);
              requestSignal.throwIfAborted();
            };
            registrations.push({
              source: `mcp:${server.id}:${server.revision}:${definitionHash}`,
              timeoutMs: server.config.requestTimeoutMs,
              policy: {
                permission: ToolPermission.USER_APPROVAL,
                resolveGrant: async (args, approvalSignal) => {
                  await verify(
                    args,
                    AbortSignal.any([
                      signal,
                      acquiredLease.signal,
                      AbortSignal.timeout(15_000),
                      ...(approvalSignal ? [approvalSignal] : []),
                    ]),
                  );
                  return {
                    fingerprint: createToolFingerprint([identity, args]),
                    target: `${server.name} / ${tool.name}`,
                    summary: createMcpApprovalSummary(tool.name, args, context.credential),
                    risk: "参数将发送给该服务，可能读取或修改外部数据；无法保证撤销。仅批准本次调用。",
                  };
                },
              },
              tool: {
                name: createMcpToolAlias(server.id, tool.name),
                label: `${server.name} / ${tool.name}`,
                description: describeMcpTool(
                  server.name,
                  tool.name,
                  (tool.description ?? "").slice(0, 4096),
                ),
                parameters: schema.model,
                executionMode: "sequential",
                execute: async (_toolCallId, args, executionSignal) => {
                  const requestSignal = AbortSignal.any([
                    signal,
                    acquiredLease.signal,
                    ...(executionSignal ? [executionSignal] : []),
                  ]);
                  await verify(args, requestSignal);
                  // No retries: a lost response does not prove the external side effect failed.
                  let result: Awaited<ReturnType<typeof acquiredLease.client.callTool>>;
                  try {
                    result = await acquiredLease.client.callTool(
                      { name: tool.name, arguments: args as Record<string, unknown> },
                      { signal: requestSignal, timeout: server.config.requestTimeoutMs },
                    );
                  } catch {
                    throw new Error(
                      "MCP_RESULT_UNKNOWN: 未取得确定结果，外部操作可能已执行；请核实后再发起新调用",
                    );
                  }
                  if (result.isError) throw new Error("MCP_TOOL_FAILED: 外部服务报告工具执行失败");
                  return {
                    content: [
                      {
                        type: "text",
                        text:
                          readMcpToolResult(result, context.credential) ||
                          "MCP 工具已完成，未返回文本",
                      },
                    ],
                    details: {
                      source: "mcp",
                      serverId: server.id,
                      serverName: server.name,
                      toolName: tool.name,
                      configRevision: server.revision,
                      definitionHash,
                    },
                  };
                },
              },
            });
            if (
              registrations.length > 64 ||
              Buffer.byteLength(
                JSON.stringify(
                  registrations.map(({ tool }) => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                  })),
                ),
              ) >
                512 * 1024
            )
              throw new McpError(
                McpErrorCode.LIMIT_EXCEEDED,
                "MCP 工具数量或定义超过运行预算，请减少启用的服务器",
              );
          }
          leases.push(acquiredLease);
        } catch (error: unknown) {
          lease?.release();
          registrations.splice(registrationStart);
          if (!(error instanceof McpError)) throw error;
          failures.push({
            displayName: server.name,
            message: error.message,
            source: `mcp:${server.id}:${server.revision}`,
          });
        }
      }
      return {
        failures,
        registrations,
        release: () => {
          for (const lease of leases) lease.release();
        },
      };
    } catch (error) {
      for (const lease of leases) lease.release();
      throw error;
    }
  };
}
