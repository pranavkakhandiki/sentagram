import { puzzles } from '../data/puzzles';
import { DAY_MS } from './clock';
export { dayKey, validDay, millisecondsToMidnight } from './clock';

export const LAUNCH_DAY = '2026-10-15';
export const EXPANDED_CYCLE_DAY = '2026-11-09';

function ordinal(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date) / DAY_MS;
}

export function dailyPuzzle(day: string) {
  // Keep the published 20-day schedule through Nov 8. Tomorrow starts the new
  // material, then all fifty entries participate in a repeating 50-day cycle.
  if (day < EXPANDED_CYCLE_DAY) {
    const offset = ordinal(day) - ordinal(LAUNCH_DAY);
    return puzzles[((offset % 20) + 20) % 20];
  }
  const offset = 20 + ordinal(day) - ordinal(EXPANDED_CYCLE_DAY);
  return puzzles[((offset % puzzles.length) + puzzles.length) % puzzles.length];
}

export function displayDate(day: string, short = false): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: short ? 'short' : 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, date, 12)));
}
