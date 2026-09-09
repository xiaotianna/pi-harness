import { randomUUID } from "node:crypto";
import { evaluateExternalConnection, ToolPolicyDecision } from "@pi-harness/policy";
import { isEqual } from "es-toolkit";
import type {
  CreateMcpServerDto,
  ImportMcpServersDto,
  McpJsonDto,
  PutMcpCredentialDto,
  UpdateMcpServerDto,
} from "../dto/mcp-dto.js";
import type { McpConnectionContext } from "../mcp/client-manager.js";
import { McpError, McpErrorCode } from "../mcp/errors.js";
import { createMcpServerRecord } from "../mcp/utils/create-server-record.js";
import { normalizeMcpConfig, normalizeMcpName } from "../mcp/utils/server-config.js";
import {
  McpAuthMode,
  McpIsolationMode,
  type McpServerRecord,
  McpTransport,
} from "../schemas/mcp.js";
import type { McpCredentialStore } from "../storage/mcp-credential-store.js";
import type { McpServerRepository } from "../storage/mcp-server-repository.js";
import type { McpServerVo } from "../vo/mcp-vo.js";

export class McpServerService {
  private mutationChain: Promise<void> = Promise.resolve();
  private isMutating = false;
  private isClosed = false;

  public constructor(
    private readonly repository: McpServerRepository,
    private readonly credentials: McpCredentialStore,
    private readonly invalidateServer: (serverId: string) => Promise<void>,
  ) {}

  public list(): readonly McpServerVo[] {
    return this.repository.list().map((record) => this.toVo(record));
  }

  public get(serverId: string): McpServerVo {
    return this.toVo(this.requireServer(serverId));
  }

  public create(input: CreateMcpServerDto): Promise<McpServerVo> {
    return this.mutate(async () => {
      if (this.repository.list().length >= 256) {
        throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 服务数量达到上限");
      }
      const record = createMcpServerRecord(input);
      this.repository.create(record);
      return this.toVo(record);
    });
  }

  public previewImport(input: ImportMcpServersDto): McpJsonDto {
    return this.toMcpJson(this.normalizeImport(input));
  }

  public importServers(input: ImportMcpServersDto): Promise<readonly McpServerVo[]> {
    return this.mutate(async () => {
      const normalized = this.normalizeImport(input);
      if (this.repository.list().length + normalized.length > 256)
        throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 服务数量达到上限");
      const records = normalized.map(createMcpServerRecord);
      this.repository.createMany(records);
      return records.map((record) => this.toVo(record));
    });
  }

  public exportServer(serverId: string): McpJsonDto {
    const { name, config } = this.requireServer(serverId);
    return this.toMcpJson([{ name, config }]);
  }

  private normalizeImport(input: ImportMcpServersDto): CreateMcpServerDto[] {
    if ("servers" in input) {
      return input.servers.map((server) => ({
        name: normalizeMcpName(server.name),
        config: normalizeMcpConfig(server.config),
      }));
    }
    return Object.entries(input.mcpServers).map(([name, server]) => ({
      name: normalizeMcpName(name),
      config: normalizeMcpConfig(
        "command" in server
          ? {
              transport: McpTransport.STDIO,
              command: server.command,
              args: server.args ?? [],
              isolation: McpIsolationMode.TRUSTED,
              requestTimeoutMs: 30_000,
              compatibility: { roots: false, sampling: false, logging: false },
            }
          : {
              transport: server.type,
              url: server.url,
              authMode: McpAuthMode.NONE,
              allowedOrigins: [],
              allowPrivateNetwork: false,
              requestTimeoutMs: 30_000,
              compatibility: { roots: false, sampling: false, logging: false },
            },
      ),
    }));
  }

  private toMcpJson(servers: readonly CreateMcpServerDto[]): McpJsonDto {
    return {
      mcpServers: Object.fromEntries(
        servers.map(({ name, config }) => [
          name,
          config.transport === McpTransport.STDIO
            ? { command: config.command, args: config.args }
            : { type: config.transport, url: config.url },
        ]),
      ),
    };
  }

  public update(serverId: string, input: UpdateMcpServerDto): Promise<McpServerVo> {
    return this.mutate(async () => {
      const current = this.requireRevision(serverId, input.expectedRevision);
      const config = normalizeMcpConfig(input.config);
      const name = normalizeMcpName(input.name);
      this.repository.revokeTrust(serverId);
      await this.invalidateServer(serverId);
      // 先撤销敏感状态再提交新地址，存储失败时不会把旧 Token 发给新服务。
      if (!isEqual(current.config, config)) await this.credentials.delete(serverId);
      const next = {
        ...current,
        name,
        config,
        enabled: input.enabled,
        revision: current.revision + 1,
        updatedAt: Date.now(),
      };
      this.repository.update(next, current.revision);
      return this.toVo(next);
    });
  }

  public delete(serverId: string, expectedRevision: number): Promise<void> {
    return this.mutate(async () => {
      const record = this.requireRevision(serverId, expectedRevision);
      // 留下可重试的禁用记录：凭据清理失败不能把服务恢复成启用状态。
      const disabled = {
        ...record,
        enabled: false,
        revision: record.revision + 1,
        updatedAt: Date.now(),
      };
      this.repository.update(disabled, record.revision);
      await this.invalidateServer(serverId);
      await this.credentials.delete(serverId);
      this.repository.delete(serverId, disabled.revision);
    });
  }

