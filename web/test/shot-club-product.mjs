import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.env.CLUB_SHOT_DIR || '/opt/cursor/artifacts';
fs.mkdirSync(outDir, { recursive: true });

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

async function pageAt(qs, { w = 390, h = 844 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`http://127.0.0.1:${port}/${qs}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__totTest, { timeout: 25000 });
  await new Promise((r) => setTimeout(r, 280));
  return page;
}

async function shot(page, name) {
  const dest = path.join(outDir, name);
  await page.screenshot({ path: dest, fullPage: false });
  console.log('wrote', dest);
  return dest;
}

const store = await pageAt('?test=1&shop=14');
await store.evaluate(() => window.__totTest.openStore());
await new Promise((r) => setTimeout(r, 400));
const storeCopy = await store.evaluate(() => window.__totTest.storeCopy());
console.log('store', storeCopy);
if (/slate/i.test(JSON.stringify(storeCopy))) throw new Error('store still says slate');
if (/unofficial/i.test(JSON.stringify(storeCopy))) throw new Error('store still says unofficial');
await store.evaluate(() => { document.querySelector('#store').scrollTop = 0; });
await shot(store, 'club_store_no_slate.png');
await store.close();

const login = await pageAt('?test=1');
await login.evaluate(() => window.__totTest.openAccount());
await new Promise((r) => setTimeout(r, 300));
const acc = await login.evaluate(() => ({
  open: document.querySelector('#account-overlay')?.classList.contains('show'),
  disclaimer: window.__totTest.accountDisclaimer(),
  googleDisabled: document.querySelector('#btn-auth-google')?.disabled,
  appleDisabled: document.querySelector('#btn-auth-apple')?.disabled,
}));
console.log('account', acc);
if (!acc.open || !/Unofficial/i.test(acc.disclaimer)) throw new Error('login overlay missing fan disclaimer');
if (!acc.googleDisabled || !acc.appleDisabled) throw new Error('Google/Apple should stay gated without Firebase');
await shot(login, 'club_login_signup.png');
await login.close();

const tour = await pageAt('?test=1');
await tour.evaluate(() => window.__totTest.startTutorial());
await new Promise((r) => setTimeout(r, 500));
const step = await tour.evaluate(() => ({
  open: !document.querySelector('#tour-root')?.hidden,
  text: window.__totTest.tourText(),
  n: document.querySelector('#tour-step')?.textContent || '',
}));
console.log('tutorial', step);
if (!step.open || !/hand/i.test(step.text)) throw new Error('tutorial step did not open');
await shot(tour, 'club_tutorial_step.png');
await tour.close();

const about = await pageAt('?test=1');
await about.evaluate(() => window.__totTest.openSettingsScreen());
await new Promise((r) => setTimeout(r, 300));
await about.evaluate(() => document.querySelector('#settings-about')?.scrollIntoView({ block: 'center' }));
await new Promise((r) => setTimeout(r, 200));
const aboutCopy = await about.evaluate(() => ({
  text: window.__totTest.aboutDisclaimer(),
  splashHas: !!document.querySelector('#splash .disclaimer'),
}));
console.log('about', aboutCopy);
if (!/Unofficial/i.test(aboutCopy.text) || !/not for sale/i.test(aboutCopy.text)) {
  throw new Error('About missing fan disclaimer');
}
await shot(about, 'club_settings_about.png');
await about.close();

await browser.close();
server.close();
console.log('club product shots ok');
