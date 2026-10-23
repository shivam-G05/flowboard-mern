import { DAY_MS } from './constants.js';

/**
 * Day boundaries in the user's local time zone.
 * offsetMinutes = minutes east of UTC (the browser sends -new Date().getTimezoneOffset(), e.g. +330 for IST).
 */
export function dayBounds(now, offsetMinutes = 0) {
  const offsetMs = offsetMinutes * 60 * 1000;
  const localMidnight = Math.floor((now.getTime() + offsetMs) / DAY_MS) * DAY_MS;
  const start = new Date(localMidnight - offsetMs);
  const end = new Date(start.getTime() + DAY_MS - 1);
  return { start, end };
}

/** "+05:30" style offset string accepted by MongoDB's $dateToString timezone option. */
export function offsetToTimezone(offsetMinutes = 0) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

/** YYYY-MM-DD key of a date in the user's local time zone. */
export function localDayKey(date, offsetMinutes = 0) {
  return new Date(date.getTime() + offsetMinutes * 60 * 1000).toISOString().slice(0, 10);
}

export function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
