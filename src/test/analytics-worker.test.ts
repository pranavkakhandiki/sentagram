import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { DatabaseSync as SQLiteDatabase } from 'node:sqlite';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { type AnalyticsDatabase, type Env, type Statement } from '../../analytics-worker/src';
import { parseReport } from '../analytics/types';

// Vite's browser-environment resolver predates this Node built-in. Load it in
// Node, where Vitest runs, so these tests exercise actual SQL rather than mocks.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

class Prepared implements Statement {
  values: (string | number)[] = [];
  constructor(readonly sql: string) {}
  bind(...values: (string | number)[]) { this.values = values; return this; }
}
const origin = 'https://sentagram.win';
const password = 'a-long-analytics-password-only-for-tests';
let sqlite: SQLiteDatabase;
let env: Env;
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
  sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync('analytics-worker/migrations').filter(file => file.endsWith('.sql')).sort())
    sqlite.exec(readFileSync('analytics-worker/migrations/' + file, 'utf8'));
  const DB: AnalyticsDatabase = {
    prepare: sql => new Prepared(sql),
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map(statement => {
          const prepared = statement as Prepared;
          return { results: sqlite.prepare(prepared.sql).all(...prepared.values) };
        });
        sqlite.exec('COMMIT');
        return results;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  env = { DB, ALLOWED_ORIGIN: origin, ANALYTICS_PASSWORD: password };
});
afterEach(() => { sqlite.close(); vi.unstubAllGlobals(); });

async function view(visitorId = crypto.randomUUID(), country = 'US', eventId = crypto.randomUUID()) {
  const request = new Request('https://analytics.example/pageview', { method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId, eventId }) });
  Object.defineProperty(request, 'cf', { value: { country } });
  return worker.fetch(request, env);
}
async function getReport(days = '7', secret: string | null = password, requestOrigin = origin) {
  const headers = new Headers({ Origin: requestOrigin });
  if (secret !== null) headers.set('Authorization', 'Bearer ' + secret);
  return worker.fetch(new Request('https://analytics.example/report?days=' + days, { headers }), env);
}

async function puzzle(attempts: number, status = 'playing', playId = crypto.randomUUID(), extra: Record<string, unknown> = {}) {
  const payload = { playId, gameDay: new Date().toISOString().slice(0, 10), puzzleId: 'a-daily-puzzle', attempts, status, ...extra };
  return worker.fetch(new Request('https://analytics.example/puzzle', { method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }), env);
}

