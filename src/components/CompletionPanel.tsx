import { useEffect, useRef, useState } from 'react';
import type { Puzzle, PuzzleProgress } from '../game/types';
import { resultText, shareResult } from '../game/share';
import { evaluateGuess } from '../game/validation';
import { Icon } from './Icon';

export function CompletionPanel({ puzzle, progress, day, practice, onReplay }: {
  puzzle: Puzzle; progress: PuzzleProgress; day: string; practice: boolean; onReplay: () => void;
}) {
  const [shareMessage, setShareMessage] = useState('');
  const [manual, setManual] = useState(false);
  const [sharing, setSharing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const revealed = progress.status === 'revealed';
  const text = resultText(puzzle, progress, day, practice);

  async function share() {
    setSharing(true);
    const result = await shareResult(text);
    setSharing(false);
    if (result === 'copied') setShareMessage('Copied!');
    if (result === 'shared') setShareMessage('Shared!');
    if (result === 'manual') setManual(true);
  }

  return (
    <section className="completion-panel" aria-label="Puzzle result">
      <h2 ref={heading} tabIndex={-1}>{revealed ? 'Until tomorrow.' : ['Perfect!', 'Nicely done!', 'Just in time!'][progress.guesses.length - 1]}</h2>
      <p className="result-meta">{revealed ? 'Three tries. Here’s the answer above.' : 'Solved in ' + progress.guesses.length + ' of 3 tries.'}</p>
      <div className="attempt-grid" role="list" aria-label="Your attempts">
        {progress.guesses.map((ids, index) => {
          const positions = evaluateGuess(puzzle, ids)!.positions;
          return <div className="attempt-row" role="listitem" key={index}
            aria-label={'Attempt ' + (index + 1) + ': ' + positions.filter(Boolean).length + ' of ' + positions.length + ' words in the right place'}>
            {positions.map((right, position) => <span key={position} aria-hidden="true" className={'result-cell' + (right ? ' is-correct' : '')} />)}
          </div>;
        })}
      </div>
      <p className="completion-explanation">{puzzle.explanation}</p>
      <button className="primary-button share-button" onClick={share} disabled={sharing}>
        {sharing ? 'Sharing…' : 'Share'}<Icon name="share" size={18} />
      </button>
      {shareMessage && <p className="share-feedback" role="status">{shareMessage}</p>}
      {manual && <div className="manual-share">
        <label htmlFor="result-copy">Copy your result:</label>
        <textarea id="result-copy" readOnly value={text} onFocus={(event) => event.target.select()} rows={7} />
      </div>}
      {practice ? <button className="text-button replay-button" onClick={onReplay}><Icon name="replay" size={15} />Replay practice</button>
        : <p className="next-puzzle-note">Back tomorrow for a new sentence.</p>}
    </section>
  );
}