  public trust(serverId: string, expectedRevision: number): Promise<McpServerVo> {
    return this.mutate(async () => {
      this.requireRevision(serverId, expectedRevision);
      this.repository.trust(serverId, expectedRevision, Date.now());
      return this.get(serverId);
    });
  }

  public revokeTrust(serverId: string): Promise<void> {
    return this.mutate(async () => {
      this.requireServer(serverId);
      this.repository.revokeTrust(serverId);
      await this.invalidateServer(serverId);
    });
  }

  public putCredential(serverId: string, input: PutMcpCredentialDto): Promise<McpServerVo> {
    return this.mutate(async () => {
      const server = this.requireRevision(serverId, input.expectedRevision);
      if (
        (server.config.transport === McpTransport.STDIO &&
          (input.material.mode !== McpAuthMode.STATIC ||
            Object.keys(input.material.headers).length > 0)) ||
        (server.config.transport !== McpTransport.STDIO &&
          (server.config.authMode !== input.material.mode ||
            (input.material.mode === McpAuthMode.STATIC &&
              Object.keys(input.material.environment).length > 0) ||
            (input.material.mode === McpAuthMode.OAUTH &&
              input.material.resource !== server.config.url)))
      ) {
        throw new McpError(McpErrorCode.CREDENTIAL_INVALID, "凭据类型或资源与 MCP 配置不匹配");
      }
      this.repository.revokeTrust(serverId);
      await this.invalidateServer(serverId);
      await this.credentials.modify(serverId, async (current) => ({
        serverId,
        // 显式替换代表一个新授权身份；OAuth 自动刷新须使用保留 identity 的专用流程。
        identity: randomUUID(),
        revision: (current?.revision ?? 0) + 1,
        configRevision: server.revision,
        material: input.material,
      }));
      this.repository.revokeTrust(serverId);
      return this.get(serverId);
    });
  }

  public deleteCredential(serverId: string, expectedRevision: number): Promise<void> {
    return this.mutate(async () => {
      this.requireRevision(serverId, expectedRevision);
      this.repository.revokeTrust(serverId);
      await this.invalidateServer(serverId);
      await this.credentials.delete(serverId);
    });
  }

  public authorizeConnection(
    serverId: string,
    ownerId: string,
    workspaceRoot: string,
    isIsolationAvailable: boolean,
  ): McpConnectionContext {
    this.assertAvailable();
    const server = this.requireServer(serverId);
    const policy = evaluateExternalConnection({
      enabled: server.enabled,
      configurationRevision: server.revision,
      isConfigurationTrusted: this.repository.isTrusted(serverId, server.revision),
      requiresIsolation:
        server.config.transport === McpTransport.STDIO &&
        server.config.isolation === McpIsolationMode.ISOLATED,
      isIsolationAvailable,
    });
    if (policy.decision !== ToolPolicyDecision.ALLOW) {
      throw new McpError(
        policy.decision === ToolPolicyDecision.ASK
          ? McpErrorCode.TRUST_REQUIRED
          : McpErrorCode.DISABLED,
        policy.reason,
      );
    }
    const credential = this.credentials.read(serverId);
    return {
      ownerId,
      workspaceRoot,
      server,
      ...(credential === undefined ? {} : { credential }),
    };
  }

  public verifyContext(context: McpConnectionContext): void {
    this.assertAvailable();
    const current = this.requireServer(context.server.id);
    const credential = this.credentials.read(current.id);
    if (
      !current.enabled ||
      current.revision !== context.server.revision ||
      !this.repository.isTrusted(current.id, current.revision) ||
      credential?.identity !== context.credential?.identity ||
      credential?.revision !== context.credential?.revision
    ) {
      throw new McpError(McpErrorCode.CONFIG_CONFLICT, "MCP 配置或授权已变更，请重新准备连接");
    }
  }

  public async close(): Promise<void> {
    this.isClosed = true;
    await this.mutationChain;
    await this.credentials.close();
  }

  private requireServer(serverId: string): McpServerRecord {
    const server = this.repository.find(serverId);
    if (server === null) throw new McpError(McpErrorCode.NOT_FOUND, "MCP 服务不存在");
    return server;
  }

  private requireRevision(serverId: string, expectedRevision: number): McpServerRecord {
    const server = this.requireServer(serverId);
    if (server.revision !== expectedRevision) {
      throw new McpError(McpErrorCode.CONFIG_CONFLICT, "MCP 配置已变更，请刷新后重试");
    }
    return server;
  }

  private toVo(record: McpServerRecord): McpServerVo {
    return {
      ...record,
      hasCredential: this.credentials.read(record.id) !== undefined,
      isTrusted: this.repository.isTrusted(record.id, record.revision),
    };
  }

  private mutate<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isClosed) return Promise.reject(new McpError(McpErrorCode.DISABLED, "MCP 服务已关闭"));
    const result = this.mutationChain.then(async () => {
      this.isMutating = true;
      try {
        return await operation();
      } finally {
        this.isMutating = false;
      }
    });
    this.mutationChain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private assertAvailable(): void {
    if (this.isClosed || this.isMutating) {
      throw new McpError(McpErrorCode.DISABLED, "MCP 配置正在变更或服务已关闭，请稍后重试");
    }
  }
}
