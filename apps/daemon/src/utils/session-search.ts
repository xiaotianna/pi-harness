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

export interface SessionSearchDocument {
  description: string;
  messages: readonly {
    messageIndex: number;
    normalizedText: string;
    text: string;
  }[];
}

export function createSessionSearchDocument(
  messages: readonly AgentMessage[],
): SessionSearchDocument {
  const searchableMessages = messages.flatMap((message, messageIndex) => {
    const text = readVisibleMessageText(message);
    return text ? [{ messageIndex, normalizedText: text.toLocaleLowerCase(), text }] : [];
  });
  return {
    description: clip(searchableMessages.at(-1)?.text ?? "", DESCRIPTION_LENGTH),
    messages: searchableMessages,
  };
}

export function createSessionSearchExcerpt(text: string, normalizedQuery: string): string {
  return createExcerpt(text, normalizedQuery);
}

export function normalizeSessionSearchQuery(value: string): string {
  return normalizeWhitespace(value).toLocaleLowerCase();
}
