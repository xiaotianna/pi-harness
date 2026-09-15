import { createHash } from "node:crypto";
import {
  AVAILABLE_PLUGINS,
  type PluginAppDefinition,
  type PluginDefinition,
  SkillType,
} from "@pi-harness/tools";
import { isEqual } from "es-toolkit";
import type { SkillOAuthClientConfig } from "../config/index.js";
import type { McpCredential } from "../mcp/credential.js";
import { McpError, McpErrorCode } from "../mcp/errors.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../mcp/utils/computer-use-server.js";
import {
  McpAuthMode,
  type McpServerConfig,
  type McpServerRecord,
  McpTransport,
} from "../schemas/mcp.js";
import type { AppSettingRepository } from "../storage/database.js";
import type { SkillCredentialStore } from "../storage/skill-credential-store.js";
import type { McpServerVo } from "../vo/mcp-vo.js";
import type { McpServerService } from "./mcp-server-service.js";
import {
  SkillConnectionError,
  SkillConnectionErrorCode,
  type SkillConnectionStatus,
  type SkillGatewayResponse,
} from "./skill-connection-types.js";
import { requestSkillGateway } from "./skill-gateway.js";
import { type OAuthPluginDefinition, SkillOAuthService } from "./skill-oauth-service.js";

const PLUGIN_APP_SERVER_PREFIX = "__pi_plugin_app__:";

export function isPluginAppMcpServer(name: string): boolean {
  return name.startsWith(PLUGIN_APP_SERVER_PREFIX);
}

export function isComputerUsePluginAppMcpServer(name: string): boolean {
  return name === COMPUTER_USE_MCP_SERVER_NAME;
}

export function getPluginAppDisplayName(name: string): string | null {
  if (!isPluginAppMcpServer(name)) return null;
  const [collectionId, appId] = name.slice(PLUGIN_APP_SERVER_PREFIX.length).split(":");
  if (!collectionId || !appId) return null;
  return findPluginApp(collectionId, appId)?.displayName ?? null;
}

function pluginAppServerName(collectionId: string, appId: string): string {
  return `${PLUGIN_APP_SERVER_PREFIX}${collectionId}:${appId}`;
}

export {
  SkillConnectionError,
  SkillConnectionErrorCode,
  type SkillConnectionStatus,
  type SkillGatewayResponse,
} from "./skill-connection-types.js";

function findPlugin(collectionId: string) {
  return AVAILABLE_PLUGINS.find(({ id }) => id === collectionId);
}

function findPluginSkill(collectionId: string, skillId: string) {
  return findPlugin(collectionId)?.skills.find(
    (skill) =>
      skill.id === skillId ||
      `plugin:${collectionId}:${skill.id}` === skillId ||
      `system:${skill.id}` === skillId,
  );
}

function findPluginApp(collectionId: string, appId: string) {
  return findPlugin(collectionId)?.apps.find((app) => app.id === appId);
}

function findPluginAppByServerName(name: string) {
  if (!isPluginAppMcpServer(name)) return null;
  const [collectionId, appId] = name.slice(PLUGIN_APP_SERVER_PREFIX.length).split(":");
  if (!collectionId || !appId) return null;
  const app = findPluginApp(collectionId, appId);
  return app === undefined ? null : { app, collectionId };
}

export function resolvePluginAppCredential(
  server: McpServerRecord,
  credentials: SkillCredentialStore,
): McpCredential | null | undefined {
  const binding = findPluginAppByServerName(server.name);
  if (binding?.app.credentialSource !== "plugin-oauth") return undefined;
  const credential = credentials.read(binding.collectionId);
  if (
    credential === undefined ||
    (credential.expiresAt !== undefined && credential.expiresAt <= Date.now())
  )
    return null;
  return {
    configRevision: server.revision,
    identity: `plugin-oauth:${binding.collectionId}:${createHash("sha256").update(credential.accessToken).digest("base64url")}`,
    material: {
      environment: {},
      headers: { Authorization: `Bearer ${credential.accessToken}` },
      mode: McpAuthMode.STATIC,
    },
    revision: Math.max(1, Math.floor(credential.connectedAt)),
    serverId: server.id,
  };
}

