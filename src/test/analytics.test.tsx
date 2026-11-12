import { webcrypto } from 'node:crypto';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { analyticsEndpoint, DEFAULT_ANALYTICS_URL, fetchReport } from '../analytics/client';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { initialState } from '../game/state';
import { STORAGE_KEY } from '../game/storage';

const endpoint = 'https://sentagram-analytics.example.workers.dev';
const password = 'a-long-private-password-for-tests';
function sample(days = 7) {
  return { days, timezone: 'UTC', generatedAt: '2026-10-15T12:00:00Z',
    daily: Array.from({ length: days }, (_, i) => ({
      day: new Date(Date.UTC(2026, 9, 15) - (days - i - 1) * 86400000).toISOString().slice(0, 10),
      visitors: i === days - 1 ? 4 : 0, pageviews: i === days - 1 ? 7 : 0,
    })), countries: [{ code: 'US', visitors: 3, pageviews: 5 }, { code: 'IN', visitors: 1, pageviews: 2 }] };
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

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
    request.mockResolvedValueOnce(Response.json(empty));
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('No visits recorded for this period yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lock analytics' }));
    expect(screen.getByLabelText('Analytics password')).toHaveValue('');
  });
  it('rejects malformed data and non-HTTPS or credential-bearing endpoint configuration', async () => {
    for (const url of ['', 'invalid', 'http://example.com', 'https://secret@example.com', endpoint + '/report', endpoint + '?key=secret'])
      expect(analyticsEndpoint(url)).toBeNull();
    expect(analyticsEndpoint(endpoint + '/')).toBe(endpoint);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ daily: [] })));
    await expect(fetchReport(endpoint, password, 7, new AbortController().signal)).rejects.toThrow();
  });
});

describe('best-effort page view collection', () => {
  async function tracker() { vi.resetModules(); return (await import('../analytics/client')).trackPageview; }
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
});
