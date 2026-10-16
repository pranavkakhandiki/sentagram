import { useState } from 'react';
import { Modal } from './Modal';

export function HelpDialog({ enabled, onDevChange, onClose }: {
  enabled: boolean; onDevChange: (enabled: boolean) => void; onClose: () => void;
}) {
  const [wantsCode, setWantsCode] = useState(enabled);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  return (
    <Modal title="How to play" onClose={onClose} className="help-modal">
      <p className="help-lede">One sentence. Three chances.</p>
      <ol className="how-to-list">
        <li>Tap the words to build the intended sentence. Use every tile.</li>
        <li>Drag a placed word onto another to swap them. Tap to send it back.</li>
        <li>Press Check to use a guess. “One swap away” means exchanging just two words would solve it.</li>
      </ol>
      <p className="help-note">After three misses, we reveal the answer. A new puzzle arrives at midnight, your local time.</p>
      <p className="help-note keyboard-note">Names keep their capitals; punctuation is provided. You can also swap a focused word with Alt + arrow keys.</p>
      <div className="dev-settings">
        <label className="dev-toggle">
          <span>Dev mode</span>
          <input type="checkbox" role="switch" checked={wantsCode}
            onChange={(event) => {
              const checked = event.target.checked;
              setWantsCode(checked);
              setError('');
              setCode('');
              if (!checked) onDevChange(false);
            }} />
        </label>
        {wantsCode && !enabled && (
          <form className="dev-form" onSubmit={(event) => {
            event.preventDefault();
            if (code === '2026') { onDevChange(true); setError(''); }
            else setError('That code doesn’t match. Try again.');
          }}>
            <label htmlFor="dev-code">Dev code</label>
            <div className="dev-code-row">
              <input id="dev-code" type="password" inputMode="numeric" pattern="[0-9]*"
                maxLength={4} autoComplete="off" value={code} aria-invalid={Boolean(error)}
                aria-describedby={error ? 'dev-code-error' : undefined}
                onChange={(event) => { setCode(event.target.value); setError(''); }} />
              <button className="secondary-button" type="submit">Unlock</button>
            </div>
            {error && <p className="dev-error" id="dev-code-error" role="alert">{error}</p>}
          </form>
        )}
        {enabled && <p className="dev-unlocked" role="status">Puzzle bank unlocked.</p>}
      </div>
      <button className="primary-button modal-primary" onClick={onClose}>Let’s play</button>
    </Modal>
  );
}
