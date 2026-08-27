import type { ThinkingLevel as PiThinkingLevel } from "@earendil-works/pi-ai";

export const ThinkingLevel = {
  HIGH: "high",
  LOW: "low",
  MEDIUM: "medium",
} as const satisfies Record<string, PiThinkingLevel>;

export type ThinkingLevel = (typeof ThinkingLevel)[keyof typeof ThinkingLevel];

export const DEFAULT_THINKING_LEVEL = ThinkingLevel.MEDIUM;
export const THINKING_LEVELS = Object.values(ThinkingLevel);

export function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return THINKING_LEVELS.some((level) => level === value);
}
