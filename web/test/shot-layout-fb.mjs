/**
 * Build 40 layout-fb gate + before/after artifacts.
 * Portrait 390×844 / landscape 844×390.
 * Zero getBoundingClientRect intersection for Ivan's overlap pairs.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = '/opt/cursor/artifacts';
const TAG = process.env.LAYOUT_TAG || 'after';
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.svg': 'text/plain',
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

function fail(msg, extra) {
  console.error('FAIL', msg, extra ? JSON.stringify(extra, null, 2) : '');
  process.exitCode = 1;
}

function padClip(box, vw, vh, pad = 12) {
  if (!box) return null;
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const right = Math.min(vw, box.x + box.w + pad);
  const bottom = Math.min(vh, box.y + box.h + pad);
  const width = right - x;
  const height = bottom - y;
  if (width < 8 || height < 8) return null;
  return { x, y, width, height };
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
    const sized = [...document.querySelectorAll('#tavern-zone .card')].every(el => el.getBoundingClientRect().height > 40);
    const medals = document.querySelectorAll('#rail-patrons .medallion').length >= 5;
    return sized && medals;
  }, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 280));
}

async function closeUp(page, name, boxes, vw, vh) {
  const union = boxes.filter(Boolean).reduce((acc, b) => {
    if (!acc) return { x: b.x, y: b.y, w: b.w, h: b.h };
    const x = Math.min(acc.x, b.x);
    const y = Math.min(acc.y, b.y);
    const r = Math.max(acc.x + acc.w, b.x + b.w);
    const bot = Math.max(acc.y + acc.h, b.y + b.h);
    return { x, y, w: r - x, h: bot - y };
  }, null);
  const clip = padClip(union, vw, vh, 18);
  if (!clip) return;
  await page.screenshot({ path: path.join(ART, `${name}.png`), clip });
}

async function measure(page, fileStem, { w, h }) {
  fs.mkdirSync(ART, { recursive: true });
  await page.screenshot({ path: path.join(ART, `${fileStem}.png`), fullPage: false });
  const pack = await page.evaluate(() => {
    const m = window.__totTest.layout();
    const snap = window.__totTest.snapshot();
    return { m, snap, hits: m.hits || {}, boxes: m.boxes || {} };
  });
  const { m, snap } = pack;
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
    midGapPct: m.midGapPct,
    peakPct: m.peakPct,
    tavernDiscard: m.tavernDiscard,
    medallions: m.medallions,
    pointedTips: m.pointedTips,
    treasuryHasTip: snap.treasuryHasTip,
    moraHasTip: snap.moraHasTip,
    landscapeBanner: snap.landscapeBanner,
    hits: m.hits,
  };

  if (m.tavernDiscard) fail(`${fileStem} tavern discard still present`, notes);
  if (m.viewportTavernPct < 72) fail(`${fileStem} tavern ${m.viewportTavernPct}% < 72%`, notes);
  if ((m.cardH || 0) < 52) fail(`${fileStem} tavern cards too short (${m.cardH}px)`, notes);
  if ((m.medallions || 0) < 5) fail(`${fileStem} expected 5 medallions`, notes);
  if (snap.treasuryHasTip) fail(`${fileStem} Treasury has a tip`, notes);
  if (snap.landscapeBanner) fail(`${fileStem} landscape banner still on the match felt`, notes);
  const pointed = (snap.patrons || []).filter(p => p.id !== 'treasury' && p.id !== 'mora');
  if (!pointed.length || pointed.some(p => !p.tip || p.tipless)) fail(`${fileStem} pointed patrons missing gothic tip`, notes);
  if (w < h) {
    if (m.topBandPct > 8 || m.botBandPct > 8) fail(`${fileStem} empty portrait bands T/B ${m.topBandPct}/${m.botBandPct}`, notes);
    if ((m.midGapPct || 0) > 16) fail(`${fileStem} tavern-to-hand gap ${m.midGapPct}% (need ≤16%)`, notes);
  } else {
    if (m.leftGutterPct > 10) fail(`${fileStem} landscape left gutter ${m.leftGutterPct}%`, notes);
  }
  if (m.peakPct == null || m.peakPct < 7 || m.peakPct > 14) {
    fail(`${fileStem} peak ${m.peakPct}% of diameter (need ≈10%, gate 7–14)`, notes);
  }

  const hits = m.hits || {};
  const mustClear = TAG === 'before' ? [] : [
    'tavernVsOppDraw',
    'tavernVsDeck',
    'tavernVsYouDraw',
    'turnVsOppRes',
    'turnVsYouRes',
    'youResVsAgents',
    'oppResVsAgents',
    'endTurnVsPatrons',
    'effectsVsDeck',
    'effectsVsDeckLabel',
    'leaveVsCooldown',
    'sfxVsCooldown',
  ];
  for (const key of mustClear) {
    if (hits[key]) fail(`${fileStem} overlap ${key}`, { hit: hits[key], notes });
  }

  console.log('ok ', JSON.stringify(notes));
  return { notes, boxes: m.boxes || {}, hits };
}

const results = {};

const portPage = await browser.newPage();
await portPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(portPage);
results.portrait = await measure(portPage, `${TAG}-portrait-390x844`, { w: 390, h: 844 });
const pBoxes = results.portrait.boxes;
await closeUp(portPage, `${TAG}-portrait-turn-vs-res`, [pBoxes.turn, pBoxes.oppRes], 390, 844);
await closeUp(portPage, `${TAG}-portrait-res-vs-agents`, [pBoxes.youRes, pBoxes.youAgents], 390, 844);
await closeUp(portPage, `${TAG}-portrait-end-turn`, [pBoxes.endTurn, pBoxes.patronRail, pBoxes.patronsCluster], 390, 844);

await portPage.evaluate(() => window.__totTest.playFirstGold());
await new Promise(r => setTimeout(r, 420));
const playedBoxes = await portPage.evaluate(() => window.__totTest.layout().boxes);
await portPage.screenshot({ path: path.join(ART, `${TAG}-portrait-played-effects.png`), fullPage: false });
await closeUp(portPage, `${TAG}-portrait-effects-vs-deck`, [playedBoxes.events, playedBoxes.deck, playedBoxes.deckLabel], 390, 844);
await closeUp(portPage, `${TAG}-portrait-leave-vs-cd`, [playedBoxes.leaveHud, playedBoxes.youCd, playedBoxes.youCalls], 390, 844);

await portPage.evaluate(() => window.__totTest.inspectById('customs-seizure') || window.__totTest.inspectById('toll-of-flesh'));
await new Promise(r => setTimeout(r, 420));
await portPage.screenshot({ path: path.join(ART, `${TAG}-portrait-inspect.png`), fullPage: false });
const pFit = await portPage.evaluate(() => window.__totTest.inspectFit());
if (!pFit.hexOn) fail('portrait inspect hex clipped', pFit);
if (!pFit.textOn) fail('portrait inspect text clipped', pFit);
if (!pFit.nameOn) fail('portrait inspect name clipped', pFit);
if (pFit.sheet && !pFit.sheetOn) fail('portrait inspect sheet clipped', pFit);
if (pFit.titleClipped) fail('portrait inspect title clipped', pFit);
if (!/CUSTOMS SEIZURE|TOLL OF FLESH/i.test(pFit.tipText || '')) fail('portrait inspect missing title', pFit);
await portPage.close();

const landPage = await browser.newPage();
await landPage.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(landPage);
results.landscape = await measure(landPage, `${TAG}-landscape-844x390`, { w: 844, h: 390 });
const lBoxes = results.landscape.boxes;
await closeUp(landPage, `${TAG}-landscape-tavern-vs-piles`, [lBoxes.tavern, lBoxes.deck, lBoxes.oppDraw, lBoxes.youDraw], 844, 390);
await closeUp(landPage, `${TAG}-landscape-left-gutter`, [lBoxes.oppDraw, lBoxes.deck, lBoxes.youDraw, lBoxes.events], 844, 390);
await closeUp(landPage, `${TAG}-landscape-right-gutter`, [lBoxes.patronRail, lBoxes.endTurn, lBoxes.oppCd, lBoxes.youCd], 844, 390);

await landPage.evaluate(() => window.__totTest.inspectById('customs-seizure') || window.__totTest.inspectById('toll-of-flesh'));
await new Promise(r => setTimeout(r, 420));
await landPage.screenshot({ path: path.join(ART, `${TAG}-landscape-inspect.png`), fullPage: false });
const lFit = await landPage.evaluate(() => window.__totTest.inspectFit());
if (!lFit.hexOn) fail('landscape inspect hex clipped', lFit);
if (!lFit.textOn) fail('landscape inspect text clipped', lFit);
if (!lFit.nameOn) fail('landscape inspect name clipped', lFit);
if (lFit.sheet && !lFit.sheetOn) fail('landscape inspect sheet clipped', lFit);
if (lFit.titleClipped) fail('landscape inspect title clipped', lFit);
await landPage.close();

const note = [
  `Build 40 layout-fb (${TAG})`,
  `portrait 390x844: tavern ${results.portrait.notes.tavernW}px = ${results.portrait.notes.viewportTavernPct}% vw`,
  `  hits ${JSON.stringify(results.portrait.notes.hits)}`,
  `landscape 844x390: tavern ${results.landscape.notes.tavernW}px = ${results.landscape.notes.viewportTavernPct}% vw`,
  `  gutters L/R ${results.landscape.notes.leftGutterPct}% / ${results.landscape.notes.rightGutterPct}%`,
  `  hits ${JSON.stringify(results.landscape.notes.hits)}`,
].join('\n');
fs.writeFileSync(path.join(ART, `${TAG}-layout-fb-measurements.txt`), note + '\n');
console.log(note);

await browser.close();
server.close();
if (process.exitCode) process.exit(process.exitCode);
console.log('LAYOUT FB GATE OK');
