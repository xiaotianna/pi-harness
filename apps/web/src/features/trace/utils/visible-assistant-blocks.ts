import { isPlainObject } from "es-toolkit";

export function visibleAssistantBlocks(content: readonly unknown[]): unknown[] {
  return content.filter(
    (block) =>
      !(
        isPlainObject(block) &&
        block.type === "text" &&
        typeof block.text === "string" &&
        !block.text.trim()
      ),
  );
}
