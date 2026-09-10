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
import type { McpCredential } from "../mcp/credential.js";
import { McpError, McpErrorCode } from "../mcp/errors.js";
import { createMcpServerRecord } from "../mcp/utils/create-server-record.js";
import { normalizeMcpConfig, normalizeMcpName } from "../mcp/utils/server-config.js";
import { reserveUniqueMcpName } from "../mcp/utils/unique-server-name.js";
import {
  McpAuthMode,
  McpAuthRequirement,
  McpIsolationMode,
  McpJsonTransport,
  type McpServerRecord,
  McpTransport,
} from "../schemas/mcp.js";
import type { McpCredentialStore } from "../storage/mcp-credential-store.js";
import type { McpServerRepository } from "../storage/mcp-server-repository.js";
import type { McpServerVo } from "../vo/mcp-vo.js";

const MAX_MCP_SERVERS = 1_000;

export class McpServerService {
  private readonly authRequirements = new Map<
    string,
    { requirement: McpAuthRequirement; resourceMetadataUrl?: string }
  >();
  private mutationChain: Promise<void> = Promise.resolve();
  private isMutating = false;
  private isClosed = false;

  public constructor(
    private readonly repository: McpServerRepository,
    private readonly credentials: McpCredentialStore,
    private readonly invalidateServer: (serverId: string) => Promise<void>,
  ) {}

  public list(): readonly McpServerVo[] {
    const trustedServerIds = new Set(this.repository.listTrustedServerIds());
    return this.repository
      .list()
      .map((record) => this.toVo(record, trustedServerIds.has(record.id)));
  }

  public get(serverId: string): McpServerVo {
    return this.toVo(this.requireServer(serverId));
  }

  public create(input: CreateMcpServerDto): Promise<McpServerVo> {
    return this.mutate(async () => {
      const servers = this.repository.list();
      if (servers.length >= MAX_MCP_SERVERS) {
        throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 服务数量达到上限");
      }
      const name = reserveUniqueMcpName(input.name, new Set(servers.map((server) => server.name)));
      const record = createMcpServerRecord({ ...input, name });
      this.repository.create(record);
      return this.toVo(record);
    });
  }

  public previewImport(input: ImportMcpServersDto): McpJsonDto {
    const names = new Set(this.repository.list().map((server) => server.name));
    return this.toMcpJson(
      this.normalizeImport(input).map((server) => ({
        ...server,
        name: reserveUniqueMcpName(server.name, names),
      })),
    );
  }

