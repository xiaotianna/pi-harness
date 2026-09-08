import { AVAILABLE_PLUGINS } from "@pi-harness/tools";

export function resolveSkillIcon(collectionId: string | null, skillId: string): string | null {
  const plugin = AVAILABLE_PLUGINS.find((plugin) => plugin.id === collectionId);
  return plugin?.skills.find((skill) => skill.id === skillId)?.icon ?? plugin?.logo ?? null;
}
