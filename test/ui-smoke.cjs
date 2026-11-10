const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs/promises');
(async () => {
  const server = http.createServer(async (req, res) => {
    const names = { '/': ['index.html', 'text/html'], '/style.css': ['style.css', 'text/css'], '/app.js': ['app.js', 'text/javascript'] };
    const item = names[req.url];
    if (!item) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', item[1]);
    res.end(await fs.readFile(path.join(__dirname, '../src/ui', item[0])));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1180, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.calls = []; window.events = {};
      window.launcher = {
        versions: async () => [{ id: '1.21.1', type: 'release' }, { id: '24w14a', type: 'snapshot' }],
        login: async () => ({ name: 'TestPlayer' }), logout: async () => true,
        launch: async input => { window.calls.push(input); },
        folder: async () => '', java: async () => 'C:\\Java\\bin\\javaw.exe', javaHelp: async () => {},
        on: (event, callback) => { window.events[event] = callback; }
      };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('#play:enabled').waitFor();
    assert.equal(await page.locator('#version option').count(), 1);
    await page.locator('#snapshots').check();
    assert.equal(await page.locator('#version option').count(), 2);
    await page.locator('#snapshots').uncheck();
    await page.locator('#offline').click();
    await page.locator('#nick').fill('TestPlayer');
    await page.locator('#settings').click();
    await page.locator('#java').click();
    await page.locator('#ram').fill('6');
    await page.locator('#play').click();
    const input = await page.evaluate(() => window.calls[0]);
    assert.deepEqual(input, { version: '1.21.1', mode: 'offline', nick: 'TestPlayer', ram: 6, javaPath: 'C:\\Java\\bin\\javaw.exe' });
    assert.equal(await page.locator('#play').isDisabled(), true);
    await page.evaluate(() => window.events['game-closed']());
    assert.equal(await page.locator('#play').isEnabled(), true);
    await page.locator('#account').click();
    await page.locator('#account-name').filter({ hasText: 'TestPlayer' }).waitFor();
    await page.locator('#logout').click();
    assert.equal(await page.locator('#account-name').textContent(), 'Zaloguj się');
    await page.locator('#home').click();
    await page.screenshot({ path: path.join(__dirname, '../dist/interface.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('UI smoke: version filter, offline form, Java/RAM settings, launch IPC, close, login/logout passed (mock backend).');
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
