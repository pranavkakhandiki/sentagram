import { useState } from 'react';
import { puzzles } from './data/puzzles';
import { acceptedSentence } from './game/validation';
import { useGame } from './hooks/useGame';
import { Header } from './components/Header';
import { Modal } from './components/Modal';
import { PuzzleBoard } from './components/PuzzleBoard';
import { PuzzleMenu } from './components/PuzzleMenu';
import { CompletionPanel } from './components/CompletionPanel';

type Dialog = 'collection' | 'help' | 'reveal' | null;

export default function App() {
  const { state, dispatch, puzzle, progress, saveFailed } = useGame();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [feedback, setFeedback] = useState('');
  const [checkPulse, setCheckPulse] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const finished = progress.status !== 'playing';
  const allDone = puzzles.every(
    (item) => state.puzzles[item.id]?.status && state.puzzles[item.id]?.status !== 'playing',
  );

  function selectPuzzle(id: string) {
    dispatch({ type: 'switch', puzzleId: id });
    setFeedback('');
    setCheckPulse(0);
    setDialog(null);
    setAnnouncement(`Puzzle ${puzzles.find((item) => item.id === id)?.number} selected.`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function check() {
    if (progress.selectedIds.length !== puzzle.solutionTokens.length) return;
    const correct = Boolean(acceptedSentence(puzzle, progress.selectedIds));
    dispatch({ type: 'check' });
    setCheckPulse((value) => value + 1);
    setFeedback(correct ? '' : 'Not quite the intended sentence. Try another arrangement.');
    setAnnouncement(
      correct ? 'Puzzle solved!' : `Attempt ${progress.attempts + 1}. Try another arrangement.`,
    );
  }

  function next() {
    if (allDone) {
      setDialog('collection');
      return;
    }
    const currentIndex = puzzles.findIndex((item) => item.id === puzzle.id);
    const ordered = [...puzzles.slice(currentIndex + 1), ...puzzles.slice(0, currentIndex + 1)];
    const nextPuzzle = ordered.find(
      (item) => !state.puzzles[item.id] || state.puzzles[item.id].status === 'playing',
    );
    if (nextPuzzle) selectPuzzle(nextPuzzle.id);
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to puzzle
      </a>
      <Header onMenu={() => setDialog('collection')} onHelp={() => setDialog('help')} />
      <main id="main" className="game-main">
        <article className="game-article" key={puzzle.id}>
          <div className="puzzle-kicker">
            <h1
              aria-label={`Puzzle ${String(puzzle.number).padStart(2, '0')} of ${puzzles.length}`}
            >
              Puzzle {String(puzzle.number).padStart(2, '0')}
            </h1>
            <span className={`difficulty difficulty-${puzzle.difficulty.toLowerCase()}`}>
              {puzzle.difficulty}
            </span>
          </div>
          <PuzzleBoard
            puzzle={puzzle}
            progress={progress}
            dispatch={(action) => {
              dispatch(action);
              if (action.type !== 'check') setFeedback('');
            }}
            feedback={feedback}
            checkPulse={checkPulse}
            onCheck={check}
          />
          {finished ? (
            <CompletionPanel
              key={`${puzzle.id}-${progress.status}`}
              puzzle={puzzle}
              progress={progress}
              allDone={allDone}
              onNext={next}
              onReplay={() => {
                dispatch({ type: 'reset' });
                setFeedback('');
                setAnnouncement('Puzzle reset.');
              }}
            />
          ) : (
            <div className="secondary-section">
              <div className="secondary-actions">
                <button
                  className="hint-button"
                  onClick={() => dispatch({ type: 'hint' })}
                  disabled={progress.hintUsed || !puzzle.hint}
                >
                  Hint
                </button>
                <button className="text-button reveal-button" onClick={() => setDialog('reveal')}>
                  Reveal
                </button>
              </div>
              {progress.hintUsed && (
                <div className="hint-panel" role="status">
                  <p>{puzzle.hint}</p>
                </div>
              )}
            </div>
          )}
        </article>
        {saveFailed && (
          <p className="storage-notice" role="status">
            Your browser can’t save progress right now. You can keep playing in this tab.
          </p>
        )}
      </main>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      {dialog === 'collection' && (
        <PuzzleMenu state={state} onSelect={selectPuzzle} onClose={() => setDialog(null)} />
      )}
      {dialog === 'help' && (
        <Modal title="How to play" onClose={() => setDialog(null)} className="help-modal">
          <ol className="how-to-list">
            <li>
              <span>01</span>
              <p>Tap words to build a sentence. Use every tile.</p>
            </li>
            <li>
              <span>02</span>
              <p>
                Drag a placed word onto another to swap them. Tap a word to return it to the bank.
              </p>
            </li>
            <li>
              <span>03</span>
              <p>Look for words with more than one meaning. Check when it clicks.</p>
            </li>
          </ol>
          <p className="help-note">
            Names and months keep their capitals. We handle punctuation. With a word focused, Alt +
            arrow keys swap it with a neighbor.
          </p>
          <button className="primary-button modal-primary" onClick={() => setDialog(null)}>
            Got it
          </button>
        </Modal>
      )}
      {dialog === 'reveal' && (
        <Modal title="Reveal the answer?" onClose={() => setDialog(null)} className="reveal-modal">
          <p className="modal-intro">
            This puzzle will be marked as revealed. You can replay it any time.
          </p>
          <div className="reveal-actions">
            <button className="secondary-button" onClick={() => setDialog(null)}>
              Keep playing
            </button>
            <button
              className="primary-button"
              onClick={() => {
                dispatch({ type: 'reveal' });
                setDialog(null);
                setFeedback('');
                setAnnouncement('Answer revealed.');
              }}
            >
              Reveal
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
