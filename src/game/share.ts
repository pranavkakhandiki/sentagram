import type { Puzzle, PuzzleProgress } from './types';
import { dayKey, displayDate } from './daily';
import { evaluateGuess } from './validation';

export const GAME_URL = 'https://pranavkakhandiki.github.io/sentagram/';

export function guessRows(puzzle: Puzzle, progress: PuzzleProgress): string[] {
  return progress.guesses.map((ids) => evaluateGuess(puzzle, ids)!.positions.map(
    (correct) => correct ? '🟩' : '⬜',
  ).join(''));
}

export function resultText(puzzle: Puzzle, progress: PuzzleProgress, day = dayKey(), practice = false): string {
  return [
    practice ? `Sentagram Practice #${puzzle.number}` : `Sentagram · ${displayDate(day, true)}`,
    `${progress.status === 'solved' ? progress.guesses.length : 'X'}/3`,
    ...guessRows(puzzle, progress),
    '', GAME_URL,
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
