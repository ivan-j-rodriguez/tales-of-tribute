/**
 * Build 42 board-pass gate + artifacts.
 * Portrait 390×844 / landscape 844×390.
 * Gothic medallion silhouette IS the favor tip. No in-match landscape banner.
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

async function shotCoin(page, name, pid) {
  fs.mkdirSync(ART, { recursive: true });
  const box = await page.evaluate((id) => {
    const el = document.querySelector(`#rail-patrons .patron-coin[data-pid="${id}"] .token-dial`)
      || document.querySelector(`#rail-patrons .patron-coin[data-pid="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const pad = 8;
    return {
      x: Math.max(0, r.left - pad),
      y: Math.max(0, r.top - pad),
      width: Math.min(window.innerWidth, r.right + pad) - Math.max(0, r.left - pad),
      height: Math.min(window.innerHeight, r.bottom + pad) - Math.max(0, r.top - pad),
    };
  }, pid);
  if (!box || box.width < 8 || box.height < 8) { fail(`${name} missing ${pid} coin`); return; }
  await page.screenshot({ path: path.join(ART, `${name}.png`), clip: box });
}

async function shotRail(page, name) {
  fs.mkdirSync(ART, { recursive: true });
  const box = await page.evaluate(() => {
    const rail = document.querySelector('#patron-rail');
    const coins = [...document.querySelectorAll('#rail-patrons .patron-coin')];
    const extras = ['#btn-end', '#you-patron-calls', '#opp-patron-calls']
      .map((s) => document.querySelector(s))
      .filter(Boolean);
    const els = [rail, ...coins, ...extras].filter(Boolean);
    if (!els.length) return null;
    const rs = els.map((el) => el.getBoundingClientRect());
    const pad = 10;
    const left = Math.min(...rs.map((r) => r.left)) - pad;
    const top = Math.min(...rs.map((r) => r.top)) - pad;
    const right = Math.max(...rs.map((r) => r.right)) + pad;
    const bottom = Math.max(...rs.map((r) => r.bottom)) + pad;
    return {
      x: Math.max(0, left),
      y: Math.max(0, top),
      width: Math.min(window.innerWidth, right) - Math.max(0, left),
      height: Math.min(window.innerHeight, bottom) - Math.max(0, top),
    };
  });
  if (!box || box.width < 8 || box.height < 8) { fail(`${name} missing patron rail`); return; }
  await page.screenshot({ path: path.join(ART, `${name}.png`), clip: box });
}

async function measure(page, fileStem, { w, h }) {
  fs.mkdirSync(ART, { recursive: true });
  await page.screenshot({ path: path.join(ART, `${fileStem}.png`), fullPage: false });
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
    midGapPct: m.midGapPct,
    peakPct: m.peakPct,
    ringMaxOffset: m.ringMaxOffset,
    usesNearHourglass: m.usesNearHourglass,
    usesAtCorner: m.usesAtCorner,
    oppResToCards: m.oppResToCards,
    youResToCards: m.youResToCards,
    hits: m.hits,
    tavernDiscard: m.tavernDiscard,
    medallions: m.medallions,
    pointedTips: m.pointedTips,
    treasuryHasTip: snap.treasuryHasTip,
    moraHasTip: snap.moraHasTip,
    landscapeBanner: snap.landscapeBanner,
    patrons: snap.patrons?.map(p => ({ id: p.id, favor: p.favor, tip: p.tip, tipless: p.tipless, rot: p.rot })),
  };

  if (m.tavernDiscard) fail(`${fileStem} tavern discard still present`, notes);
  if (m.viewportTavernPct < 72) fail(`${fileStem} tavern ${m.viewportTavernPct}% < 72%`, notes);
  if ((m.cardH || 0) < 52) fail(`${fileStem} tavern cards too short (${m.cardH}px)`, notes);
  if ((m.medallions || 0) < 5) fail(`${fileStem} expected 5 medallions`, notes);
  if (snap.treasuryHasTip) fail(`${fileStem} Treasury has a tip`, notes);
  if (snap.moraHasTip) fail(`${fileStem} Mora has a tip`, notes);
  if (snap.landscapeBanner) fail(`${fileStem} landscape banner still on the match felt`, notes);
  const pointed = (snap.patrons || []).filter(p => p.id !== 'treasury' && p.id !== 'mora');
  if (!pointed.length || pointed.some(p => !p.tip || p.tipless)) fail(`${fileStem} pointed patrons missing gothic tip`, notes);
  if (w < h) {
    if (m.topBandPct > 8 || m.botBandPct > 8) fail(`${fileStem} empty portrait bands T/B ${m.topBandPct}/${m.botBandPct}`, notes);
    if ((m.midGapPct || 0) > 14) fail(`${fileStem} tavern-to-hand gap ${m.midGapPct}% tightened vs 41 (need ≤14%)`, notes);
    if ((m.oppResToCards || 0) > 56) fail(`${fileStem} opp res-to-tavern ${m.oppResToCards}px (need pack toward center)`, notes);
    if ((m.youResToCards || 0) > 48) fail(`${fileStem} you res-to-tavern ${m.youResToCards}px (need pack toward center)`, notes);
  } else {
    if (m.leftGutterPct > 10) fail(`${fileStem} landscape left gutter ${m.leftGutterPct}%`, notes);
  }
  if (m.peakPct == null || m.peakPct < 7 || m.peakPct > 14) {
    fail(`${fileStem} peak ${m.peakPct}% of diameter (need ≈10%, gate 7–14)`, notes);
  }
  if (m.ringMaxOffset == null || m.ringMaxOffset > 2.2) {
    fail(`${fileStem} ring offset ${m.ringMaxOffset}px from portrait (need ≤2px)`, { ringAlign: m.ringAlign, notes });
  }
  if (m.usesAtCorner) fail(`${fileStem} patron-use octagons at screen corners`, notes);
  if (!m.usesNearHourglass) fail(`${fileStem} patron-use octagons not on the right rail`, notes);
  if (m.hits) {
    for (const [k, v] of Object.entries(m.hits)) {
      if (v) fail(`${fileStem} overlap ${k}`, notes);
    }
  }
  console.log('ok ', JSON.stringify(notes));
  return notes;
}

async function favorSet(page, map) {
  return page.evaluate((pairs) => {
    for (const [pid, v] of pairs) window.__totTest.setFavor(pid, v);
    return window.__totTest.snapshot().patrons.map(p => ({ id: p.id, favor: p.favor, rot: p.rot, tipless: p.tipless }));
  }, Object.entries(map));
}

const results = {};

const portPage = await browser.newPage();
await portPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(portPage);
results.portrait = await measure(portPage, 'portrait-390x844', { w: 390, h: 844 });
await shotRail(portPage, 'portrait-rail-neutral');
await shotCoin(portPage, 'portrait-ring-crows-neutral', 'crows');
await shotCoin(portPage, 'portrait-ring-treasury-tipless', 'treasury');
await favorSet(portPage, { pelin: 1, hlaalu: 0, crows: 0, celarus: 0 });
await new Promise(r => setTimeout(r, 700));
await shotRail(portPage, 'portrait-rail-fav-you');
await shotCoin(portPage, 'portrait-ring-pelin-fav-you', 'pelin');
{
  const rot = await portPage.evaluate(() => window.__totTest.layout());
  if ((rot.ringMaxOffset ?? 99) > 2.2) fail('portrait fav-you ring offset', rot.ringAlign);
}
await favorSet(portPage, { pelin: -1, hlaalu: 0, crows: 0, celarus: 0 });
await new Promise(r => setTimeout(r, 700));
await shotRail(portPage, 'portrait-rail-fav-opp');
await shotCoin(portPage, 'portrait-ring-pelin-fav-opp', 'pelin');
{
  const rot = await portPage.evaluate(() => window.__totTest.layout());
  if ((rot.ringMaxOffset ?? 99) > 2.2) fail('portrait fav-opp ring offset', rot.ringAlign);
}
await portPage.close();

const landPage = await browser.newPage();
await landPage.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(landPage);
results.landscape = await measure(landPage, 'landscape-844x390', { w: 844, h: 390 });
await shotRail(landPage, 'landscape-rail-neutral');
await shotCoin(landPage, 'landscape-ring-crows-neutral', 'crows');
const youState = await favorSet(landPage, { pelin: 1, hlaalu: 0, crows: 0, celarus: 0 });
console.log('landscape fav-you', JSON.stringify(youState));
await new Promise(r => setTimeout(r, 700));
await shotRail(landPage, 'landscape-rail-fav-you');
await shotCoin(landPage, 'landscape-ring-pelin-fav-you', 'pelin');
{
  const rot = await landPage.evaluate(() => window.__totTest.layout());
  if ((rot.ringMaxOffset ?? 99) > 2.2) fail('landscape fav-you ring offset', rot.ringAlign);
}
const oppState = await favorSet(landPage, { pelin: -1, hlaalu: 0, crows: 0, celarus: 0 });
console.log('landscape fav-opp', JSON.stringify(oppState));
await new Promise(r => setTimeout(r, 700));
await shotRail(landPage, 'landscape-rail-fav-opp');
await shotCoin(landPage, 'landscape-ring-pelin-fav-opp', 'pelin');
{
  const rot = await landPage.evaluate(() => window.__totTest.layout());
  if ((rot.ringMaxOffset ?? 99) > 2.2) fail('landscape fav-opp ring offset', rot.ringAlign);
}
await landPage.close();

const pelinYou = youState.find(p => p.id === 'pelin');
const pelinOpp = oppState.find(p => p.id === 'pelin');
const treas = youState.find(p => p.id === 'treasury');
if (pelinYou?.favor !== 'favored') fail('pelin fav-you not favored', pelinYou);
if (pelinOpp?.favor !== 'unfavored') fail('pelin fav-opp not unfavored', pelinOpp);
if (treas && treas.rot !== 'none') fail('treasury rotated', treas);

const note = [
  'Build 42 board-pass measurements',
  `portrait 390x844: tavern ${results.portrait.tavernW}px = ${results.portrait.viewportTavernPct}% vw`,
  `  empty bands T/B ${results.portrait.topBandPct}% / ${results.portrait.botBandPct}% (need ≤8%)`,
  `  tavern-to-hand gap ${results.portrait.midGapPct}% (need ≤14%)`,
  `  res-to-cards opp/you ${results.portrait.oppResToCards}/${results.portrait.youResToCards}px`,
  `  ring offset ${results.portrait.ringMaxOffset}px (need ≤2)`,
  `  uses near hg ${results.portrait.usesNearHourglass} corner ${results.portrait.usesAtCorner}`,
  `  peak ${results.portrait.peakPct}% of diameter (need ≈10%)`,
  `  tavern discard: ${results.portrait.tavernDiscard}  banner: ${results.portrait.landscapeBanner}`,
  `  medallions ${results.portrait.medallions}, gothic tips ${results.portrait.pointedTips}, Treasury tip ${results.portrait.treasuryHasTip}`,
  `landscape 844x390: tavern ${results.landscape.tavernW}px = ${results.landscape.viewportTavernPct}% vw (need ≥72%)`,
  `  gutters L/R ${results.landscape.leftGutterPct}% / ${results.landscape.rightGutterPct}%`,
  `  ring offset ${results.landscape.ringMaxOffset}px  uses near hg ${results.landscape.usesNearHourglass}`,
  `  tavern discard: ${results.landscape.tavernDiscard}  banner: ${results.landscape.landscapeBanner}`,
  `  medallions ${results.landscape.medallions}, gothic tips ${results.landscape.pointedTips}, Treasury tip ${results.landscape.treasuryHasTip}`,
  `pelin fav-you ${pelinYou?.favor} rot=${pelinYou?.rot}`,
  `pelin fav-opp ${pelinOpp?.favor} rot=${pelinOpp?.rot}`,
  `treasury rot=${treas?.rot}`,
].join('\n');
fs.writeFileSync(path.join(ART, 'board-pass-measurements.txt'), note + '\n');
console.log(note);

await browser.close();
server.close();
if (process.exitCode) process.exit(process.exitCode);
console.log('BOARD PASS GATE OK');
