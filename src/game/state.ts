import { puzzles, puzzleById } from '../data/puzzles';
import { acceptedSentence } from './validation';
import type { PuzzleProgress, SavedProgress } from './types';

export function emptyProgress(): PuzzleProgress {
  return {
    selectedIds: [],
    history: [],
    status: 'playing',
    attempts: 0,
    incorrectChecks: 0,
    hintUsed: false,
  };
}

export function initialState(): SavedProgress {
  return { version: 1, activePuzzleId: puzzles[0].id, puzzles: {} };
}

export type GameAction =
  | { type: 'switch'; puzzleId: string }
  | { type: 'add' | 'remove'; tokenId: string }
  | { type: 'swap'; firstId: string; secondId: string }
  | { type: 'undo' | 'clear' | 'check' | 'hint' | 'reveal' | 'reset' };

export function gameReducer(state: SavedProgress, action: GameAction): SavedProgress {
  if (action.type === 'switch') {
    return puzzleById.has(action.puzzleId) ? { ...state, activePuzzleId: action.puzzleId } : state;
  }
  const puzzle = puzzleById.get(state.activePuzzleId);
  if (!puzzle) return state;
  const current = state.puzzles[puzzle.id] ?? emptyProgress();
  let next: PuzzleProgress;
  if (action.type === 'reset') next = emptyProgress();
  else if (current.status !== 'playing') return state;
  else if (action.type === 'swap') {
    const first = current.selectedIds.indexOf(action.firstId);
    const second = current.selectedIds.indexOf(action.secondId);
    if (first < 0 || second < 0 || first === second) return state;
    const selectedIds = [...current.selectedIds];
    [selectedIds[first], selectedIds[second]] = [selectedIds[second], selectedIds[first]];
    next = {
      ...current,
      selectedIds,
      history: [...current.history, [...current.selectedIds]].slice(-100),
    };
  } else if (action.type === 'add' || action.type === 'remove') {
    const exists = current.selectedIds.includes(action.tokenId);
    if (
      !puzzle.solutionTokens.some((token) => token.id === action.tokenId) ||
      (action.type === 'add' ? exists : !exists)
    )
      return state;
    next = {
      ...current,
      history: [...current.history, [...current.selectedIds]].slice(-100),
      selectedIds:
        action.type === 'add'
          ? [...current.selectedIds, action.tokenId]
          : current.selectedIds.filter((id) => id !== action.tokenId),
    };
  } else if (action.type === 'undo') {
    if (!current.history.length) return state;
    next = {
      ...current,
      selectedIds: current.history[current.history.length - 1],
      history: current.history.slice(0, -1),
    };
  } else if (action.type === 'clear') {
    if (!current.selectedIds.length) return state;
    next = {
      ...current,
      selectedIds: [],
      history: [...current.history, [...current.selectedIds]].slice(-100),
    };
  } else if (action.type === 'hint') next = { ...current, hintUsed: true };
  else if (action.type === 'reveal') {
    next = {
      ...current,
      selectedIds: puzzle.solutionTokens.map((token) => token.id),
      history: [],
      status: 'revealed',
    };
  } else if (action.type === 'check') {
    if (current.selectedIds.length !== puzzle.solutionTokens.length) return state;
    const correct = Boolean(acceptedSentence(puzzle, current.selectedIds));
    next = {
      ...current,
      attempts: current.attempts + 1,
      incorrectChecks: current.incorrectChecks + (correct ? 0 : 1),
      status: correct ? 'solved' : 'playing',
      history: correct ? [] : current.history,
    };
  } else return state;
  return { ...state, puzzles: { ...state.puzzles, [puzzle.id]: next } };
}
