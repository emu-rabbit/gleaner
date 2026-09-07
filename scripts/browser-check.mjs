// Optional browser QA: pass an installed Playwright module path as the first argument.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'playwright');
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto('http://127.0.0.1:4173/?lang=tw');
  assert.equal(await page.locator('button:disabled').count(), 2);
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hant');
  const fixture = {
    'frozen-rabbit-favorites-data': JSON.stringify(Array.from({length:4}, (_,id)=>({ id, name:'測試收藏' }))),
    'frozen-rabbit-notes': JSON.stringify([{id:'history'}]),
    'frozen-rabbit-lang': 'tw',
    'frozen-rabbit-dark-mode': 'false',
    'frozen-rabbit-tome-library': '[{"id":"tome","name":"秘笈"}]',
    'frozen-rabbit-tome-favorite-items': '[{},{},{}]',
    'frozen-rabbit-tome-gear-profiles': '[{},{}]',
    'frozen-rabbit-tome-macro-settings': '{"secondsPerGather":4}',
    unrelated: 'do not export',
  };
  await page.evaluate(values => { for (const [key,value] of Object.entries(values)) localStorage.setItem(key,value); }, fixture);
  await page.reload();
  await page.goto('http://127.0.0.1:4173/?lang=en');
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hant');
  await page.goto('http://127.0.0.1:4173/');
  for (const img of await page.locator('.card-heading img').all()) {
    assert.equal(await img.evaluate(el => el.complete && el.naturalWidth > 0), true);
  }
  await page.locator('#theme-toggle').click();
  assert.equal(await page.locator('#theme-toggle').getAttribute('aria-checked'), 'true');
  assert.equal(await page.locator('html').evaluate(el => el.classList.contains('dark')), true);
  await page.locator('#theme-toggle').click();
  assert.equal(await page.locator('#theme-toggle').getAttribute('aria-checked'), 'false');
  assert.equal(await page.locator('[data-project="workshop"] dd').first().textContent(), '4');
  for (const project of ['workshop','tome']) {
    const downloading = page.waitForEvent('download');
    await page.locator(`[data-project="${project}"] button`).click();
    const download = await downloading;
    const file = `artifacts/${project}.json`;
    await download.saveAs(file);
    const backup = JSON.parse(await readFile(file,'utf8'));
    assert.equal(backup.format, `frozen-rabbit-${project}-backup`);
    for(const [key,value] of Object.entries(backup.data)) assert.equal(value,fixture[key]);
    assert.equal(backup.data.unrelated, undefined);
  }
  assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),fixture);
  for (const [lang,htmlLang] of [['tw','zh-Hant'],['cn','zh-Hans'],['ja','ja'],['en','en']]) {
    await page.selectOption('#language', lang);
    assert.equal(await page.locator('html').getAttribute('lang'),htmlLang);
    await page.screenshot({path:`artifacts/desktop-${lang}.png`,fullPage:true});
    await page.setViewportSize({width:375,height:812});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
    await page.screenshot({path:`artifacts/mobile-${lang}.png`,fullPage:true});
    await page.setViewportSize({width:1280,height:900});
  }
  await page.selectOption('#language','tw');
  assert.equal(page.url(), 'http://127.0.0.1:4173/');
  assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),fixture);
  await page.evaluate(()=>{
    localStorage.removeItem('frozen-rabbit-lang');
    localStorage.removeItem('frozen-rabbit-dark-mode');
    localStorage.setItem('frozen-rabbit-tome-lang','ja');
    localStorage.setItem('frozen-rabbit-tome-dark-mode','true');
  });
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('lang'),'ja');
  assert.equal(await page.locator('#theme-toggle').getAttribute('aria-checked'),'true');
  await page.evaluate(()=>localStorage.setItem('frozen-rabbit-lang','tw'));
  await page.evaluate(()=>localStorage.setItem('frozen-rabbit-dark-mode','true'));
  await page.reload();
  await page.screenshot({path:'artifacts/dark.png',fullPage:true});
  await page.evaluate(()=>localStorage.setItem('frozen-rabbit-notes','{broken'));
  await page.reload();
  assert.match(await page.locator('[data-project="workshop"] .state').textContent(),/格式異常/);
  assert.equal(await page.locator('[data-project="workshop"] dd').nth(1).textContent(),'—');
  // Model the production origin by serving this build through request interception.
  await page.route('https://emu-rabbit.github.io/gleaner/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/gleaner/','') || 'index.html';
    const contentType = path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.png') ? 'image/png' : 'text/html';
    await route.fulfill({body:await readFile(`dist/${path}`),contentType});
  });
  await page.goto('https://emu-rabbit.github.io/gleaner/?lang=en');
  assert.equal(await page.locator('#environment').isVisible(),false);
  assert.equal(await page.locator('button:disabled').count(),2);
  await page.evaluate(()=>localStorage.setItem('frozen-rabbit-notes','[{"id":"old-origin"}]'));
  await page.reload();
  const productionDownload = page.waitForEvent('download');
  await page.locator('[data-project="workshop"] button').click();
  await (await productionDownload).saveAs('artifacts/production-simulated.json');
  assert.equal(JSON.parse(await readFile('artifacts/production-simulated.json','utf8')).sourceOrigin,'https://emu-rabbit.github.io');
  await page.screenshot({path:'artifacts/production-empty-tome.png',fullPage:true});
  const blocked = await context.newPage();
  await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}}));
  await blocked.goto('http://127.0.0.1:4173/?lang=en');
  assert.equal(await blocked.locator('html').getAttribute('lang'),'zh-Hant');
  await blocked.selectOption('#language','en');
  assert.equal(await blocked.locator('button:disabled').count(),2);
  assert.match(await blocked.locator('.state').first().textContent(),/cannot read/);
  assert.deepEqual(errors,[]);
  console.log('Browser checks passed: both favicons, preference priority, ignored query, theme toggle, empty, populated, both downloads, exact storage preservation, four locales, mobile overflow, dark, corrupt, blocked, simulated production origin.');
} finally { await browser.close(); }
