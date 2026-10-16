import { useState } from 'react';
import { evaluateGuess } from './game/validation';
import { displayDate } from './game/daily';
import { useGame } from './hooks/useGame';
import { Header } from './components/Header';
import { HelpDialog } from './components/HelpDialog';
import { PuzzleBoard } from './components/PuzzleBoard';
import { PuzzleMenu } from './components/PuzzleMenu';
import { CompletionPanel } from './components/CompletionPanel';

type Dialog = 'collection' | 'help' | null;

export default function App() {
  const { state, dispatch, puzzle, progress, practice, saveFailed } = useGame();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [feedback, setFeedback] = useState({ key: '', message: '', pulse: 0 });
  const context = practice ? 'practice-' + puzzle.id : state.day;
  const finished = progress.status !== 'playing';
  const message = feedback.key === context ? feedback.message : '';

  function selectPuzzle(id: string) {
    dispatch({ type: 'switch', puzzleId: id });
    setFeedback({ key: '', message: '', pulse: 0 });
    setDialog(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function check() {
    if (finished) return;
    const result = evaluateGuess(puzzle, progress.selectedIds);
    if (!result) return;
    dispatch({ type: 'check' });
    setFeedback({
      key: context, pulse: feedback.pulse + 1,
      message: result.correct || progress.guesses.length === 2 ? ''
        : result.oneSwapAway ? 'One swap away…' : 'Not quite. Try again.',
    });
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to puzzle</a>
      <Header devMode={state.devMode} onMenu={() => setDialog('collection')} onHelp={() => setDialog('help')} />
      <main id="main" className="game-main">
        <article className="game-article" key={context}>
          <div className="puzzle-heading">
            <h1>{practice ? 'Practice · Puzzle ' + String(puzzle.number).padStart(2, '0')
              : <time dateTime={state.day}>{displayDate(state.day)}</time>}</h1>
            {state.devMode && <span className="dev-label">{puzzle.difficulty} · Dev mode</span>}
          </div>
          <p className="game-instruction">Make a sentence. You have three tries.</p>
          <PuzzleBoard
            puzzle={puzzle} progress={progress}
            dispatch={(action) => {
              dispatch(action);
              setFeedback((value) => ({ ...value, message: '' }));
            }}
            feedback={message} checkPulse={feedback.key === context ? feedback.pulse : 0} onCheck={check}
          />
          {finished && (
            <CompletionPanel
              key={context + progress.status} puzzle={puzzle} progress={progress}
              day={state.day} practice={practice}
              onReplay={() => {
                dispatch({ type: 'reset' });
                setFeedback({ key: '', message: '', pulse: 0 });
              }}
            />
          )}
          {practice && <button className="text-button back-to-today" onClick={() => dispatch({ type: 'today' })}>Back to today’s puzzle</button>}
        </article>
        {saveFailed && <p className="storage-notice" role="status">Your browser can’t save progress right now. You can keep playing in this tab.</p>}
      </main>
      {dialog === 'collection' && state.devMode && (
        <PuzzleMenu state={state} onSelect={selectPuzzle} onToday={() => {
          dispatch({ type: 'today' });
          setDialog(null);
        }} onClose={() => setDialog(null)} />
      )}
      {dialog === 'help' && (
        <HelpDialog enabled={state.devMode}
          onDevChange={(enabled) => dispatch({ type: 'set-dev', enabled })}
          onClose={() => setDialog(null)} />
      )}
    </>
  );
}
