export const BoardTaskStatus = {
  COMPLETED: "completed",
  IN_PROGRESS: "in_progress",
  PENDING: "pending",
  REVIEW: "review",
  WAITING: "waiting",
} as const;

export type BoardTaskStatus = (typeof BoardTaskStatus)[keyof typeof BoardTaskStatus];

export const BOARD_TASK_COLUMNS = [
  { color: "var(--default)", id: BoardTaskStatus.PENDING, label: "待开始" },
  { color: "var(--accent)", id: BoardTaskStatus.IN_PROGRESS, label: "执行中" },
  { color: "var(--warning)", id: BoardTaskStatus.WAITING, label: "需处理" },
  {
    color: "color-mix(in oklab, var(--accent) 62%, var(--danger))",
    id: BoardTaskStatus.REVIEW,
    label: "待验收",
  },
  { color: "var(--success)", id: BoardTaskStatus.COMPLETED, label: "已完成" },
] as const;

export const BOARD_TASK_STATUS_LABELS: Record<BoardTaskStatus, string> = Object.fromEntries(
  BOARD_TASK_COLUMNS.map((column) => [column.id, column.label]),
) as Record<BoardTaskStatus, string>;

export function isBoardTaskStatus(value: unknown): value is BoardTaskStatus {
  return BOARD_TASK_COLUMNS.some((column) => column.id === value);
}
