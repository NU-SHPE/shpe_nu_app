import type { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * Point values are defined here, not typed in by whoever creates the event.
 * Officers pick a category and the points follow, so they stay consistent
 * across the chapter and can't be fat-fingered.
 *
 * checkOutPoints of 0 means the category has no check-out — the organizer won't
 * be offered the toggle for it. Regional and community service work that way:
 * showing up at all is the effort, so the full award lands on check-in.
 *
 * The keys are what get stored on event documents. Labels are display only, so
 * renaming a label is free — changing a key would orphan existing events.
 */
export const EVENT_CATEGORIES = {
  generalMeeting: {
    label: 'General Meeting',
    checkInPoints: 1.5,
    checkOutPoints: 1.5,
  },
  social: {
    label: 'Social / Collaboration',
    checkInPoints: 1,
    checkOutPoints: 1,
  },
  studyTable: {
    label: 'Study Table',
    checkInPoints: 1,
    checkOutPoints: 1,
  },
  professional: {
    label: 'Professional',
    checkInPoints: 1.5,
    checkOutPoints: 1.5,
  },
  regional: {
    label: 'Regional',
    checkInPoints: 4,
    checkOutPoints: 0,
  },
  communityService: {
    label: 'Community Service',
    checkInPoints: 5,
    checkOutPoints: 0,
  },
} as const;

export type EventCategory = keyof typeof EVENT_CATEGORIES;

export const EVENT_CATEGORY_KEYS = Object.keys(EVENT_CATEGORIES) as EventCategory[];

/** Points a member gets just for holding a national SHPE membership. */
export const PAID_MEMBER_POINTS = 2;

export interface EventDoc {
  title: string;
  description: string;
  location: string;
  category: EventCategory;
  /** Copied from the category at creation so rules can validate awards. */
  checkInPoints: number;
  checkOutPoints: number;
  /** Organizers flip this on when the event is wrapping up. */
  checkOutOpen: boolean;
  startsAt: Timestamp;
  endsAt: Timestamp;
  createdAt: Timestamp | FieldValue;
  createdBy: string;
}

export const categoryLabel = (category?: string): string =>
  category && category in EVENT_CATEGORIES
    ? EVENT_CATEGORIES[category as EventCategory].label
    : '';
