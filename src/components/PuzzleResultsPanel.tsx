import type { PuzzleResults } from '../analytics/types';
import { displayDate } from '../game/daily';
import { validDay } from '../game/clock';

export function PuzzleResultsPanel({ results, day, today, earliestDay, onDayChange }: {
  results: PuzzleResults | undefined; day: string; today: string; earliestDay: string; onDayChange: (day: string) => void;
}) {
  const buckets = results ? [
    { label: '1 guess', count: results.one },
    { label: '2 guesses', count: results.two },
    { label: '3 guesses', count: results.three },
    { label: 'Failed', count: results.failed },
  ] : [];
  const maximum = Math.max(1, ...buckets.map(bucket => bucket.count));
  return <section className="puzzle-results" aria-label="Daily puzzle results">
    <h3 className="analytics-section-title">Daily puzzle results</h3>
    <div className="puzzle-results-toolbar">
      <label htmlFor="puzzle-results-date">Puzzle date (PST)</label>
      <input id="puzzle-results-date" type="date" value={day} min={earliestDay} max={today}
        onChange={event => {
          const value = event.target.value;
          if (validDay(value) && value >= earliestDay && value <= today) onDayChange(value);
        }} />
      <button className="text-button" disabled={day === today} onClick={() => onDayChange('')}>Today’s puzzle</button>
    </div>
    {results ? <>
      <p className="analytics-note">{displayDate(day)} · {day === today ? 'In progress' : 'Past puzzle'}. This date only, regardless of the traffic range above. Practice and special puzzles are excluded.</p>
      <dl className="puzzle-result-totals">
        {(['attempted', 'solved', 'failed', 'unfinished'] as const).map(key => <div key={key}>
          <dt>{key.charAt(0).toUpperCase() + key.slice(1)}</dt><dd>{results[key].toLocaleString('en-US')}</dd>
        </div>)}
      </dl>
      {results.attempted === 0 ? <p className="analytics-note">No daily puzzle attempts recorded for this date yet.</p> : <>
        <h4 className="guess-distribution-title">Guess distribution</h4>
        <ol className="guess-distribution" aria-label="Guess distribution">
          {buckets.map(bucket => <li key={bucket.label}>
            <span>{bucket.label}</span>
            <span className="guess-distribution-track" aria-hidden="true"><span
              className={bucket.label === 'Failed' ? 'is-failed' : ''} style={{ width: (bucket.count / maximum * 100) + '%' }} /></span>
            <strong>{bucket.count.toLocaleString('en-US')}</strong>
          </li>)}
        </ol>
      </>}
      <p className="analytics-note">Attempted means at least one checked guess. Failed means all three guesses were used. Unfinished games aren’t failures and aren’t included in the histogram.</p>
    </> : <p className="analytics-note">Puzzle results aren’t available from this backend yet.</p>}
  </section>;
}
