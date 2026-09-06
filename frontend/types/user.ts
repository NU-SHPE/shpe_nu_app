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

// --- Career fields (optional, edited from the Careers screen). Used by
// the resume book and its CSV export. ---

export const SEEKING_OPTIONS = ['Internship', 'Co-op', 'Full-time', 'Research'] as const;
export type Seeking = (typeof SEEKING_OPTIONS)[number];

// The two questions every job application asks, kept separate here for the
// same reason they're separate there — they're independent facts.
export const YES_NO_OPTIONS = ['Yes', 'No', 'Prefer not to say'] as const;
export type YesNo = (typeof YES_NO_OPTIONS)[number];

export const WORK_AUTH_QUESTION =
  'Are you legally authorized to work in the United States?';
export const SPONSORSHIP_QUESTION =
  'Will you now or in the future need visa sponsorship for employment?';

// Expected graduation is stored as `gradTerm` = "YYYY-MM" (e.g. "2027-06").
// Month matters for recruiting — a spring vs. fall grad is a different hiring
// timeline — so it's month + year, not just a year.
export const GRAD_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** Current year through +6 — covers undergrad and grad students. */
export const gradYearOptions = (now: Date = new Date()): number[] => {
  const y = now.getFullYear();
  return Array.from({ length: 7 }, (_, i) => y + i);
};

/** "2027-06" → "June 2027"; '' / bad input → ''. */
export const formatGradTerm = (term: string | undefined): string => {
  const m = /^(\d{4})-(\d{2})$/.exec(term ?? '');
  if (!m) return '';
  const month = GRAD_MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${m[1]}` : '';
};

/**
 * Starter list, not an official catalog — picked from `MajorSelect`, with
 * "Other" as a free-text escape hatch for anything missing. Editing this list
 * is just editing this array; it doesn't touch existing members' data since
 * profiles store the resolved string, not a reference to this list.
 */
export const MAJOR_OPTIONS = [
  'Applied Math',
  'Artificial Intelligence',
  'Biomedical Engineering',
  'Chemical Engineering',
  'Civil Engineering',
  'Computer Engineering',
  'Computer Science',
  'Electrical Engineering',
  'Environmental Engineering',
  'Industrial Engineering',
  'MaDE',
  'Materials Science Engineering',
  'Mechanical Engineering',
] as const;

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
  /** One or more. Each entry is either a MAJOR_OPTIONS value or free-typed via "Other". */
  majors: string[];
  /** Free text, no picker — minors span too many schools/combinations for a curated list. Empty array if none. */
  minors: string[];
  /** National Member ID, recommended — stored as '' when not provided. */
  memberId: string;
  /** Career fields — all optional, filled from the Careers screen. */
  gradTerm?: string; // "YYYY-MM", see formatGradTerm
  seeking?: Seeking[];
  workAuthorized?: YesNo; // WORK_AUTH_QUESTION
  needsSponsorship?: YesNo; // SPONSORSHIP_QUESTION
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
