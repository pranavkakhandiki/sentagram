import { useEffect, useReducer, useState } from 'react';
import { puzzleById, puzzles } from '../data/puzzles';
import { emptyProgress, gameReducer } from '../game/state';
import { localProgressRepository } from '../game/storage';
import type { ProgressRepository } from '../game/storage';

const unplayedProgress = emptyProgress();

export function useGame(repository: ProgressRepository = localProgressRepository) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => repository.load());
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => {
    setSaveFailed(!repository.save(state));
  }, [repository, state]);
  const puzzle = puzzleById.get(state.activePuzzleId) ?? puzzles[0];
  const progress = state.puzzles[puzzle.id] ?? unplayedProgress;
  return { state, dispatch, puzzle, progress, saveFailed };
}