describe('anonymous daily puzzle results', () => {
  it('reports solved-in-1/2/3, failed, and unfinished as separate outcomes', async () => {
    for (const attempts of [1, 2, 3]) expect((await puzzle(attempts, 'solved')).status).toBe(204);
    await puzzle(3, 'failed'); await puzzle(1); await puzzle(2);
    const report = parseReport(await (await getReport()).json());
    expect(report.puzzleResults).toEqual({ attempted: 6, solved: 3, failed: 1, unfinished: 2, one: 1, two: 1, three: 1 });
    const rows = sqlite.prepare('SELECT * FROM puzzle_plays').all();
    expect(Object.keys(rows[0]).sort()).toEqual(['attempts', 'game_day', 'play_hash', 'puzzle_id', 'started_day', 'status']);
    expect(rows[0].play_hash).toMatch(/^[a-f0-9]{64}$/);
  });
  it('deduplicates reloads and retries, advances unfinished games, and never regresses a terminal result', async () => {
    const id = crypto.randomUUID();
    await puzzle(1, 'playing', id); await puzzle(1, 'playing', id); await puzzle(2, 'playing', id);
    await puzzle(1, 'playing', id); await puzzle(3, 'solved', id);
    await puzzle(2, 'playing', id); await puzzle(3, 'failed', id); await puzzle(3, 'solved', id);
    expect(parseReport(await (await getReport()).json()).puzzleResults).toEqual({ attempted: 1, solved: 1, failed: 0, unfinished: 0, one: 0, two: 0, three: 1 });
    expect(JSON.stringify(sqlite.prepare('SELECT * FROM puzzle_plays').all())).not.toContain(id);
  });
  it('accepts a terminal result from another tab and keeps cross-midnight results in their original reporting period', async () => {
    const id = crypto.randomUUID();
    vi.setSystemTime(new Date('2026-11-12T23:59:00Z'));
    await puzzle(2, 'playing', id);
    vi.setSystemTime(new Date('2026-11-13T00:01:00Z'));
    await puzzle(1, 'solved', id, { gameDay: '2026-11-12' });
    const row = sqlite.prepare('SELECT * FROM puzzle_plays').get()!;
    expect(row.started_day).toBe('2026-11-12'); expect(row.status).toBe('solved'); expect(row.attempts).toBe(1);
    expect(parseReport(await (await getReport('1')).json()).puzzleResults?.attempted).toBe(0);
    expect(parseReport(await (await getReport('7')).json()).puzzleResults?.one).toBe(1);
  });
  it('rejects invalid counts, non-daily special puzzles, dates outside the local-day window, and invalid payloads', async () => {
    for (const [attempts, status] of [[0, 'playing'], [4, 'solved'], [2.5, 'solved'], [3, 'playing'], [1, 'failed'], [1, 'unknown']] as const)
      expect((await puzzle(attempts, status)).status).toBe(400);
    for (const extra of [{ gameDay: '2026-02-31' }, { gameDay: '2026-11-10' }, { gameDay: '2026-11-14' },
      { puzzleId: 'one-little-question' }, { status: ['solved'] }, { playId: 'invalid' }])
      expect((await puzzle(1, 'solved', crypto.randomUUID(), extra)).status).toBe(400);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM puzzle_plays').get()?.n).toBe(0);
    expect((await puzzle(1, 'solved', crypto.randomUUID(), { gameDay: '2026-11-13' })).status).toBe(204);
  });
  it('expires puzzle statistics with the same 90-day retention as traffic', async () => {
    vi.setSystemTime(new Date('2026-08-14T12:00:00Z')); await puzzle(1, 'solved');
    vi.setSystemTime(new Date('2026-08-15T12:00:00Z')); await puzzle(3, 'failed');
    vi.setSystemTime(new Date('2026-11-12T12:00:00Z')); await puzzle(2);
    await worker.scheduled({}, env);
    expect(sqlite.prepare('SELECT started_day FROM puzzle_plays ORDER BY started_day').all().map(row => row.started_day)).toEqual(['2026-08-15', '2026-11-12']);
  });
});

