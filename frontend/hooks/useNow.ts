import { useEffect, useState } from 'react';

/**
 * A Date that refreshes on an interval, for anything time-based (like
 * isEventPast) that needs to stay correct while a screen just sits open --
 * without this, "is this event over" only gets re-checked when the
 * underlying data changes (a Firestore update), not when the clock actually
 * passes the event's end time. 60s is plenty responsive for "has this event
 * ended" without re-rendering aggressively.
 */
export function useNow(intervalMs: number = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
