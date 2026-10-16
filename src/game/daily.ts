import { puzzles } from '../data/puzzles';

export const LAUNCH_DAY = '2026-10-15';
const DAY_MS = 86_400_000;

/** Calendar components keep the cycle stable through 23- and 25-hour DST days. */
export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function ordinal(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date) / DAY_MS;
}

export function validDay(day: unknown): day is string {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(ordinal(day) * DAY_MS);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

export function dailyPuzzle(day: string) {
  const offset = ordinal(day) - ordinal(LAUNCH_DAY);
  return puzzles[((offset % puzzles.length) + puzzles.length) % puzzles.length];
}

export function displayDate(day: string, short = false): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: short ? 'short' : 'long', year: 'numeric',
  }).format(new Date(year, month - 1, date, 12));
}

export function millisecondsToMidnight(now = new Date()): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(1, midnight.getTime() - now.getTime());
}
