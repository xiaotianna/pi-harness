import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { formatLoadedSkill, type SkillRegistry } from "@pi-harness/tools";
import { isPlainObject } from "es-toolkit";
import type { HarnessUserMessage } from "../user-input.js";
import { isHarnessUserMessage } from "../user-input.js";

export async function expandExplicitSkills(
  message: HarnessUserMessage,
  registry?: SkillRegistry,
  signal?: AbortSignal,
): Promise<HarnessUserMessage> {
  const previous = new Set(message.activatedSkills?.map(({ contentIndex }) => contentIndex));
  const content =
    typeof message.content === "string"
      ? [{ type: "text" as const, text: message.content }]
      : message.content.filter((_, index) => !previous.has(index));
  const result = { ...message, content };
  delete result.activatedSkills;
  if (!registry) return result;
  const names = new Set(
    [...message.displayText.matchAll(/(?:^|[\s(])\$([a-z0-9]+(?:-[a-z0-9]+)*)(?![a-z0-9_-])/g)].map(
      (match) => match[1],
    ),
  );
  if (!names.size) return result;
  const skills = (await registry.discover(signal)).filter((skill) => names.has(skill.name));
  const activatedSkills: { id: string; contentIndex: number }[] = [];
  for (const skill of skills) {
    signal?.throwIfAborted();
    const loaded = await registry.load(skill.name, skill.scope, undefined, signal);
    activatedSkills.push({ id: loaded.id, contentIndex: content.length });
    content.push({ type: "text", text: formatLoadedSkill(loaded) });
  }
  return { ...result, ...(activatedSkills.length ? { activatedSkills } : {}) };
}

export function preserveSkillInstructions(
  messages: readonly AgentMessage[],
  start: number,
  tail: number,
): AgentMessage[] {
  const latest = new Map<string, { index: number; text: string }>();
  for (let index = start; index < messages.length; index += 1) {
    const message = messages[index];
    if (isHarnessUserMessage(message) && Array.isArray(message.content)) {
      for (const skill of message.activatedSkills ?? []) {
        const part = message.content[skill.contentIndex];
        if (part?.type === "text") latest.set(skill.id, { index, text: part.text });
      }
    } else if (
      message?.role === "toolResult" &&
      !message.isError &&
      message.toolName === "load_skill" &&
      isPlainObject(message.details) &&
      message.details.resource === "SKILL.md" &&
      typeof message.details.id === "string"
    ) {
      latest.set(message.details.id, {
        index,
        text: message.content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n"),
      });
    }
  }
  return [...latest.values()]
    .filter((skill) => skill.index < tail)
    .map((skill) => ({
      role: "user",
      content: skill.text,
      timestamp: 0,
    }));
}
