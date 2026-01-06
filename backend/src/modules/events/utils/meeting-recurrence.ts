import { addDays, differenceInCalendarDays } from 'date-fns';

export const getNextMeetingStart = (
  start: Date,
  now: Date = new Date(),
  intervalDays = 28,
) => {
  if (start >= now) return start;
  const diffDays = differenceInCalendarDays(now, start);
  const cycles = Math.floor(diffDays / intervalDays) + 1;
  return addDays(start, cycles * intervalDays);
};
