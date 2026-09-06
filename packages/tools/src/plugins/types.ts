import type { SkillType } from "../skills/types.js";

export interface PluginOAuthDefinition {
  authorizationPath: string;
  profile: {
    avatarUrlField?: string;
    displayNameField?: string;
    idField: string;
    method?: "GET" | "POST";
    path?: string;
    source: "id-token" | "token" | "userinfo";
    usernameField: string;
  };
  scopes: readonly string[];
  tokenPath: string;
}

export interface PluginSkillDefinition {
  description: string;
  displayName: string;
  id: string;
  instructions: string;
  name: string;
  type: SkillType;
}

export interface PluginDefinition {
  apiUrl: string;
  category: "developer" | "productivity";
  description: string;
  id: string;
  logo?: string;
  name: string;
  oauth?: PluginOAuthDefinition;
  skills: readonly PluginSkillDefinition[];
  type: SkillType;
}
