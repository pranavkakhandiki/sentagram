import { parseReport } from './types';

export const DEFAULT_ANALYTICS_URL = 'https://sentagram-analytics.sentagram.workers.dev';

// Only this public service URL ships to browsers. Passwords stay in Worker secrets.
// An explicitly empty override disables analytics; an absent override uses our backend.
export function analyticsEndpoint(value = import.meta.env.VITE_ANALYTICS_URL ?? DEFAULT_ANALYTICS_URL): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    return url.origin;
  } catch { return null; }
}

const VISITOR_KEY = 'sentagram.analytics.daily-visitor';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let memoryVisitor: { day: string; id: string } | undefined;
let tracked = false;

function dailyVisitor() {
  const day = new Date().toISOString().slice(0, 10);
  if (memoryVisitor?.day === day) return memoryVisitor.id;
  try {
    const saved = JSON.parse(localStorage.getItem(VISITOR_KEY) ?? 'null');
    if (saved?.day === day && typeof saved.id === 'string' && UUID.test(saved.id)) {
      memoryVisitor = saved;
      return saved.id as string;
    }
  } catch { /* Storage may be blocked; retain an ID for this document only. */ }
  memoryVisitor = { day, id: crypto.randomUUID() };
  try { localStorage.setItem(VISITOR_KEY, JSON.stringify(memoryVisitor)); } catch { /* The game still works. */ }
  return memoryVisitor.id;
}

/** Once per page load, outside React StrictMode. Failure must never block play. */
export function trackPageview() {
  const endpoint = analyticsEndpoint();
  if (tracked || !import.meta.env.PROD || location.hostname !== 'sentagram.win' || !endpoint || navigator.doNotTrack === '1') return;
  tracked = true;
  try {
    const body = JSON.stringify({ eventId: crypto.randomUUID(), visitorId: dailyVisitor() });
    void fetch(endpoint + '/pageview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      keepalive: true, credentials: 'omit', cache: 'no-store',
    }).catch(() => { /* Missing analytics is preferable to interrupting a game. */ });
  } catch { /* Browsers without secure random IDs can still play. */ }
}

export class AnalyticsAccessError extends Error {}

export async function fetchReport(endpoint: string, password: string, days: number, signal: AbortSignal) {
  const response = await fetch(`${endpoint}/report?days=${days}`, {
    headers: { Authorization: `Bearer ${password}` }, signal, credentials: 'omit', cache: 'no-store',
  });
  if (response.status === 401) throw new AnalyticsAccessError('That analytics password doesn’t match.');
  if (!response.ok) throw new Error('Analytics couldn’t load. Check the backend setup or try again.');
  const report = parseReport(await response.json());
  if (report.days !== days) throw new Error('Analytics returned the wrong date range.');
  return report;
}
