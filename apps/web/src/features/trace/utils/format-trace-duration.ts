export function formatTraceDuration(durationMs: number): string {
  if (durationMs < 1_000) return `${Math.round(durationMs)} ms`;
  return `${(durationMs / 1_000).toFixed(2)} s`;
}

export function formatTraceTimestamp(value: number | null): string {
  if (value === null) return "—";
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    fractionalSecondDigits: 3,
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    year: "numeric",
  });
}
