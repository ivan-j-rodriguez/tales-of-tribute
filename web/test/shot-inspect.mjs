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
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(async () => {
    const el = document.querySelector('#tavern-zone .card') || document.querySelector('#hand-zone .card');
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true }));
    await new Promise(r => setTimeout(r, 1150));
  });
  await new Promise(r => setTimeout(r, 380));
  const dest = `/workspace/${name}.png`;
  await page.screenshot({ path: dest, fullPage: false });
  const text = await page.evaluate(() => document.querySelector('.lift-text-fly')?.innerText || '');
  console.log(name, 'tip=', JSON.stringify(text.slice(0, 180)));
  await page.close();
}

await shot('inspect-portrait', { w: 390, h: 844 });
await shot('inspect-landscape', { w: 844, h: 390 });
await browser.close();
server.close();
