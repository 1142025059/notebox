const pad = (n: number) => String(n).padStart(2, '0');

const toDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** 完整时间戳（本地时区，精确到秒）：2026-11-18 15:32:07 */
export function formatDateTime(iso: string | null | undefined): string {
  const date = toDate(iso);
  if (!date) return '—';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 列表用的紧凑格式：今天只给时刻，今年给月日，往年给完整日期。 */
export function formatCompact(iso: string | null | undefined): string {
  const date = toDate(iso);
  if (!date) return '—';
  const now = new Date();
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (date.toDateString() === now.toDateString()) return time;
  if (date.getFullYear() === now.getFullYear()) {
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
