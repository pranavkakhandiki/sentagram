# Sentagram analytics setup

The game stays on GitHub Pages. A separate Cloudflare Worker records page views
and approximate countries in a D1 database. The **Analytics** tab is inside
the dev-mode puzzle-bank window. Reports require a separate password.

This is a small Sentagram-specific counter, not Cloudflare Web Analytics. You do
not need a Web Analytics beacon, a Cloudflare Analytics API token, or DNS changes.
The Worker uses its own `workers.dev` address.

## Deployed backend

- Worker: `sentagram-analytics`
- Public endpoint: `https://sentagram-analytics.sentagram.workers.dev`
- D1 database: `sentagram-analytics`
- Database ID: `b10231ec-7a48-49db-85a8-005e5c6bb534`
- The initial tables are created, and daily cleanup is scheduled.
- The private analytics password is configured. The remaining launch step is
  publishing the website changes below.

The public endpoint is already the website's default in `src/analytics/client.ts`.
No GitHub repository variable is needed. The account and database IDs in
`analytics-worker/wrangler.jsonc` are public configuration, not credentials.

## Reset the analytics password when needed

Create a long, unique analytics password (at least 20 characters) and save it in
your password manager. For example, `openssl rand -hex 24` generates one. Then run:

```bash
npx wrangler@4 secret put ANALYTICS_PASSWORD --config analytics-worker/wrangler.jsonc
```

Paste the password at Wrangler's hidden prompt. Do not put it in source code,
GitHub variables, `.env` files, URLs, or chat. The `2026` dev code is not this
password. A guessed dev code alone cannot retrieve a report.

## Publish the website changes

Commit and push the analytics source changes when you are ready. The existing
GitHub Actions workflow builds and publishes the game. The deployed Worker URL
is included automatically, and the analytics password stays in Cloudflare.

For an optional override, use `VITE_ANALYTICS_URL` at build time (or in an ignored
`.env.local` file). An explicitly empty value disables analytics and shows setup
instructions in the tab. With no override, the site uses the deployed backend.

## Try it

Visit `https://sentagram.win/` and reload once. Open **? → Dev mode → 2026 →
Unlock → Let’s play**, then the grid button and **Analytics** tab. Enter the
separate analytics password. You should see one visitor and two page views
(plus any other traffic). Counts can appear immediately after the tracking
request finishes; use Refresh if needed.

If the database, password or URL was not configured, the UI shows an error or a
setup message, not made-up numbers. Opening the Worker URL by itself shows a
Forbidden response; it only accepts requests from `https://sentagram.win`.

## What the numbers mean

- **Visitors today:** anonymous browsers counted once per UTC day. This estimates
  visitors, not distinct human beings. Browsers/devices count separately. Storage
  clearing or blocked storage can count a returning browser again.
- **Page views:** one per page load. Word moves, guesses, practice puzzles, opening
  dev mode, and checking analytics do not generate extra views.
- **Daily visitors:** today's count is partial. All report dates use UTC, while
  the daily puzzle continues to reset at each player's local midnight.
- **Visitor-days by country:** a returning browser counts again on another day.
  We deliberately do not identify visitors across days. Country is the first
  country seen for that browser that day; the Views column uses each view's
  country. A travelling visitor can have views in several countries.
- **Countries:** approximate network locations supplied by Cloudflare. VPNs may
  show a different country. Unknown locations are listed as Unknown. No GPS or
  location permission is requested.
- Numbers begin after activation; past visits cannot be recovered. Your own
  visits count too. JavaScript bots can count, while Do Not Track, blockers,
  network failures, and browsers without secure random IDs can reduce counts.

## Data and maintenance

The database contains a random page-load ID, a hash of a daily random browser ID,
the UTC day, and a country code. It contains no IP addresses, names, emails, precise
locations, guesses, or puzzle answers. The random browser ID rotates daily and is
separate from game progress. The analytics password is held only in memory while
the Analytics tab is open; changing tabs, closing the window, or Lock analytics
clears it. The Worker never sends this password back in a report.

A daily Worker schedule removes records older than the most recent 90 UTC dates.
There are no analytics cookies or third-party tracking scripts. Network requests
to the Worker are best-effort and never prevent the game from loading or playing.

This uses the Workers and D1 free allowances; it is not a guarantee of unlimited
free traffic. Keep your Cloudflare account on its free plan if that is what you
want, and check usage in the Cloudflare dashboard as traffic grows. Public
browser counters are estimates: someone can forge a tracking request, even
though cross-origin browser requests are restricted and reports are private.

Local previews do not send tracking requests. To test the dashboard locally, put
the public endpoint in `.env.local` and temporarily allow a local origin in a
separate test Worker. Never change production's allowed origin to `*`.

GitHub Actions deploys the game, while Worker updates are deployed separately.
For future backend changes, apply any new migrations and deploy with:

```bash
npx wrangler@4 d1 migrations apply sentagram-analytics --remote --config analytics-worker/wrangler.jsonc
npx wrangler@4 deploy --config analytics-worker/wrangler.jsonc
```

These commands reuse the existing database and preserve the password secret.

Sources: [D1 setup](https://developers.cloudflare.com/d1/get-started/),
[Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
[country metadata](https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties),
[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/),
[Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
