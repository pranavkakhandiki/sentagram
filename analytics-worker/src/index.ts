import type { AnalyticsReport, CountryTraffic } from '../../src/analytics/types';

export interface Statement {
  bind(...values: (string | number)[]): Statement;
}
export interface AnalyticsDatabase {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<{ results: Record<string, unknown>[] }[]>;
}
export interface Env {
  DB: AnalyticsDatabase;
  ALLOWED_ORIGIN: string;
  ANALYTICS_PASSWORD?: string;
}
type GeoRequest = Request & { cf?: { country?: string } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DAY_MS = 86_400_000;
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const shiftedDay = (day: string, offset: number) => dayKey(new Date(Date.parse(day + 'T00:00:00Z') + offset * DAY_MS));

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}
async function authorized(request: Request, password: string) {
  const header = request.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ') || header.length > 300) return false;
  const [actual, expected] = await Promise.all([digest(header.slice(7)), digest(password)]);
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
  return difference === 0;
}

async function collect(request: GeoRequest, env: Env, now: Date) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return 415;
  if (Number(request.headers.get('Content-Length')) > 1024) return 413;
  // Bound streaming/chunked bodies too, rather than trusting Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return 400;
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 1024) { await reader.cancel(); return 413; }
    chunks.push(value);
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  let payload: { eventId?: unknown; visitorId?: unknown } | null;
  try { payload = JSON.parse(new TextDecoder().decode(buffer)); } catch { return 400; }
  if (!payload || typeof payload.eventId !== 'string' || !UUID.test(payload.eventId) ||
    typeof payload.visitorId !== 'string' || !UUID.test(payload.visitorId)) return 400;
  const day = dayKey(now);
  const visitorHash = Array.from(await digest(day + ':' + payload.visitorId.toLowerCase()), b => b.toString(16).padStart(2, '0')).join('');
  const country = /^[A-Z]{2}$/.test(request.cf?.country ?? '') ? request.cf!.country! : 'XX';
  const eventId = payload.eventId.toLowerCase();
  // D1 batches are atomic. Retries cannot count another view or another visitor,
  // even if the caller changes its visitor ID or a retry crosses midnight.
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO page_views (event_id, day, visitor_hash, country) VALUES (?, ?, ?, ?)')
      .bind(eventId, day, visitorHash, country),
    env.DB.prepare('INSERT OR IGNORE INTO visitors (day, visitor_hash, country) SELECT day, visitor_hash, country FROM page_views WHERE event_id = ?')
      .bind(eventId),
  ]);
  return 204;
}

export async function report(env: Env, days: number, now: Date): Promise<AnalyticsReport> {
  const today = dayKey(now), start = shiftedDay(today, 1 - days);
  const results = await env.DB.batch([
    env.DB.prepare('SELECT day, COUNT(*) AS pageviews FROM page_views WHERE day BETWEEN ? AND ? GROUP BY day').bind(start, today),
    env.DB.prepare('SELECT day, COUNT(*) AS visitors FROM visitors WHERE day BETWEEN ? AND ? GROUP BY day').bind(start, today),
    env.DB.prepare('SELECT country, COUNT(*) AS pageviews FROM page_views WHERE day BETWEEN ? AND ? GROUP BY country').bind(start, today),
    env.DB.prepare('SELECT country, COUNT(*) AS visitors FROM visitors WHERE day BETWEEN ? AND ? GROUP BY country').bind(start, today),
  ]);
  const daily = Array.from({ length: days }, (_, i) => ({ day: shiftedDay(start, i), visitors: 0, pageviews: 0 }));
  const byDay = new Map(daily.map(row => [row.day, row]));
  for (const row of results[0].results) byDay.get(String(row.day))!.pageviews = Number(row.pageviews);
  for (const row of results[1].results) byDay.get(String(row.day))!.visitors = Number(row.visitors);
  const countries = new Map<string, CountryTraffic>();
  for (const result of results.slice(2)) for (const row of result.results) {
    const code = String(row.country);
    const country = countries.get(code) ?? { code, visitors: 0, pageviews: 0 };
    if ('visitors' in row) country.visitors = Number(row.visitors);
    if ('pageviews' in row) country.pageviews = Number(row.pageviews);
    countries.set(code, country);
  }
  return { timezone: 'UTC', days, generatedAt: now.toISOString(), daily,
    countries: [...countries.values()].sort((a, b) => b.visitors - a.visitors || b.pageviews - a.pageviews || a.code.localeCompare(b.code)) };
}

export default {
  async fetch(request: GeoRequest, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN)
      return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
    const headers = new Headers({
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store', 'Vary': 'Origin',
    });
    const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
    const url = new URL(request.url);
    if (!['/pageview', '/report'].includes(url.pathname)) return json({ error: 'Not found' }, 404);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    try {
      if (url.pathname === '/pageview' && request.method === 'POST') {
        if (!env.DB) return json({ error: 'Database is not configured' }, 503);
        const status = await collect(request, env, new Date());
        return status === 204 ? new Response(null, { status, headers }) : json({ error: 'Invalid page view' }, status);
      }
      if (url.pathname === '/report' && request.method === 'GET') {
        if (!env.ANALYTICS_PASSWORD || env.ANALYTICS_PASSWORD.length < 20 || !env.DB)
          return json({ error: 'Analytics setup is incomplete' }, 503);
        if (!await authorized(request, env.ANALYTICS_PASSWORD)) return json({ error: 'Unauthorized' }, 401);
        const range = url.searchParams.get('days') ?? '7';
        if (!['1', '7', '30'].includes(range)) return json({ error: 'Invalid date range' }, 400);
        return json(await report(env, Number(range), new Date()));
      }
      return json({ error: 'Method not allowed' }, 405);
    } catch { return json({ error: 'Analytics is temporarily unavailable' }, 503); }
  },
  async scheduled(_event: unknown, env: Env) {
    const cutoff = shiftedDay(dayKey(new Date()), -89);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM page_views WHERE day < ?').bind(cutoff),
      env.DB.prepare('DELETE FROM visitors WHERE day < ?').bind(cutoff),
    ]);
  },
};
