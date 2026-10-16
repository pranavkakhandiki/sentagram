import { puzzles } from '../data/puzzles';
import type { SavedProgress } from '../game/types';
import { Icon } from './Icon';
import { Modal } from './Modal';

export function PuzzleMenu({ state, onSelect, onToday, onClose }: {
  state: SavedProgress; onSelect: (id: string) => void; onToday: () => void; onClose: () => void;
}) {
  return (
    <Modal title="Puzzle bank" onClose={onClose} className="collection-modal">
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
    </Modal>
  );
}