function toMcpConfig(app: PluginAppDefinition): McpServerConfig {
  const compatibility = { logging: false, roots: false, sampling: false };
  if (app.server.type === "stdio") {
    return {
      args: [...app.server.args],
      command: app.server.command,
      compatibility,
      requestTimeoutMs: 30_000,
      transport: McpTransport.STDIO,
    };
  }
  return {
    allowPrivateNetwork: false,
    allowedOrigins: [],
    authMode: app.credentialSource === "plugin-oauth" ? McpAuthMode.STATIC : McpAuthMode.NONE,
    compatibility,
    requestTimeoutMs: 30_000,
    transport: app.server.type === "sse" ? McpTransport.SSE : McpTransport.STREAMABLE_HTTP,
    url: app.server.url,
  };
}

function registeredSkillId(collectionId: string, skillId: string): string {
  return `plugin:${collectionId}:${skillId}`;
}

export class SkillConnectionService {
  private readonly oauth: SkillOAuthService;

  public constructor(
    private readonly credentials: SkillCredentialStore,
    private readonly settings: AppSettingRepository,
    private readonly skillGatewayUrl: string,
    private readonly oauthClients: Readonly<Record<string, SkillOAuthClientConfig>>,
    private readonly mcpServers: McpServerService,
    private readonly refreshMcpApp: (server: McpServerVo) => void,
  ) {
    this.oauth = new SkillOAuthService(credentials, skillGatewayUrl);
  }

  public async synchronizeApps(): Promise<void> {
    for (const plugin of AVAILABLE_PLUGINS) {
      for (const app of plugin.apps) {
        const server = this.findAppServer(plugin.id, app.id);
        if (this.isInstalled(plugin.id)) {
          await this.ensureAppServer(plugin.id, app);
        } else if (server !== null) {
          await this.mcpServers.delete(server.id, server.revision);
        }
      }
    }
  }

  public isInstalled(collectionId: string): boolean {
    return this.settings.getInstalledSkillCollectionIds().includes(collectionId);
  }

  public async install(collectionId: string): Promise<void> {
    const plugin = this.requirePlugin(collectionId);
    for (const app of plugin.apps) await this.ensureAppServer(collectionId, app);
    const installed = new Set(this.settings.getInstalledSkillCollectionIds());
    installed.add(collectionId);
    this.settings.setInstalledSkillCollectionIds([...installed].sort(), Date.now());
  }

  public getAppServer(collectionId: string, appId: string): McpServerVo | null {
    this.requireApp(collectionId, appId);
    return this.isInstalled(collectionId) ? this.findAppServer(collectionId, appId) : null;
  }

  public async setAppEnabled(
    collectionId: string,
    appId: string,
    isEnabled: boolean,
  ): Promise<void> {
    this.requireInstalled(collectionId);
    const app = this.requireApp(collectionId, appId);
    let server = await this.ensureAppServer(collectionId, app);
    if (server.enabled !== isEnabled) {
      server = await this.mcpServers.update(server.id, {
        config: server.config,
        enabled: isEnabled,
        expectedRevision: server.revision,
        name: server.name,
      });
    }
    if (isEnabled) {
      if (!server.isTrusted) server = await this.mcpServers.trust(server.id, server.revision);
      this.refreshMcpApp(server);
    }
  }

  public async putAppCredential(
    collectionId: string,
    appId: string,
    values: Readonly<Record<string, string>>,
  ): Promise<void> {
    const server = this.requireEnabledAppServer(collectionId, appId);
    await this.mcpServers.putCredential(server.id, {
      expectedRevision: server.revision,
      material: {
        mode: McpAuthMode.STATIC,
        headers: server.config.transport === McpTransport.STDIO ? {} : { ...values },
        environment: server.config.transport === McpTransport.STDIO ? { ...values } : {},
      },
    });
    const trusted = await this.mcpServers.trust(server.id, server.revision);
    this.refreshMcpApp(trusted);
  }

  public async deleteAppCredential(collectionId: string, appId: string): Promise<void> {
    const server = this.requireEnabledAppServer(collectionId, appId);
    await this.mcpServers.deleteCredential(server.id, server.revision);
    const trusted = await this.mcpServers.trust(server.id, server.revision);
    this.refreshMcpApp(trusted);
  }

