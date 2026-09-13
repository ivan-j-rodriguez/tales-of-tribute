import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      let file = path.join(root, url === '/' ? 'index.html' : url);
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('no'); return; }
        res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function waitReady(page) {
  await page.waitForFunction(() => window.__totTest, { timeout: 20000 });
}

async function start(page) {
  await page.evaluate(() => window.__totTest.startQuick());
  await page.waitForFunction(() => window.__totTest.snapshot().hand > 0, { timeout: 8000 });
}

async function snap(page) {
  return page.evaluate(() => window.__totTest.snapshot());
}

function tapEvents(kind) {
  if (kind === 'full') {
    return `
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true }));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', isPrimary: true }));
      el.click();
    `;
  }
  if (kind === 'ios') {
    return `
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true }));
      el.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerType: 'touch', isPrimary: true }));
      el.click();
    `;
  }
  throw new Error(kind);
}

async function tapHand(page, kind, id = 'gold') {
  return page.evaluate((src, want) => {
    const el = document.querySelector(`#hand-zone .card[data-id="${want}"]`)
      || document.querySelector('#hand-zone .card');
    if (!el) return false;
    eval(src);
    return true;
  }, tapEvents(kind), id);
}

async function tapPatron(page, kind, pid = 'pelin') {
  return page.evaluate((src, want) => {
    const el = document.querySelector(`#rail-patrons .patron-coin[data-pid="${want}"]`)
      || document.querySelector('#rail-patrons .patron-coin[data-side="you"]');
    if (!el) return false;
    eval(src);
    return true;
  }, tapEvents(kind), pid);
}

async function holdPatron(page, pid = 'pelin') {
  return page.evaluate(async (want) => {
    const el = document.querySelector(`#rail-patrons .patron-coin[data-pid="${want}"]`)
      || document.querySelector('#rail-patrons .patron-coin[data-side="you"]');
    if (!el) return { ok: false };
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true }));
    await new Promise(r => setTimeout(r, 640));
    const mid = window.__totTest.snapshot();
    const dossier = document.querySelector('.lift-text-fly')?.innerText || '';
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', isPrimary: true }));
    el.click();
    return { ok: true, mid, dossier };
  }, pid);
}

async function holdHand(page) {
  return page.evaluate(async () => {
    const el = document.querySelector('#hand-zone .card');
    if (!el) return false;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true }));
    await new Promise(r => setTimeout(r, 620));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', isPrimary: true }));
    el.click();
    return true;
  });
}

const fails = [];
function assert(name, cond, extra) {
  if (cond) console.log('PASS', name);
  else {
    console.error('FAIL', name, extra || '');
    fails.push(name + (extra ? ' ' + JSON.stringify(extra) : ''));
  }
}

const { server, port } = await serve();
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
page.setDefaultTimeout(20000);
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));

await page.goto(`http://127.0.0.1:${port}/?test=1`, { waitUntil: 'domcontentloaded' });
await waitReady(page);

// 1. full pointer cycle plays exactly one Gold
await start(page);
let a = await snap(page);
assert('start has hand', a.hand >= 5, a);
const golds0 = a.golds;
const hand0 = a.hand;
const coin0 = a.coin;
await tapHand(page, 'full');
await new Promise(r => setTimeout(r, 80));
let b = await snap(page);
assert('full tap plays one card', b.hand === hand0 - 1 && b.played >= 1, b);
assert('full tap does not double-play', b.hand === hand0 - 1, b);
assert('gold pays a coin', b.golds === golds0 - 1 && b.coin === coin0 + 1, b);

// 2. iOS click-only still plays
await start(page);
a = await snap(page);
await tapHand(page, 'ios');
await new Promise(r => setTimeout(r, 80));
b = await snap(page);
assert('ios click-only plays one card', b.hand === a.hand - 1 && b.coin === a.coin + 1, { a, b });

// 3. hold inspects, does not play
await start(page);
a = await snap(page);
await holdHand(page);
await new Promise(r => setTimeout(r, 80));
b = await snap(page);
assert('hold does not play', b.hand === a.hand && b.coin === a.coin, { a, b });

// 4. draw pile sealed
await start(page);
const toast = await page.evaluate(() => window.__totTest.clickDraw());
assert('draw pile sealed', /sealed/i.test(toast), toast);

// 5. patron tap opens confirm, not lift
await start(page);
await tapPatron(page, 'full', 'pelin');
await new Promise(r => setTimeout(r, 80));
b = await snap(page);
assert('patron tap opens confirm', b.patronConfirm === true && b.liftActive === false, b);
assert('patrons clustered', b.clusterH > 0 && b.railH > 0 && b.clusterH < b.railH * 0.72, b);
const sides = b.patrons.reduce((m, p) => { m[p.side] = (m[p.side] || 0) + 1; return m; }, {});
assert('yours on your side', (sides.you || 0) === 2 && (sides.opp || 0) === 2 && (sides.mid || 0) === 1, b.patrons);
assert('favor labels present', b.patrons.every(p => p.favor), b.patrons);
await page.evaluate(() => document.querySelector('#pc-cancel')?.click());

// 6. patron hold reads dossier, does not call
const held = await holdPatron(page, 'pelin');
assert('patron hold lifts', !!(held.mid && held.mid.liftActive), held);
assert('patron hold shows favor text', /Favored|Neutral|Unfavored/i.test(held.dossier || ''), held.dossier);
assert('patron hold does not open call', held.mid && held.mid.patronConfirm === false, held);

await browser.close();
server.close();
if (fails.length) {
  console.error('\\n' + fails.length + ' failed:\\n' + fails.join('\\n'));
  process.exit(1);
}
console.log('\\nAll gesture tests passed.');
