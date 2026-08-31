import type { AgentMessage } from "@pi-harness/agent-runtime";
import { isInternalAgentMessage } from "@pi-harness/agent-runtime/agent-message";
import { isHarnessUserMessage } from "@pi-harness/agent-runtime/user-input";

const DESCRIPTION_LENGTH = 160;
const EXCERPT_LENGTH = 240;
const EXCERPT_PREFIX_LENGTH = 32;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function readVisibleMessageText(message: AgentMessage): string {
  if (
    isInternalAgentMessage(message) ||
    (message.role !== "user" && message.role !== "assistant")
  ) {
    return "";
  }
  if (isHarnessUserMessage(message)) return normalizeWhitespace(message.displayText);
  if (typeof message.content === "string") return normalizeWhitespace(message.content);
  return normalizeWhitespace(
    message.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join(" "),
  );
}

function clip(value: string, maximumLength: number): string {
  return value.length > maximumLength ? `${value.slice(0, maximumLength - 1)}…` : value;
}

function createExcerpt(value: string, normalizedQuery: string): string {
  const matchIndex = value.toLocaleLowerCase().indexOf(normalizedQuery);
  if (matchIndex < 0) return clip(value, EXCERPT_LENGTH);
  const maximumLength = Math.max(EXCERPT_LENGTH, normalizedQuery.length);
  const start = Math.max(0, matchIndex - EXCERPT_PREFIX_LENGTH);
  const end = Math.min(value.length, start + maximumLength);
  return `${start > 0 ? "…" : ""}${value.slice(start, end)}${end < value.length ? "…" : ""}`;
}

export interface SessionSearchContent {
  description: string;
  excerpt: string;
  hasMessageMatch: boolean;
  matchingMessageIndex: number | null;
}

export function readSessionSearchContent(
  messages: readonly AgentMessage[],
  normalizedQuery: string,
): SessionSearchContent {
  const texts = messages.map(readVisibleMessageText);
  const description = clip(texts.findLast(Boolean) ?? "", DESCRIPTION_LENGTH);
  const matchingMessageIndex = normalizedQuery
    ? texts.findLastIndex((text) => text.toLocaleLowerCase().includes(normalizedQuery))
    : -1;
  const matchingText = matchingMessageIndex < 0 ? undefined : texts[matchingMessageIndex];

  return {
    description,
    excerpt: matchingText ? createExcerpt(matchingText, normalizedQuery) : description,
    hasMessageMatch: matchingText !== undefined,
    matchingMessageIndex: matchingMessageIndex < 0 ? null : matchingMessageIndex,
  };
}

export function normalizeSessionSearchQuery(value: string): string {
  return normalizeWhitespace(value).toLocaleLowerCase();
}
