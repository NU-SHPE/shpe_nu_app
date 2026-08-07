// Email domains accepted for this chapter. Northwestern students get
// @u.northwestern.edu; faculty and staff get @northwestern.edu.
export const CHAPTER_EMAIL_DOMAINS = [
  'u.northwestern.edu',
  'northwestern.edu',
] as const;

// Shown in placeholders and error messages.
export const CHAPTER_EMAIL_LABEL = '@u.northwestern.edu';

export const isChapterEmail = (email: string): boolean => {
  const match = /^([^\s@]+)@([^\s@]+)$/.exec(email.trim().toLowerCase());
  if (!match) return false;
  return (CHAPTER_EMAIL_DOMAINS as readonly string[]).includes(match[2]);
};
