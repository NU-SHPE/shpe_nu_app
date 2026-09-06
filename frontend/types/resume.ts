import type { Timestamp } from 'firebase/firestore';

/**
 * Metadata for a member's resume PDF. The file lives in Cloud Storage at
 * `resumes/{uid}/resume.pdf`; this doc (id = uid, collection `resumes`) exists
 * so the admin resume-book screen can list uploads with a Firestore query
 * instead of the Storage list API. Career fields (grad year, seeking, work
 * auth) live on the `users` profile, not here.
 */
export interface ResumeDoc {
  userId: string;
  /** The member's original filename, kept only for display. */
  fileName: string;
  size: number;
  updatedAt: Timestamp | null;
}

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;

/** One file per member, always this exact path — the Storage rule pins it. */
export const resumeStoragePath = (uid: string) => `resumes/${uid}/resume.pdf`;

export const RESUME_STALE_MONTHS = 6;

export const isResumeStale = (updatedAt: unknown): boolean => {
  const d =
    updatedAt && typeof (updatedAt as Timestamp).toDate === 'function'
      ? (updatedAt as Timestamp).toDate()
      : null;
  if (!d) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RESUME_STALE_MONTHS);
  return d < cutoff;
};
