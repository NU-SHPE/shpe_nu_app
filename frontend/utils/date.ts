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

const pad = (value: number): string => String(value).padStart(2, '0');

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