  public importServers(input: ImportMcpServersDto): Promise<readonly McpServerVo[]> {
    return this.mutate(async () => {
      const normalized = this.normalizeImport(input);
      const servers = this.repository.list();
      if (servers.length + normalized.length > MAX_MCP_SERVERS)
        throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 服务数量达到上限");
      const names = new Set(servers.map((server) => server.name));
      const records = normalized.map((server) =>
        createMcpServerRecord({
          ...server,
          name: reserveUniqueMcpName(server.name, names),
        }),
      );
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
              transport:
                server.type === McpJsonTransport.HTTP ? McpTransport.STREAMABLE_HTTP : server.type,
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
            ? {
                type: McpJsonTransport.STDIO,
                command: config.command,
                args: config.args,
              }
            : {
                type:
                  config.transport === McpTransport.STREAMABLE_HTTP
                    ? McpJsonTransport.HTTP
                    : config.transport,
                url: config.url,
              },
        ]),
      ),
    };
  }

  public update(serverId: string, input: UpdateMcpServerDto): Promise<McpServerVo> {
    return this.mutate(async () => {
      const current = this.requireRevision(serverId, input.expectedRevision);
      const config = normalizeMcpConfig(input.config);
      const name = reserveUniqueMcpName(
        input.name,
        new Set(
          this.repository
            .list()
            .filter((server) => server.id !== serverId)
            .map((server) => server.name),
        ),
      );
      this.repository.revokeTrust(serverId);
      await this.invalidateServer(serverId);
      this.authRequirements.delete(serverId);
      // 先撤销敏感状态再提交新地址，存储失败时不会把旧 Token 发给新服务。
      const hasConfigChanged = !isEqual(current.config, config);
      if (hasConfigChanged) await this.credentials.delete(serverId);
      const next = {
        ...current,
        name,
        config,
        enabled: input.enabled,
        revision: current.revision + 1,
        updatedAt: Date.now(),
      };
      if (!hasConfigChanged) {
        await this.credentials.modify(serverId, async (credential) =>
          credential === undefined
            ? undefined
            : {
                ...credential,
                revision: credential.revision + 1,
                configRevision: next.revision,
              },
        );
      }
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
      this.authRequirements.delete(serverId);
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
          ((server.config.authMode !== McpAuthMode.NONE &&
            server.config.authMode !== input.material.mode) ||
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
      this.authRequirements.set(serverId, { requirement: input.material.mode });
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
      this.authRequirements.delete(serverId);
    });
  }

  public noteAuthenticationRequired(
    serverId: string,
    requirement: typeof McpAuthRequirement.STATIC | typeof McpAuthRequirement.OAUTH,
    resourceMetadataUrl?: URL,
  ): void {
    this.authRequirements.set(serverId, {
      requirement,
      ...(resourceMetadataUrl ? { resourceMetadataUrl: resourceMetadataUrl.href } : {}),
    });
  }

  public noteAuthenticationSucceeded(context: McpConnectionContext): void {
    this.authRequirements.set(context.server.id, {
      requirement: context.credential?.material.mode ?? McpAuthRequirement.NONE,
    });
  }

  public getOAuthResourceMetadataUrl(serverId: string): URL | undefined {
    const value = this.authRequirements.get(serverId)?.resourceMetadataUrl;
    return value === undefined ? undefined : new URL(value);
  }

  public async saveOAuthCredential(
    context: McpConnectionContext,
    material: Extract<McpCredential["material"], { mode: typeof McpAuthMode.OAUTH }>,
    identity: string,
  ): Promise<void> {
    await this.mutate(async () => {
      const server = this.requireRevision(context.server.id, context.server.revision);
      await this.invalidateServer(server.id);
      await this.credentials.modify(server.id, async (current) => ({
        serverId: server.id,
        identity,
        revision: (current?.revision ?? 0) + 1,
        configRevision: server.revision,
        material,
      }));
      const saved = this.credentials.read(server.id);
      if (saved === undefined) {
        throw new McpError(McpErrorCode.STORAGE_FAILED, "MCP OAuth 凭据保存失败");
      }
      context.credential = saved;
      // OAuth 只能从已启用的当前配置启动；保留用户在本次流程前已授予的连接信任。
      this.authRequirements.set(server.id, { requirement: McpAuthRequirement.OAUTH });
    });
  }

  public async refreshOAuthCredential(
    context: McpConnectionContext,
    material: Extract<McpCredential["material"], { mode: typeof McpAuthMode.OAUTH }>,
  ): Promise<void> {
    await this.mutate(async () => {
      const snapshot = context.credential;
      if (snapshot?.material.mode !== McpAuthMode.OAUTH) {
        throw new McpError(McpErrorCode.CREDENTIAL_INVALID, "MCP OAuth 授权不可刷新");
      }
      this.requireRevision(context.server.id, context.server.revision);
      await this.credentials.modify(context.server.id, async (current) => {
        if (
          current?.identity !== snapshot.identity ||
          current.revision !== snapshot.revision ||
          current.configRevision !== context.server.revision
        ) {
          throw new McpError(McpErrorCode.CONFIG_CONFLICT, "MCP 授权已变更，请重新连接");
        }
        return { ...current, material };
      });
      context.credential = { ...snapshot, material };
      this.authRequirements.set(context.server.id, { requirement: McpAuthRequirement.OAUTH });
    });
  }

  public synchronizeOAuthCredential(context: McpConnectionContext): void {
    const current = this.credentials.read(context.server.id);
    if (
      current?.material.mode !== McpAuthMode.OAUTH ||
      current.identity !== context.credential?.identity ||
      current.revision !== context.credential.revision ||
      current.configRevision !== context.server.revision
    ) {
      throw new McpError(McpErrorCode.CONFIG_CONFLICT, "MCP 授权已变更，请重新连接");
    }
    context.credential = current;
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
    return this.createConnectionContext(server, ownerId, workspaceRoot);
  }

  public createOAuthContext(
    serverId: string,
    expectedRevision: number,
    ownerId: string,
  ): McpConnectionContext {
    this.assertAvailable();
    const server = this.requireRevision(serverId, expectedRevision);
    if (!server.enabled) throw new McpError(McpErrorCode.DISABLED, "MCP 服务已禁用");
    return this.createConnectionContext(server, ownerId, "");
  }

  private createConnectionContext(
    server: McpServerRecord,
    ownerId: string,
    workspaceRoot: string,
  ): McpConnectionContext {
    const credential = this.credentials.read(server.id);
    if (credential !== undefined && credential.configRevision !== server.revision) {
      throw new McpError(McpErrorCode.CREDENTIAL_INVALID, "MCP 凭据与当前配置不匹配");
    }
    return {
      ownerId,
      workspaceRoot,
      server,
      ...(credential === undefined ? {} : { credential }),
    };
  }

  public verifyContext(context: McpConnectionContext): void {
    this.verifyCurrentContext(context, true);
  }

  public verifyOAuthContext(context: McpConnectionContext): void {
    this.verifyCurrentContext(context, false);
  }

  private verifyCurrentContext(context: McpConnectionContext, requiresTrust: boolean): void {
    this.assertAvailable();
    const current = this.requireServer(context.server.id);
    const credential = this.credentials.read(current.id);
    if (
      !current.enabled ||
      current.revision !== context.server.revision ||
      (requiresTrust && !this.repository.isTrusted(current.id, current.revision)) ||
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

  private toVo(
    record: McpServerRecord,
    isTrusted = this.repository.isTrusted(record.id, record.revision),
  ): McpServerVo {
    const credential = this.credentials.read(record.id);
    const configuredRequirement =
      record.config.transport === McpTransport.STDIO
        ? McpAuthRequirement.STATIC
        : record.config.authMode;
    return {
      ...record,
      authRequirement:
        credential?.material.mode ??
        (configuredRequirement === McpAuthMode.NONE
          ? (this.authRequirements.get(record.id)?.requirement ?? McpAuthRequirement.UNKNOWN)
          : configuredRequirement),
      ...(credential
        ? { credentialMode: credential.material.mode, credentialRevision: credential.revision }
        : {}),
      hasCredential: credential !== undefined,
      isTrusted,
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
