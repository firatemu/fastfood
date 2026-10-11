const fs = require('node:fs');
const OUT = '/mnt/c/Users/AZEM/AppData/Local/Temp/ff-build/font-walk.log';
const log = (m) => { fs.appendFileSync(OUT, m + '\n'); process.stdout.write(m + '\n'); };
fs.writeFileSync(OUT, '');
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

  const walk = await page.evaluate(() => {
    const cls = (el) => {
      const c = el.className;
      if (!c) return '';
      return typeof c === 'string' ? c : c.baseVal || '';
    };
    const fam = (el) => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '');
    const chain = (start, n) => {
      const out = [];
      let el = start;
      while (el && out.length < n) {
        out.push({ tag: el.tagName.toLowerCase(), cls: cls(el), family: fam(el), theme: el.getAttribute ? el.getAttribute('data-admin-theme') : null });
        el = el.parentElement;
      }
      return out;
    };
    return {
      tabIcon: chain(document.querySelector('[role="dialog"] [role="tab"] .material-symbols-outlined'), 14),
      workingIcon: chain(document.querySelector('[role="dialog"] [class*="dialogGlyph"] .material-symbols-outlined'), 8),
    };
  });

  log('--- TAB ICON ancestry (nearest first) ---');
  for (const r of walk.tabIcon) log('  ' + r.tag + ' .' + r.cls + '  ->  ' + r.family + (r.theme ? '   [theme=' + r.theme + ']' : ''));
  log('--- WORKING ICON ancestry ---');
  for (const r of walk.workingIcon) log('  ' + r.tag + ' .' + r.cls + '  ->  ' + r.family);
  await browser.close();
})().catch((e) => { log('FATAL ' + e.message); process.exit(1); });