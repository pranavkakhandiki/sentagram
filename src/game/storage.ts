import { puzzleById, puzzles } from '../data/puzzles';
import { dailyPuzzle, dayKey, validDay } from './daily';
import { acceptedSentence } from './validation';
import { emptyProgress, initialState, MAX_GUESSES } from './state';
import type { Puzzle, PuzzleProgress, SavedProgress } from './types';

// Prototype saves did not record guesses or dates and cannot represent a daily result.
export const STORAGE_KEY = 'sentagram.progress.v2';

export interface ProgressRepository {
  load(): SavedProgress;
  save(state: SavedProgress): boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validIds(value: unknown, puzzle: Puzzle): value is string[] {
  return Array.isArray(value) && value.length <= puzzle.solutionTokens.length &&
    new Set(value).size === value.length && value.every(
      (id) => typeof id === 'string' && puzzle.solutionTokens.some((token) => token.id === id),
    );
}

function sanitizePuzzle(raw: unknown, puzzle: Puzzle): PuzzleProgress {
  if (!isRecord(raw)) return emptyProgress();
  const guesses: string[][] = [];
  // Reconstruct the result from real guesses, never from an untrusted status/count.
  if (Array.isArray(raw.guesses)) {
    for (const ids of raw.guesses) {
      if (!validIds(ids, puzzle) || ids.length !== puzzle.solutionTokens.length) break;
      guesses.push(ids);
      if (acceptedSentence(puzzle, ids) || guesses.length === MAX_GUESSES) break;
    }
  }
  const last = guesses[guesses.length - 1];
  const status = last && acceptedSentence(puzzle, last) ? 'solved'
    : guesses.length === MAX_GUESSES ? 'revealed' : 'playing';
  return {
    guesses, status,
    selectedIds: status === 'solved' ? last : status === 'revealed'
      ? puzzle.solutionTokens.map((token) => token.id)
      : validIds(raw.selectedIds, puzzle) ? raw.selectedIds : [],
    history: status === 'playing' && Array.isArray(raw.history)
      ? raw.history.filter((ids) => validIds(ids, puzzle)).slice(-100) : [],
  };
}

export function sanitizeProgress(raw: unknown, today = dayKey()): SavedProgress {
  const fallback = initialState(today);
  if (!isRecord(raw) || raw.version !== 2) return fallback;
  const practice: Record<string, PuzzleProgress> = {};
  if (isRecord(raw.practice)) {
    for (const puzzle of puzzles) {
      if (raw.practice[puzzle.id]) practice[puzzle.id] = sanitizePuzzle(raw.practice[puzzle.id], puzzle);
    }
  }
  const devMode = raw.devMode === true;
  return {
    ...fallback, practice, devMode,
    daily: validDay(raw.day) && raw.day === today ? sanitizePuzzle(raw.daily, dailyPuzzle(today)) : emptyProgress(),
    practicePuzzleId: devMode && typeof raw.practicePuzzleId === 'string' && puzzleById.has(raw.practicePuzzleId)
      ? raw.practicePuzzleId : null,
  };
}

export const localProgressRepository: ProgressRepository = {
  load() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value ? sanitizeProgress(JSON.parse(value)) : initialState();
    } catch { return initialState(); }
  },
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch { return false; }
  },
};
