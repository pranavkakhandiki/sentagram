import { expect } from 'vitest';
import { puzzles } from '../data/puzzles';
import { emptyProgress, initialState } from '../game/state';
import type { Puzzle, SavedProgress } from '../game/types';
import { LAUNCH_DAY } from '../game/daily';

export function idsForWords(puzzle: Puzzle, words: readonly string[]) {
  const available = [...puzzle.solutionTokens];
  return words.map((word) => {
    const index = available.findIndex((token) => token.preserveCase
      ? token.text === word : token.text.toLowerCase() === word.toLowerCase());
    expect(index, 'Missing tile ' + word).toBeGreaterThanOrEqual(0);
    return available.splice(index, 1)[0].id;
  });
}

export function orderedState(puzzle = puzzles[0], ids = puzzle.solutionTokens.map((token) => token.id)): SavedProgress {
  const state = initialState(LAUNCH_DAY);
  const progress = { ...emptyProgress(), selectedIds: ids };
  return puzzle.id === puzzles[0].id ? { ...state, daily: progress }
    : { ...state, devMode: true, practicePuzzleId: puzzle.id, practice: { [puzzle.id]: progress } };
}
