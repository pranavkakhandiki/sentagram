import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { puzzles } from '../data/puzzles';
import { bankLabel } from '../game/validation';
import { STORAGE_KEY } from '../game/storage';
import { emptyProgress, gameReducer, initialState } from '../game/state';
import { shareResult } from '../game/share';
import { orderedState } from './helpers';

async function fill(user: ReturnType<typeof userEvent.setup>, puzzle = puzzles[0]) {
  for (const token of puzzle.solutionTokens)
    await user.click(screen.getAllByRole('button', { name: 'Add ' + bankLabel(token) + ' to sentence' })[0]);
}
function save(state: ReturnType<typeof initialState>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
async function unlock(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'How to play' }));
  await user.click(screen.getByRole('switch', { name: 'Dev mode' }));
  await user.type(screen.getByLabelText('Dev code'), '2026');
  await user.click(screen.getByRole('button', { name: 'Unlock' }));
  await user.click(screen.getByRole('button', { name: 'Let’s play' }));
}

describe('daily game interface', () => {
  it('opens today’s puzzle without difficulty, bank, hints, reveal or replay shortcuts', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '15 October 2026' })).toBeInTheDocument();
    expect(within(screen.getByLabelText('Word bank')).getAllByRole('button')).toHaveLength(10);
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
    expect(screen.getByLabelText('3 guesses remaining')).toBeInTheDocument();
    for (const name of ['Hint', 'Reveal', 'Replay', 'Next puzzle', 'Open puzzle collection'])
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    expect(screen.queryByText('Gentle')).not.toBeInTheDocument();
  });
  it('keeps duplicate words distinct, supports Undo and Clear, and preserves partial progress after reload', async () => {
    const user = userEvent.setup();
    const app = render(<App />);
    for (const word of ['wind', 'made', 'wind'])
      await user.click(screen.getAllByRole('button', { name: 'Add ' + word + ' to sentence' })[0]);
    await user.click(screen.getByRole('button', { name: 'Return made to word bank, word 2' }));
    expect(screen.getByRole('button', { name: 'Return wind to word bank, word 2' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    app.unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: 'Return made to word bank, word 2' })).toBeInTheDocument();
    expect(screen.getByLabelText('3 guesses remaining')).toBeInTheDocument();
  });
  it('shows one swap away, retains the guess after Undo, then solves and copies real emoji rows', async () => {
    const user = userEvent.setup();
    const ids = puzzles[0].solutionTokens.map((token) => token.id);
    const wrong = [...ids]; [wrong[0], wrong[9]] = [wrong[9], wrong[0]];
    save(orderedState(puzzles[0], wrong));
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText('One swap away…')).toBeInTheDocument();
    expect(screen.getByLabelText('2 guesses remaining')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('2 guesses remaining')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('heading', { name: 'Nicely done!' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Your attempts' }).children).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    const text = await navigator.clipboard.readText();
    expect(text).toContain('15 Oct 2026\n2/3\n⬜');
    expect(text).toContain('🟩'.repeat(10));
    expect(screen.queryByRole('button', { name: 'Replay' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next puzzle' })).not.toBeInTheDocument();
  });
  it('reveals and freezes the answer after three misses, preserves the failed grids across remounts', async () => {
    const user = userEvent.setup();
    save(orderedState(puzzles[0], puzzles[0].solutionTokens.map((token) => token.id).reverse()));
    const app = render(<App />);
    for (let attempt = 0; attempt < 3; attempt++) await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('heading', { name: 'Until tomorrow.' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Your attempts' }).children).toHaveLength(3);
    const sentence = within(screen.getByLabelText('Constructed sentence')).getAllByRole('button');
    expect(sentence.map((word) => word.textContent)).toEqual(['The', 'wind', 'made', 'it', 'hard', 'to', 'wind', 'the', 'kite', 'string']);
    expect(sentence.every((word) => (word as HTMLButtonElement).disabled)).toBe(true);
    app.unmount();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Until tomorrow.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(await navigator.clipboard.readText()).toContain('X/3');
  });
  it('requires the code for bank access and isolates practice guesses from the daily game', async () => {
    const user = userEvent.setup();
    const app = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add kite to sentence' }));
    await user.click(screen.getByRole('button', { name: 'How to play' }));
    await user.click(screen.getByRole('switch', { name: 'Dev mode' }));
    await user.type(screen.getByLabelText('Dev code'), '1111');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(screen.getByRole('alert')).toHaveTextContent('That code doesn’t match');
    expect(screen.queryByRole('button', { name: 'Open puzzle collection' })).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Dev code'));
    await user.type(screen.getByLabelText('Dev code'), '2026');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    await user.click(screen.getByRole('button', { name: 'Let’s play' }));
    await user.click(screen.getByRole('button', { name: 'Open puzzle collection' }));
    expect(within(screen.getByRole('dialog')).getAllByRole('button', { name: /^Puzzle \d/ })).toHaveLength(20);
    await user.click(screen.getByRole('button', { name: 'Puzzle 01, Gentle, Not played' }));
    expect(screen.getByRole('heading', { name: 'Practice · Puzzle 01' })).toBeInTheDocument();
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('button', { name: 'Replay practice' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Replay practice' }));
    expect(screen.getByLabelText('3 guesses remaining')).toBeInTheDocument();
    app.unmount();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Practice · Puzzle 01' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'How to play' }));
    await user.click(screen.getByRole('switch', { name: 'Dev mode' }));
    await user.click(screen.getByRole('button', { name: 'Let’s play' }));
    expect(screen.getByRole('heading', { name: '15 October 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return kite to word bank, word 1' })).toBeInTheDocument();
    expect(screen.queryByText(/Gentle/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open puzzle collection' })).not.toBeInTheDocument();
  });
  it('returns from any practice puzzle to today without losing daily guesses', async () => {
    const user = userEvent.setup();
    save(gameReducer(orderedState(puzzles[0], puzzles[0].wordBank.map((token) => token.id)), { type: 'check' }));
    render(<App />);
    await unlock(user);
    await user.click(screen.getByRole('button', { name: 'Open puzzle collection' }));
    await user.click(screen.getByRole('button', { name: 'Puzzle 20, Thoughtful, Not played' }));
    expect(screen.getByRole('heading', { name: 'Practice · Puzzle 20' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to today’s puzzle' }));
    expect(screen.getByLabelText('2 guesses remaining')).toBeInTheDocument();
  });
  it('rotates automatically at midnight and starts with three new guesses', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 23, 59, 59));
    save(gameReducer(orderedState(), { type: 'check' }));
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Perfect!' })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1100); });
    expect(screen.getByRole('heading', { name: '16 October 2026' })).toBeInTheDocument();
    expect(screen.getByLabelText('3 guesses remaining')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Word bank')).getAllByRole('button')).toHaveLength(puzzles[1].solutionTokens.length);
  });
  it('refreshes a sleeping tab when visible again, and rejects a stale-day click before its timer runs', async () => {
    const user = userEvent.setup();
    render(<App />);
    vi.setSystemTime(new Date(2026, 9, 16, 9));
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByRole('heading', { name: '16 October 2026' })).toBeInTheDocument();
    vi.setSystemTime(new Date(2026, 9, 17, 9));
    await user.click(screen.getByRole('button', { name: 'Add scoreboard to sentence' }));
    expect(screen.getByRole('heading', { name: '17 October 2026' })).toBeInTheDocument();
    expect(screen.getByText('Arrange the words.')).toBeInTheDocument();
  });
  it('uses the proper punctuation for a saved accepted alternative', () => {
    const puzzle = puzzles[2], available = [...puzzle.solutionTokens];
    const selectedIds = puzzle.alternativeSolutions![0].words.map((word) => {
      const i = available.findIndex((token) => token.preserveCase ? token.text === word : token.text.toLowerCase() === word.toLowerCase());
      return available.splice(i, 1)[0].id;
    });
    const state = { ...initialState(), devMode: true, practicePuzzleId: puzzle.id,
      practice: { [puzzle.id]: { ...emptyProgress(), selectedIds, guesses: [selectedIds], status: 'solved' as const } } };
    save(state);
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Perfect!' })).toBeInTheDocument();
    expect(screen.getByText(',')).toBeInTheDocument();
  });
  it('keeps the game playable if storage is blocked', async () => {
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('Blocked'); });
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/Your browser can’t save/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add kite to sentence' }));
    expect(screen.getByRole('button', { name: 'Return kite to word bank, word 1' })).toBeInTheDocument();
    set.mockRestore();
  });
  it('supports keyboard tile selection and closes help on Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    screen.getByRole('button', { name: 'Add kite to sentence' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Return kite to word bank, word 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'How to play' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('share transport', () => {
  it('prefers native sharing when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    expect(await shareResult('a result')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'a result' });
  });
  it('does not copy when a native share sheet is canceled', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true, value: vi.fn().mockRejectedValue(new DOMException('Cancel', 'AbortError')),
    });
    expect(await shareResult('a result')).toBe('canceled');
  });
  it('offers manual copy when sharing and clipboard are unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    expect(await shareResult('a result')).toBe('manual');
  });
});
