import type { Puzzle, PuzzleProgress } from './types';

export function resultText(puzzle: Puzzle, progress: PuzzleProgress): string {
  return [
    `Sentagram #${String(puzzle.number).padStart(2, '0')}`,
    progress.status === 'revealed'
      ? 'Answer revealed'
      : `Solved in ${progress.attempts} ${progress.attempts === 1 ? 'attempt' : 'attempts'}`,
    progress.hintUsed ? 'A little hint helped' : 'No hints used',
  ].join('\n');
}

export async function shareResult(
  text: string,
): Promise<'shared' | 'copied' | 'canceled' | 'manual'> {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'AbortError'
      )
        return 'canceled';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'manual';
  }
}
