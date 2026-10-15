import { useEffect, useRef, useState } from 'react';
import type { Puzzle, PuzzleProgress } from '../game/types';
import { resultText, shareResult } from '../game/share';
import { Icon } from './Icon';

export function CompletionPanel({
  puzzle,
  progress,
  onNext,
  onReplay,
  allDone,
}: {
  puzzle: Puzzle;
  progress: PuzzleProgress;
  onNext: () => void;
  onReplay: () => void;
  allDone: boolean;
}) {
  const [shareMessage, setShareMessage] = useState('');
  const [manual, setManual] = useState(false);
  const [sharing, setSharing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  const revealed = progress.status === 'revealed';
  const text = resultText(puzzle, progress);
  async function share() {
    setSharing(true);
    const result = await shareResult(text);
    setSharing(false);
    if (result === 'copied') setShareMessage('Copied.');
    if (result === 'shared') setShareMessage('Shared.');
    if (result === 'manual') setManual(true);
  }
  return (
    <section className="completion-panel" aria-label="Puzzle result">
      <h2 ref={heading} tabIndex={-1}>
        {revealed ? 'Answer revealed.' : 'Nicely done.'}
      </h2>
      <p className="completion-explanation">{puzzle.explanation}</p>
      <p className="result-meta">
        {revealed
          ? 'Revealed'
          : `${progress.attempts} ${progress.attempts === 1 ? 'attempt' : 'attempts'}`}
        <span>·</span>
        {progress.hintUsed ? 'Hint used' : 'No hints used'}
      </p>
      <div className="completion-actions">
        <button className="primary-button" onClick={onNext}>
          {allDone ? 'Puzzles' : 'Next puzzle'}
          <Icon name="arrow" />
        </button>
        <button className="text-button" onClick={share} disabled={sharing}>
          <Icon name="share" />
          {sharing ? 'Sharing…' : 'Share'}
        </button>
      </div>
      {shareMessage && (
        <p className="share-feedback" role="status">
          {shareMessage}
        </p>
      )}
      {manual && (
        <div className="manual-share">
          <label htmlFor="result-copy">Copy your result:</label>
          <textarea
            id="result-copy"
            readOnly
            value={text}
            onFocus={(event) => event.target.select()}
            rows={5}
          />
        </div>
      )}
      <button className="text-button replay-button" onClick={onReplay}>
        <Icon name="replay" size={15} />
        Replay
      </button>
    </section>
  );
}
