/**
 * Build 53 layout-fb gate + before/after artifacts.
 * Portrait 390×844 locked to build 51 packing.
 * Landscape 844×390: SFX/settings/Leave horizontal between you-DRAW and
 * the hand; you-hand hexes zoomed in from build 52 but fully on-canvas
 * with felt air. Left DRAW/DECK/DRAW art+labels fully on-canvas.
 * Zero getBoundingClientRect intersection for Ivan's overlap pairs.
 * Also: tavern mid on vw/2, hand mid on vw/2, pendant colinear X,
 * DRAW/CD labels under four corner piles, portrait left strip high,
 * End Turn bottom-left, yellow felt orbs gone, patron column left of
 * build 50, middle patron circle clear of neighbors, DECK left of tavern
 * + vertically centered on the tavern band, pile stacks use card-back.svg,
 * playable / End Turn gold glow present.
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

async function paintMidline(page, on, zone = 'hand') {
  await page.evaluate((show, which) => {
    document.getElementById('tot-review-midline')?.remove();
    if (!show) return;
    const line = document.createElement('div');
    line.id = 'tot-review-midline';
    line.style.cssText = 'position:fixed;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:#e11;z-index:99999;pointer-events:none;';
    const sel = which === 'tavern'
      ? '#tavern-zone > .card, #tavern-zone > button.card'
      : '#hand-zone > .card, #hand-zone > button.card';
    const cards = [...document.querySelectorAll(sel)];
    const mid = cards.length % 2 === 1 ? cards[(cards.length - 1) / 2] : null;
    if (mid) {
      const r = mid.getBoundingClientRect();
      const dot = document.createElement('div');
      dot.style.cssText = `position:fixed;left:${r.left + r.width / 2 - 5}px;top:${r.top - 5}px;width:10px;height:10px;border-radius:50%;background:#e11;z-index:100000;pointer-events:none;`;
      line.appendChild(dot);
    }
    document.body.appendChild(line);
  }, on, zone);
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
    ringMaxOffset: m.ringMaxOffset,
    usesNearHourglass: m.usesNearHourglass,
    usesAtCorner: m.usesAtCorner,
    usesOnRightRail: m.usesOnRightRail,
    drawLeftEdge: m.drawLeftEdge,
    cdRightGap: m.cdRightGap,
    hudIsLeftStrip: m.hudIsLeftStrip,
    hudIsLandscapeChrome: m.hudIsLandscapeChrome,
    endTurnBottomLeft: m.endTurnBottomLeft,
    hudTop: m.hudTop,
    youHandCount: m.youHandCount,
    youHandMidX: m.youHandMidX,
    youHandMidDx: m.youHandMidDx,
    tavernMidX: m.tavernMidX,
    tavernMidDx: m.tavernMidDx,
    pendantCenterSpread: m.pendantCenterSpread,
    drawLabelUnder: m.drawLabelUnder,
    cdLabelUnder: m.cdLabelUnder,
    deckLabelUnder: m.deckLabelUnder,
    leftPilesOnCanvas: m.leftPilesOnCanvas,
    rightPilesOnCanvas: m.rightPilesOnCanvas,
    tavernCardsOnCanvas: m.tavernCardsOnCanvas,
    handCardsOnCanvas: m.handCardsOnCanvas,
    leftPileMinX: m.leftPileMinX,
    rightPileMaxRight: m.rightPileMaxRight,
    tavernCardClip: m.tavernCardClip,
    handCardClip: m.handCardClip,
    yellowOrbGone: m.yellowOrbGone,
    patronColX: m.patronColX,
    patronColLeftOf50: m.patronColLeftOf50,
    pendantFaceGaps: m.pendantFaceGaps,
    middlePatronGapMin: m.middlePatronGapMin,
    middlePatronClear: m.middlePatronClear,
    deckLeftOfTavern: m.deckLeftOfTavern,
    deckTavernMidDy: m.deckTavernMidDy,
    deckBesideTavern: m.deckBesideTavern,
    oppDrawIsCorner: m.oppDrawIsCorner,
    pileUsesCardBack: m.pileUsesCardBack,
    playableGlowOn: m.playableGlowOn,
    endTurnGlowOn: m.endTurnGlowOn,
    treasuryCircle: m.treasuryCircle,
    treasuryDialBox: m.treasuryDialBox,
    treasuryFaceBox: m.treasuryFaceBox,
    treasurySvgBox: m.treasurySvgBox,
    oppHandMidDx: m.oppHandMidDx,
    oppResToCards: m.oppResToCards,
    youResToCards: m.youResToCards,
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
  if (snap.moraHasTip) fail(`${fileStem} Mora has a tip`, notes);
  if (snap.landscapeBanner) fail(`${fileStem} landscape banner still on the match felt`, notes);
  const pointed = (snap.patrons || []).filter(p => p.id !== 'treasury' && p.id !== 'mora');
  if (!pointed.length || pointed.some(p => !p.tip || p.tipless)) fail(`${fileStem} pointed patrons missing gothic tip`, notes);
  if (w < h) {
    if (m.topBandPct > 8 || m.botBandPct > 8) fail(`${fileStem} empty portrait bands T/B ${m.topBandPct}/${m.botBandPct}`, notes);
    if ((m.midGapPct || 0) > 14) fail(`${fileStem} tavern-to-hand gap ${m.midGapPct}% (need ≤14%)`, notes);
    if ((m.oppResToCards || 0) > 56) fail(`${fileStem} opp res-to-tavern ${m.oppResToCards}px`, notes);
    if ((m.youResToCards || 0) > 48) fail(`${fileStem} you res-to-tavern ${m.youResToCards}px`, notes);
  } else {
    if (m.leftGutterPct > 10) fail(`${fileStem} landscape left gutter ${m.leftGutterPct}%`, notes);
  }
  if (m.peakPct == null || m.peakPct < 7 || m.peakPct > 14) {
    fail(`${fileStem} peak ${m.peakPct}% of diameter (need ≈10%, gate 7–14)`, notes);
  }
  if (m.ringMaxOffset == null || m.ringMaxOffset > 2.2) fail(`${fileStem} ring offset ${m.ringMaxOffset}px`, notes);
  if (m.usesAtCorner) fail(`${fileStem} patron-use octagons at screen corners`, notes);
  if (!m.usesNearHourglass) fail(`${fileStem} patron-use octagons not on the right rail`, notes);

  if (TAG !== 'before') {
    if (w < h) {
      if ((m.drawLeftEdge ?? 99) > 8) fail(`${fileStem} DRAW not at left edge (${m.drawLeftEdge}px)`, notes);
      if ((m.cdRightGap ?? 99) > 12) fail(`${fileStem} COOLDOWN not at right edge (gap ${m.cdRightGap}px)`, notes);
      if ((m.cdRightGap ?? 0) < -2) fail(`${fileStem} COOLDOWN clipped past the right edge (gap ${m.cdRightGap}px)`, notes);
      if (!m.hudIsLeftStrip) fail(`${fileStem} match-actions not a mid-left vertical strip`, notes);
      if (!m.endTurnBottomLeft) fail(`${fileStem} End Turn not bottom-left under the left strip`, notes);
      if (m.youHandCount !== 5) fail(`${fileStem} expected opening 5-card hand (got ${m.youHandCount})`, notes);
      if (m.youHandMidDx == null || Math.abs(m.youHandMidDx) > 4) {
        fail(`${fileStem} hand mid-card top not on vertical center (dx ${m.youHandMidDx}px, need ≤4)`, notes);
      }
      if (m.tavernMidDx == null || Math.abs(m.tavernMidDx) > 4) {
        fail(`${fileStem} tavern mid-card top not on vertical center (dx ${m.tavernMidDx}px, need ≤4)`, notes);
      }
      if (m.pendantCenterSpread == null || m.pendantCenterSpread > 4) {
        fail(`${fileStem} patron pendant centers not colinear (spread ${m.pendantCenterSpread}px, need ≤4)`, notes);
      }
      if (!m.drawLabelUnder) fail(`${fileStem} DRAW labels not under the four-corner pile graphics`, notes);
      if (!m.cdLabelUnder) fail(`${fileStem} COOLDOWN labels not under the four-corner pile graphics`, notes);
      if (!m.yellowOrbGone) fail(`${fileStem} mystery yellow felt orb still visible`, notes);
      if (!m.patronColLeftOf50) fail(`${fileStem} patron column not left of build-50 baseline (x ${m.patronColX})`, notes);
      if (!m.middlePatronClear) fail(`${fileStem} middle patron circle still overlapping neighbors (gaps ${JSON.stringify(m.pendantFaceGaps)} min ${m.middlePatronGapMin})`, notes);
      if (!m.deckLeftOfTavern) fail(`${fileStem} DECK not left of tavern cards`, notes);
      if (!m.deckBesideTavern) fail(`${fileStem} DECK not vertically centered with tavern (dy ${m.deckTavernMidDy})`, notes);
      if (!m.oppDrawIsCorner) fail(`${fileStem} opp DRAW left the top-left corner`, notes);
      if (!m.pileUsesCardBack) fail(`${fileStem} pile stacks missing card-back art (${m.pileBg})`, notes);
      if (!m.playableGlowOn) fail(`${fileStem} playable-card gold glow missing`, notes);
      if (!m.endTurnGlowOn) fail(`${fileStem} End Turn gold glow missing`, notes);
      if (!m.treasuryCircle) fail(`${fileStem} Treasury not a 1:1 circle (dial ${JSON.stringify(m.treasuryDialBox)} face ${JSON.stringify(m.treasuryFaceBox)} svg ${JSON.stringify(m.treasurySvgBox)})`, notes);
      if (m.oppHandCount >= 3 && m.oppHandMidDx != null && Math.abs(m.oppHandMidDx) > 8) {
        fail(`${fileStem} opp hand mid-card off vertical center (dx ${m.oppHandMidDx}px)`, notes);
      }
      /* Build 49 portrait strip sat at top:44% ≈ 371px. Need a further lift toward top-left. */
      if ((m.hudTop ?? 99) > 260) fail(`${fileStem} left strip not shifted up (hudTop ${m.hudTop}, build49 was ~371)`, notes);
      /* Build 51 portrait lock — packing must not drift. */
      const B51 = { patronColX: 328, drawLeftEdge: 6, hudTop: 168.8, treasuryFace: 24.63 };
      if (m.patronColX == null || Math.abs(m.patronColX - B51.patronColX) > 2) {
        fail(`${fileStem} portrait patron col drifted from build 51 (x ${m.patronColX}, need ~${B51.patronColX})`, notes);
      }
      if (m.drawLeftEdge == null || Math.abs(m.drawLeftEdge - B51.drawLeftEdge) > 1) {
        fail(`${fileStem} portrait DRAW left drifted from build 51 (${m.drawLeftEdge})`, notes);
      }
      if (m.hudTop == null || Math.abs(m.hudTop - B51.hudTop) > 2) {
        fail(`${fileStem} portrait hudTop drifted from build 51 (${m.hudTop})`, notes);
      }
      const faceW = m.treasuryFaceBox?.w;
      if (faceW == null || Math.abs(faceW - B51.treasuryFace) > 0.6) {
        fail(`${fileStem} portrait Treasury face drifted from build 51 (${JSON.stringify(m.treasuryFaceBox)})`, notes);
      }
    } else {
      if ((m.cdRightGap ?? 99) > 130) fail(`${fileStem} landscape COOLDOWN still far from right (gap ${m.cdRightGap}px)`, notes);
      if ((m.cdRightGap ?? 0) < -2) fail(`${fileStem} landscape COOLDOWN clipped past the right edge (gap ${m.cdRightGap}px)`, notes);
      if (!m.hudIsLandscapeChrome) fail(`${fileStem} landscape match-actions not between you-DRAW and the hand`, notes);
      if (m.hudIsLeftStrip) fail(`${fileStem} landscape match-actions still a vertical left strip`, notes);
      if (m.youHandCount !== 5) fail(`${fileStem} expected opening 5-card hand (got ${m.youHandCount})`, notes);
      if (m.youHandMidDx == null || Math.abs(m.youHandMidDx) > 4) {
        fail(`${fileStem} landscape hand mid-card top not on vertical center (dx ${m.youHandMidDx}px, need ≤4)`, notes);
      }
      if (m.tavernMidDx == null || Math.abs(m.tavernMidDx) > 4) {
        fail(`${fileStem} landscape tavern mid-card top not on vertical center (dx ${m.tavernMidDx}px, need ≤4)`, notes);
      }
      if (m.pendantCenterSpread == null || m.pendantCenterSpread > 4) {
        fail(`${fileStem} landscape patron pendant centers not colinear (spread ${m.pendantCenterSpread}px, need ≤4)`, notes);
      }
      if (!m.yellowOrbGone) fail(`${fileStem} landscape mystery yellow felt orb still visible`, notes);
      if (!m.patronColLeftOf50) fail(`${fileStem} landscape patron column not left of build-50 (x ${m.patronColX})`, notes);
      if (!m.middlePatronClear) fail(`${fileStem} landscape middle patron circle overlapping neighbors (gaps ${JSON.stringify(m.pendantFaceGaps)})`, notes);
      if (!m.deckLeftOfTavern) fail(`${fileStem} landscape DECK not left of tavern cards`, notes);
      if (!m.deckBesideTavern) fail(`${fileStem} landscape DECK not vertically centered with tavern (dy ${m.deckTavernMidDy})`, notes);
      if (!m.pileUsesCardBack) fail(`${fileStem} landscape pile stacks missing card-back art (${m.pileBg})`, notes);
      if (!m.playableGlowOn) fail(`${fileStem} landscape playable-card gold glow missing`, notes);
      if (!m.endTurnGlowOn) fail(`${fileStem} landscape End Turn gold glow missing`, notes);
      if (!m.treasuryCircle) fail(`${fileStem} landscape Treasury not a 1:1 circle (dial ${JSON.stringify(m.treasuryDialBox)} face ${JSON.stringify(m.treasuryFaceBox)} svg ${JSON.stringify(m.treasurySvgBox)})`, notes);
      if ((m.drawLeftEdge ?? 0) < 36) fail(`${fileStem} landscape DRAW still flush to the left (${m.drawLeftEdge}, need ≥36px felt gutter)`, notes);
      if ((m.drawLeftEdge ?? 99) > 64) fail(`${fileStem} landscape DRAW shifted too far inward (${m.drawLeftEdge})`, notes);
      if ((m.leftPileMinX ?? -1) < 28) fail(`${fileStem} landscape left pile art/label still flush (minX ${m.leftPileMinX}, need ≥28)`, notes);
      if ((m.rightPileMaxRight ?? 999) > w + 0.5) fail(`${fileStem} landscape right COOLDOWN clipped (maxRight ${m.rightPileMaxRight} vw ${w})`, notes);
      if (!m.leftPilesOnCanvas) fail(`${fileStem} landscape left DRAW/DECK/DRAW art+labels not fully on-canvas (minX ${m.leftPileMinX})`, notes);
      if (!m.rightPilesOnCanvas) fail(`${fileStem} landscape right COOLDOWN art+labels not fully on-canvas (maxRight ${m.rightPileMaxRight})`, notes);
      if (!m.tavernCardsOnCanvas) fail(`${fileStem} landscape tavern cards clipped (${JSON.stringify(m.tavernCardClip)} vh 390 vw ${w})`, notes);
      if (!m.handCardsOnCanvas) fail(`${fileStem} landscape hand hexes clipped (${JSON.stringify(m.handCardClip)} vh 390 vw ${w})`, notes);
      if ((m.handCardClip?.maxBottom ?? 999) > 390 - 10) {
        fail(`${fileStem} landscape hand hex tips still tight to the bottom (${JSON.stringify(m.handCardClip)} need felt air under tips)`, notes);
      }
      if ((m.handCardClip?.h ?? 0) < 54) {
        fail(`${fileStem} landscape hand still tiny (${JSON.stringify(m.handCardClip)} need hex h ≥54)`, notes);
      }
      if ((m.youResToCards ?? 0) < 12) {
        fail(`${fileStem} landscape tavern hexes tight to you-res (${m.youResToCards}px, need ≥12)`, notes);
      }
      if ((m.oppResToCards ?? 0) < 16) {
        fail(`${fileStem} landscape tavern hexes tight to opp-res (${m.oppResToCards}px, need ≥16)`, notes);
      }
      if (!m.drawLabelUnder) fail(`${fileStem} landscape DRAW labels not under the pile graphics`, notes);
      if (!m.cdLabelUnder) fail(`${fileStem} landscape COOLDOWN labels not under the pile graphics`, notes);
      if (!m.deckLabelUnder) fail(`${fileStem} landscape DECK label not under the pile graphic`, notes);
    }
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
    'hudVsDeck',
    'hudVsYouDraw',
    'endTurnVsYouDraw',
    'endTurnVsHud',
    'handVsYouDraw',
    'handVsYouCd',
    'handVsHud',
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
await closeUp(portPage, `${TAG}-portrait-draw-left`, [pBoxes.oppDraw, pBoxes.youDraw, pBoxes.deck], 390, 844);
await closeUp(portPage, `${TAG}-portrait-cd-right`, [pBoxes.oppCd, pBoxes.youCd], 390, 844);
await closeUp(portPage, `${TAG}-portrait-left-strip`, [pBoxes.leaveHud, pBoxes.endTurn, pBoxes.youDraw], 390, 844);
const treasuryBox = await portPage.evaluate(() => {
  const el = document.querySelector('#rail-patrons .patron-coin[data-pid="treasury"], #rail-patrons .patron-coin.treasury');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await closeUp(portPage, `${TAG}-portrait-treasury`, [treasuryBox], 390, 844);
await paintMidline(portPage, true, 'hand');
await portPage.screenshot({ path: path.join(ART, `${TAG}-portrait-hand-center.png`), fullPage: false });
await paintMidline(portPage, true, 'tavern');
await portPage.screenshot({ path: path.join(ART, `${TAG}-portrait-tavern-center.png`), fullPage: false });
await paintMidline(portPage, false);
await closeUp(portPage, `${TAG}-portrait-pendants`, [pBoxes.patronsCluster, pBoxes.patronRail], 390, 844);
await closeUp(portPage, `${TAG}-portrait-four-corners`, [pBoxes.oppDraw, pBoxes.youDraw, pBoxes.oppCd, pBoxes.youCd], 390, 844);
await closeUp(portPage, `${TAG}-portrait-end-turn-bl`, [pBoxes.endTurn, pBoxes.youDraw, pBoxes.leaveHud], 390, 844);
await closeUp(portPage, `${TAG}-portrait-deck-beside-tavern`, [pBoxes.deck, pBoxes.tavern, pBoxes.oppDraw], 390, 844);
await closeUp(portPage, `${TAG}-portrait-pile-backs`, [pBoxes.oppDrawStack || pBoxes.oppDraw, pBoxes.youDrawStack || pBoxes.youDraw, pBoxes.deck], 390, 844);
await closeUp(portPage, `${TAG}-portrait-deck-back`, [pBoxes.deck], 390, 844);
const handGlowBox = await portPage.evaluate(() => {
  const cards = [...document.querySelectorAll('#hand-zone .card.playable, #hand-zone .card.affordable')];
  if (!cards.length) return null;
  const rs = cards.map((el) => el.getBoundingClientRect());
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  const right = Math.max(...rs.map((r) => r.right));
  const bottom = Math.max(...rs.map((r) => r.bottom));
  return { x, y, w: right - x, h: bottom - y };
});
await closeUp(portPage, `${TAG}-portrait-gold-glow`, [pBoxes.endTurn, handGlowBox], 390, 844);

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
if (!/Acquire a card from the Tavern that costs up to 5 Coin|Gain 2 Coin/i.test(pFit.tipText || '')) {
  fail('portrait inspect missing official play text', pFit);
}
if (pFit.sheet) await closeUp(portPage, `${TAG}-portrait-inspect-sheet`, [pFit.sheet], 390, 844);
await portPage.close();

const landPage = await browser.newPage();
await landPage.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(landPage);
results.landscape = await measure(landPage, `${TAG}-landscape-844x390`, { w: 844, h: 390 });
const lBoxes = results.landscape.boxes;
await closeUp(landPage, `${TAG}-landscape-deck-beside-tavern`, [lBoxes.deck, lBoxes.tavern, lBoxes.oppDraw], 844, 390);
await closeUp(landPage, `${TAG}-landscape-tavern-vs-piles`, [lBoxes.tavern, lBoxes.deck, lBoxes.oppDraw, lBoxes.youDraw], 844, 390);
await closeUp(landPage, `${TAG}-landscape-left-gutter`, [lBoxes.oppDraw, lBoxes.deck, lBoxes.youDraw, lBoxes.events], 844, 390);
await closeUp(landPage, `${TAG}-landscape-right-gutter`, [lBoxes.patronRail, lBoxes.endTurn, lBoxes.oppCd, lBoxes.youCd], 844, 390);
await paintMidline(landPage, true, 'hand');
await landPage.screenshot({ path: path.join(ART, `${TAG}-landscape-hand-center.png`), fullPage: false });
await paintMidline(landPage, true, 'tavern');
await landPage.screenshot({ path: path.join(ART, `${TAG}-landscape-tavern-center.png`), fullPage: false });
await paintMidline(landPage, false);
await closeUp(landPage, `${TAG}-landscape-left-piles`, [lBoxes.oppDraw, lBoxes.deck, lBoxes.youDraw], 844, 390);
await closeUp(landPage, `${TAG}-landscape-right-cds`, [lBoxes.oppCd, lBoxes.youCd], 844, 390);
const landHandBox = await landPage.evaluate(() => {
  const cards = [...document.querySelectorAll('#hand-zone > .card, #hand-zone > button.card')];
  if (!cards.length) return null;
  const rs = cards.map((el) => el.getBoundingClientRect());
  return {
    x: Math.min(...rs.map((r) => r.x)),
    y: Math.min(...rs.map((r) => r.y)),
    w: Math.max(...rs.map((r) => r.right)) - Math.min(...rs.map((r) => r.x)),
    h: Math.max(...rs.map((r) => r.bottom)) - Math.min(...rs.map((r) => r.y)),
  };
});
await closeUp(landPage, `${TAG}-landscape-hand-hexes`, [landHandBox], 844, 390);
await closeUp(landPage, `${TAG}-landscape-chrome-draw-hand`, [lBoxes.youDraw, lBoxes.leaveHud, landHandBox], 844, 390);
const landTavernBox = await landPage.evaluate(() => {
  const cards = [...document.querySelectorAll('#tavern-zone > .card, #tavern-zone > button.card')];
  if (!cards.length) return null;
  const rs = cards.map((el) => el.getBoundingClientRect());
  return {
    x: Math.min(...rs.map((r) => r.x)),
    y: Math.min(...rs.map((r) => r.y)),
    w: Math.max(...rs.map((r) => r.right)) - Math.min(...rs.map((r) => r.x)),
    h: Math.max(...rs.map((r) => r.bottom)) - Math.min(...rs.map((r) => r.y)),
  };
});
await closeUp(landPage, `${TAG}-landscape-tavern-hexes`, [landTavernBox], 844, 390);

await landPage.evaluate(() => window.__totTest.inspectById('customs-seizure') || window.__totTest.inspectById('toll-of-flesh'));
await new Promise(r => setTimeout(r, 420));
await landPage.screenshot({ path: path.join(ART, `${TAG}-landscape-inspect.png`), fullPage: false });
const lFit = await landPage.evaluate(() => window.__totTest.inspectFit());
if (!lFit.hexOn) fail('landscape inspect hex clipped', lFit);
if (!lFit.textOn) fail('landscape inspect text clipped', lFit);
if (!lFit.nameOn) fail('landscape inspect name clipped', lFit);
if (lFit.sheet && !lFit.sheetOn) fail('landscape inspect sheet clipped', lFit);
if (lFit.titleClipped) fail('landscape inspect title clipped', lFit);
if (!/Acquire a card from the Tavern that costs up to 5 Coin|Gain 2 Coin/i.test(lFit.tipText || '')) {
  fail('landscape inspect missing official play text', lFit);
}
if (lFit.sheet) await closeUp(landPage, `${TAG}-landscape-inspect-sheet`, [lFit.sheet], 844, 390);
await landPage.close();

const note = [
  `Build 53 layout-fb (${TAG})`,
  `portrait 390x844: tavern ${results.portrait.notes.tavernW}px = ${results.portrait.notes.viewportTavernPct}% vw`,
  `  DRAW left ${results.portrait.notes.drawLeftEdge}px  CD right-gap ${results.portrait.notes.cdRightGap}px`,
  `  hud strip ${results.portrait.notes.hudIsLeftStrip}  hudTop ${results.portrait.notes.hudTop}  endTurn BL ${results.portrait.notes.endTurnBottomLeft}`,
  `  hand n=${results.portrait.notes.youHandCount} midX ${results.portrait.notes.youHandMidX} dx ${results.portrait.notes.youHandMidDx}  oppDx ${results.portrait.notes.oppHandMidDx}`,
  `  tavern midX ${results.portrait.notes.tavernMidX} dx ${results.portrait.notes.tavernMidDx}  pendants Δx ${results.portrait.notes.pendantCenterSpread}`,
  `  labels DRAW ${results.portrait.notes.drawLabelUnder} CD ${results.portrait.notes.cdLabelUnder}  orbGone ${results.portrait.notes.yellowOrbGone}`,
  `  patrons x ${results.portrait.notes.patronColX} leftOf50 ${results.portrait.notes.patronColLeftOf50} midGap ${results.portrait.notes.middlePatronGapMin} clear ${results.portrait.notes.middlePatronClear}`,
  `  DECK left ${results.portrait.notes.deckLeftOfTavern} dy ${results.portrait.notes.deckTavernMidDy} beside ${results.portrait.notes.deckBesideTavern}  oppDRAW corner ${results.portrait.notes.oppDrawIsCorner}`,
  `  pileBack ${results.portrait.notes.pileUsesCardBack}  playableGlow ${results.portrait.notes.playableGlowOn}  endGlow ${results.portrait.notes.endTurnGlowOn}`,
  `  treasury circle ${results.portrait.notes.treasuryCircle} dial ${JSON.stringify(results.portrait.notes.treasuryDialBox)} face ${JSON.stringify(results.portrait.notes.treasuryFaceBox)}`,
  `  hits ${JSON.stringify(results.portrait.notes.hits)}`,
  `landscape 844x390: tavern ${results.landscape.notes.tavernW}px = ${results.landscape.notes.viewportTavernPct}% vw`,
  `  gutters L/R ${results.landscape.notes.leftGutterPct}% / ${results.landscape.notes.rightGutterPct}%`,
  `  DRAW left ${results.landscape.notes.drawLeftEdge}px  CD right-gap ${results.landscape.notes.cdRightGap}px`,
  `  hud chrome ${results.landscape.notes.hudIsLandscapeChrome}  hand dx ${results.landscape.notes.youHandMidDx}  tavern dx ${results.landscape.notes.tavernMidDx}`,
  `  pendants Δx ${results.landscape.notes.pendantCenterSpread}  orbGone ${results.landscape.notes.yellowOrbGone}`,
  `  patrons x ${results.landscape.notes.patronColX} leftOf50 ${results.landscape.notes.patronColLeftOf50} midGap ${results.landscape.notes.middlePatronGapMin} clear ${results.landscape.notes.middlePatronClear}`,
  `  DECK left ${results.landscape.notes.deckLeftOfTavern} dy ${results.landscape.notes.deckTavernMidDy} beside ${results.landscape.notes.deckBesideTavern}`,
  `  pileBack ${results.landscape.notes.pileUsesCardBack}  playableGlow ${results.landscape.notes.playableGlowOn}  endGlow ${results.landscape.notes.endTurnGlowOn}`,
  `  treasury circle ${results.landscape.notes.treasuryCircle} dial ${JSON.stringify(results.landscape.notes.treasuryDialBox)} face ${JSON.stringify(results.landscape.notes.treasuryFaceBox)}`,
  `  leftPilesOnCanvas ${results.landscape.notes.leftPilesOnCanvas} minX ${results.landscape.notes.leftPileMinX}  rightPilesOnCanvas ${results.landscape.notes.rightPilesOnCanvas} maxRight ${results.landscape.notes.rightPileMaxRight}`,
  `  tavernOnCanvas ${results.landscape.notes.tavernCardsOnCanvas} ${JSON.stringify(results.landscape.notes.tavernCardClip)}`,
  `  handOnCanvas ${results.landscape.notes.handCardsOnCanvas} ${JSON.stringify(results.landscape.notes.handCardClip)}`,
  `  labels DRAW ${results.landscape.notes.drawLabelUnder} DECK ${results.landscape.notes.deckLabelUnder} CD ${results.landscape.notes.cdLabelUnder}`,
  `  hits ${JSON.stringify(results.landscape.notes.hits)}`,
  `inspect portrait: ${JSON.stringify({ name: (pFit.tipText || '').split('\n')[0], play: (pFit.tipText || '').replace(/\s+/g, ' ').slice(0, 180) })}`,
  `inspect landscape: ${JSON.stringify({ name: (lFit.tipText || '').split('\n')[0], play: (lFit.tipText || '').replace(/\s+/g, ' ').slice(0, 180) })}`,
].join('\n');
fs.writeFileSync(path.join(ART, `${TAG}-layout-fb-measurements.txt`), note + '\n');
console.log(note);

await browser.close();
server.close();
if (process.exitCode) process.exit(process.exitCode);
console.log('LAYOUT FB GATE OK');
