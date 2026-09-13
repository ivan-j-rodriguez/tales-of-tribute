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
const { server, port } = await serve();
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
async function ready(page) {
  await page.goto(`http://127.0.0.1:${port}/?test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__totTest, { timeout: 20000 });
  await page.evaluate(() => window.__totTest.startQuick());
  await page.waitForFunction(() => window.__totTest.snapshot().hand > 0, { timeout: 8000 });
  await new Promise(r => setTimeout(r, 300));
}

async function shot(name, page) {
  const dest = `/opt/cursor/artifacts/${name}.png`;
  await page.screenshot({ path: dest });
  await page.screenshot({ path: `/workspace/${name}.png` });
}

const land = await browser.newPage();
await land.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(land);
const before = await land.evaluate(() => ({
  snap: window.__totTest.snapshot(),
  zones: window.__totTest.zones(),
  lift: window.__totTest.liftOpen(),
  gate: window.__totTest.rotateGate(),
  fill: window.__totTest.boardFill(),
  tip: window.__totTest.portraitTip(),
}));
await shot('phone-landscape-844x390', land);
await land.evaluate(() => window.__totTest.tapCard('#hand-zone .card[data-id="gold"]'));
await new Promise(r => setTimeout(r, 750));
const afterTap = await land.evaluate(() => ({
  lift: window.__totTest.liftOpen(),
  hand: window.__totTest.snapshot().hand,
  coin: window.__totTest.snapshot().coin,
}));
if (afterTap.hand === before.snap.hand) {
  await land.evaluate(() => window.__totTest.playFirstGold());
  await new Promise(r => setTimeout(r, 750));
}
const after = await land.evaluate(() => ({
  snap: window.__totTest.snapshot(),
  zones: window.__totTest.zones(),
  lift: window.__totTest.liftOpen(),
}));
await shot('phone-landscape-844x390-after-play', land);
const shift = Object.keys(before.zones).map((k) => {
  const a = before.zones[k], b = after.zones[k];
  if (!a || !b) return { k, miss: true };
  return { k, dx: b.x - a.x, dy: b.y - a.y, dw: b.w - a.w, dh: b.h - a.h };
});
console.log('before', JSON.stringify(before, null, 2));
console.log('afterTap', JSON.stringify(afterTap));
console.log('after', JSON.stringify(after, null, 2));
console.log('shift', JSON.stringify(shift));
const fill = before.fill || {};
if ((fill.bw || 0) < (fill.mw || 999) * 0.96 || (fill.bh || 0) < (fill.mh || 999) * 0.96) {
  console.error('FAIL landscape not full-bleed', fill);
  process.exitCode = 1;
}
await land.close();

const portShot = await browser.newPage();
await portShot.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(portShot);
const portrait = await portShot.evaluate(() => ({
  gate: window.__totTest.rotateGate(),
  tip: window.__totTest.portraitTip(),
  fill: window.__totTest.boardFill(),
  zones: window.__totTest.zones(),
}));
await shot('phone-portrait-playable', portShot);
console.log('portrait', JSON.stringify(portrait));
if (portrait.gate || !portrait.tip || (portrait.fill?.bh || 0) < 400) {
  console.error('FAIL portrait not playable', portrait);
  process.exitCode = 1;
}
if (!portrait.zones?.['#tavern-zone']?.h || !portrait.zones?.['#hand-zone']?.h) {
  console.error('FAIL portrait missing table zones', portrait.zones);
  process.exitCode = 1;
}
await portShot.close();

const small = await browser.newPage();
await small.setViewport({ width: 667, height: 375, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(small);
await shot('phone-landscape-667x375', small);
await small.close();
await browser.close();
server.close();
