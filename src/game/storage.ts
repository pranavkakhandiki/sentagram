import { puzzleById, puzzles } from '../data/puzzles';
import { acceptedSentence } from './validation';
import { emptyProgress, initialState } from './state';
import type { Puzzle, PuzzleProgress, SavedProgress } from './types';

export const STORAGE_KEY = 'sentagram.progress.v1';
export const LEGACY_STORAGE_KEY = 'sensemaker.progress.v1';

export interface ProgressRepository {
  load(): SavedProgress;
  save(state: SavedProgress): boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validIds(value: unknown, puzzle: Puzzle): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= puzzle.solutionTokens.length &&
    new Set(value).size === value.length &&
    value.every(
      (id) => typeof id === 'string' && puzzle.solutionTokens.some((token) => token.id === id),
    )
  );
}

function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function sanitizeProgress(raw: unknown): SavedProgress {
  const fallback = initialState();
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.puzzles)) return fallback;
  const restored: Record<string, PuzzleProgress> = {};
  for (const puzzle of puzzles) {
    const entry = raw.puzzles[puzzle.id];
    if (!isRecord(entry)) continue;
    const selectedIds = validIds(entry.selectedIds, puzzle) ? entry.selectedIds : [];
    const complete = Boolean(acceptedSentence(puzzle, selectedIds));
    const status =
      complete && (entry.status === 'solved' || entry.status === 'revealed')
        ? entry.status
        : 'playing';
    const incorrectChecks = safeCount(entry.incorrectChecks);
    restored[puzzle.id] = {
      ...emptyProgress(),
      selectedIds,
      status,
      history:
        status === 'playing' && Array.isArray(entry.history)
          ? entry.history.filter((ids) => validIds(ids, puzzle)).slice(-100)
          : [],
      attempts: Math.max(
        safeCount(entry.attempts),
        incorrectChecks + (status === 'solved' ? 1 : 0),
      ),
      incorrectChecks,
      hintUsed: entry.hintUsed === true,
    };
  }
  return {
    version: 1,
    activePuzzleId:
      typeof raw.activePuzzleId === 'string' && puzzleById.has(raw.activePuzzleId)
        ? raw.activePuzzleId
        : fallback.activePuzzleId,
    puzzles: restored,
  };
}

/** The UI depends on this boundary, so a synced repository can be added later. */
export const localProgressRepository: ProgressRepository = {
  load() {
    try {
      // The rebrand retains progress from the original SENSEMAKER prototype.
      for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
        const value = localStorage.getItem(key);
        if (!value) continue;
        try {
          const raw: unknown = JSON.parse(value);
          if (isRecord(raw) && raw.version === 1 && isRecord(raw.puzzles))
            return sanitizeProgress(raw);
        } catch {
          /* Try the previous key if the current record is corrupt. */
        }
      }
      return initialState();
    } catch {
      return initialState();
    }
  },
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  },
};
