import { describe, expect, it, vi } from 'vitest';
import { parseSentence, puzzles } from '../data/puzzles';
import { deterministicShuffle } from '../game/shuffle';
import { emptyProgress, gameReducer, initialState } from '../game/state';
import {
  localProgressRepository,
  sanitizeProgress,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
} from '../game/storage';
import { acceptedSentence, bankLabel, formatSentence, sentenceLabel } from '../game/validation';
import { resultText } from '../game/share';
import type { Puzzle, SavedProgress } from '../game/types';

function orderedState(
  puzzle: Puzzle,
  ids = puzzle.solutionTokens.map((token) => token.id),
): SavedProgress {
  return {
    version: 1,
    activePuzzleId: puzzle.id,
    puzzles: { [puzzle.id]: { ...emptyProgress(), selectedIds: ids } },
  };
}

function idsForWords(puzzle: Puzzle, words: string[]) {
  const available = [...puzzle.solutionTokens];
  return words.map((word) => {
    const index = available.findIndex((token) =>
      token.preserveCase ? token.text === word : token.text.toLowerCase() === word.toLowerCase(),
    );
    expect(index, `Missing tile ${word}`).toBeGreaterThanOrEqual(0);
    return available.splice(index, 1)[0].id;
  });
}

describe('curated puzzle integrity', () => {
  it('has eight uniquely identified and numbered puzzles', () => {
    expect(puzzles).toHaveLength(8);
    expect(new Set(puzzles.map((puzzle) => puzzle.id)).size).toBe(8);
    expect(puzzles.map((puzzle) => puzzle.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  for (const puzzle of puzzles) {
    it(`${puzzle.title}: preserves every distinct tile, repeated word, and deterministic scramble`, () => {
      const ids = puzzle.solutionTokens.map((token) => token.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(puzzle.wordBank.map((token) => token.id).sort()).toEqual([...ids].sort());
      expect(puzzle.wordBank).toEqual(deterministicShuffle(puzzle.solutionTokens, puzzle.id));
      expect(puzzle.wordBank).not.toEqual(puzzle.solutionTokens);
      expect(puzzle.wordBank).not.toEqual([...puzzle.solutionTokens].reverse());
      for (let offset = 1; offset < ids.length; offset++) {
        expect(puzzle.wordBank.map((token) => token.id)).not.toEqual([
          ...ids.slice(offset),
          ...ids.slice(0, offset),
        ]);
      }
      expect(new Set(puzzle.solutionTokens.map(bankLabel)).size).toBeLessThan(ids.length);
      expect(acceptedSentence(puzzle, ids)).not.toBeNull();
    });
    for (const alternative of puzzle.alternativeSolutions ?? []) {
      it(`${puzzle.title}: accepts its authored alternative using exactly the original words`, () => {
        const ids = idsForWords(puzzle, alternative.words);
        expect(acceptedSentence(puzzle, ids)).toEqual(alternative);
        expect([...ids].sort()).toEqual(puzzle.solutionTokens.map((token) => token.id).sort());
      });
    }
  }

  it('accepts identical words when their distinct IDs have been exchanged', () => {
    const puzzle = puzzles[6];
    const ids = puzzle.solutionTokens.map((token) => token.id);
    [ids[1], ids[9]] = [ids[9], ids[1]];
    [ids[0], ids[4]] = [ids[4], ids[0]];
    expect(acceptedSentence(puzzle, ids)).not.toBeNull();
  });
  it('rejects missing words, reused IDs, foreign IDs, and incorrect sequences', () => {
    const puzzle = puzzles[0];
    const ids = puzzle.solutionTokens.map((token) => token.id);
    expect(acceptedSentence(puzzle, ids.slice(1))).toBeNull();
    expect(acceptedSentence(puzzle, [ids[0], ...ids.slice(0, -1)])).toBeNull();
    expect(acceptedSentence(puzzle, ['foreign', ...ids.slice(1)])).toBeNull();
    expect(acceptedSentence(puzzle, [...ids].reverse())).toBeNull();
  });
  it('hides sentence-initial capitals and retains names and months', () => {
    expect(bankLabel(puzzles[0].solutionTokens[0])).toBe('the');
    expect(sentenceLabel(puzzles[0].solutionTokens[7], 0)).toBe('The');
    expect(bankLabel(puzzles[5].solutionTokens[0])).toBe('May');
    expect(bankLabel(puzzles[5].solutionTokens[1])).toBe('may');
    expect(bankLabel(puzzles[5].solutionTokens[2])).toBe('march');
    expect(bankLabel(puzzles[5].solutionTokens[4])).toBe('March');
  });
  it('keeps commas and final punctuation outside tiles without splitting apostrophes', () => {
    expect(parseSentence('Before lunch, Rose can’t dance.')).toEqual({
      words: ['Before', 'lunch', 'Rose', 'can’t', 'dance'],
      format: { before: {}, after: { 1: ',' }, ending: '.' },
    });
    expect(formatSentence(puzzles[0].solutionTokens, puzzles[0].format)).toBe(
      'The wind made it hard to wind the kite string.',
    );
  });
});

describe('game transitions', () => {
  const puzzle = puzzles[0];
  const ids = puzzle.solutionTokens.map((token) => token.id);
  it('adds individual tiles, removes a middle tile, and undoes that exact removal', () => {
    let state = initialState();
    for (const tokenId of ids.slice(0, 4)) state = gameReducer(state, { type: 'add', tokenId });
    state = gameReducer(state, { type: 'remove', tokenId: ids[1] });
    expect(state.puzzles[puzzle.id].selectedIds).toEqual([ids[0], ids[2], ids[3]]);
    state = gameReducer(state, { type: 'undo' });
    expect(state.puzzles[puzzle.id].selectedIds).toEqual(ids.slice(0, 4));
  });
  it('clear is fully undoable', () => {
    const state = orderedState(puzzle, ids.slice(0, 3));
    const cleared = gameReducer(state, { type: 'clear' });
    expect(cleared.puzzles[puzzle.id].selectedIds).toEqual([]);
    expect(gameReducer(cleared, { type: 'undo' }).puzzles[puzzle.id].selectedIds).toEqual(
      ids.slice(0, 3),
    );
  });
  it('swaps two nonadjacent tiles without changing other positions, attempts, or hints; Undo restores it', () => {
    const state = orderedState(puzzle, ids.slice(0, 5));
    const swapped = gameReducer(state, { type: 'swap', firstId: ids[0], secondId: ids[3] });
    expect(swapped.puzzles[puzzle.id].selectedIds).toEqual([
      ids[3],
      ids[1],
      ids[2],
      ids[0],
      ids[4],
    ]);
    expect(swapped.puzzles[puzzle.id].attempts).toBe(0);
    expect(swapped.puzzles[puzzle.id].hintUsed).toBe(false);
    expect(gameReducer(swapped, { type: 'undo' }).puzzles[puzzle.id].selectedIds).toEqual(
      ids.slice(0, 5),
    );
  });
  it('swaps duplicate word objects by ID', () => {
    const state = orderedState(puzzle);
    const swapped = gameReducer(state, { type: 'swap', firstId: ids[1], secondId: ids[6] });
    expect(swapped.puzzles[puzzle.id].selectedIds[1]).toBe(ids[6]);
    expect(swapped.puzzles[puzzle.id].selectedIds[6]).toBe(ids[1]);
    expect(new Set(swapped.puzzles[puzzle.id].selectedIds).size).toBe(ids.length);
    expect(acceptedSentence(puzzle, swapped.puzzles[puzzle.id].selectedIds)).not.toBeNull();
  });
  it('ignores a swap onto itself, a foreign ID, or a word that is still in the bank', () => {
    const state = orderedState(puzzle, ids.slice(0, 2));
    for (const secondId of [ids[0], ids[3], 'unknown']) {
      expect(gameReducer(state, { type: 'swap', firstId: ids[0], secondId })).toBe(state);
    }
  });
  it('does not swap words in a solved or revealed result', () => {
    for (const type of ['check', 'reveal'] as const) {
      const finished = gameReducer(orderedState(puzzle), { type });
      expect(gameReducer(finished, { type: 'swap', firstId: ids[0], secondId: ids[3] })).toBe(
        finished,
      );
    }
  });
  it('ignores duplicate additions and unknown removals', () => {
    const state = orderedState(puzzle, ids.slice(0, 1));
    expect(gameReducer(state, { type: 'add', tokenId: ids[0] })).toBe(state);
    expect(gameReducer(state, { type: 'add', tokenId: 'unknown' })).toBe(state);
    expect(gameReducer(state, { type: 'remove', tokenId: ids[1] })).toBe(state);
  });
  it('keeps repeated words separate when one is removed', () => {
    let state = orderedState(puzzle);
    state = gameReducer(state, { type: 'remove', tokenId: ids[1] });
    expect(state.puzzles[puzzle.id].selectedIds).not.toContain(ids[1]);
    expect(state.puzzles[puzzle.id].selectedIds).toContain(ids[6]);
  });
  it('an incorrect check preserves arrangement and tracks every attempt', () => {
    const wrongIds = [...ids].reverse();
    let state = orderedState(puzzle, wrongIds);
    state = gameReducer(state, { type: 'check' });
    state = gameReducer(state, { type: 'check' });
    expect(state.puzzles[puzzle.id]).toMatchObject({
      status: 'playing',
      selectedIds: wrongIds,
      attempts: 2,
      incorrectChecks: 2,
    });
  });
  it('does not check an incomplete sentence', () => {
    const state = orderedState(puzzle, ids.slice(0, 2));
    expect(gameReducer(state, { type: 'check' })).toBe(state);
  });
  it('solves a correct answer and prevents accidental edits to completion', () => {
    const solved = gameReducer(orderedState(puzzle), { type: 'check' });
    expect(solved.puzzles[puzzle.id]).toMatchObject({
      status: 'solved',
      attempts: 1,
      incorrectChecks: 0,
    });
    expect(gameReducer(solved, { type: 'clear' })).toBe(solved);
  });
  it('switching preserves independent arrangements and counters', () => {
    let state = orderedState(puzzle, ids.slice(0, 3));
    state = gameReducer(state, { type: 'switch', puzzleId: puzzles[1].id });
    state = gameReducer(state, { type: 'add', tokenId: puzzles[1].solutionTokens[2].id });
    state = gameReducer(state, { type: 'switch', puzzleId: puzzle.id });
    expect(state.puzzles[puzzle.id].selectedIds).toEqual(ids.slice(0, 3));
    expect(state.puzzles[puzzles[1].id].selectedIds).toHaveLength(1);
  });
  it('tracks hints and reveals independently of earned solves; reset allows replay', () => {
    let state = gameReducer(initialState(), { type: 'hint' });
    state = gameReducer(state, { type: 'reveal' });
    expect(state.puzzles[puzzle.id]).toMatchObject({
      status: 'revealed',
      hintUsed: true,
      attempts: 0,
      selectedIds: ids,
    });
    expect(gameReducer(state, { type: 'reset' }).puzzles[puzzle.id]).toEqual(emptyProgress());
  });
});

describe('versioned browser persistence', () => {
  it('preserves progress from the original brand and writes it under Sentagram', () => {
    const state = gameReducer(orderedState(puzzles[0]), {
      type: 'swap',
      firstId: puzzles[0].solutionTokens[0].id,
      secondId: puzzles[0].solutionTokens[2].id,
    });
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(state));
    expect(localProgressRepository.load()).toEqual(state);
    localProgressRepository.save(state);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(state);
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull();
  });
  it('prefers current progress but can recover a corrupt new record from the legacy key', () => {
    const old = orderedState(puzzles[0]);
    const current = orderedState(puzzles[1]);
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(old));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    expect(localProgressRepository.load()).toEqual(current);
    localStorage.setItem(STORAGE_KEY, '{broken');
    expect(localProgressRepository.load()).toEqual(old);
  });
  it('restores arrangements, history, attempts, hints, and last active puzzle', () => {
    let state = orderedState(puzzles[6]);
    state = gameReducer(state, { type: 'hint' });
    state = gameReducer(state, { type: 'remove', tokenId: puzzles[6].solutionTokens[2].id });
    expect(localProgressRepository.save(state)).toBe(true);
    expect(localProgressRepository.load()).toEqual(state);
  });
  it('restores solved and revealed results', () => {
    let state = gameReducer(orderedState(puzzles[0]), { type: 'check' });
    state = gameReducer(state, { type: 'switch', puzzleId: puzzles[1].id });
    state = gameReducer(state, { type: 'reveal' });
    localProgressRepository.save(state);
    expect(localProgressRepository.load()).toEqual(state);
  });
  it('recovers from corrupt JSON, unknown versions, or non-object data', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    expect(localProgressRepository.load()).toEqual(initialState());
    for (const raw of [
      null,
      [],
      'hello',
      { version: 999, puzzles: {} },
      { version: 1, puzzles: null },
    ])
      expect(sanitizeProgress(raw)).toEqual(initialState());
  });
  it('discards invalid IDs and unjustified solved statuses, and bounds malformed counts', () => {
    const raw = {
      version: 1,
      activePuzzleId: 'gone',
      puzzles: {
        [puzzles[0].id]: {
          selectedIds: ['unknown'],
          status: 'solved',
          attempts: -10,
          incorrectChecks: Infinity,
          hintUsed: 'yes',
          history: [['unknown']],
        },
      },
    };
    const restored = sanitizeProgress(raw);
    expect(restored.activePuzzleId).toBe(puzzles[0].id);
    expect(restored.puzzles[puzzles[0].id]).toEqual(emptyProgress());
  });
  it('handles blocked storage without preventing play', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    expect(localProgressRepository.load()).toEqual(initialState());
    get.mockRestore();
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    expect(localProgressRepository.save(initialState())).toBe(false);
    set.mockRestore();
  });
});

describe('spoiler-free result text', () => {
  it('reports attempts and hints without including the solution', () => {
    const puzzle = puzzles[6];
    const text = resultText(puzzle, { ...emptyProgress(), status: 'solved', attempts: 2 });
    expect(text).toContain('Sentagram #07');
    expect(text).toContain('Solved in 2 attempts');
    expect(text).toContain('No hints used');
    expect(text).not.toContain('present');
  });
  it('labels revealed answers honestly', () => {
    expect(
      resultText(puzzles[0], { ...emptyProgress(), status: 'revealed', hintUsed: true }),
    ).toContain('Answer revealed\nA little hint helped');
  });
});
