import { useRef, useState } from 'react';
import { puzzles } from '../data/puzzles';
import type { SavedProgress } from '../game/types';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { AnalyticsPanel } from './AnalyticsPanel';

export function PuzzleMenu({ state, onSelect, onToday, onClose }: {
  state: SavedProgress; onSelect: (id: string) => void; onToday: () => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<'puzzles' | 'analytics'>('puzzles');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <Modal title={tab === 'puzzles' ? 'Puzzle bank' : 'Analytics'} onClose={onClose} className="collection-modal">
      <div className="dev-tabs" role="tablist" aria-label="Dev tools" onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'puzzles' : event.key === 'End' ? 'analytics' : tab === 'puzzles' ? 'analytics' : 'puzzles';
        setTab(next); tabs.current[next === 'puzzles' ? 0 : 1]?.focus();
      }}>
        {(['puzzles', 'analytics'] as const).map((name, i) => <button key={name} ref={element => { tabs.current[i] = element; }}
          role="tab" id={'dev-tab-' + name} aria-controls={'dev-panel-' + name}
          aria-selected={tab === name} tabIndex={tab === name ? 0 : -1} onClick={() => setTab(name)}>
          {name === 'puzzles' ? 'Puzzles' : 'Analytics'}
        </button>)}
      </div>
      <div role="tabpanel" id="dev-panel-analytics" aria-labelledby="dev-tab-analytics" hidden={tab !== 'analytics'}>
        {tab === 'analytics' && <AnalyticsPanel />}
      </div>
      <div role="tabpanel" id="dev-panel-puzzles" aria-labelledby="dev-tab-puzzles" hidden={tab !== 'puzzles'}>
      {tab === 'puzzles' && <>
      <p className="collection-summary">Dev mode · {puzzles.length} puzzles</p>
      <button className="secondary-button today-button" onClick={onToday}>Today’s puzzle</button>
      <div className="puzzle-list">
        {puzzles.map((puzzle) => {
          const progress = state.practice[puzzle.id];
          const active = state.practicePuzzleId === puzzle.id;
          const status = progress?.status === 'solved' ? 'Solved'
            : progress?.status === 'revealed' ? 'Revealed'
            : progress?.selectedIds.length ? 'In progress' : 'Not played';
          return (
            <button key={puzzle.id} className={'puzzle-entry' + (active ? ' current' : '')}
              onClick={() => onSelect(puzzle.id)}
              aria-label={'Puzzle ' + String(puzzle.number).padStart(2, '0') + ', ' + puzzle.difficulty + ', ' + status}
              aria-current={active ? 'true' : undefined}>
              <span className="entry-content">
                <span className="entry-title">Puzzle {String(puzzle.number).padStart(2, '0')}</span>
                <span className="entry-meta">{puzzle.difficulty}</span>
              </span>
              <span className={'entry-status' + (progress?.status === 'solved' ? ' is-solved' : '')}>
                {progress?.status === 'solved' && <Icon name="check" size={14} />}{status}
              </span>
              <Icon name="chevron" size={14} />
            </button>
          );
        })}
      </div>
      </>}
      </div>
    </Modal>
  );
}
