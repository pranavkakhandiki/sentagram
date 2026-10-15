/** Seeded Fisher–Yates: stable across reloads, without using Math.random. */
export function deterministicShuffle<T>(items: readonly T[], seed: string): T[] {
  let state = 2166136261;
  for (const character of seed) {
    state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    const swap = Math.floor((state / 4294967296) * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}
