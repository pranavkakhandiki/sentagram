import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { STORAGE_KEY } from '../game/storage';

async function arrange() {
  const user = userEvent.setup();
  render(<App />);
  for (const word of ['kite', 'hard', 'string'])
    await user.click(screen.getByRole('button', { name: 'Add ' + word + ' to sentence' }));
  const source = screen.getByRole('button', { name: 'Return kite to word bank, word 1' });
  const middle = screen.getByRole('button', { name: 'Return hard to word bank, word 2' });
  const target = screen.getByRole('button', { name: 'Return string to word bank, word 3' });
  vi.spyOn(source.closest('.sentence-area')!, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 240, 160));
  vi.spyOn(source, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 10, 60, 46));
  vi.spyOn(middle, 'getBoundingClientRect').mockReturnValue(new DOMRect(80, 10, 60, 46));
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(140, 80, 60, 46));
  return { user, source, middle, target };
}
function words() {
  return within(screen.getByLabelText('Constructed sentence')).getAllByRole('button').map((button) => button.textContent);
}
function drag(source: HTMLElement, x: number, y: number, pointerType = 'mouse') {
  fireEvent.pointerDown(source, { pointerId: 1, pointerType, button: 0, clientX: 30, clientY: 30 });
  fireEvent.pointerMove(source, { pointerId: 1, pointerType, buttons: 1, clientX: x, clientY: y });
}
function drop(source: HTMLElement, x: number, y: number) {
  fireEvent.pointerUp(source, { pointerId: 1, button: 0, clientX: x, clientY: y });
  fireEvent.click(source, { detail: 1 });
}

describe('placed-word insertion', () => {
  it('shows a caret across rows, inserts before a word, and consumes the generated click', async () => {
    const { user, source } = await arrange();
    drag(source, 150, 100);
    expect(document.querySelector('.insertion-marker')).not.toBeNull();
    expect(source).toHaveClass('drag-source');
    expect(words()).toEqual(['Kite', 'hard', 'string']);
    drop(source, 150, 100);
    expect(words()).toEqual(['Hard', 'kite', 'string']);
    expect(screen.queryByRole('button', { name: 'Add kite to sentence' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(words()).toEqual(['Kite', 'hard', 'string']);
    await user.click(source);
    expect(words()).toEqual(['Hard', 'string']);
  });
  it('inserts after the final word with touch and persists the relative order of every other tile', async () => {
    const { source } = await arrange();
    const before = JSON.parse(localStorage.getItem(STORAGE_KEY)!).daily.selectedIds;
    drag(source, 210, 100, 'touch');
    drop(source, 210, 100);
    expect(words()).toEqual(['Hard', 'string', 'kite']);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).daily.selectedIds).toEqual([before[1], before[2], before[0]]);
  });
  it('moves a word to the beginning and keeps all the intervening words in order', async () => {
    const { target } = await arrange();
    fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientX: 170, clientY: 100 });
    fireEvent.pointerMove(target, { pointerId: 1, clientX: 5, clientY: 30 });
    drop(target, 5, 30);
    expect(words()).toEqual(['String', 'kite', 'hard']);
  });
  it('cancels a drag without adding history', async () => {
    const { source } = await arrange();
    const before = localStorage.getItem(STORAGE_KEY);
    drag(source, 210, 100);
    fireEvent.pointerCancel(source, { pointerId: 1 });
    expect(words()).toEqual(['Kite', 'hard', 'string']);
    expect(document.querySelector('.drag-preview')).toBeNull();
    expect(document.querySelector('.insertion-marker')).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
  it('rejects release outside the sentence even if the last move was over a valid gap', async () => {
    const { source } = await arrange();
    const before = localStorage.getItem(STORAGE_KEY);
    drag(source, 150, 100);
    drop(source, 500, 500);
    expect(words()).toEqual(['Kite', 'hard', 'string']);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
  it('does not add undo history when dropped in its original position', async () => {
    const { source } = await arrange();
    const before = localStorage.getItem(STORAGE_KEY);
    drag(source, 65, 30);
    drop(source, 65, 30);
    expect(words()).toEqual(['Kite', 'hard', 'string']);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
  it('treats small touch movements as taps', async () => {
    const { source } = await arrange();
    fireEvent.pointerDown(source, { pointerId: 1, pointerType: 'touch', button: 0, clientX: 30, clientY: 30 });
    fireEvent.pointerMove(source, { pointerId: 1, pointerType: 'touch', clientX: 33, clientY: 32 });
    drop(source, 33, 32);
    expect(words()).toEqual(['Hard', 'string']);
  });
  it('supports keyboard movement with retained focus and Undo', async () => {
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
