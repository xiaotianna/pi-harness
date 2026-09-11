import { randomUUID } from "node:crypto";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createToolFingerprint } from "@pi-harness/tools";
import type { TestMcpConnectionDto } from "../dto/mcp-dto.js";
import type { McpClientManager, McpConnectionContext } from "../mcp/client-manager.js";
import type { McpCatalog, McpDiscovery } from "../mcp/discovery.js";
import { McpError, McpErrorCode } from "../mcp/errors.js";
import { redactMcpText, redactMcpValue } from "../mcp/utils/credential-redaction.js";
import type { McpDiagnosticsVo } from "../vo/mcp-vo.js";
import type { McpServerService } from "./mcp-server-service.js";

export class McpDiagnosticsService {
  public constructor(
    private readonly servers: McpServerService,
    private readonly clients: McpClientManager,
    private readonly discovery: McpDiscovery,
  ) {}

  public get(serverId: string): McpDiagnosticsVo | null {
    return this.servers.getCatalog(serverId);
  }

  public async refreshAll(
    signal: AbortSignal,
    onError: (serverId: string, error: unknown) => void,
  ): Promise<void> {
    const queue = this.servers
      .list()
      .filter((server) => server.enabled && server.isTrusted)
      .map((server) => ({ id: server.id, revision: server.revision }));
    let nextIndex = 0;
    const worker = async () => {
      while (!signal.aborted) {
        const server = queue[nextIndex++];
        if (server === undefined) return;
        try {
          await this.test(server.id, { expectedRevision: server.revision }, signal);
        } catch (error: unknown) {
          if (!signal.aborted) onError(server.id, error);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
  }

  public async test(
    serverId: string,
    input: TestMcpConnectionDto,
    signal: AbortSignal,
  ): Promise<McpDiagnosticsVo> {
    this.servers.beginCatalogRefresh(serverId, input.expectedRevision);
    try {
      const { catalog, context, durationMs } = await this.inspect(serverId, input, signal);
      const redact = (text: string) => redactMcpText(text, context.credential);
      const redactValue = (value: unknown) => redactMcpValue(value, context.credential);
      const result: McpDiagnosticsVo = {
        serverId,
        configRevision: context.server.revision,
        protocolEra: catalog.protocolEra,
        serverName: redact(catalog.serverName).slice(0, 512),
        serverVersion: redact(catalog.serverVersion).slice(0, 128),
        serverInfo: redactValue(catalog.serverInfo),
        ...(catalog.instructions
          ? { instructions: redact(catalog.instructions).slice(0, 65_536) }
          : {}),
        capabilities: redactValue(catalog.capabilities),
        durationMs,
        discoveredAt: catalog.discoveredAt,
        tools: catalog.tools.map((tool) => {
          const definitionFingerprint = createToolFingerprint(tool);
          const setting = this.servers.getToolSetting(serverId, tool.name, definitionFingerprint);
          return {
            name: redact(tool.name).slice(0, 512),
            ...(typeof tool.title === "string" ? { title: redact(tool.title).slice(0, 512) } : {}),
            description: redact(tool.description ?? "").slice(0, 4096),
            definitionFingerprint,
            enabled: setting.enabled,
            inputSchema: redactValue(tool.inputSchema),
            ...(tool.outputSchema === undefined
              ? {}
              : { outputSchema: redactValue(tool.outputSchema) }),
            raw: redactValue(tool),
            trustedReadOnly: setting.trustedReadOnly,
          };
        }),
        resources: catalog.resources.map((resource) => ({
          name: redact(resource.name).slice(0, 512),
          ...(typeof resource.title === "string"
            ? { title: redact(resource.title).slice(0, 512) }
            : {}),
          description: redact(resource.description ?? "").slice(0, 4096),
          uri: redact(resource.uri).slice(0, 8192),
          ...(typeof resource.mimeType === "string"
            ? { mimeType: redact(resource.mimeType).slice(0, 512) }
            : {}),
          ...(typeof resource.size === "number" ? { size: resource.size } : {}),
          raw: redactValue(resource),
        })),
        resourceTemplates: catalog.resourceTemplates.map((template) => ({
          name: redact(template.name).slice(0, 512),
          ...(typeof template.title === "string"
            ? { title: redact(template.title).slice(0, 512) }
            : {}),
          description: redact(template.description ?? "").slice(0, 4096),
          uriTemplate: redact(template.uriTemplate).slice(0, 8192),
          ...(typeof template.mimeType === "string"
            ? { mimeType: redact(template.mimeType).slice(0, 512) }
            : {}),
          raw: redactValue(template),
        })),
        prompts: catalog.prompts.map((prompt) => ({
          name: redact(prompt.name).slice(0, 512),
          ...(typeof prompt.title === "string"
            ? { title: redact(prompt.title).slice(0, 512) }
            : {}),
          description: redact(prompt.description ?? "").slice(0, 4096),
          arguments: (prompt.arguments ?? []).map((argument) => ({
            name: redact(argument.name).slice(0, 512),
            description: redact(argument.description ?? "").slice(0, 4096),
            required: argument.required ?? false,
          })),
          raw: redactValue(prompt),
        })),
      };
      this.servers.saveCatalog(result);
      return result;
    } catch (error: unknown) {
      if (signal.aborted) {
        this.servers.cancelCatalogRefresh(serverId, input.expectedRevision);
      } else {
        this.servers.failCatalogRefresh(
          serverId,
          input.expectedRevision,
          error instanceof McpError ? error.message : "MCP 能力目录加载失败",
        );
      }
      throw error;
    }
  }

  private async inspect(
    serverId: string,
    input: TestMcpConnectionDto,
    signal: AbortSignal,
  ): Promise<{
    catalog: McpCatalog;
    context: McpConnectionContext;
    durationMs: number;
  }> {
    const startedAt = performance.now();
    signal.throwIfAborted();
    const ownerId = `diagnostics:${randomUUID()}`;
    const directory = await mkdtemp(join(tmpdir(), "pi-harness-mcp-diagnostics-"));
    try {
      // 管理连接不依赖任何项目，也不把 daemon 凭据目录作为本地进程 cwd。
      const context = this.servers.authorizeConnection(
        serverId,
        ownerId,
        await realpath(directory),
      );
      if (context.server.revision !== input.expectedRevision)
        throw new McpError(McpErrorCode.CONFIG_CONFLICT, "MCP 配置已变更，请刷新后重试");
      const lease = await this.clients.acquire(context, signal);
      try {
        const catalog = await this.discovery.discover(lease, signal, true);
        this.servers.verifyContext(context);
        this.servers.noteAuthenticationSucceeded(context);
        const durationMs = Math.round(performance.now() - startedAt);
        return {
          catalog,
          context,
          durationMs,
        };
      } finally {
        lease.release();
      }
    } finally {
      try {
        // 测试结束即回收独立连接，避免进程继续使用已删除的临时目录。
        await this.clients.invalidateOwner(ownerId);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
  }
}