  public isSkillEnabled(collectionId: string, skillId: string): boolean {
    const skill = findPluginSkill(collectionId, skillId);
    if (!skill) return false;
    const disabled = this.settings.getDisabledSkillCollectionSkillIds();
    return (
      !disabled.includes(registeredSkillId(collectionId, skill.id)) &&
      !disabled.includes(`system:${skill.id}`)
    );
  }

  public getSkillContent(collectionId: string, skillId: string): string {
    const skill = findPluginSkill(collectionId, skillId);
    if (!skill) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.SKILL_NOT_FOUND,
        "插件中不存在该 Skill",
      );
    }
    return skill.instructions.replaceAll("{skillGatewayUrl}", this.skillGatewayUrl);
  }

  public setSkillEnabled(collectionId: string, skillId: string, isEnabled: boolean): void {
    this.requireInstalled(collectionId);
    const skill = findPluginSkill(collectionId, skillId);
    if (!skill) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.SKILL_NOT_FOUND,
        "插件中不存在该 Skill",
      );
    }

    const disabled = new Set(this.settings.getDisabledSkillCollectionSkillIds());
    const id = registeredSkillId(collectionId, skill.id);
    disabled.delete(`system:${skill.id}`);
    if (isEnabled) disabled.delete(id);
    else disabled.add(id);
    this.settings.setDisabledSkillCollectionSkillIds([...disabled].sort(), Date.now());
  }

  public async uninstall(collectionId: string): Promise<void> {
    const plugin = this.requirePlugin(collectionId);
    for (const app of plugin.apps) {
      const server = this.findAppServer(collectionId, app.id);
      if (server !== null) await this.mcpServers.delete(server.id, server.revision);
    }
    await this.credentials.delete(collectionId);
    const collectionSkillIds = new Set<string>(
      plugin.skills.flatMap(({ id }) => [registeredSkillId(collectionId, id), `system:${id}`]),
    );
    this.settings.setDisabledSkillCollectionSkillIds(
      this.settings
        .getDisabledSkillCollectionSkillIds()
        .filter((skillId) => !collectionSkillIds.has(skillId)),
      Date.now(),
    );
    const installed = new Set(this.settings.getInstalledSkillCollectionIds());
    installed.delete(collectionId);
    this.settings.setInstalledSkillCollectionIds([...installed].sort(), Date.now());
  }

  public createAuthorizationUrl(collectionId: string): string {
    const plugin = this.requireOAuthPlugin(collectionId);
    this.requireInstalled(collectionId);
    return this.oauth.createAuthorizationUrl(plugin);
  }

  public async completeAuthorization(
    collectionId: string,
    code: string,
    state: string,
  ): Promise<void> {
    const plugin = this.requireOAuthPlugin(collectionId);
    this.requireInstalled(collectionId);
    await this.oauth.completeAuthorization(plugin, code, state);
    this.refreshPluginOAuthApps(plugin);
  }

  public async getStatus(collectionId: string): Promise<SkillConnectionStatus> {
    const plugin = this.requirePlugin(collectionId);
    let credential = this.oauth.readCredential(plugin);
    if (credential !== undefined && plugin.type === SkillType.OAUTH) {
      try {
        credential = await this.oauth.requireCredential(this.requireOAuthPlugin(collectionId));
      } catch (cause: unknown) {
        if (
          !(cause instanceof SkillConnectionError) ||
          cause.code !== SkillConnectionErrorCode.NOT_CONNECTED
        )
          throw cause;
        credential = undefined;
        this.refreshPluginOAuthApps(plugin);
      }
    }
    return {
      account: credential?.account ?? null,
      collectionId,
      isConnected: credential !== undefined,
    };
  }

  public async disconnect(collectionId: string): Promise<void> {
    const plugin = this.requirePlugin(collectionId);
    await this.credentials.delete(collectionId);
    this.refreshPluginOAuthApps(plugin);
  }

  public async refreshPluginAppCredential(
    server: McpServerRecord,
    signal?: AbortSignal,
  ): Promise<void> {
    const binding = findPluginAppByServerName(server.name);
    if (binding?.app.credentialSource !== "plugin-oauth") return;
    try {
      await this.oauth.requireCredential(this.requireOAuthPlugin(binding.collectionId), signal);
    } catch (cause: unknown) {
      if (!(cause instanceof SkillConnectionError)) throw cause;
      throw new McpError(
        cause.code === SkillConnectionErrorCode.NOT_CONNECTED
          ? McpErrorCode.STATIC_CREDENTIAL_REQUIRED
          : McpErrorCode.CONNECTION_FAILED,
        cause.message,
      );
    }
  }

  public async invalidatePluginAppCredential(server: McpServerRecord): Promise<boolean> {
    const binding = findPluginAppByServerName(server.name);
    if (binding?.app.credentialSource !== "plugin-oauth") return false;
    await this.credentials.delete(binding.collectionId);
    return true;
  }

  public async request(
    collectionId: string,
    path: string,
    search: string,
    signal?: AbortSignal,
  ): Promise<SkillGatewayResponse> {
    const plugin = this.requirePlugin(collectionId);
    this.requireInstalled(collectionId);
    const credential =
      plugin.type === SkillType.OAUTH
        ? await this.oauth.requireCredential(this.requireOAuthPlugin(collectionId), signal)
        : undefined;
    return requestSkillGateway(plugin, credential, path, search, signal);
  }

  private requireInstalled(collectionId: string): void {
    if (this.isInstalled(collectionId)) return;
    throw new SkillConnectionError(
      SkillConnectionErrorCode.NOT_INSTALLED,
      `请先在插件市场安装 ${this.requirePlugin(collectionId).name}`,
    );
  }

  private requireApp(collectionId: string, appId: string): PluginAppDefinition {
    const app = findPluginApp(collectionId, appId);
    if (app) return app;
    throw new SkillConnectionError(SkillConnectionErrorCode.APP_NOT_FOUND, "插件中不存在该应用");
  }

  private requireEnabledAppServer(collectionId: string, appId: string): McpServerVo {
    this.requireInstalled(collectionId);
    const server = this.findAppServer(collectionId, appId);
    if (server?.enabled) return server;
    throw new SkillConnectionError(SkillConnectionErrorCode.APP_MCP_FAILED, "请先开启插件应用");
  }

  private findAppServer(collectionId: string, appId: string): McpServerVo | null {
    const name = pluginAppServerName(collectionId, appId);
    return this.mcpServers.list().find((server) => server.name === name) ?? null;
  }

  private async ensureAppServer(
    collectionId: string,
    app: PluginAppDefinition,
  ): Promise<McpServerVo> {
    const name = pluginAppServerName(collectionId, app.id);
    const config = toMcpConfig(app);
    const current = this.findAppServer(collectionId, app.id);
    if (current === null) return this.mcpServers.create({ config, name });
    if (isEqual(current.config, config)) return current;
    const updated = await this.mcpServers.update(current.id, {
      config,
      enabled: current.enabled,
      expectedRevision: current.revision,
      name,
    });
    return updated.enabled ? this.mcpServers.trust(updated.id, updated.revision) : updated;
  }

  private refreshPluginOAuthApps(plugin: PluginDefinition): void {
    for (const app of plugin.apps) {
      if (app.credentialSource !== "plugin-oauth") continue;
      const server = this.findAppServer(plugin.id, app.id);
      if (server?.enabled) this.refreshMcpApp(server);
    }
  }

  private requirePlugin(collectionId: string): PluginDefinition {
    const plugin = findPlugin(collectionId);
    if (plugin) return plugin;
    throw new SkillConnectionError(
      SkillConnectionErrorCode.COLLECTION_NOT_FOUND,
      "插件市场中不存在该插件",
    );
  }

  private requireOAuthPlugin(collectionId: string): OAuthPluginDefinition {
    const plugin = this.requirePlugin(collectionId);
    if (plugin.type === SkillType.OAUTH && plugin.oauth) {
      return {
        ...plugin,
        oauth: { ...plugin.oauth, ...this.oauthClients[collectionId] },
      };
    }
    throw new SkillConnectionError(
      SkillConnectionErrorCode.OAUTH_FAILED,
      `${plugin.name} 不提供 OAuth 授权`,
    );
  }
}
