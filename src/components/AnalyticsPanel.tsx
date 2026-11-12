import { useEffect, useState } from 'react';
import { analyticsEndpoint, AnalyticsAccessError, fetchReport } from '../analytics/client';
import type { AnalyticsReport } from '../analytics/types';

const SETUP_URL = 'https://github.com/pranavkakhandiki/sentagram/blob/main/docs/analytics.md';
const count = (value: number) => value.toLocaleString('en-US');
function date(day: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'));
}
function countryName(code: string) {
  if (code === 'XX') return 'Unknown';
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code; } catch { return code; }
}

export function AnalyticsPanel() {
  const endpoint = analyticsEndpoint();
  const [password, setPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [days, setDays] = useState(7);
  const [refresh, setRefresh] = useState(0);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!endpoint || !accessKey) return;
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    setLoading(true); setError(''); setReport(null);
    void fetchReport(endpoint, accessKey, days, controller.signal).then(value => {
      if (active) setReport(value);
    }).catch((reason: unknown) => {
      if (!active) return;
      if (reason instanceof AnalyticsAccessError) {
        setAccessKey(''); setPassword(''); setError(reason.message);
      } else setError('Analytics couldn’t load. Please try again or check the backend setup.');
    }).finally(() => {
      clearTimeout(timeout);
      if (active) setLoading(false);
    });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [endpoint, accessKey, days, refresh]);

  if (!endpoint) return (
    <section className="analytics-setup" aria-label="Analytics setup">
      <h3>Analytics isn’t connected yet.</h3>
      <p>Connect the Cloudflare backend to start counting visits and countries.</p>
      <a className="secondary-button" href={SETUP_URL} target="_blank" rel="noreferrer">Setup guide</a>
    </section>
  );

  if (!accessKey) return (
    <form className="analytics-login" onSubmit={event => {
      event.preventDefault(); setError(''); setAccessKey(password); setPassword('');
    }}>
      <p>Visitor counts and countries, just for you.</p>
      <label htmlFor="analytics-password">Analytics password</label>
      <input id="analytics-password" type="password" autoComplete="current-password" required maxLength={256}
        value={password} onChange={event => setPassword(event.target.value)} aria-describedby="analytics-login-note" />
      <p id="analytics-login-note" className="analytics-note">Use the separate password you set during analytics setup.</p>
      {error && <p className="dev-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit">View analytics</button>
    </form>
  );

  const totalViews = report?.daily.reduce((sum, row) => sum + row.pageviews, 0) ?? 0;
  const today = report?.daily[report.daily.length - 1];
  const maxDaily = Math.max(1, ...report?.daily.map(row => row.visitors) ?? []);
  const maxCountry = Math.max(1, ...report?.countries.map(row => row.visitors) ?? []);
  return (
    <section className="analytics-panel" aria-label="Visitor analytics">
      <div className="analytics-toolbar">
        <div className="analytics-ranges" role="group" aria-label="Analytics date range">
          {[1, 7, 30].map(range => <button key={range} aria-pressed={days === range}
            onClick={() => setDays(range)}>{range === 1 ? 'Today' : range + ' days'}</button>)}
        </div>
        <button className="text-button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh</button>
      </div>
      <p className="analytics-note">All dates UTC. Today is still in progress.</p>
      {loading && <p className="analytics-status" role="status">Loading analytics…</p>}
      {error && <p className="dev-error" role="alert">{error}</p>}
      {report && <>
        <dl className="analytics-totals">
          <div><dt>Visitors today</dt><dd>{count(today?.visitors ?? 0)}</dd></div>
          <div><dt>Page views · {days === 1 ? 'today' : days + ' days'}</dt><dd>{count(totalViews)}</dd></div>
        </dl>
        {totalViews === 0 ? <p className="analytics-status">No visits recorded for this period yet.</p> : <>
          <h3 className="analytics-section-title">Daily visitors</h3>
          <div className="analytics-chart" role="img" aria-label={`Daily visitors over ${days} ${days === 1 ? 'day' : 'days'}. Exact counts in Daily breakdown below.`}>
            {report.daily.map(row => <div key={row.day} className="analytics-chart-column" aria-hidden="true"
              title={`${date(row.day)}: ${count(row.visitors)} visitors, ${count(row.pageviews)} page views`}>
              <span style={{ height: (row.visitors / maxDaily * 100) + '%' }} />
            </div>)}
          </div>
          <div className="analytics-axis" aria-hidden="true"><span>{date(report.daily[0].day)}</span><span>{date(today!.day)}</span></div>
          <h3 className="analytics-section-title">Where visitors are</h3>
          <p className="analytics-note">Visitors are counted once per day. Someone returning on another day counts again.</p>
          <table className="analytics-table countries-table">
            <caption className="sr-only">Countries during the selected period. Visitor-days count each browser once per UTC day, assigned to its first country that day.</caption>
            <thead><tr><th scope="col">Country</th><th scope="col">Visitor-days</th><th scope="col">Views</th></tr></thead>
            <tbody>{report.countries.map(row => <tr key={row.code}>
              <th scope="row"><span className="country-label">{countryName(row.code)}</span><span className="country-bar" aria-hidden="true" style={{ width: (row.visitors / maxCountry * 100) + '%' }} /></th>
              <td>{count(row.visitors)}</td><td>{count(row.pageviews)}</td>
            </tr>)}</tbody>
          </table>
          <details className="analytics-daily">
            <summary>Daily breakdown</summary>
            <table className="analytics-table"><caption className="sr-only">Daily visitors and page views, in UTC</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Visitors</th><th scope="col">Views</th></tr></thead>
              <tbody>{[...report.daily].reverse().map(row => <tr key={row.day}><th scope="row">{date(row.day)}</th><td>{count(row.visitors)}</td><td>{count(row.pageviews)}</td></tr>)}</tbody>
            </table>
          </details>
        </>}
        <p className="analytics-note analytics-updated">Updated {new Date(report.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Country locations are approximate.</p>
      </>}
      <button className="text-button analytics-lock" onClick={() => { setAccessKey(''); setPassword(''); setReport(null); setError(''); }}>Lock analytics</button>
    </section>
  );
}
