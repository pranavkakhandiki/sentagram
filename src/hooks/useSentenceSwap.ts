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
  targetId: string | null;
}

export interface DragPreview {
  sourceId: string;
  targetId: string | null;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SwapOptions {
  selectedIds: string[];
  elements: RefObject<Map<string, HTMLButtonElement>>;
  disabled: boolean;
  onSwap: (firstId: string, secondId: string, dropPosition?: DOMRect) => void;
}

/** Pointer capture keeps one consistent interaction for mouse, pen, and touch.
 * Ordering changes only on drop, so cancellations never alter game history.
 */
export function useSentenceSwap({ selectedIds, elements, disabled, onSwap }: SwapOptions) {
  const session = useRef<DragSession | null>(null);
  const suppressedClick = useRef<{ id: string; until: number } | null>(null);
  const [preview, setPreview] = useState<DragPreview | null>(null);

  function cancel() {
    const active = session.current;
    if (active?.dragging)
      suppressedClick.current = { id: active.sourceId, until: Date.now() + 350 };
    session.current = null;
    setPreview(null);
    if (active?.element.hasPointerCapture?.(active.pointerId)) {
      active.element.releasePointerCapture(active.pointerId);
    }
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

  useEffect(() => {
    if (disabled) cancel();
  }, [disabled]);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>, sourceId: string) {
    if (disabled || selectedIds.length < 2 || event.button !== 0 || session.current) return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    suppressedClick.current = null;
    session.current = {
      pointerId: event.pointerId,
      sourceId,
      element,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      label: element.textContent ?? '',
      dragging: false,
      targetId: null,
    };
    element.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = session.current;
    if (!active || event.pointerId !== active.pointerId) return;
    if (
      !active.dragging &&
      Math.hypot(event.clientX - active.startX, event.clientY - active.startY) < 8
    )
      return;
    active.dragging = true;
    event.preventDefault();
    // Match the visible target rather than a linear index: wrapped rows work too.
    active.targetId =
      selectedIds.find((id) => {
        if (id === active.sourceId) return false;
        const rect = elements.current.get(id)?.getBoundingClientRect();
        return (
          rect &&
          event.clientX >= rect.left - 5 &&
          event.clientX <= rect.right + 5 &&
          event.clientY >= rect.top - 5 &&
          event.clientY <= rect.bottom + 5
        );
      }) ?? null;
    setPreview({
      sourceId: active.sourceId,
      targetId: active.targetId,
      label: active.label,
      x: event.clientX - active.offsetX,
      y: event.clientY - active.offsetY,
      width: active.width,
      height: active.height,
    });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = session.current;
    if (!active || event.pointerId !== active.pointerId) return;
    if (active.dragging) {
      // Releasing a captured pointer can also generate a click on the source.
      // Consume that click so a swap never sends the source back to the bank.
      suppressedClick.current = { id: active.sourceId, until: Date.now() + 350 };
      if (active.targetId) {
        onSwap(
          active.sourceId,
          active.targetId,
          new DOMRect(
            event.clientX - active.offsetX,
            event.clientY - active.offsetY,
            active.width,
            active.height,
          ),
        );
      }
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
