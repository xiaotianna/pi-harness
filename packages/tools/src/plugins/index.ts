import { type SkillDefinition, SkillScope } from "../skills/types.js";
import { loadPlugin } from "./load-plugin.js";
import type { PluginDefinition } from "./types.js";

const BUILT_IN_PLUGIN_IDS = [
  "vercel",
  "github",
  "google",
  "slack",
  "apple",
  "microsoft",
  "aws",
] as const;

export const AVAILABLE_PLUGINS: readonly PluginDefinition[] = BUILT_IN_PLUGIN_IDS.map(loadPlugin);

export function resolveRegisteredPluginSkills(
  installedPluginIds: readonly string[],
  disabledSkillIds: readonly string[],
): readonly SkillDefinition[] {
  const installed = new Set(installedPluginIds);
  const disabled = new Set(disabledSkillIds);

  return AVAILABLE_PLUGINS.filter((plugin) => installed.has(plugin.id)).flatMap((plugin) =>
    plugin.skills
      .filter(
        (skill) =>
          !disabled.has(`plugin:${plugin.id}:${skill.id}`) && !disabled.has(`system:${skill.id}`),
      )
      .map((skill) => ({
        collectionId: plugin.id,
        description: skill.description,
        id: `plugin:${plugin.id}:${skill.id}`,
        instructions: skill.instructions,
        name: skill.name,
        scope: SkillScope.GLOBAL,
        type: skill.type,
      })),
  );
}

export type { PluginDefinition, PluginSkillDefinition } from "./types.js";
