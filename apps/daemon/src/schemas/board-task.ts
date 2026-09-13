export const BoardTaskStatus = {
  COMPLETED: "completed",
  IN_PROGRESS: "in_progress",
  PENDING: "pending",
  REVIEW: "review",
  WAITING: "waiting",
} as const;

export type BoardTaskStatus = (typeof BoardTaskStatus)[keyof typeof BoardTaskStatus];

const BOARD_TASK_STATUSES = new Set<string>(Object.values(BoardTaskStatus));

export function isBoardTaskStatus(value: unknown): value is BoardTaskStatus {
  return typeof value === "string" && BOARD_TASK_STATUSES.has(value);
}
