import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

// Check the actual Pages artifact, not just source files in public/.
const dist = new URL('../dist/', import.meta.url);
const canonical = 'https://sentagram.win/';
const { document } = new JSDOM(readFileSync(new URL('index.html', dist), 'utf8')).window;
const content = (selector) => {
  const value = document.querySelector(selector)?.getAttribute('content');
  assert.ok(value?.trim(), `Missing metadata: ${selector}`);
  return value;
};
const publishedAsset = (url) => {
  const asset = new URL(url, canonical);
  assert.equal(asset.origin, new URL(canonical).origin, `Expected a local asset: ${url}`);
  return readFileSync(new URL(`.${asset.pathname}`, dist));
};

assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1);
assert.equal(document.querySelector('link[rel="canonical"]').getAttribute('href'), canonical);
assert.match(document.title, /^Sentagram\b.*(?:game|puzzle)/i);
const description = content('meta[name="description"]');
assert.match(description, /Sentagram/);
assert.ok(document.querySelector('meta[name="viewport"]'));
for (const meta of document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]')) {
  assert.doesNotMatch(meta.content, /(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i);
}

assert.equal(document.querySelectorAll('h1').length, 1);
assert.equal(document.querySelector('h1').textContent.trim(), 'Sentagram');
assert.match(document.querySelector('main')?.textContent ?? '', /rearrange.*sentence.*three guesses/is);
assert.ok(document.querySelector('noscript'), 'Explain the JavaScript requirement');

assert.equal(content('meta[property="og:type"]'), 'website');
assert.equal(content('meta[property="og:site_name"]'), 'Sentagram');
assert.equal(content('meta[property="og:url"]'), canonical);
assert.equal(content('meta[property="og:title"]'), document.title);
assert.equal(content('meta[property="og:description"]'), description);
assert.equal(content('meta[name="twitter:card"]'), 'summary_large_image');
assert.equal(content('meta[name="twitter:title"]'), document.title);
assert.equal(content('meta[name="twitter:description"]'), description);
const image = content('meta[property="og:image"]');
assert.equal(content('meta[name="twitter:image"]'), image);
content('meta[property="og:image:alt"]');
content('meta[name="twitter:image:alt"]');
const png = publishedAsset(image);
assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Social image must be a PNG');
assert.equal(png.readUInt32BE(16), Number(content('meta[property="og:image:width"]')));
assert.equal(png.readUInt32BE(20), Number(content('meta[property="og:image:height"]')));

const website = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
assert.equal(website['@context'], 'https://schema.org');
assert.equal(website['@type'], 'WebSite');
assert.equal(website.name, 'Sentagram');
assert.equal(website.url, canonical);

const robots = readFileSync(new URL('robots.txt', dist), 'utf8');
assert.match(robots, /^User-agent:\s*\*\s*$/im);
assert.match(robots, /^Allow:\s*\/\s*$/im);
assert.doesNotMatch(robots, /^Disallow:\s*\S+/im);
assert.ok(robots.split(/\r?\n/).includes(`Sitemap: ${canonical}sitemap.xml`));
const sitemap = new JSDOM(readFileSync(new URL('sitemap.xml', dist), 'utf8'), {
  contentType: 'application/xml',
}).window.document;
assert.equal(sitemap.documentElement.namespaceURI, 'http://www.sitemaps.org/schemas/sitemap/0.9');
// There are no other public page URLs: puzzles and dialogs share the homepage.
assert.deepEqual([...sitemap.querySelectorAll('loc')].map((loc) => loc.textContent.trim()), [canonical]);

for (const asset of document.querySelectorAll('script[src], link[rel="stylesheet"], link[rel="icon"]')) {
  const url = asset.getAttribute('src') ?? asset.getAttribute('href');
  assert.ok(url.startsWith('/'), `Asset must load from the domain root: ${url}`);
  publishedAsset(url);
}
console.log(`SEO checks passed for ${fileURLToPath(dist)}: readable HTML, metadata, sitemap, robots, and assets.`);
