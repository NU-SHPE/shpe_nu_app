import type { Timestamp } from 'firebase/firestore';

/**
 * Events store startsAt/endsAt as real Firestore Timestamps rather than
 * strings. Strings sorted alphabetically, so "December" came before
 * "February" — these helpers turn them back into something readable.
 */

/** Firestore returns Timestamp, but a doc written elsewhere might hold a Date. */
export const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const timestamp = value as Timestamp;
  return typeof timestamp?.toDate === 'function' ? timestamp.toDate() : null;
};

export const formatEventDate = (value: unknown): string => {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * "5 minutes ago" / "3 hours ago" / "2 days ago" for anything recent enough
 * that freshness is the useful signal (an announcement feed); falls back to
 * a real date past a week, since "47 days ago" stops being meaningful long
 * before "3 weeks ago" does.
 */
export const formatRelativeTime = (value: unknown): string => {
  const date = toDate(value);
  if (!date) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return formatEventDate(value);
};

export const formatTime = (value: unknown): string => {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatTimeRange = (start: unknown, end: unknown): string => {
  const parts = [formatTime(start), formatTime(end)].filter(Boolean);
  return parts.join(' – ');
};

/**
 * An event is "past" once it has actually ended — not when scanning closes
 * (a narrower window, see utils/scanWindow.ts). Missing endsAt fails open
 * (not past) rather than silently vanishing a bad-data event into a
 * collapsed section nobody opens by default.
 */
export const isEventPast = (event: { endsAt?: unknown }, now: Date = new Date()): boolean => {
  const end = toDate(event.endsAt);
  return end ? end.getTime() < now.getTime() : false;
};

const pad = (value: number): string => String(value).padStart(2, '0');

/** `YYYY-MM-DD` → e.g. "January 1, 2006", for displaying a stored birthday. */
export const formatDateInput = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return '';
  const [, year, month, day] = match.map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * `YYYY-MM-DD` birthday → age in whole years, or null if malformed.
 * Recomputed from the stored date rather than a stored number, so age never
 * goes stale.
 */
export const calculateAge = (birthday: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const born = new Date(year, month - 1, day);
  if (born.getMonth() !== month - 1 || born.getDate() !== day) return null;

  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const hadBirthdayThisYear =
    today.getMonth() > born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() >= born.getDate());
  if (!hadBirthdayThisYear) age -= 1;

  return age;
};

/** Date → `YYYY-MM-DD`, the format the create-event form holds. */
export const toDateInput = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Date → `HH:MM` in 24-hour time. */
export const toTimeInput = (date: Date): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/**
 * Builds a Date from the form's `YYYY-MM-DD` and `HH:MM` inputs.
 * Returns null when either is malformed or the values aren't a real date
 * (e.g. February 31st, which the Date constructor would silently roll over).
 */
export const parseDateTime = (dateInput: string, timeInput: string): Date | null => {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeInput.trim());
  if (!dateMatch || !timeMatch) return null;

  const [, year, month, day] = dateMatch.map(Number);
  const [, hours, minutes] = timeMatch.map(Number);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hours > 23 || minutes > 59) return null;

  const date = new Date(year, month - 1, day, hours, minutes);
  // Guards against rollover: new Date(2026, 1, 31) silently becomes March 3rd.
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return date;
};

/**
 * The create/edit event form has fully independent start and end
 * date+time pairs — the normal pattern every calendar app uses. No
 * inference, no rollover, no guessing whether something spans midnight:
 * an overnight event is just an end date one day after the start date,
 * picked directly. The only rule is the plain one — end has to be after
 * start — left to the caller to check, same as any other field.
 */
export const parseEventDates = (
  startDateInput: string,
  startTimeInput: string,
  endDateInput: string,
  endTimeInput: string,
): { startsAt: Date; endsAt: Date } | null => {
  const startsAt = parseDateTime(startDateInput, startTimeInput);
  const endsAt = parseDateTime(endDateInput, endTimeInput);
  if (!startsAt || !endsAt) return null;
  return { startsAt, endsAt };
};
