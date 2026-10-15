import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Dispatch, KeyboardEvent } from 'react';
import type { GameAction } from '../game/state';
import type { Puzzle, PuzzleProgress } from '../game/types';
import { acceptedSentence, bankLabel, sentenceLabel } from '../game/validation';
import { useSentenceSwap } from '../hooks/useSentenceSwap';
import { WordTile } from './WordTile';

interface BoardProps {
  puzzle: Puzzle;
  progress: PuzzleProgress;
  dispatch: Dispatch<GameAction>;
  feedback: string;
  checkPulse: number;
  onCheck: () => void;
}

export function PuzzleBoard({
  puzzle,
  progress,
  dispatch,
  feedback,
  checkPulse,
  onCheck,
}: BoardProps) {
  const tileElements = useRef(new Map<string, HTMLButtonElement>());
  const previousPositions = useRef(new Map<string, DOMRect>());
  const focusAfterMove = useRef<string | null>(null);
  const [swapAnnouncement, setSwapAnnouncement] = useState('');
  const complete = progress.selectedIds.length === puzzle.solutionTokens.length;
  const finished = progress.status !== 'playing';
  const tokenMap = new Map(puzzle.solutionTokens.map((token) => [token.id, token]));
  const selected = progress.selectedIds.map((id) => tokenMap.get(id)!).filter(Boolean);
  const format = acceptedSentence(puzzle, progress.selectedIds)?.format ?? puzzle.format;

  function rememberPositions() {
    tileElements.current.forEach((element, id) =>
      previousPositions.current.set(id, element.getBoundingClientRect()),
    );
  }

  function swapWords(firstId: string, secondId: string, dropPosition?: DOMRect) {
    rememberPositions();
    // Settle the dragged tile from the finger's location, not its old slot.
    if (dropPosition) previousPositions.current.set(firstId, dropPosition);
    const position = progress.selectedIds.indexOf(secondId) + 1;
    dispatch({ type: 'swap', firstId, secondId });
    setSwapAnnouncement(`${bankLabel(tokenMap.get(firstId)!)} swapped to position ${position}.`);
  }

  const drag = useSentenceSwap({
    selectedIds: progress.selectedIds,
    elements: tileElements,
    disabled: finished,
    onSwap: swapWords,
  });

  useLayoutEffect(() => {
    const positions = new Map<string, DOMRect>();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    tileElements.current.forEach((element, id) => {
      const current = element.getBoundingClientRect();
      const previous = previousPositions.current.get(id);
      positions.set(id, current);
      if (previous && !reduced && typeof element.animate === 'function') {
        const x = previous.left - current.left;
        const y = previous.top - current.top;
        if (Math.abs(x) + Math.abs(y) > 2)
          element.animate(
            [
              { transform: `translate(${x}px, ${y}px) scale(.96)`, zIndex: 3 },
              { transform: 'translate(0, 0) scale(1)', zIndex: 3 },
            ],
            { duration: 230, easing: 'cubic-bezier(.2,.75,.25,1)' },
          );
      }
    });
    previousPositions.current = positions;
    if (focusAfterMove.current) {
      tileElements.current.get(focusAfterMove.current)?.focus();
      focusAfterMove.current = null;
    }
  }, [progress.selectedIds]);

  function attach(id: string) {
    return (element: HTMLButtonElement | null) => {
      if (element) tileElements.current.set(id, element);
      else tileElements.current.delete(id);
    };
  }

  function move(type: 'add' | 'remove', id: string) {
    rememberPositions();
    const origin = tileElements.current.get(id);
    if (origin === document.activeElement && origin?.matches(':focus-visible'))
      focusAfterMove.current = id;
    dispatch({ type, tokenId: id });
  }

  function keyboardSwap(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (!event.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
      return;
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const neighbor = progress.selectedIds[progress.selectedIds.indexOf(id) + direction];
    if (neighbor) {
      focusAfterMove.current = id;
      swapWords(id, neighbor);
    }
  }

  return (
    <section className="puzzle-board" aria-label="Word puzzle">
      <p className="sr-only" id="sentence-help">
        Tap a placed word to return it. Drag it onto another to swap. Or use Alt and an arrow key to
        swap with a neighbor.
      </p>
      <div
        className={`sentence-area ${finished ? 'sentence-finished' : ''} ${drag.preview ? 'is-swapping' : ''}`}
      >
        <div className="sentence-sizer" aria-hidden="true">
          {puzzle.wordBank.map((token) => (
            <span key={token.id} className="word-tile">
              {bankLabel(token)}
            </span>
          ))}
          <span className="ending-punctuation">.</span>
        </div>
        <div
          key={checkPulse}
          className={`sentence-content ${feedback ? 'try-again' : ''} ${progress.status === 'solved' ? 'solved-animation' : ''}`}
          aria-label="Constructed sentence"
        >
          {selected.length ? (
            <div className="sentence-words">
              {selected.map((token, index) => (
                <span className="sentence-token" key={token.id}>
                  {format.before?.[index] && (
                    <span className="punctuation">{format.before[index]}</span>
                  )}
                  <WordTile
                    ref={attach(token.id)}
                    label={sentenceLabel(token, index)}
                    accessibleLabel={`Return ${bankLabel(token)} to word bank, word ${index + 1}`}
                    aria-describedby={finished ? undefined : 'sentence-help'}
                    placed
                    disabled={finished}
                    className={`${drag.preview?.sourceId === token.id ? 'drag-source' : ''} ${drag.preview?.targetId === token.id ? 'swap-target' : ''}`}
                    onClick={(event) => {
                      if (!drag.consumeDragClick(token.id, event.detail)) move('remove', token.id);
                    }}
                    onPointerDown={(event) => drag.onPointerDown(event, token.id)}
                    onPointerMove={drag.onPointerMove}
                    onPointerUp={drag.onPointerUp}
                    onPointerCancel={drag.cancel}
                    onLostPointerCapture={drag.cancel}
                    onKeyDown={(event) => keyboardSwap(event, token.id)}
                  />
                  {format.after?.[index] && (
                    <span className="punctuation">{format.after[index]}</span>
                  )}
                </span>
              ))}
              {complete && (
                <span className="ending-punctuation" aria-hidden="true">
                  {format.ending}
                </span>
              )}
            </div>
          ) : (
            <p className="sentence-placeholder">Arrange the words.</p>
          )}
        </div>
      </div>
      {!finished && (
        <>
          <div className="word-bank" aria-label="Word bank">
            {puzzle.wordBank.map((token) => {
              const used = progress.selectedIds.includes(token.id);
              return (
                <span key={token.id} className={`bank-slot ${used ? 'is-used' : ''}`}>
                  {used ? (
                    <span className="tile-placeholder" aria-hidden="true">
                      {bankLabel(token)}
                    </span>
                  ) : (
                    <WordTile
                      ref={attach(token.id)}
                      label={bankLabel(token)}
                      accessibleLabel={`Add ${bankLabel(token)} to sentence`}
                      onClick={() => move('add', token.id)}
                    />
                  )}
                </span>
              );
            })}
          </div>
          <div className="game-controls">
            <div className="edit-controls">
              <button
                className="text-button"
                disabled={!progress.history.length}
                onClick={() => {
                  rememberPositions();
                  dispatch({ type: 'undo' });
                }}
              >
                Undo
              </button>
              <button
                className="text-button"
                disabled={!selected.length}
                onClick={() => {
                  rememberPositions();
                  dispatch({ type: 'clear' });
                }}
              >
                Clear
              </button>
            </div>
            <button className="primary-button check-button" disabled={!complete} onClick={onCheck}>
              Check
            </button>
          </div>
          {feedback && (
            <p className="check-feedback" role="status">
              {feedback}
            </p>
          )}
        </>
      )}
      <p className="sr-only" role="status">
        {swapAnnouncement}
      </p>
      {drag.preview &&
        createPortal(
          <div
            className="word-tile drag-preview"
            aria-hidden="true"
            style={{
              left: drag.preview.x,
              top: drag.preview.y,
              width: drag.preview.width,
              height: drag.preview.height,
            }}
          >
            {drag.preview.label}
          </div>,
          document.body,
        )}
    </section>
  );
}
