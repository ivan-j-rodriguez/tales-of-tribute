/**
 * Build 35 board-pass gate + artifacts.
 * Portrait 390×844: no large empty bands, no tavern discard, tavern readable.
 * Landscape 844×390: no large side gutters, tavern ≥ 72% viewport.
 * Patron medallions: gothic tip rotates with favor; Treasury + Mora tipless.
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
    const medals = document.querySelectorAll('#rail-patrons .medallion').length >= 5;
    return sized && medals && faces.length && faces.every(img => img.complete && img.naturalWidth > 0);
  }, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 280));
}

function fail(msg, extra) {
  console.error('FAIL', msg, extra ? JSON.stringify(extra, null, 2) : '');
  process.exitCode = 1;
}

async function measure(page, fileStem, { w, h }) {
  fs.mkdirSync(ART, { recursive: true });
  const destArt = path.join(ART, `${fileStem}.png`);
  await page.screenshot({ path: destArt, fullPage: false });
  const m = await page.evaluate(() => window.__totTest.layout());
  const snap = await page.evaluate(() => window.__totTest.snapshot());
  const notes = {
    name: fileStem,
    viewport: `${w}x${h}`,
    tavernW: +m.tavernW.toFixed(1),
    viewportTavernPct: m.viewportTavernPct,
    feltW: +m.feltW.toFixed(1),
    leftGutterPct: m.leftGutterPct,
    rightGutterPct: m.rightGutterPct,
    topBandPct: m.topBandPct,
    botBandPct: m.botBandPct,
    cardCount: m.cardCount,
    cardH: m.cardH,
    tavernDiscard: m.tavernDiscard,
    medallions: m.medallions,
    pointedTips: m.pointedTips,
    treasuryHasTip: snap.treasuryHasTip,
    moraHasTip: snap.moraHasTip,
    patrons: snap.patrons?.map(p => ({ id: p.id, favor: p.favor, tip: p.tip, tipless: p.tipless })),
  };

  if (m.tavernDiscard) fail(`${fileStem} tavern discard still present`, notes);
  if (m.viewportTavernPct < 72) fail(`${fileStem} tavern ${m.viewportTavernPct}% < 72%`, notes);
  if ((m.cardH || 0) < 52) fail(`${fileStem} tavern cards too short (${m.cardH}px)`, notes);
  if ((m.medallions || 0) < 5) fail(`${fileStem} expected 5 medallions`, notes);
  if (snap.treasuryHasTip) fail(`${fileStem} Treasury has a tip`, notes);
  const pointed = (snap.patrons || []).filter(p => p.id !== 'treasury' && p.id !== 'mora');
  if (!pointed.length || pointed.some(p => !p.tip || p.tipless)) fail(`${fileStem} pointed patrons missing gothic tip`, notes);
  if (w < h) {
    if (m.topBandPct > 8 || m.botBandPct > 8) fail(`${fileStem} empty portrait bands T/B ${m.topBandPct}/${m.botBandPct}`, notes);
  } else {
    if (m.leftGutterPct > 10) fail(`${fileStem} landscape left gutter ${m.leftGutterPct}%`, notes);
  }
  console.log('ok ', JSON.stringify(notes));
  return notes;
}

const results = {};

const portPage = await browser.newPage();
await portPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(portPage);
results.portrait = await measure(portPage, 'portrait-390x844', { w: 390, h: 844 });
const portFavor = await portPage.evaluate(() => {
  const a = window.__totTest.setFavor('pelin', 1);
  const b = window.__totTest.setFavor('crows', -1);
  const snap = window.__totTest.snapshot();
  return { a, b, patrons: snap.patrons };
});
console.log('portrait favor', JSON.stringify(portFavor));
await new Promise(r => setTimeout(r, 800));
await portPage.screenshot({ path: path.join(ART, 'portrait-patron-favor-rotate.png') });
await portPage.close();

const landPage = await browser.newPage();
await landPage.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(landPage);
results.landscape = await measure(landPage, 'landscape-844x390', { w: 844, h: 390 });
const landFavor = await landPage.evaluate(() => {
  const a = window.__totTest.setFavor('pelin', 1);
  const b = window.__totTest.setFavor('crows', -1);
  const snap = window.__totTest.snapshot();
  return { a, b, patrons: snap.patrons };
});
console.log('landscape favor', JSON.stringify(landFavor));
await new Promise(r => setTimeout(r, 800));
await landPage.screenshot({ path: path.join(ART, 'landscape-patron-favor-rotate.png') });
await landPage.close();

const note = [
  'Build 35 board-pass measurements',
  `portrait 390x844: tavern ${results.portrait.tavernW}px = ${results.portrait.viewportTavernPct}% vw`,
  `  empty bands T/B ${results.portrait.topBandPct}% / ${results.portrait.botBandPct}% (need ≤8%)`,
  `  tavern discard: ${results.portrait.tavernDiscard}`,
  `  medallions ${results.portrait.medallions}, gothic tips ${results.portrait.pointedTips}, Treasury tip ${results.portrait.treasuryHasTip}`,
  `landscape 844x390: tavern ${results.landscape.tavernW}px = ${results.landscape.viewportTavernPct}% vw (need ≥72%)`,
  `  gutters L/R ${results.landscape.leftGutterPct}% / ${results.landscape.rightGutterPct}%`,
  `  tavern discard: ${results.landscape.tavernDiscard}`,
  `  medallions ${results.landscape.medallions}, gothic tips ${results.landscape.pointedTips}, Treasury tip ${results.landscape.treasuryHasTip}`,
].join('\n');
fs.writeFileSync(path.join(ART, 'board-pass-measurements.txt'), note + '\n');
console.log(note);

await browser.close();
server.close();
if (process.exitCode) process.exit(process.exitCode);
console.log('BOARD PASS GATE OK');
