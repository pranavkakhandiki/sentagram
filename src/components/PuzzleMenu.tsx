import { puzzles } from '../data/puzzles';
import type { SavedProgress } from '../game/types';
import { Icon } from './Icon';
import { Modal } from './Modal';

export function PuzzleMenu({
  state,
  onSelect,
  onClose,
}: {
  state: SavedProgress;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const solved = puzzles.filter((puzzle) => state.puzzles[puzzle.id]?.status === 'solved').length;
  return (
    <Modal title="Puzzles" onClose={onClose} className="collection-modal">
      <div className="collection-summary">
        <span>
          {solved} of {puzzles.length} solved
        </span>
      </div>
      <div className="puzzle-list">
        {puzzles.map((puzzle) => {
          const progress = state.puzzles[puzzle.id];
          const active = state.activePuzzleId === puzzle.id;
          const status =
            progress?.status === 'solved'
              ? 'Solved'
              : progress?.status === 'revealed'
                ? 'Revealed'
                : progress?.selectedIds.length
                  ? 'In progress'
                  : 'Not solved';
          return (
            <button
              key={puzzle.id}
              className={`puzzle-entry ${active ? 'current' : ''}`}
              onClick={() => onSelect(puzzle.id)}
              aria-label={`Puzzle ${String(puzzle.number).padStart(2, '0')}, ${puzzle.difficulty}, ${status}`}
              aria-current={active ? 'true' : undefined}
            >
              <span className="entry-content">
                <span className="entry-title">Puzzle {String(puzzle.number).padStart(2, '0')}</span>
                <span className="entry-meta">{puzzle.difficulty}</span>
              </span>
              <span className={`entry-status ${progress?.status === 'solved' ? 'is-solved' : ''}`}>
                {progress?.status === 'solved' && <Icon name="check" size={14} />}
                {status}
              </span>
              <Icon name="chevron" size={14} />
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
