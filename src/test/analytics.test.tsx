import { webcrypto } from 'node:crypto';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { analyticsEndpoint, DEFAULT_ANALYTICS_URL, fetchReport } from '../analytics/client';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { emptyProgress, initialState } from '../game/state';
import { STORAGE_KEY } from '../game/storage';
import type { AnalyticsReport } from '../analytics/types';
import type { PuzzleStatus } from '../game/types';

const endpoint = 'https://sentagram-analytics.example.workers.dev';
const password = 'a-long-private-password-for-tests';
function sample(days = 7): AnalyticsReport {
  return { days, timezone: 'UTC', generatedAt: '2026-10-15T12:00:00Z',
    daily: Array.from({ length: days }, (_, i) => ({
      day: new Date(Date.UTC(2026, 9, 15) - (days - i - 1) * 86400000).toISOString().slice(0, 10),
      visitors: i === days - 1 ? 4 : 0, pageviews: i === days - 1 ? 7 : 0,
    })), countries: [{ code: 'US', visitors: 3, pageviews: 5 }, { code: 'IN', visitors: 1, pageviews: 2 }],
    puzzleResults: { attempted: 9, solved: 6, failed: 2, unfinished: 1, one: 1, two: 2, three: 3 } };
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.doUnmock('../game/daily'); });

describe('analytics inside dev mode', () => {
  it('uses the deployed backend without a GitHub variable and supports an explicit off switch', () => {
    vi.stubEnv('VITE_ANALYTICS_URL', undefined);
    expect(analyticsEndpoint()).toBe(DEFAULT_ANALYTICS_URL);
    vi.stubEnv('VITE_ANALYTICS_URL', '');
    expect(analyticsEndpoint()).toBeNull();
  });
  it('is gated by dev mode, opens as a keyboard-accessible tab, and explains missing setup without inventing stats', async () => {
    const user = userEvent.setup();
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    vi.stubEnv('VITE_ANALYTICS_URL', '');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...initialState(), devMode: true }));
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Open puzzle collection' }));
    expect(screen.getByRole('tab', { name: 'Puzzles' })).toHaveAttribute('aria-selected', 'true');
    screen.getByRole('tab', { name: 'Puzzles' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Analytics isn’t connected yet.' })).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Puzzles' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('button', { name: /^Puzzle \d/ })).toHaveLength(50);
  });
  it('loads real report values after password entry, changes ranges and refreshes, and forgets access on remount', async () => {
    const user = userEvent.setup();
    vi.stubEnv('VITE_ANALYTICS_URL', endpoint);
    const request = vi.fn(async (url: string) => Response.json(sample(Number(new URL(url).searchParams.get('days')))));
    vi.stubGlobal('fetch', request);
    const app = render(<AnalyticsPanel />);
    expect(request).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Analytics password'), password);
    await user.click(screen.getByRole('button', { name: 'View analytics' }));
    expect(await screen.findByText('Visitors today')).toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('India')).toBeInTheDocument();
    const histogram = screen.getByRole('list', { name: 'Guess distribution' });
    expect(within(histogram).getAllByRole('listitem').map(row => row.textContent)).toEqual(['1 guess1', '2 guesses2', '3 guesses3', 'Failed2']);
    const countries = screen.getByRole('table', { name: /Countries during/ });
    expect(within(countries).getByRole('row', { name: 'United States 3 5' })).toBeInTheDocument();
    expect(request.mock.calls[0]).toMatchObject([endpoint + '/report?days=7', { headers: { Authorization: 'Bearer ' + password }, credentials: 'omit', cache: 'no-store' }]);
    expect(JSON.stringify(localStorage)).not.toContain(password);
    await user.click(screen.getByRole('button', { name: '30 days' }));
    expect(await screen.findByRole('img', { name: /Daily visitors over 30/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('img', { name: /Daily visitors over 30/ })).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(3);
    app.unmount(); render(<AnalyticsPanel />);
    expect(screen.getByLabelText('Analytics password')).toHaveValue('');
    expect(screen.queryByText('Visitors today')).not.toBeInTheDocument();
  });
  it('handles a wrong password, network failure and empty reports as distinct states', async () => {
    const user = userEvent.setup(); vi.stubEnv('VITE_ANALYTICS_URL', endpoint);
    const request = vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 })).mockRejectedValueOnce(new Error('Offline'));
    vi.stubGlobal('fetch', request); render(<AnalyticsPanel />);
    await user.type(screen.getByLabelText('Analytics password'), '2026');
    await user.click(screen.getByRole('button', { name: 'View analytics' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('doesn’t match');
    await user.type(screen.getByLabelText('Analytics password'), password);
    await user.click(screen.getByRole('button', { name: 'View analytics' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t load');
    expect(screen.queryByText('Visitors today')).not.toBeInTheDocument();
    const empty = sample(); empty.daily.forEach(row => { row.visitors = 0; row.pageviews = 0; }); empty.countries = [];
    empty.puzzleResults = { attempted: 0, solved: 0, failed: 0, unfinished: 0, one: 0, two: 0, three: 0 };
    request.mockResolvedValueOnce(Response.json(empty));
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('No visits recorded for this period yet.')).toBeInTheDocument();
    expect(screen.getByText('No daily puzzle attempts recorded for this period yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lock analytics' }));
    expect(screen.getByLabelText('Analytics password')).toHaveValue('');
  });
  it('rejects malformed data and non-HTTPS or credential-bearing endpoint configuration', async () => {
    for (const url of ['', 'invalid', 'http://example.com', 'https://secret@example.com', endpoint + '/report', endpoint + '?key=secret'])
      expect(analyticsEndpoint(url)).toBeNull();
    expect(analyticsEndpoint(endpoint + '/')).toBe(endpoint);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ daily: [] })));
    await expect(fetchReport(endpoint, password, 7, new AbortController().signal)).rejects.toThrow();
    const invalid = sample(); invalid.puzzleResults!.solved = 99;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(invalid)));
    await expect(fetchReport(endpoint, password, 7, new AbortController().signal)).rejects.toThrow();
  });
  it('shows missing outcome data as unavailable rather than zero when talking to an older backend', async () => {
    const user = userEvent.setup(); vi.stubEnv('VITE_ANALYTICS_URL', endpoint);
    const legacy = sample(); delete legacy.puzzleResults;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(legacy)));
    render(<AnalyticsPanel />);
    await user.type(screen.getByLabelText('Analytics password'), password);
    await user.click(screen.getByRole('button', { name: 'View analytics' }));
    expect(await screen.findByText('Puzzle results aren’t available from this backend yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Guess distribution' })).not.toBeInTheDocument();
  });
});

