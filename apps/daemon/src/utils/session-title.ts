const MAX_SESSION_TITLE_LENGTH = 60;
const MAX_SESSION_TITLE_SOURCE_LENGTH = 4_000;

export function buildSessionTitleSource(
  prompt: string,
  attachmentNames: readonly string[],
  referencePaths: readonly string[],
): string {
  return [
    prompt.trim(),
    attachmentNames.length ? `附件：${attachmentNames.join("、")}` : "",
    referencePaths.length ? `引用：${referencePaths.join("、")}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_SESSION_TITLE_SOURCE_LENGTH);
}

export function createFallbackSessionTitle(source: string): string {
  return source.replace(/\s+/g, " ").trim().slice(0, MAX_SESSION_TITLE_LENGTH) || "New session";
}

export function normalizeGeneratedSessionTitle(value: string, fallback: string): string {
  const firstLine = value.trim().split(/\r?\n/, 1)[0] ?? "";
  return (
    firstLine
      .replace(/^(?:标题|title)\s*[:：]\s*/i, "")
      .replace(/^[`"'“”‘’]+|[`"'“”‘’。.!！]+$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_SESSION_TITLE_LENGTH) || fallback
  );
}
