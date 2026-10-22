import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

interface DragSession {
  pointerId: number;
  sourceId: string;
  element: HTMLButtonElement;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  label: string;
  dragging: boolean;
}

interface Insertion {
  /** Final position after removing the dragged word. */
  index: number;
  x: number;
  y: number;
  height: number;
}

interface DragPreview {
  sourceId: string;
  insertion: Insertion | null;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ReorderOptions {
  selectedIds: string[];
  elements: RefObject<Map<string, HTMLButtonElement>>;
  container: RefObject<HTMLDivElement | null>;
  disabled: boolean;
  onReorder: (tokenId: string, toIndex: number, dropPosition?: DOMRect) => void;
}

/** Keep the sentence stable until drop. A caret marks an insertion between words,
 * including the start/end of wrapped rows, for mouse, pen, and touch alike.
 */
export function useSentenceReorder({ selectedIds, elements, container, disabled, onReorder }: ReorderOptions) {
  const session = useRef<DragSession | null>(null);
  const suppressedClick = useRef<{ id: string; until: number } | null>(null);
  const [preview, setPreview] = useState<DragPreview | null>(null);

  function cancel() {
    const active = session.current;
    if (active?.dragging)
      suppressedClick.current = { id: active.sourceId, until: Date.now() + 350 };
    session.current = null;
    setPreview(null);
    if (active?.element.hasPointerCapture?.(active.pointerId))
      active.element.releasePointerCapture(active.pointerId);
  }

  useEffect(() => {
    const onBlur = () => cancel();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => { if (disabled) cancel(); }, [disabled]);

  function insertionAt(x: number, y: number, sourceId: string): Insertion | null {
    const area = container.current?.getBoundingClientRect();
    if (!area || x < area.left - 5 || x > area.right + 5 || y < area.top - 5 || y > area.bottom + 5) return null;

    const rows: { top: number; bottom: number; items: { index: number; rect: DOMRect }[] }[] = [];
    selectedIds.filter((id) => id !== sourceId).forEach((id, index) => {
      const rect = elements.current.get(id)?.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) return;
      const row = rows[rows.length - 1];
      if (row && rect.top < row.bottom && rect.bottom > row.top) {
        row.items.push({ index, rect });
        row.top = Math.min(row.top, rect.top);
        row.bottom = Math.max(row.bottom, rect.bottom);
      } else rows.push({ top: rect.top, bottom: rect.bottom, items: [{ index, rect }] });
    });
    if (!rows.length) return null;
    const nearest = rows.reduce((best, row) =>
      Math.abs(y - (row.top + row.bottom) / 2) < Math.abs(y - (best.top + best.bottom) / 2) ? row : best);
    const before = nearest.items.find(({ rect }) => x < rect.left + rect.width / 2);
    if (before) return { index: before.index, x: before.rect.left - 4, y: before.rect.top, height: before.rect.height };
    const last = nearest.items[nearest.items.length - 1];
    return { index: last.index + 1, x: last.rect.right + 4, y: last.rect.top, height: last.rect.height };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>, sourceId: string) {
    if (disabled || selectedIds.length < 2 || event.button !== 0 || session.current) return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    suppressedClick.current = null;
    session.current = {
      pointerId: event.pointerId, sourceId, element,
      startX: event.clientX, startY: event.clientY,
      offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top,
      width: rect.width, height: rect.height, label: element.textContent ?? '', dragging: false,
    };
    element.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = session.current;
    if (!active || event.pointerId !== active.pointerId) return;
    if (!active.dragging && Math.hypot(event.clientX - active.startX, event.clientY - active.startY) < 8) return;
    active.dragging = true;
    event.preventDefault();
    setPreview({
      sourceId: active.sourceId,
      insertion: insertionAt(event.clientX, event.clientY, active.sourceId),
      label: active.label, x: event.clientX - active.offsetX, y: event.clientY - active.offsetY,
      width: active.width, height: active.height,
    });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = session.current;
    if (!active || event.pointerId !== active.pointerId) return;
    if (active.dragging) {
      suppressedClick.current = { id: active.sourceId, until: Date.now() + 350 };
      // Re-evaluate at release so moving outside the sentence always cancels.
      const insertion = insertionAt(event.clientX, event.clientY, active.sourceId);
      if (insertion && insertion.index !== selectedIds.indexOf(active.sourceId))
        onReorder(active.sourceId, insertion.index, new DOMRect(
          event.clientX - active.offsetX, event.clientY - active.offsetY, active.width, active.height,
        ));
    }
    cancel();
  }

  function consumeDragClick(id: string, detail: number) {
    const suppressed = suppressedClick.current;
    suppressedClick.current = null;
    return detail !== 0 && suppressed?.id === id && Date.now() <= suppressed.until;
  }

  return { preview, onPointerDown, onPointerMove, onPointerUp, cancel, consumeDragClick };
}
