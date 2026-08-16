import type { Timestamp, FieldValue } from 'firebase/firestore';

export const SEX_AT_BIRTH_OPTIONS = ['Male', 'Female'] as const;
export type SexAtBirth = (typeof SEX_AT_BIRTH_OPTIONS)[number];

export const SCHOOL_LEVEL_OPTIONS = [
  'Freshman',
  'Sophomore',
  'Junior',
  'Senior',
  'Graduate',
] as const;
export type SchoolLevel = (typeof SCHOOL_LEVEL_OPTIONS)[number];

export interface UserProfileInput {
  firstName: string;
  /** May contain multiple surnames — never split or validate as one word. */
  lastName: string;
  /** `YYYY-MM-DD`. Use `calculateAge()` from `utils/date.ts` to derive age. */
  birthday: string;
  sexAtBirth: SexAtBirth;
  gender: string;
  /** Self-described, optional — stored as '' when not provided. */
  pronouns: string;
  schoolLevel: SchoolLevel;
  major: string;
  /** Self-described, optional — stored as '' when not provided. */
  minor: string;
  /** National Member ID, recommended — stored as '' when not provided. */
  memberId: string;
}

export interface UserProfile extends UserProfileInput {
  email: string;
  isAdmin: boolean;
  /** Grants the Organizer tab (create events, run check-in/out QR codes) and announcement posting. Granted from the admin roles screen, never self-service. */
  isExec: boolean;
  createdAt: Timestamp | FieldValue;
}

/** Full name for display. Returns '' when the profile isn't loaded yet. */
export const displayName = (
  profile: Pick<UserProfile, 'firstName' | 'lastName'> | null | undefined,
): string => [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
