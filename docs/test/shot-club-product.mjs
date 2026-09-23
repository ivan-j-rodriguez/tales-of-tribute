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
const storeOverflow = await store.evaluate(() => {
  const el = document.querySelector('#store');
  return { sw: el.scrollWidth, cw: el.clientWidth };
});
console.log('store overflow', storeOverflow);
if (storeOverflow.sw > storeOverflow.cw + 1) {
  throw new Error(`store horizontal overflow: scrollWidth ${storeOverflow.sw} > clientWidth ${storeOverflow.cw}`);
}
await shot(store, 'club_store_no_slate.png');
await store.close();

const login = await pageAt('?test=1');
await login.evaluate(() => window.__totTest.openAccount());
await new Promise((r) => setTimeout(r, 300));
const acc = await login.evaluate(() => {
  const root = document.querySelector('#account-overlay');
  const text = (root?.innerText || '').replace(/\s+/g, ' ').trim();
  return {
    open: root?.classList.contains('show'),
    text,
    email: !!document.querySelector('#account-email'),
    password: !!document.querySelector('#account-password'),
    signIn: !!document.querySelector('#btn-auth-signin'),
    signUp: !!document.querySelector('#btn-auth-signup'),
    guest: document.querySelector('#btn-auth-guest')?.textContent || '',
    close: !!document.querySelector('#btn-auth-close'),
    google: !!document.querySelector('#btn-auth-google'),
    apple: !!document.querySelector('#btn-auth-apple'),
    phone: !!document.querySelector('#btn-auth-phone') || !!document.querySelector('#account-phone'),
  };
});
console.log('account', acc);
if (!acc.open) throw new Error('login overlay did not open');
if (!acc.email || !acc.password || !acc.signIn || !acc.signUp || !acc.close) throw new Error('email sign-in controls missing');
if (!/guest/i.test(acc.guest)) throw new Error('guest play missing');
if (acc.google || acc.apple || acc.phone) throw new Error('Google, Apple, or phone controls still on the sign-in sheet');
if (/unofficial|bethesda|firebase|google|apple|phone/i.test(acc.text)) throw new Error(`sign-in sheet still has extra copy: ${acc.text}`);
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

const leak = await pageAt('?test=1');
const hotseatMic = await leak.evaluate(() => {
  window.__totTest.startWithStuckVoice('hotseat');
  return window.__totTest.voiceMicHidden();
});
console.log('hotseat mic hidden', hotseatMic);
if (!hotseatMic) throw new Error('Hotseat Mic must stay hidden after leftover Friend voice');
await shot(leak, 'club_hotseat_mic_hidden.png');
await leak.close();

const aiLeak = await pageAt('?test=1');
const aiMic = await aiLeak.evaluate(() => {
  window.__totTest.startWithStuckVoice('ai');
  return window.__totTest.voiceMicHidden();
});
console.log('ai mic hidden', aiMic);
if (!aiMic) throw new Error('AI Mic must stay hidden after leftover Friend voice');
await shot(aiLeak, 'club_ai_mic_hidden.png');
await aiLeak.close();

await browser.close();
server.close();
console.log('club product shots ok');