describe('shared traffic counts against the real SQLite schema', () => {
  it('counts reloads as views but one visitor per day, and reports the correct countries', async () => {
    const visitor = crypto.randomUUID();
    expect((await view(visitor)).status).toBe(204);
    await view(visitor); await view(crypto.randomUUID(), 'IN');
    const response = await getReport();
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    const report = parseReport(await response.json());
    expect(report.daily).toHaveLength(7);
    expect(report.daily[0]).toEqual({ day: '2026-11-06', visitors: 0, pageviews: 0 });
    expect(report.daily[6]).toEqual({ day: '2026-11-12', visitors: 2, pageviews: 3 });
    expect(report.countries).toEqual([
      { code: 'US', visitors: 1, pageviews: 2 }, { code: 'IN', visitors: 1, pageviews: 1 },
    ]);
    const stored = sqlite.prepare('SELECT * FROM page_views').all();
    expect(stored[0].visitor_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(visitor);
    expect(Object.keys(stored[0]).sort()).toEqual(['country', 'day', 'event_id', 'visitor_hash']);
  });
  it('deduplicates retried events even with a changed visitor, country or UTC day', async () => {
    const event = crypto.randomUUID();
    await view(crypto.randomUUID(), 'US', event);
    await view(crypto.randomUUID(), 'IN', event);
    vi.setSystemTime(new Date('2026-11-13T00:00:01Z'));
    await view(crypto.randomUUID(), 'GB', event);
    const report = parseReport(await (await getReport()).json());
    expect(report.daily.at(-1)).toEqual({ day: '2026-11-13', visitors: 0, pageviews: 0 });
    expect(report.daily.at(-2)).toEqual({ day: '2026-11-12', visitors: 1, pageviews: 1 });
    expect(report.countries).toEqual([{ code: 'US', visitors: 1, pageviews: 1 }]);
  });
  it('rotates server hashes by day, uses the first country per visitor-day, and has a real Unknown bucket', async () => {
    const visitor = crypto.randomUUID();
    await view(visitor, 'US'); await view(visitor, 'IN');
    await view(crypto.randomUUID(), 'T1');
    vi.setSystemTime(new Date('2026-11-13T01:00:00Z'));
    await view(visitor, 'CA');
    const report = parseReport(await (await getReport()).json());
    expect(report.daily.at(-2)?.visitors).toBe(2);
    expect(report.daily.at(-1)?.visitors).toBe(1);
    expect(report.countries).toContainEqual({ code: 'IN', visitors: 0, pageviews: 1 });
    expect(report.countries).toContainEqual({ code: 'XX', visitors: 1, pageviews: 1 });
    const hashes = sqlite.prepare('SELECT visitor_hash FROM page_views WHERE country IN (\'US\', \'CA\')').all();
    expect(hashes[0].visitor_hash).not.toBe(hashes[1].visitor_hash);
  });
  it('fills empty ranges with zeroes and rejects unsupported ranges instead of silently reporting partial data', async () => {
    for (const days of ['1', '7', '30']) {
      const report = parseReport(await (await getReport(days)).json());
      expect(report.daily).toHaveLength(Number(days));
      expect(report.daily.every(row => row.pageviews === 0 && row.visitors === 0)).toBe(true);
      expect(report.countries).toEqual([]);
    }
    for (const days of ['0', '999', '7.1', '30 OR 1=1', '']) expect((await getReport(days)).status).toBe(400);
  });
  it('protects reports with the separate secret and restricts browser origins and preflights', async () => {
    expect((await getReport('7', null)).status).toBe(401);
    expect((await getReport('7', '2026')).status).toBe(401);
    expect((await getReport('7', password, 'https://other.example')).status).toBe(403);
    const blocked = await worker.fetch(new Request('https://analytics.example/pageview', {
      method: 'POST', headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: crypto.randomUUID(), visitorId: crypto.randomUUID() }),
    }), env);
    expect(blocked.status).toBe(403);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM page_views').get()?.n).toBe(0);
    const preflight = await worker.fetch(new Request('https://analytics.example/report', {
      method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'Authorization' },
    }), env);
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    env.ANALYTICS_PASSWORD = '2026';
    expect((await getReport()).status).toBe(503);
  });
  it('rejects malformed and oversized events without writing anything', async () => {
    for (const body of ['null', '{}', '{', JSON.stringify({ eventId: 'invalid', visitorId: crypto.randomUUID() }), ' '.repeat(1025)]) {
      const response = await worker.fetch(new Request('https://analytics.example/pageview', { method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' }, body }), env);
      expect([400, 413]).toContain(response.status);
    }
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM page_views').get()?.n).toBe(0);
    expect((await worker.fetch(new Request('https://analytics.example/pageview', { method: 'POST', headers: { Origin: origin }, body: '{}' }), env)).status).toBe(415);
  });
  it('keeps the most recent 90 days and reports backend failures as errors', async () => {
    vi.setSystemTime(new Date('2026-08-14T12:00:00Z')); await view();
    vi.setSystemTime(new Date('2026-08-15T12:00:00Z')); await view();
    vi.setSystemTime(new Date('2026-11-12T12:00:00Z')); await view();
    await worker.scheduled({}, env);
    expect(sqlite.prepare('SELECT DISTINCT day FROM page_views ORDER BY day').all().map(row => row.day)).toEqual(['2026-08-15', '2026-11-12']);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM visitors').get()?.n).toBe(2);
    vi.spyOn(env.DB, 'batch').mockRejectedValue(new Error('Database unavailable'));
    expect((await getReport()).status).toBe(503);
    expect((await view()).status).toBe(503);
  });
});
