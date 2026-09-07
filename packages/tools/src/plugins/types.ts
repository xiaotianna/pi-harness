import type { SkillType } from "../skills/types.js";

export interface PluginOAuthDefinition {
  authorizationParams?: Readonly<Record<string, string>>;
  authorizationPath: string;
  callbackUrl?: string;
  clientId: string;
  clientSecret: string;
  pkce: boolean;
  profile?: {
    avatarUrlField?: string;
    displayNameField?: string;
    idField: string;
    method?: "GET" | "POST";
    path?: string;
    source: "id-token" | "token" | "userinfo";
    usernameField: string;
  };
  scopes: readonly string[];
  tokenAuth: "basic" | "body";
  tokenFormat: "form" | "json";
  tokenPath: string;
}

export interface PluginGatewayDefinition {
  allowedPaths: readonly string[];
  deniedQueryValues?: Readonly<Record<string, readonly string[]>>;
  headers?: Readonly<Record<string, string>>;
  queryJsonPostPaths?: readonly string[];
}

export interface PluginSkillDefinition {
  description: string;
  displayName: string;
  icon?: string;
  id: string;
  instructions: string;
  name: string;
  type: SkillType;
}

export interface PluginDefinition {
  apiUrl: string;
  category: "developer" | "productivity";
  description: string;
  gateway: PluginGatewayDefinition;
  id: string;
  logo?: string;
  name: string;
  oauth?: PluginOAuthDefinition;
  skills: readonly PluginSkillDefinition[];
  type: SkillType;
}
