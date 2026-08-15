export function formatTraceDuration(durationMs: number): string {
  if (durationMs < 1_000) return `${Math.round(durationMs)} ms`;
  return `${(durationMs / 1_000).toFixed(2)} s`;
}
