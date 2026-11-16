// A fixed PST day (UTC−8), including during daylight saving time. Shared by
// browsers and the analytics Worker so location cannot change the daily game.
export const DAY_MS = 86_400_000;
const PST_OFFSET_MS = 8 * 60 * 60 * 1000;

export function dayKey(date = new Date()): string {
  return new Date(date.getTime() - PST_OFFSET_MS).toISOString().slice(0, 10);
}

export function shiftDay(day: string, offset: number): string {
  return new Date(Date.parse(day + 'T00:00:00Z') + offset * DAY_MS).toISOString().slice(0, 10);
}

export function validDay(day: unknown): day is string {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const time = Date.parse(day + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === day;
}

export function millisecondsToMidnight(now = new Date()): number {
  const next = Date.parse(shiftDay(dayKey(now), 1) + 'T08:00:00Z');
  return Math.max(1, next - now.getTime());
}
