import { parseReport } from './types';
import { dailyPuzzle, dayKey } from '../game/daily';
import type { SavedProgress } from '../game/types';

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
interface GameIdentity { day: string; puzzleId: string; id: string }
interface VisitorIdentity { day: string; id: string; game?: GameIdentity }
let memoryVisitor: VisitorIdentity | undefined;
let tracked = false;
const gameReports = new Set<string>();

function currentGame(value: unknown): GameIdentity | undefined {
  const game = value as GameIdentity | null;
  return game && game.day === dayKey() && typeof game.puzzleId === 'string' &&
    /^[a-z0-9][a-z0-9-]{0,79}$/.test(game.puzzleId) && typeof game.id === 'string' && UUID.test(game.id)
    ? { day: game.day, puzzleId: game.puzzleId, id: game.id } : undefined;
}

function saveIdentity() {
  try { localStorage.setItem(VISITOR_KEY, JSON.stringify(memoryVisitor)); } catch { /* The game still works. */ }
}

function dailyVisitor() {
  const day = new Date().toISOString().slice(0, 10);
  if (memoryVisitor?.day === day) return memoryVisitor.id;
  let game = currentGame(memoryVisitor?.game);
  try {
    const saved = JSON.parse(localStorage.getItem(VISITOR_KEY) ?? 'null');
    game = currentGame(saved?.game) ?? game;
    if (saved?.day === day && typeof saved.id === 'string' && UUID.test(saved.id)) {
      memoryVisitor = { day, id: saved.id, game };
      return saved.id as string;
    }
  } catch { /* Storage may be blocked; retain an ID for this document only. */ }
  memoryVisitor = { day, id: crypto.randomUUID(), game };
  saveIdentity();
  return memoryVisitor.id;
}

/** Only submitted guesses in the actual daily game qualify as an attempt. */
export function trackDailyGame(state: SavedProgress) {
  const endpoint = analyticsEndpoint();
  if (!import.meta.env.PROD || location.hostname !== 'sentagram.win' || !endpoint || navigator.doNotTrack === '1' ||
    state.specialActive || (state.devMode && state.practicePuzzleId !== null) || state.day !== dayKey()) return;
  const attempts = state.daily.guesses.length;
  const status = state.daily.status === 'revealed' ? 'failed' : state.daily.status;
  if (attempts < 1 || attempts > 3 || (status === 'playing' && attempts === 3) || (status === 'failed' && attempts !== 3)) return;
  try {
    dailyVisitor();
    const puzzleId = dailyPuzzle(state.day).id;
    // Another tab may have created the game token since this document loaded.
    try {
      const saved = currentGame(JSON.parse(localStorage.getItem(VISITOR_KEY) ?? 'null')?.game);
      if (saved?.day === state.day && saved.puzzleId === puzzleId) memoryVisitor!.game = saved;
    } catch { /* Keep the document's in-memory token when storage is unavailable. */ }
    if (memoryVisitor!.game?.day !== state.day || memoryVisitor!.game?.puzzleId !== puzzleId) {
      memoryVisitor!.game = { day: state.day, puzzleId, id: crypto.randomUUID() };
      saveIdentity();
    }
    const playId = memoryVisitor!.game!.id;
    const signature = `${playId}:${attempts}:${status}`;
    if (gameReports.has(signature)) return;
    gameReports.add(signature);
    // No selected words, guesses, answers or traffic visitor ID leave the browser.
    const body = JSON.stringify({ playId, gameDay: state.day, puzzleId, attempts, status });
    void fetch(endpoint + '/puzzle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      keepalive: true, credentials: 'omit', cache: 'no-store',
    }).then(response => { if (!response.ok) gameReports.delete(signature); })
      .catch(() => { gameReports.delete(signature); });
  } catch { /* Analytics must never interfere with checking or restoring a puzzle. */ }
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
