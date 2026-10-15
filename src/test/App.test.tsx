import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { puzzles } from '../data/puzzles';
import { bankLabel } from '../game/validation';
import { STORAGE_KEY } from '../game/storage';
import { emptyProgress } from '../game/state';
import { shareResult } from '../game/share';

describe('playable word-tile interface', () => {
  it('starts directly in the game with every word available and Check disabled', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Puzzle 01 of 8' })).toBeInTheDocument();
    expect(screen.queryByText('A Windy Day')).not.toBeInTheDocument();
    expect(screen.queryByText(/looking for a place/)).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('Word bank')).getAllByRole('button')).toHaveLength(10);
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
    expect(screen.getByText('Arrange the words.')).toBeInTheDocument();
  });
  it('selects duplicate words individually and keeps all other words in order on removal', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: 'Add wind to sentence' })[0]);
    await user.click(screen.getByRole('button', { name: 'Add made to sentence' }));
    await user.click(screen.getByRole('button', { name: 'Add wind to sentence' }));
    await user.click(screen.getByRole('button', { name: 'Return made to word bank, word 2' }));
    expect(
      screen.getByRole('button', { name: 'Return wind to word bank, word 1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Return wind to word bank, word 2' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add made to sentence' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(
      screen.getByRole('button', { name: 'Return made to word bank, word 2' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('Arrange the words.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(
      screen.getByRole('button', { name: 'Return wind to word bank, word 3' }),
    ).toBeInTheDocument();
  });
  it('gently rejects an incorrect answer while retaining all selected tiles', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const tile of within(screen.getByLabelText('Word bank')).getAllByRole('button'))
      await user.click(tile);
    const check = screen.getByRole('button', { name: 'Check' });
    expect(check).toBeEnabled();
    await user.click(check);
    expect(
      screen.getByText('Not quite the intended sentence. Try another arrangement.'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Constructed sentence')).getAllByRole('button'),
    ).toHaveLength(10);
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).puzzles[puzzles[0].id].incorrectChecks,
    ).toBe(1);
  });
  it('solves, explains, shares, advances, restores the solved state, and replays', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const token of puzzles[0].solutionTokens)
      await user.click(
        screen.getAllByRole('button', { name: `Add ${bankLabel(token)} to sentence` })[0],
      );
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('heading', { name: 'Nicely done.' })).toBeInTheDocument();
    expect(screen.getByText(puzzles[0].explanation)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(screen.getByText('Copied.')).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toContain('Solved in 1 attempt');
    await user.click(screen.getByRole('button', { name: 'Next puzzle' }));
    expect(screen.getByRole('heading', { name: 'Puzzle 02 of 8' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open puzzle collection' }));
    await user.click(screen.getByRole('button', { name: 'Puzzle 01, Gentle, Solved' }));
    expect(screen.getByRole('heading', { name: 'Nicely done.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Replay' }));
    expect(screen.getByText('Arrange the words.')).toBeInTheDocument();
  });
  it('keeps partial arrangements and hint usage through puzzle switches and remounts', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add kite to sentence' }));
    await user.click(screen.getByRole('button', { name: 'Hint' }));
    expect(screen.getByText(puzzles[0].hint!)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open puzzle collection' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByRole('button')).toHaveLength(9);
    await user.click(within(dialog).getByRole('button', { name: /Puzzle 02, Gentle, Not solved/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    unmount();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Puzzle 02 of 8' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open puzzle collection' }));
    await user.click(screen.getByRole('button', { name: 'Puzzle 01, Gentle, In progress' }));
    expect(
      screen.getByRole('button', { name: 'Return kite to word bank, word 1' }),
    ).toBeInTheDocument();
    expect(screen.getByText(puzzles[0].hint!)).toBeInTheDocument();
  });
  it('requires confirmation to reveal, distinguishes revealed status, and supports replay', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Reveal' }));
    expect(screen.getByRole('dialog', { name: 'Reveal the answer?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(screen.getByText('Arrange the words.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reveal' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reveal' }));
    expect(screen.getByRole('heading', { name: 'Answer revealed.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open puzzle collection' }));
    expect(screen.getByRole('button', { name: 'Puzzle 01, Gentle, Revealed' })).toBeInTheDocument();
    expect(screen.getByText('0 of 8 solved')).toBeInTheDocument();
  });
  it('closes the collection on Escape and displays instructions on request', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Open puzzle collection' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(
      within(screen.getByRole('banner')).getByRole('button', { name: 'How to play' }),
    );
    expect(screen.getByRole('heading', { name: 'How to play' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('allows keyboard selection with Enter and Space', async () => {
    const user = userEvent.setup();
    render(<App />);
    screen.getByRole('button', { name: 'Add kite to sentence' }).focus();
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('button', { name: 'Return kite to word bank, word 1' }),
    ).toBeInTheDocument();
    screen.getByRole('button', { name: 'Add string to sentence' }).focus();
    await user.keyboard(' ');
    expect(
      screen.getByRole('button', { name: 'Return string to word bank, word 2' }),
    ).toBeInTheDocument();
  });
  it('restores an alternative solution with its punctuation', () => {
    const puzzle = puzzles[3];
    const words = puzzle.alternativeSolutions![0].words;
    const available = [...puzzle.solutionTokens];
    const selectedIds = words.map((word) => {
      const index = available.findIndex((token) => token.text.toLowerCase() === word.toLowerCase());
      return available.splice(index, 1)[0].id;
    });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activePuzzleId: puzzle.id,
        puzzles: {
          [puzzle.id]: { ...emptyProgress(), selectedIds, status: 'solved', attempts: 1 },
        },
      }),
    );
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Nicely done.' })).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Constructed sentence'))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['The', 'bass', 'player', 'put', 'down', 'his', 'bass', 'to', 'catch', 'a', 'bass']);
  });
});

describe('share transport', () => {
  it('prefers native sharing when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    expect(await shareResult('a result')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'a result' });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });
  it('does not copy unexpectedly when the native share sheet is canceled', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException('Cancel', 'AbortError')),
    });
    expect(await shareResult('a result')).toBe('canceled');
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });
  it('offers a manual copy when sharing and clipboard are unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    expect(await shareResult('a result')).toBe('manual');
  });
});
