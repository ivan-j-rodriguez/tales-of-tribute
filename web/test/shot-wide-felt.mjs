/**
 * Build 32 gate: 390×844 + 844×390 in-match board.
 * Tavern band must be ≥ 72% of viewport in both orientations.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = '/opt/cursor/artifacts';
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

const { server, port } = await serve();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

async function ready(page) {
  await page.goto(`http://127.0.0.1:${port}/?test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__totTest, { timeout: 20000 });
  await page.evaluate(() => window.__totTest.startQuick());
  await page.waitForFunction(() => window.__totTest.snapshot().hand > 0, { timeout: 8000 });
  await page.waitForFunction(() => {
    const faces = [...document.querySelectorAll('#tavern-zone .card img, #hand-zone .card img')];
    const sized = [...document.querySelectorAll('#tavern-zone .card')].every(el => el.getBoundingClientRect().height > 40);
    return sized && faces.length && faces.every(img => img.complete && img.naturalWidth > 0);
  }, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 250));
}

function fail(msg, extra) {
  console.error('FAIL', msg, extra ? JSON.stringify(extra, null, 2) : '');
  process.exitCode = 1;
}

async function measure(page, name, { w, h }) {
  const destArt = path.join(ART, `${name}.png`);
  const destWs = path.join('/workspace', `${name}.png`);
  fs.mkdirSync(ART, { recursive: true });
  await page.screenshot({ path: destArt });
  await page.screenshot({ path: destWs });
  const m = await page.evaluate(() => window.__totTest.layout());
  const debug = await page.evaluate(() => {
    const ids = ['#opp-res', '#match .felt-tavern', '#you-res', '#tavern-zone', '#hand-zone'];
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { sel, x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), area: cs.gridArea, row: cs.gridRow };
    };
    const felt = document.querySelector('#match .felt-table');
    const fcs = felt ? getComputedStyle(felt) : null;
    return {
      grid: fcs ? { rows: fcs.gridTemplateRows, areas: fcs.gridTemplateAreas, cols: fcs.gridTemplateColumns } : null,
      zones: ids.map(box),
      cards: [...document.querySelectorAll('#tavern-zone .card')].map((el, i) => {
        const r = el.getBoundingClientRect();
        const img = el.querySelector('img');
        return { i, x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), src: img?.getAttribute('src') || '', nw: img?.naturalWidth || 0 };
      }),
    };
  });
  console.log('debug', name, JSON.stringify(debug));
  const snap = await page.evaluate(() => window.__totTest.snapshot());
  const notes = {
    name, viewport: `${w}x${h}`,
    tavernW: +m.tavernW.toFixed(1),
    viewportTavernPct: m.viewportTavernPct,
    feltW: +m.feltW.toFixed(1),
    leftGutterPct: m.leftGutterPct,
    rightGutterPct: m.rightGutterPct,
    cardCount: m.cardCount,
    cardH: m.cardH,
    cardOverlap: m.cardOverlap,
    hiddenCards: m.hiddenCards,
    tokensStacked: m.tokensStacked,
    railW: +m.railW.toFixed(1),
    triadCount: snap.triadCount,
    youCallsOnRail: snap.youCallsOnRail,
    treasuryHasTip: snap.treasuryHasTip,
  };
  if (m.viewportTavernPct < 72) fail(`${name} tavern ${m.viewportTavernPct}% < 72%`, notes);
  if ((m.hiddenCards || 0) > 0) fail(`${name} ${m.hiddenCards} tavern card(s) hidden under the rail`, notes);
  if ((m.cardH || 0) < 48) fail(`${name} tavern cards too short (${m.cardH}px)`, notes);
  if (m.cardCount >= 2 && m.cardOverlap > 18) fail(`${name} tavern cards overlap ${m.cardOverlap}px`, notes);
  if (m.tokensStacked) fail(`${name} two patron-use tokens stacked under hourglass`, notes);
  /* Right-side space is the patron overlay on felt, not a letterbox. Fail only a fat LEFT dead column. */
  if (h < w && m.leftGutterPct > 10) fail(`${name} landscape left gutter too wide`, notes);
  if (snap.triadCount !== 3) fail(`${name} resource triad is not 3`, notes);
  console.log('ok ', JSON.stringify(notes));
  return notes;
}

const results = {};

const portPage = await browser.newPage();
await portPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(portPage);
results.portrait = await measure(portPage, 'portrait-wide-ok', { w: 390, h: 844 });
await portPage.close();

const landPage = await browser.newPage();
await landPage.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(landPage);
results.landscape = await measure(landPage, 'landscape-wide-ok', { w: 844, h: 390 });
await landPage.close();

const note = [
  'Build 32 tavern width gate',
  `portrait 390x844: tavern ${results.portrait.tavernW}px = ${results.portrait.viewportTavernPct}% of viewport (need ≥72%)`,
  `landscape 844x390: tavern ${results.landscape.tavernW}px = ${results.landscape.viewportTavernPct}% of viewport (need ≥72%)`,
  `portrait gutters L/R ${results.portrait.leftGutterPct}% / ${results.portrait.rightGutterPct}%`,
  `landscape gutters L/R ${results.landscape.leftGutterPct}% / ${results.landscape.rightGutterPct}%`,
  `card overlap portrait ${results.portrait.cardOverlap}px / landscape ${results.landscape.cardOverlap}px`,
  `tokensStacked: portrait ${results.portrait.tokensStacked} landscape ${results.landscape.tokensStacked}`,
].join('\n');
fs.writeFileSync(path.join(ART, 'wide-felt-measurements.txt'), note + '\n');
fs.writeFileSync('/workspace/wide-felt-measurements.txt', note + '\n');
console.log(note);

await browser.close();
server.close();
if (process.exitCode) process.exit(process.exitCode);
console.log('WIDE FELT GATE OK');
