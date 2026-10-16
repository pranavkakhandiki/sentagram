import { describe, expect, it, vi } from 'vitest';
import { parseSentence, puzzles } from '../data/puzzles';
import { deterministicShuffle } from '../game/shuffle';
import { emptyProgress, gameReducer, initialState, activeGame } from '../game/state';
import { localProgressRepository, sanitizeProgress, STORAGE_KEY } from '../game/storage';
import { acceptedSentence, bankLabel, evaluateGuess, formatSentence, sentenceLabel } from '../game/validation';
import { guessRows, resultText, GAME_URL } from '../game/share';
import { dailyPuzzle, dayKey, displayDate, LAUNCH_DAY, millisecondsToMidnight, validDay } from '../game/daily';
import { idsForWords, orderedState } from './helpers';

describe('curated puzzle integrity', () => {
  it('has 20 unique puzzles with consecutive editorial numbers', () => {
    expect(puzzles).toHaveLength(20);
    expect(new Set(puzzles.map((puzzle) => puzzle.id)).size).toBe(20);
    expect(puzzles.map((puzzle) => puzzle.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
  for (const puzzle of puzzles) {
    it(puzzle.title + ': every tile is preserved in a deterministic scramble and the answer is accepted', () => {
      const ids = puzzle.solutionTokens.map((token) => token.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(puzzle.wordBank.map((token) => token.id).sort()).toEqual([...ids].sort());
      expect(puzzle.wordBank).toEqual(deterministicShuffle(puzzle.solutionTokens, puzzle.id));
      expect(puzzle.wordBank).not.toEqual(puzzle.solutionTokens);
      expect(puzzle.solutionTokens.every((token) => token.text.length > 0)).toBe(true);
      expect(acceptedSentence(puzzle, ids)).not.toBeNull();
      expect(evaluateGuess(puzzle, ids)?.positions.every(Boolean)).toBe(true);
    });
    for (const alternative of puzzle.alternativeSolutions ?? []) {
      it(puzzle.title + ': accepts ' + alternative.words.join(' '), () => {
        const ids = idsForWords(puzzle, alternative.words);
        expect(acceptedSentence(puzzle, ids)).toEqual(alternative);
        expect([...ids].sort()).toEqual(puzzle.solutionTokens.map((token) => token.id).sort());
        expect(evaluateGuess(puzzle, ids)?.positions.every(Boolean)).toBe(true);
      });
    }
  }
  it('accepts identical words with exchanged IDs, including repeated sentence-initial articles', () => {
    const puzzle = puzzles[6], ids = puzzle.solutionTokens.map((token) => token.id);
    [ids[1], ids[9]] = [ids[9], ids[1]];
    [ids[0], ids[4]] = [ids[4], ids[0]];
    expect(acceptedSentence(puzzle, ids)).not.toBeNull();
  });
  it('rejects missing words, reused IDs, foreign IDs, and incorrect sequences', () => {
    const puzzle = puzzles[0], ids = puzzle.solutionTokens.map((token) => token.id);
    for (const guess of [ids.slice(1), [ids[0], ...ids.slice(0, -1)], ['foreign', ...ids.slice(1)]])
      expect(evaluateGuess(puzzle, guess)).toBeNull();
    expect(acceptedSentence(puzzle, [...ids].reverse())).toBeNull();
  });
  it('retains names and months while hiding ordinary sentence-initial capitals', () => {
    expect(bankLabel(puzzles[0].solutionTokens[0])).toBe('the');
    expect(sentenceLabel(puzzles[0].solutionTokens[7], 0)).toBe('The');
    expect(puzzles[5].solutionTokens.slice(0, 5).map(bankLabel)).toEqual(['May', 'may', 'march', 'in', 'March']);
  });
  it('keeps punctuation outside words and retains apostrophes', () => {
    expect(parseSentence('Before lunch, Rose can’t dance.')).toEqual({
      words: ['Before', 'lunch', 'Rose', 'can’t', 'dance'],
      format: { before: {}, after: { 1: ',' }, ending: '.' },
    });
    expect(formatSentence(puzzles[0].solutionTokens, puzzles[0].format)).toBe(
      'The wind made it hard to wind the kite string.',
    );
  });
});

describe('daily calendar', () => {
  it('keeps the same puzzle all day and changes at local midnight', () => {
    expect(dayKey(new Date(2026, 9, 15, 0))).toBe(LAUNCH_DAY);
    expect(dayKey(new Date(2026, 9, 15, 23, 59, 59))).toBe(LAUNCH_DAY);
    expect(dailyPuzzle(LAUNCH_DAY)).toBe(puzzles[0]);
    expect(dailyPuzzle(dayKey(new Date(2026, 9, 16)))).toBe(puzzles[1]);
    expect(displayDate(LAUNCH_DAY)).toBe('15 October 2026');
  });
  it('loops every 20 calendar days across months, leap days, and DST', () => {
    for (const day of ['2026-10-15', '2026-10-31', '2026-11-01', '2027-03-14', '2028-02-28']) {
      const [year, month, date] = day.split('-').map(Number);
      const cycle = new Date(year, month - 1, date + 20);
      expect(dailyPuzzle(dayKey(cycle))).toBe(dailyPuzzle(day));
    }
    expect(dailyPuzzle('2026-10-14')).toBe(puzzles[19]);
  });
  it('schedules the next actual local midnight, rather than a fixed 24-hour wait', () => {
    const now = new Date(2026, 9, 15, 23, 59, 59, 500);
    expect(millisecondsToMidnight(now)).toBe(500);
    const dstDay = new Date(2027, 2, 14);
    const next = new Date(2027, 2, 15);
    expect(millisecondsToMidnight(dstDay)).toBe(next.getTime() - dstDay.getTime());
  });
  it('validates real dates, including leap years', () => {
    expect(validDay('2028-02-29')).toBe(true);
    for (const value of ['2026-02-29', '2026-13-01', '2026-00-01', 'nope', null])
      expect(validDay(value)).toBe(false);
  });
  it('resets today on rollover even when the bank loops to the same puzzle', () => {
    const state = gameReducer(orderedState(), { type: 'check' });
    expect(gameReducer(state, { type: 'rollover', day: LAUNCH_DAY })).toBe(state);
    const next = gameReducer(state, { type: 'rollover', day: '2026-11-04' });
    expect(activeGame(next).puzzle).toBe(puzzles[0]);
    expect(next.daily).toEqual(emptyProgress());
  });
});

describe('three guesses and one-swap feedback', () => {
  const puzzle = puzzles[0], ids = puzzle.solutionTokens.map((token) => token.id);
  it('detects an adjacent or nonadjacent exchange and marks exactly two wrong positions', () => {
    for (const [a, b] of [[0, 1], [0, 9], [2, 6]]) {
      const wrong = [...ids];
      [wrong[a], wrong[b]] = [wrong[b], wrong[a]];
      const result = evaluateGuess(puzzle, wrong)!;
      expect(result.correct).toBe(false);
      expect(result.oneSwapAway).toBe(true);
      expect(result.positions.flatMap((right, i) => right ? [] : [i])).toEqual([a, b]);
    }
  });
  it('does not call an already-correct duplicate swap or a three-word rotation one away', () => {
    const duplicate = [...ids];
    [duplicate[1], duplicate[6]] = [duplicate[6], duplicate[1]];
    expect(evaluateGuess(puzzle, duplicate)).toMatchObject({ correct: true, oneSwapAway: false });
    const rotation = [...ids];
    [rotation[0], rotation[2], rotation[9]] = [rotation[2], rotation[9], rotation[0]];
    expect(evaluateGuess(puzzle, rotation)).toMatchObject({ correct: false, oneSwapAway: false });
  });
  it('recognizes one swap from an accepted alternative, respecting proper capitals', () => {
    const alternativePuzzle = puzzles[2];
    const alternative = idsForWords(alternativePuzzle, alternativePuzzle.alternativeSolutions![0].words);
    [alternative[0], alternative[alternative.length - 1]] = [alternative[alternative.length - 1], alternative[0]];
    expect(evaluateGuess(alternativePuzzle, alternative)).toMatchObject({ correct: false, oneSwapAway: true });
    const monthIds = puzzles[5].solutionTokens.map((token) => token.id);
    [monthIds[0], monthIds[1]] = [monthIds[1], monthIds[0]];
    expect(acceptedSentence(puzzles[5], monthIds)).toBeNull();
  });
  it('ignores incomplete checks; saves failed arrangements and reveals on precisely the third miss', () => {
    const partial = orderedState(puzzle, ids.slice(0, 2));
    expect(gameReducer(partial, { type: 'check' })).toBe(partial);
    const wrong = [...ids].reverse();
    let state = orderedState(puzzle, wrong);
    for (let attempt = 1; attempt <= 3; attempt++) {
      state = gameReducer(state, { type: 'check' });
      expect(state.daily.guesses).toEqual(Array.from({ length: attempt }, () => wrong));
      expect(state.daily.status).toBe(attempt === 3 ? 'revealed' : 'playing');
    }
    expect(state.daily.selectedIds).toEqual(ids);
    for (const type of ['check', 'undo', 'clear', 'reset'] as const)
      expect(gameReducer(state, { type })).toBe(state);
  });
  it('can solve on the third guess and never changes earlier recorded guesses', () => {
    const wrong = [...ids].reverse();
    let state = orderedState(puzzle, wrong);
    state = gameReducer(gameReducer(state, { type: 'check' }), { type: 'check' });
    state = { ...state, daily: { ...state.daily, selectedIds: ids } };
    state = gameReducer(state, { type: 'check' });
    expect(state.daily.status).toBe('solved');
    expect(state.daily.guesses).toEqual([wrong, wrong, ids]);
    expect(gameReducer(state, { type: 'remove', tokenId: ids[0] })).toBe(state);
  });
});

describe('editing and isolated development play', () => {
  const puzzle = puzzles[0], ids = puzzle.solutionTokens.map((token) => token.id);
  it('adds distinct duplicates, removes a middle tile, clears, and undoes edits without refunding guesses', () => {
    let state = initialState(LAUNCH_DAY);
    for (const tokenId of ids) state = gameReducer(state, { type: 'add', tokenId });
    state = gameReducer(state, { type: 'swap', firstId: ids[0], secondId: ids[9] });
    state = gameReducer(state, { type: 'check' });
    state = gameReducer(state, { type: 'undo' });
    expect(state.daily.selectedIds).toEqual(ids);
    expect(state.daily.guesses).toHaveLength(1);
    state = gameReducer(state, { type: 'remove', tokenId: ids[1] });
    expect(state.daily.selectedIds).toContain(ids[6]);
    state = gameReducer(state, { type: 'undo' });
    expect(state.daily.selectedIds).toEqual(ids);
    state = gameReducer(state, { type: 'clear' });
    expect(state.daily.selectedIds).toEqual([]);
    expect(gameReducer(state, { type: 'undo' }).daily.selectedIds).toEqual(ids);
  });
  it('ignores duplicate additions, foreign IDs, and invalid swaps', () => {
    const state = orderedState(puzzle, ids.slice(0, 2));
    for (const action of [
      { type: 'add', tokenId: ids[0] }, { type: 'add', tokenId: 'unknown' },
      { type: 'remove', tokenId: ids[4] },
      { type: 'swap', firstId: ids[0], secondId: ids[0] },
      { type: 'swap', firstId: ids[0], secondId: ids[5] },
    ] as const) expect(gameReducer(state, action)).toBe(state);
  });
  it('gates bank access, isolates practice on today’s exact puzzle, and permits only practice resets', () => {
    let state = orderedState(puzzle, [...ids].reverse());
    expect(gameReducer(state, { type: 'switch', puzzleId: puzzle.id })).toBe(state);
    state = gameReducer(state, { type: 'check' });
    const daily = state.daily;
    state = gameReducer(state, { type: 'set-dev', enabled: true });
    state = gameReducer(state, { type: 'switch', puzzleId: puzzle.id });
    for (const tokenId of ids) state = gameReducer(state, { type: 'add', tokenId });
    state = gameReducer(state, { type: 'check' });
    expect(state.practice[puzzle.id].status).toBe('solved');
    expect(state.daily).toBe(daily);
    state = gameReducer(state, { type: 'reset' });
    expect(state.practice[puzzle.id]).toEqual(emptyProgress());
    state = gameReducer(state, { type: 'set-dev', enabled: false });
    expect(activeGame(state).practice).toBe(false);
    expect(state.daily).toBe(daily);
    expect(gameReducer(state, { type: 'reset' })).toBe(state);
  });
});

describe('daily persistence', () => {
  it('restores guesses, edits, undo history and development progress', () => {
    let state = gameReducer(orderedState(puzzles[0], puzzles[0].wordBank.map((token) => token.id)), { type: 'check' });
    state = gameReducer(state, { type: 'remove', tokenId: state.daily.selectedIds[0] });
    state = gameReducer(state, { type: 'set-dev', enabled: true });
    state = gameReducer(state, { type: 'switch', puzzleId: puzzles[6].id });
    state = gameReducer(state, { type: 'add', tokenId: puzzles[6].solutionTokens[0].id });
    expect(localProgressRepository.save(state)).toBe(true);
    expect(localProgressRepository.load()).toEqual(state);
    expect(sanitizeProgress(state, '2026-10-16')).toMatchObject({ day: '2026-10-16', daily: emptyProgress(), practice: state.practice });
  });
  it('reconstructs solved and failed results from guesses, preserving the third failed row', () => {
    const solved = gameReducer(orderedState(), { type: 'check' });
    expect(sanitizeProgress(solved, LAUNCH_DAY)).toEqual(solved);
    let lost = orderedState(puzzles[0], puzzles[0].solutionTokens.map((token) => token.id).reverse());
    for (let i = 0; i < 3; i++) lost = gameReducer(lost, { type: 'check' });
    expect(sanitizeProgress(lost, LAUNCH_DAY)).toEqual(lost);
  });
  it('discards forged results and malformed tile IDs and stops reading after the first solved guess', () => {
    const bad = { ...initialState(LAUNCH_DAY), devMode: false, practicePuzzleId: 'unknown',
      daily: { selectedIds: ['unknown'], history: [['unknown']], guesses: [['unknown']], status: 'solved' } };
    expect(sanitizeProgress(bad, LAUNCH_DAY)).toEqual(initialState(LAUNCH_DAY));
    const ids = puzzles[0].solutionTokens.map((token) => token.id);
    const raw = { ...initialState(LAUNCH_DAY), daily: { guesses: [ids, [...ids].reverse()], selectedIds: [] } };
    expect(sanitizeProgress(raw, LAUNCH_DAY).daily).toMatchObject({ status: 'solved', guesses: [ids], selectedIds: ids });
  });
  it('recovers safely from prototype saves, corrupt JSON, unknown versions, and blocked storage', () => {
    for (const raw of [null, [], { version: 1, puzzles: {} }, { version: 99 }])
      expect(sanitizeProgress(raw, LAUNCH_DAY)).toEqual(initialState(LAUNCH_DAY));
    localStorage.setItem(STORAGE_KEY, '{broken');
    expect(localProgressRepository.load()).toEqual(initialState());
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('Blocked'); });
    expect(localProgressRepository.load()).toEqual(initialState());
    get.mockRestore();
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('Quota'); });
    expect(localProgressRepository.save(initialState())).toBe(false);
    set.mockRestore();
  });
});

describe('spoiler-free emoji results', () => {
  it('shares one row per real attempt, with position matches and a date and link', () => {
    const puzzle = puzzles[0], ids = puzzle.solutionTokens.map((token) => token.id);
    const wrong = [...ids]; [wrong[0], wrong[9]] = [wrong[9], wrong[0]];
    const progress = { ...emptyProgress(), status: 'solved' as const, selectedIds: ids, guesses: [wrong, ids] };
    expect(guessRows(puzzle, progress)).toEqual(['⬜🟩🟩🟩🟩🟩🟩🟩🟩⬜', '🟩'.repeat(10)]);
    const text = resultText(puzzle, progress, LAUNCH_DAY);
    expect(text).toBe('Sentagram · 15 Oct 2026\n2/3\n⬜🟩🟩🟩🟩🟩🟩🟩🟩⬜\n' + '🟩'.repeat(10) + '\n\n' + GAME_URL);
    expect(text).not.toContain('wind');
  });
  it('shares X/3 and all three failed guesses rather than a fabricated green reveal row', () => {
    const puzzle = puzzles[0], wrong = puzzle.solutionTokens.map((token) => token.id).reverse();
    let state = orderedState(puzzle, wrong);
    for (let i = 0; i < 3; i++) state = gameReducer(state, { type: 'check' });
    const text = resultText(puzzle, state.daily, LAUNCH_DAY);
    expect(text).toContain('\nX/3\n');
    expect(guessRows(puzzle, state.daily)).toHaveLength(3);
    expect(guessRows(puzzle, state.daily).every((row) => row.includes('⬜'))).toBe(true);
    expect(resultText(puzzle, state.daily, LAUNCH_DAY, true)).toContain('Practice #1');
  });
});
