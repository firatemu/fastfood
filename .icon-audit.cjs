const fs = require('node:fs');
const OUT = '/mnt/c/Users/AZEM/AppData/Local/Temp/ff-build/icon-audit.log';
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

  // Every icon whose computed family is not the icon font is a hit: the ligature
  // cannot apply there, so the raw text ("edit_note") is what gets painted.
  const audit = (page, where) =>
    page.evaluate((where) => {
      const bad = [], total = [];
      const seen = new Set();
      for (const el of document.querySelectorAll('.material-symbols-outlined')) {
        if (seen.has(el)) continue;
        seen.add(el);
        const c = getComputedStyle(el);
        const fam = c.fontFamily.split(',')[0].replace(/["']/g, '');
        const rec = {
          text: (el.textContent || '').trim().slice(0, 18),
          family: fam,
          size: c.fontSize,
          parent: (el.parentElement && typeof el.parentElement.className === 'string' ? el.parentElement.className : '').split(/\s+/).filter(s => !s.startsWith('material-symbols')).slice(-1)[0] || '?',
        };
        total.push(rec);
        if (fam !== 'Material Symbols Outlined') bad.push(rec);
      }
      return { where, icons: total.length, bad };
    }, where);

  const report = async (where) => {
    const a = await audit(page, where);
    log(`\n--- ${where} : ${a.icons} icons, ${a.bad.length} broken ---`);
    for (const b of a.bad) log(`   "${b.text}"  family=${b.family}  size=${b.size}  in .${b.parent}`);
    if (!a.bad.length) log('   (all icons resolve to Material Symbols Outlined)');
    return a.bad.length;
  };

  let broken = await report('list');

  await page.locator('tr[aria-label$="şubesini düzenle"]').first().click({ timeout: 25000 });
  await page.waitForSelector('[role="dialog"]', { timeout: 25000 });
  await page.waitForTimeout(2200);
  broken += await report('edit dialog / Bilgiler');

  for (const name of [/Çalışma saatleri/, /Hizmet kapsamı/]) {
    await page.getByRole('tab', { name }).click({ timeout: 15000 });
    await page.waitForTimeout(1000);
    const active = await page.locator('[role="dialog"] [role="tab"][aria-selected="true"]').textContent();
    broken += await report('edit dialog / ' + (active || '').replace(/\s+/g, ' ').trim());
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Yeni Şube/i }).first().click({ timeout: 15000 });
  await page.waitForSelector('[role="dialog"]', { timeout: 25000 });
  await page.waitForTimeout(2000);
  broken += await report('create dialog');

  log('\nTOTAL BROKEN ICONS: ' + broken);
  await browser.close();
})().catch((e) => { log('FATAL ' + e.message); process.exit(1); });