/**
 * ArkCRM — Date & time helpers
 * ---------------------------------------------------------------------------
 * Thin wrappers over dayjs so every screen agrees on format, timezone
 * handling and relative wording. All formatters return strings safe to render
 * directly.
 */

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import duration from 'dayjs/plugin/duration';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(duration);
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export { dayjs };

/** The tenant's business timezone; override per-vendor in settings. */
export const DEFAULT_TIMEZONE = 'Africa/Lagos';

export const DATE_FORMATS = {
  short: 'DD MMM YYYY',
  medium: 'DD MMM YYYY, h:mm A',
  long: 'dddd, DD MMMM YYYY',
  numeric: 'YYYY-MM-DD',
  month: 'MMMM YYYY',
  time: 'h:mm A',
  dayMonth: 'DD MMM',
};

/**
 * Formats a date using one of the shared DATE_FORMATS presets.
 * Invalid input yields an em dash so tables never show "Invalid Date".
 */
export function formatDate(value, preset = 'short', tz = DEFAULT_TIMEZONE) {
  if (!value) return '—';
  const d = dayjs(value);
  if (!d.isValid()) return '—';
  const pattern = DATE_FORMATS[preset] ?? preset;
  return tz ? d.tz(tz).format(pattern) : d.format(pattern);
}

/** Date + time, the default for audit trails and timeline entries. */
export function formatDateTime(value, tz = DEFAULT_TIMEZONE) {
  return formatDate(value, 'medium', tz);
}

/** "3 hours ago", "in 2 days" — for activity feeds and notifications. */
export function fromNow(value) {
  if (!value) return '—';
  const d = dayjs(value);
  if (!d.isValid()) return '—';
  return d.fromNow();
}

/** "Today", "Yesterday", or a formatted date — the most common table column. */
export function formatSmartDate(value) {
  if (!value) return '—';
  const d = dayjs(value);
  if (!d.isValid()) return '—';
  if (d.isToday()) return `Today, ${d.format('h:mm A')}`;
  if (d.isYesterday()) return `Yesterday, ${d.format('h:mm A')}`;
  return formatDate(value, 'short');
}

/** Coarse relative label used on kanban cards: "2d", "5h", "3w". */
export function formatRelativeShort(value) {
  if (!value) return '—';
  const diff = dayjs(value).fromNow(true);
  const [amount, unit] = diff.split(' ');
  return `${parseInt(amount, 10)}${unit?.[0] ?? ''}`;
}

/**
 * Resolves a DATE_RANGES id into a concrete { from, to } ISO pair.
 * `custom` expects `days` to already be a { from, to } object.
 */
export function resolveDateRange(range) {
  const to = dayjs();
  switch (range) {
    case 'today':
      return { from: to.startOf('day').toISOString(), to: to.endOf('day').toISOString() };
    case '7d':
      return { from: to.subtract(6, 'day').startOf('day').toISOString(), to: to.toISOString() };
    case '30d':
      return { from: to.subtract(29, 'day').startOf('day').toISOString(), to: to.toISOString() };
    case '90d':
      return { from: to.subtract(89, 'day').startOf('day').toISOString(), to: to.toISOString() };
    case 'ytd':
      return { from: to.startOf('year').toISOString(), to: to.toISOString() };
    default:
      return { from: to.subtract(29, 'day').toISOString(), to: to.toISOString() };
  }
}

/** Inclusive day count between two dates. */
export function daysBetween(from, to) {
  const a = dayjs(from);
  const b = dayjs(to);
  if (!a.isValid() || !b.isValid()) return 0;
  return b.diff(a, 'day');
}

/** Whole days overdue. Negative for future dates. */
export function daysOverdue(dueDate) {
  return daysBetween(dueDate, dayjs());
}

/** "3 days ago" / "2 days ago" in days only, for due-date chips. */
export function dueDateLabel(dueDate) {
  const days = daysOverdue(dueDate);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days === -1) return '1 day overdue';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  return `Due in ${days} days`;
}

/** True when the date is in the past. */
export function isOverdue(dueDate) {
  return daysOverdue(dueDate) > 0;
}

/** ISO date string for <input type="date">. */
export function toDateInputValue(value) {
  const d = dayjs(value);
  return d.isValid() ? d.format('YYYY-MM-DD') : '';
}

/** ISO datetime string for <input type="datetime-local">. */
export function toDateTimeInputValue(value) {
  const d = dayjs(value);
  return d.isValid() ? d.format('YYYY-MM-DDTHH:mm') : '';
}

/** Human duration for leave/SLA: "2h 15m", "3 days". */
export function formatDuration(hours) {
  const d = dayjs.duration(Number(hours) || 0, 'hours');
  if (d.hours() < 24) return d.format('H[h] m[m]');
  return d.asDays().toFixed(d.asDays() < 10 ? 1 : 0).replace(/\.0$/, '') + ' days';
}

/** Last N days as ISO date strings — feeds the chart x-axis. */
export function lastNDays(n = 14, tz = DEFAULT_TIMEZONE) {
  return Array.from({ length: n }, (_, i) =>
    dayjs().subtract(n - 1 - i, 'day').tz(tz).format('YYYY-MM-DD'),
  );
}

/** Last N months as "MMM" labels. */
export function lastNMonths(n = 12) {
  return Array.from({ length: n }, (_, i) => dayjs().subtract(n - 1 - i, 'month').format('MMM'));
}

/** Start/end of the current month, for period pickers. */
export function currentMonthRange() {
  const now = dayjs();
  return { from: now.startOf('month').toISOString(), to: now.endOf('month').toISOString() };
}

/** Start/end of the current financial year (calendar year by default). */
export function currentFiscalYearRange(fiscalStartMonth = 0) {
  const now = dayjs();
  const start = now.month(fiscalStartMonth).startOf('month');
  /* If the fiscal year has not begun yet this year, step back a year. */
  const from = start.isAfter(now) ? start.subtract(1, 'year') : start;
  return { from: from.toISOString(), to: now.toISOString() };
}
