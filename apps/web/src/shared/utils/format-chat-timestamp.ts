const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export function formatChatTimestamp(value: string | number | Date, now = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const elapsed = Math.max(0, now.getTime() - date.getTime());
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday && elapsed < MINUTE_MS) return "刚刚";
  if (isToday && elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}分钟前`;
  if (isToday) return `${Math.floor(elapsed / HOUR_MS)}小时前`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return "昨天";
  }

  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  return `${date.getFullYear()}年`;
}
