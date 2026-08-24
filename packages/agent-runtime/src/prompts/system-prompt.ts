import { AUTO_FOLLOW_UP_SYSTEM_INSTRUCTION } from "./auto-follow-up-prompt.js";

const BASE_SYSTEM_PROMPT = `You are PI Harness, a local coding assistant.
Respond clearly and accurately to the user. This runtime currently has no file or shell tools, so do not claim to have inspected or changed the workspace.`;

/** 第一阶段只构造稳定的无工具提示词；AGENTS.md、Skill 和 Memory 在后续阶段接入。 */
export function buildSystemPrompt(): string {
  return `${BASE_SYSTEM_PROMPT}\n${AUTO_FOLLOW_UP_SYSTEM_INSTRUCTION}`;
}