describe('best-effort page view collection', () => {
  async function tracker() { vi.resetModules(); return (await import('../analytics/client')).trackPageview; }
  async function gameTracker() { vi.resetModules(); return (await import('../analytics/client')).trackDailyGame; }
  function dailyGame(attempts: number, status: PuzzleStatus = 'playing') {
    return { ...initialState(), daily: { ...emptyProgress(), status,
      guesses: Array.from({ length: attempts }, () => ['never-send-this-word-order']) } };
  }
  function setup() {
    vi.stubEnv('PROD', true); vi.stubEnv('VITE_ANALYTICS_URL', endpoint);
    vi.stubGlobal('location', { hostname: 'sentagram.win' }); vi.stubGlobal('crypto', webcrypto);
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', request); return request;
  }
  it('records once per document, preserves a daily anonymous identity across reloads, and rotates it the next day', async () => {
    const request = setup();
    const track = await tracker(); track(); track();
    expect(request).toHaveBeenCalledTimes(1);
    const first = JSON.parse(request.mock.calls[0][1].body);
    const reload = await tracker(); reload();
    const second = JSON.parse(request.mock.calls[1][1].body);
    expect(first.visitorId).toBe(second.visitorId);
    expect(first.eventId).not.toBe(second.eventId);
    vi.setSystemTime(new Date(2026, 9, 16, 12));
    const tomorrow = await tracker(); tomorrow();
    expect(JSON.parse(request.mock.calls[2][1].body).visitorId).not.toBe(first.visitorId);
    expect(Object.keys(first).sort()).toEqual(['eventId', 'visitorId']);
  });
  it('does not track local previews, development, an unconfigured site or Do Not Track', async () => {
    const request = setup();
    vi.stubGlobal('location', { hostname: 'localhost' }); (await tracker())();
    vi.stubGlobal('location', { hostname: 'sentagram.win' }); vi.stubEnv('PROD', false); (await tracker())();
    vi.stubEnv('PROD', true); vi.stubEnv('VITE_ANALYTICS_URL', ''); (await tracker())();
    vi.stubEnv('VITE_ANALYTICS_URL', endpoint); vi.stubGlobal('navigator', { doNotTrack: '1' }); (await tracker())();
    expect(request).not.toHaveBeenCalled();
  });
  it('survives blocked storage and a failed request without writing to game progress', async () => {
    const request = setup(); request.mockRejectedValue(new Error('Blocked'));
    localStorage.setItem(STORAGE_KEY, 'untouched');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked storage'); });
    expect((await tracker())()).toBeUndefined();
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('untouched');
  });
  it('reports only checked daily guesses, excludes practice and special games, and sends no word orders', async () => {
    const request = setup(), track = await gameTracker();
    localStorage.setItem(STORAGE_KEY, 'untouched');
    track(dailyGame(0));
    track({ ...dailyGame(1), devMode: true, practicePuzzleId: 'practice-puzzle' });
    track({ ...dailyGame(1, 'solved'), specialActive: true });
    expect(request).not.toHaveBeenCalled();
    const state = dailyGame(1);
    track(state); track({ ...state, daily: { ...state.daily, selectedIds: ['moved-a-word'] } });
    expect(request).toHaveBeenCalledTimes(1);
    const first = JSON.parse(request.mock.calls[0][1].body);
    expect(Object.keys(first).sort()).toEqual(['attempts', 'gameDay', 'playId', 'puzzleId', 'status']);
    expect(request.mock.calls[0][0]).toBe(endpoint + '/puzzle');
    expect(request.mock.calls[0][1].body).not.toContain('never-send');
    track(dailyGame(2, 'solved'));
    const solved = JSON.parse(request.mock.calls[1][1].body);
    expect(solved).toMatchObject({ playId: first.playId, attempts: 2, status: 'solved' });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('untouched');
    expect(Object.keys(localStorage).sort()).toEqual([STORAGE_KEY, 'sentagram.analytics.daily-visitor'].sort());
  });
  it('keeps the same play token after reload and uses a token created by another tab', async () => {
    const request = setup();
    // This tab has already cached the traffic ID before the other tab starts play.
    const clientA = await import('../analytics/client');
    clientA.trackPageview(); request.mockClear();
    const clientB = await gameTracker(); clientB(dailyGame(1));
    const id = JSON.parse(request.mock.calls[0][1].body).playId;
    clientA.trackDailyGame(dailyGame(2, 'solved'));
    expect(JSON.parse(request.mock.calls[1][1].body).playId).toBe(id);
    const reloaded = await gameTracker(); reloaded(dailyGame(2, 'solved'));
    expect(JSON.parse(request.mock.calls[2][1].body).playId).toBe(id);
  });
  it('keeps a game token across UTC midnight while rotating the traffic ID, and resets it for a new local puzzle day', async () => {
    const request = setup();
    vi.doMock('../game/daily', async importOriginal => ({ ...await importOriginal<typeof import('../game/daily')>(), dayKey: () => '2026-11-12' }));
    const state = { ...dailyGame(1), day: '2026-11-12' };
    vi.setSystemTime(new Date('2026-11-12T23:59:00Z'));
    (await gameTracker())(state);
    const first = JSON.parse(request.mock.calls[0][1].body);
    const visitor = JSON.parse(localStorage.getItem('sentagram.analytics.daily-visitor')!).id;
    vi.setSystemTime(new Date('2026-11-13T00:01:00Z'));
    (await gameTracker())({ ...state, daily: { ...state.daily, guesses: [[], []], status: 'solved' } });
    expect(JSON.parse(request.mock.calls[1][1].body).playId).toBe(first.playId);
    expect(JSON.parse(localStorage.getItem('sentagram.analytics.daily-visitor')!).id).not.toBe(visitor);
    vi.doUnmock('../game/daily'); vi.setSystemTime(new Date(2026, 10, 13, 12));
    (await gameTracker())(dailyGame(1));
    expect(JSON.parse(request.mock.calls[2][1].body).playId).not.toBe(first.playId);
  });
  it('retries a failed snapshot on the next observation without changing its play token', async () => {
    const request = setup(); request.mockRejectedValueOnce(new Error('Network failure'));
    const track = await gameTracker(), state = dailyGame(1);
    track(state); await Promise.resolve(); await Promise.resolve();
    track(state);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][1].body).toBe(request.mock.calls[1][1].body);
  });
});
