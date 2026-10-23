import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from 'date-fns';

export function formatDate(value, pattern = 'MMM d, yyyy') {
  if (!value) return '—';
  return format(new Date(value), pattern);
}

/** "Today", "Tomorrow", "Yesterday" or "Mar 4" — compact, human due dates. */
export function formatDueDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, d.getFullYear() === new Date().getFullYear() ? 'MMM d' : 'MMM d, yyyy');
}

export function timeAgo(value) {
  if (!value) return '';
  return `${formatDistanceToNowStrict(new Date(value))} ago`;
}

/** 93_600_000 → "1d 2h". Handles null and negative values. */
export function formatDuration(ms) {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '—';
  const abs = Math.abs(ms);
  const minutes = Math.floor(abs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${Math.max(minutes, abs > 0 ? 1 : 0)}m`;
}

/** Converts a Date/ISO string to the value format of <input type="datetime-local">. */
export function toDateTimeInput(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeInput(value) {
  return value ? new Date(value).toISOString() : null;
}

export function pluralize(count, word, plural = `${word}s`) {
  return `${count} ${count === 1 ? word : plural}`;
}
