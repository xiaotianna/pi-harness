import type { ModelThinkingLevel } from "@earendil-works/pi-ai";

export const ThinkingLevel = {
  OFF: "off",
  MINIMAL: "minimal",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  XHIGH: "xhigh",
  MAX: "max",
} as const satisfies Record<string, ModelThinkingLevel>;

export type ThinkingLevel = (typeof ThinkingLevel)[keyof typeof ThinkingLevel];

export const DEFAULT_THINKING_LEVEL = ThinkingLevel.MEDIUM;
export const THINKING_LEVELS = Object.values(ThinkingLevel);

export function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return THINKING_LEVELS.some((level) => level === value);
}

export function resolveThinkingLevel(
  supportedLevels: readonly ThinkingLevel[],
  requestedLevel: ThinkingLevel,
): ThinkingLevel {
  if (supportedLevels.includes(requestedLevel)) return requestedLevel;

  const requestedIndex = THINKING_LEVELS.indexOf(requestedLevel);
  for (let index = requestedIndex; index < THINKING_LEVELS.length; index += 1) {
    const level = THINKING_LEVELS[index];
    if (level && supportedLevels.includes(level)) return level;
  }
  for (let index = requestedIndex - 1; index >= 0; index -= 1) {
    const level = THINKING_LEVELS[index];
    if (level && supportedLevels.includes(level)) return level;
  }
  return ThinkingLevel.OFF;
}
