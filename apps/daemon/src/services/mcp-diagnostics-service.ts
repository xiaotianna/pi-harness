import { randomUUID } from "node:crypto";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestMcpConnectionDto } from "../dto/mcp-dto.js";
import type { McpClientManager } from "../mcp/client-manager.js";
import type { McpDiscovery } from "../mcp/discovery.js";
import { McpError, McpErrorCode } from "../mcp/errors.js";
import { redactMcpText } from "../mcp/utils/credential-redaction.js";
import type { McpDiagnosticsVo } from "../vo/mcp-vo.js";
import type { McpServerService } from "./mcp-server-service.js";

export class McpDiagnosticsService {
  public constructor(
    private readonly servers: McpServerService,
    private readonly clients: McpClientManager,
    private readonly discovery: McpDiscovery,
  ) {}

  public async test(
    serverId: string,
    input: TestMcpConnectionDto,
    signal: AbortSignal,
  ): Promise<McpDiagnosticsVo> {
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
        false,
      );
      if (context.server.revision !== input.expectedRevision)
        throw new McpError(McpErrorCode.CONFIG_CONFLICT, "MCP 配置已变更，请刷新后重试");
      const lease = await this.clients.acquire(context, signal);
      try {
        const catalog = await this.discovery.discover(lease, signal, true);
        this.servers.verifyContext(context);
        const redact = (text: string) => redactMcpText(text, context.credential);
        return {
          serverId,
          configRevision: context.server.revision,
          protocolEra: catalog.protocolEra,
          serverName: redact(catalog.serverName).slice(0, 512),
          serverVersion: redact(catalog.serverVersion).slice(0, 128),
          durationMs: Math.round(performance.now() - startedAt),
          discoveredAt: catalog.discoveredAt,
          tools: catalog.tools.map((tool) => ({
            name: redact(tool.name).slice(0, 512),
            description: redact(tool.description ?? "").slice(0, 4096),
          })),
          prompts: catalog.prompts.map((prompt) => ({
            name: redact(prompt.name).slice(0, 512),
            description: redact(prompt.description ?? "").slice(0, 4096),
          })),
          resourceCount: catalog.resources.length,
          resourceTemplateCount: catalog.resourceTemplates.length,
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
