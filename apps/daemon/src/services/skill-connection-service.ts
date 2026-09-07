import { AVAILABLE_PLUGINS, type PluginDefinition, SkillType } from "@pi-harness/tools";
import type { SkillOAuthClientConfig } from "../config/index.js";
import type { AppSettingRepository } from "../storage/database.js";
import type { SkillCredentialStore } from "../storage/skill-credential-store.js";
import {
  SkillConnectionError,
  SkillConnectionErrorCode,
  type SkillConnectionStatus,
  type SkillGatewayResponse,
} from "./skill-connection-types.js";
import { requestSkillGateway } from "./skill-gateway.js";
import { type OAuthPluginDefinition, SkillOAuthService } from "./skill-oauth-service.js";

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
  ) {
    this.oauth = new SkillOAuthService(credentials, skillGatewayUrl);
  }

  public isInstalled(collectionId: string): boolean {
    return this.settings.getInstalledSkillCollectionIds().includes(collectionId);
  }

  public install(collectionId: string): void {
    this.requirePlugin(collectionId);
    const installed = new Set(this.settings.getInstalledSkillCollectionIds());
    installed.add(collectionId);
    this.settings.setInstalledSkillCollectionIds([...installed].sort(), Date.now());
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
  }

  public getStatus(collectionId: string): SkillConnectionStatus {
    const plugin = this.requirePlugin(collectionId);
    const credential = this.oauth.readCredential(plugin);
    return {
      account: credential?.account ?? null,
      collectionId,
      isConnected: credential !== undefined,
    };
  }

  public async disconnect(collectionId: string): Promise<void> {
    this.requirePlugin(collectionId);
    await this.credentials.delete(collectionId);
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
