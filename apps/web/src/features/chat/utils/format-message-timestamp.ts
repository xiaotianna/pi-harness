const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
});

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function formatMessageTimestamp(value: number, now = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const time = TIME_FORMATTER.format(date);
  if (isSameDay(date, now)) return time;

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (isSameDay(date, yesterday)) return `昨天 ${time}`;

  const dateLabel = `${date.getMonth() + 1}月${date.getDate()}日`;
  return date.getFullYear() === now.getFullYear()
    ? `${dateLabel} ${time}`
    : `${date.getFullYear()}年${dateLabel} ${time}`;
}
