import type { LoadedSkill } from "../skill-registry.js";

export function formatLoadedSkill(skill: LoadedSkill): string {
  return [
    `<skill_content name="${skill.name}" resource="${skill.resource.replaceAll('"', "&quot;")}">`,
    `Skill directory: ${skill.directory ?? "built-in"}`,
    "Resolve script and asset paths relative to this directory. Use absolute paths with run_command; its working directory remains the workspace.",
    `Metadata: ${JSON.stringify(skill.frontmatter)}`,
    ...(skill.frontmatter["allowed-tools"]?.length
      ? [
          "Tool preapproval requires load_skill with approveTools: true and user approval. Loading these instructions alone does not grant tool permissions.",
        ]
      : []),
    skill.content,
    ...(skill.resource === "SKILL.md"
      ? [
          `Resources${skill.resourcesTruncated ? " (partial)" : ""}: ${JSON.stringify(skill.resources)}`,
        ]
      : []),
    "</skill_content>",
  ].join("\n");
}
