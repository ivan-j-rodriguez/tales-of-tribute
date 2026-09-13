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
async function shot(name, { w, h }) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`http://127.0.0.1:${port}/?test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__totTest, { timeout: 20000 });
  await page.evaluate(() => window.__totTest.startQuick());
  await page.waitForFunction(() => window.__totTest.snapshot().hand > 0, { timeout: 8000 });
  if (name.includes('glow')) {
    await page.evaluate(() => {
      const gold = [...document.querySelectorAll('#hand-zone .card')].find(el => el.dataset.id === 'gold');
      gold?.click();
    });
    await new Promise(r => setTimeout(r, 450));
  }
  await new Promise(r => setTimeout(r, 400));
  const dest = `/opt/cursor/artifacts/${name}.png`;
  await page.screenshot({ path: dest });
  await page.screenshot({ path: `/workspace/${name}.png` });
  const info = await page.evaluate(() => {
    const snap = window.__totTest.snapshot();
    const coins = [...document.querySelectorAll('.patron-coin')].map(el => ({
      id: el.dataset.pid, favor: el.dataset.favor, cls: el.className,
    }));
    const hg = document.querySelector('#btn-end')?.getBoundingClientRect();
    const piles = [...document.querySelectorAll('#match .hex-pile:not(.sr-pile)')].map(el => {
      const r = el.getBoundingClientRect();
      return { id: el.id, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) };
    });
    return { snap, coins, hg: hg && { x: Math.round(hg.x), y: Math.round(hg.y), w: Math.round(hg.width), h: Math.round(hg.height) }, piles };
  });
  console.log(name, JSON.stringify(info, null, 2));
  await page.close();
}
await shot('phone-landscape-844x390', { w: 844, h: 390 });
await shot('phone-landscape-844x390-glow', { w: 844, h: 390 });
await shot('phone-landscape-667x375', { w: 667, h: 375 });
await shot('phone-landscape-932x430', { w: 932, h: 430 });
await browser.close();
server.close();
