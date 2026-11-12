import type { PuzzleResults } from '../analytics/types';

export function PuzzleResultsPanel({ results }: { results: PuzzleResults | undefined }) {
  const buckets = results ? [
    { label: '1 guess', count: results.one },
    { label: '2 guesses', count: results.two },
    { label: '3 guesses', count: results.three },
    { label: 'Failed', count: results.failed },
  ] : [];
  const maximum = Math.max(1, ...buckets.map(bucket => bucket.count));
  return <section className="puzzle-results" aria-label="Daily puzzle results">
    <h3 className="analytics-section-title">Daily puzzle results</h3>
    {results ? <>
      <p className="analytics-note">Daily games first recorded in this period (UTC). Practice and special puzzles are excluded.</p>
      <dl className="puzzle-result-totals">
        {(['attempted', 'solved', 'failed', 'unfinished'] as const).map(key => <div key={key}>
          <dt>{key.charAt(0).toUpperCase() + key.slice(1)}</dt><dd>{results[key].toLocaleString('en-US')}</dd>
        </div>)}
      </dl>
      {results.attempted === 0 ? <p className="analytics-note">No daily puzzle attempts recorded for this period yet.</p> : <>
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
