import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { STORAGE_KEY } from '../game/storage';
import { puzzles } from '../data/puzzles';

async function arrange() {
  const user = userEvent.setup();
  render(<App />);
  for (const word of ['kite', 'hard', 'string'])
    await user.click(screen.getByRole('button', { name: `Add ${word} to sentence` }));
  const source = screen.getByRole('button', { name: 'Return kite to word bank, word 1' });
  const target = screen.getByRole('button', { name: 'Return string to word bank, word 3' });
  vi.spyOn(source, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 10, 60, 46));
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(140, 80, 60, 46));
  return { user, source, target };
}

function words() {
  return within(screen.getByLabelText('Constructed sentence'))
    .getAllByRole('button')
    .map((button) => button.textContent);
}

describe('placed-word swapping', () => {
  it('drags across rows, highlights a target, swaps on release, and consumes the generated click', async () => {
    const { user, source, target } = await arrange();
    fireEvent.pointerDown(source, { pointerId: 1, button: 0, clientX: 30, clientY: 30 });
    fireEvent.pointerMove(source, { pointerId: 1, buttons: 1, clientX: 165, clientY: 100 });
    expect(target).toHaveClass('swap-target');
    expect(source).toHaveClass('drag-source');
    expect(words()).toEqual(['Kite', 'hard', 'string']);
    fireEvent.pointerUp(source, { pointerId: 1, button: 0, clientX: 165, clientY: 100 });
    fireEvent.click(source, { detail: 1 });
    expect(words()).toEqual(['String', 'hard', 'kite']);
    expect(screen.queryByRole('button', { name: 'Add kite to sentence' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(words()).toEqual(['Kite', 'hard', 'string']);
    await user.click(source);
    expect(words()).toEqual(['Hard', 'string']);
  });

  it('uses the same swap interaction for touch pointers and persists the new order', async () => {
    const { source } = await arrange();
    const before = JSON.parse(localStorage.getItem(STORAGE_KEY)!).puzzles[puzzles[0].id]
      .selectedIds;
    fireEvent.pointerDown(source, {
      pointerId: 7,
      pointerType: 'touch',
      button: 0,
      clientX: 30,
      clientY: 30,
    });
    fireEvent.pointerMove(source, {
      pointerId: 7,
      pointerType: 'touch',
      clientX: 165,
      clientY: 100,
    });
    fireEvent.pointerUp(source, {
      pointerId: 7,
      pointerType: 'touch',
      button: 0,
      clientX: 165,
      clientY: 100,
    });
    expect(words()).toEqual(['String', 'hard', 'kite']);
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).puzzles[puzzles[0].id].selectedIds,
    ).toEqual([before[2], before[1], before[0]]);
  });

  it('cancels a drag without changing the arrangement or adding undo history', async () => {
    const { source } = await arrange();
    const before = localStorage.getItem(STORAGE_KEY);
    fireEvent.pointerDown(source, { pointerId: 1, button: 0, clientX: 30, clientY: 30 });
    fireEvent.pointerMove(source, { pointerId: 1, clientX: 165, clientY: 100 });
    fireEvent.pointerCancel(source, { pointerId: 1 });
    expect(words()).toEqual(['Kite', 'hard', 'string']);
    expect(document.querySelector('.drag-preview')).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });

  it('drops outside every word without swapping or returning the dragged tile', async () => {
    const { source } = await arrange();
    fireEvent.pointerDown(source, { pointerId: 1, button: 0, clientX: 30, clientY: 30 });
    fireEvent.pointerMove(source, { pointerId: 1, clientX: 500, clientY: 500 });
    fireEvent.pointerUp(source, { pointerId: 1, button: 0, clientX: 500, clientY: 500 });
    fireEvent.click(source, { detail: 1 });
    expect(words()).toEqual(['Kite', 'hard', 'string']);
  });

  it('treats a small touch movement as a tap, so placed words can still return', async () => {
    const { source } = await arrange();
    fireEvent.pointerDown(source, {
      pointerId: 1,
      pointerType: 'touch',
      button: 0,
      clientX: 30,
      clientY: 30,
    });
    fireEvent.pointerMove(source, { pointerId: 1, pointerType: 'touch', clientX: 33, clientY: 32 });
    fireEvent.pointerUp(source, {
      pointerId: 1,
      pointerType: 'touch',
      button: 0,
      clientX: 33,
      clientY: 32,
    });
    fireEvent.click(source, { detail: 1 });
    expect(words()).toEqual(['Hard', 'string']);
  });

  it('supports keyboard swapping, retains focus on the moved word, and remains undoable', async () => {
    const { user, source } = await arrange();
    source.focus();
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(words()).toEqual(['Hard', 'kite', 'string']);
    expect(screen.getByRole('button', { name: 'Return kite to word bank, word 2' })).toHaveFocus();
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(words()).toEqual(['Hard', 'string', 'kite']);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(words()).toEqual(['Hard', 'kite', 'string']);
  });
});
