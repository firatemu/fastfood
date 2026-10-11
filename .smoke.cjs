const fs = require('node:fs');
const SHOTS = '/mnt/c/Users/AZEM/AppData/Local/Temp/ff-build/shots';
const ORIGIN = 'http://localhost:3101';
(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ timeout: 60000 });
  const ctx = await browser.newContext({ viewport: { width: 1499, height: 1101 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('fastfood-admin-color-mode', 'dark'); } catch {} });
  const page = await ctx.newPage();
  await page.goto(ORIGIN + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  for (let a = 1; a <= 5; a++) {
    await page.waitForTimeout(a === 1 ? 3500 : 2500);
    await page.fill('#identifier', 'staff@fastfood.local');
    await page.fill('#password', 'DevStaffPass1!');
    await page.getByRole('button', { name: 'Devam et' }).click();
    await page.waitForTimeout(4000);
    if (!page.url().includes('identifier=')) break;
    await page.goto(ORIGIN + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 });
  await page.locator('[data-admin-nav-item="branch-list"]').first().click({ timeout: 25000 });
  await page.waitForFunction(() => location.pathname === '/branches', { timeout: 25000 });
  await page.waitForTimeout(2500);
  await page.locator('tr[aria-label$="şubesini düzenle"]').first().click({ timeout: 25000 });
  await page.waitForSelector('[role="dialog"]', { timeout: 25000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: SHOTS + '/final-edit-dialog.png' });
  const ok = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="dialog"] [role="tab"]')];
    const bad = [...document.querySelectorAll('.material-symbols-outlined')]
      .filter((el) => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '') !== 'Material Symbols Outlined').length;
    return { tabs: tabs.length, badIcons: bad, stripH: Math.round(document.querySelector('[role="dialog"] [role="tablist"]').getBoundingClientRect().height) };
  });
  console.log('post-build smoke: ' + JSON.stringify(ok));
  await browser.close();
})().catch((e) => { console.log('FATAL ' + e.message); process.exit(1); });