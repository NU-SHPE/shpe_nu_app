import { toDate } from './date';

export const isCheckInOpen = (event: any, now: Date): boolean => {
    const start = toDate(event.startsAt);
    const end = toDate(event.endsAt);
    // If the event doesn't have a start or end time, it can't be open.
    if (!start || !end) return false;

    const midpoint = new Date((start.getTime() + end.getTime()) / 2);
    const THIRTY_MINUTES = 30 * 60 * 1000; // 30 mins in milliseconds.
    const opensAt = new Date(start.getTime() - THIRTY_MINUTES);

    if (now >= opensAt && now <= midpoint) {
        return true;
    }

    return false;
}

export const isCheckOutOpen = (event: any, now: Date): boolean => {
    const start = toDate(event.startsAt);
    const end = toDate(event.endsAt);
    // If the event doesn't have a start or end time, it can't be open.
    if (!start || !end) return false;
    
    const midpoint = new Date((start.getTime() + end.getTime()) / 2);
    const THIRTY_MINUTES = 30 * 60 * 1000; // 30 mins in milliseconds.
    const closesAt = new Date(end.getTime() + THIRTY_MINUTES);
    
    if (now > midpoint && now <= closesAt) {
        return true;
    }

    return false;
}