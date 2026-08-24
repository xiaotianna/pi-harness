import { isPlainObject } from "es-toolkit";
import { AUTO_FOLLOW_UP_MARKER } from "../prompts/auto-follow-up-prompt.js";

function hasAutoFollowUpMarker(text: string): boolean {
  const trimmedText = text.trimEnd();
  return (
    trimmedText === AUTO_FOLLOW_UP_MARKER || trimmedText.endsWith(`\n${AUTO_FOLLOW_UP_MARKER}`)
  );
}

export function requestsAutoFollowUp(value: unknown): boolean {
  if (!isPlainObject(value) || value.role !== "assistant" || !Array.isArray(value.content)) {
    return false;
  }

  for (let index = value.content.length - 1; index >= 0; index -= 1) {
    const part = value.content[index];
    if (isPlainObject(part) && part.type === "text" && typeof part.text === "string") {
      return hasAutoFollowUpMarker(part.text);
    }
  }
  return false;
}

export function stripAutoFollowUpMarker(text: string): string {
  const trimmedText = text.trimEnd();
  if (trimmedText === AUTO_FOLLOW_UP_MARKER) return "";

  const markerLine = `\n${AUTO_FOLLOW_UP_MARKER}`;
  return trimmedText.endsWith(markerLine)
    ? trimmedText.slice(0, -markerLine.length).trimEnd()
    : text;
}
