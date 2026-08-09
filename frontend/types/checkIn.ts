import type { Timestamp, FieldValue } from 'firebase/firestore';

export type ScanMode = 'in' | 'out';

/** Minutes before an event starts that its check-in code becomes valid. */
export const CHECK_IN_OPENS_MINUTES_BEFORE = 30;

/** How long a member must be checked in before they're allowed to check out. */
export const CHECK_OUT_AFTER_MINUTES = 20;

export interface CheckInDoc {
  userId: string;
  eventId: string;
  checkedInAt: Timestamp | FieldValue;
  pointsAwarded: number;
  checkedOutAt?: Timestamp | FieldValue;
  checkOutPointsAwarded?: number;
}

/**
 * QR payloads. Check-in codes are the bare event ID; check-out codes carry an
 * `:out` suffix. The code itself says what it's for, so the scanner doesn't
 * need any server-side state to tell them apart.
 */
export const buildQrPayload = (eventId: string, mode: ScanMode): string =>
  mode === 'out' ? `${eventId}:out` : eventId;

export const parseQrPayload = (
  raw: string,
): { eventId: string; mode: ScanMode } | null => {
  const value = raw.trim();
  if (!value) return null;

  const [eventId, suffix] = value.split(':');
  if (!eventId) return null;
  if (suffix && suffix !== 'out') return null;

  return { eventId, mode: suffix === 'out' ? 'out' : 'in' };
};

/** Codes stop working at midnight so a screenshot isn't good next month. */
export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
