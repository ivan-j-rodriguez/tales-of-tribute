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
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(`http://127.0.0.1:${port}/?test=1`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__totTest, { timeout: 20000 });
await page.evaluate(() => window.__totTest.startQuick());
await page.waitForFunction(() => window.__totTest.snapshot().hand > 0);
await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: '/workspace/board-tokens.png' });
await page.evaluate(async () => {
  const el = document.querySelector('.patron-coin[data-pid="pelin"]') || document.querySelector('.patron-coin[data-side="you"]');
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true }));
  await new Promise(r => setTimeout(r, 920));
});
await new Promise(r => setTimeout(r, 350));
await page.screenshot({ path: '/workspace/patron-tip.png' });
const text = await page.evaluate(() => document.querySelector('.lift-text-fly')?.innerText || '');
console.log('TIP\\n' + text);
await browser.close();
server.close();
