import { puzzleById } from '../data/puzzles';
import { dailyPuzzle, dayKey } from './daily';
import { acceptedSentence } from './validation';
import type { PuzzleProgress, SavedProgress } from './types';

export const MAX_GUESSES = 3;

export function emptyProgress(): PuzzleProgress {
  return { selectedIds: [], history: [], status: 'playing', guesses: [] };
}

export function initialState(day = dayKey()): SavedProgress {
  return { version: 2, day, daily: emptyProgress(), devMode: false, practicePuzzleId: null, practice: {} };
}

export function activeGame(state: SavedProgress) {
  const practice = state.devMode && state.practicePuzzleId !== null;
  const puzzle = practice ? puzzleById.get(state.practicePuzzleId!)! : dailyPuzzle(state.day);
  return { puzzle, progress: practice ? state.practice[puzzle.id] ?? emptyProgress() : state.daily, practice };
}

export type GameAction =
  | { type: 'rollover'; day: string }
  | { type: 'restore'; state: SavedProgress }
  | { type: 'set-dev'; enabled: boolean }
  | { type: 'switch'; puzzleId: string }
  | { type: 'today' }
  | { type: 'add' | 'remove'; tokenId: string }
  | { type: 'swap'; firstId: string; secondId: string }
  | { type: 'undo' | 'clear' | 'check' | 'reset' };

export function gameReducer(state: SavedProgress, action: GameAction): SavedProgress {
  if (action.type === 'restore') return action.state;
  if (action.type === 'rollover')
    return state.day === action.day ? state : { ...state, day: action.day, daily: emptyProgress() };
  if (action.type === 'set-dev')
    return { ...state, devMode: action.enabled, practicePuzzleId: null };
  if (action.type === 'today') return { ...state, practicePuzzleId: null };
  if (action.type === 'switch')
    return state.devMode && puzzleById.has(action.puzzleId)
      ? { ...state, practicePuzzleId: action.puzzleId }
      : state;

  const { puzzle, progress: current, practice } = activeGame(state);
  let next: PuzzleProgress;
  if (action.type === 'reset') {
    // Daily results are final. Replays are confined to the development bank.
    if (!practice) return state;
    next = emptyProgress();
  } else if (current.status !== 'playing') return state;
  else if (action.type === 'swap') {
    const first = current.selectedIds.indexOf(action.firstId);
    const second = current.selectedIds.indexOf(action.secondId);
    if (first < 0 || second < 0 || first === second) return state;
    const selectedIds = [...current.selectedIds];
    [selectedIds[first], selectedIds[second]] = [selectedIds[second], selectedIds[first]];
    next = { ...current, selectedIds, history: [...current.history, current.selectedIds].slice(-100) };
  } else if (action.type === 'add' || action.type === 'remove') {
    const exists = current.selectedIds.includes(action.tokenId);
    if (!puzzle.solutionTokens.some((token) => token.id === action.tokenId) ||
      (action.type === 'add' ? exists : !exists)) return state;
    next = {
      ...current,
      history: [...current.history, current.selectedIds].slice(-100),
      selectedIds: action.type === 'add'
        ? [...current.selectedIds, action.tokenId]
        : current.selectedIds.filter((id) => id !== action.tokenId),
    };
  } else if (action.type === 'undo') {
    if (!current.history.length) return state;
    next = { ...current, selectedIds: current.history[current.history.length - 1], history: current.history.slice(0, -1) };
  } else if (action.type === 'clear') {
    if (!current.selectedIds.length) return state;
    next = { ...current, selectedIds: [], history: [...current.history, current.selectedIds].slice(-100) };
  } else if (action.type === 'check') {
    if (current.selectedIds.length !== puzzle.solutionTokens.length || current.guesses.length >= MAX_GUESSES) return state;
    const correct = Boolean(acceptedSentence(puzzle, current.selectedIds));
    const guesses = [...current.guesses, [...current.selectedIds]];
    const revealed = !correct && guesses.length === MAX_GUESSES;
    next = {
      ...current, guesses,
      status: correct ? 'solved' : revealed ? 'revealed' : 'playing',
      selectedIds: revealed ? puzzle.solutionTokens.map((token) => token.id) : current.selectedIds,
      history: correct || revealed ? [] : current.history,
    };
  } else return state;
  return practice
    ? { ...state, practice: { ...state.practice, [puzzle.id]: next } }
    : { ...state, daily: next };
}
