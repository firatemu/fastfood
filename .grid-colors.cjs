/* What colour does each part of the datagrid actually paint, in each theme?
   Read from the DOM, never from the stylesheet: the module has a Navy theme
   layer that wins at 0,2,0, so the cascade cannot be read off the source. */
const fs = require('node:fs');
const OUT = '/mnt/c/Users/AZEM/AppData/Local/Temp/ff-build/grid-colors.log';
const log = (m) => { fs.appendFileSync(OUT, m + '\n'); process.stdout.write(m + '\n'); };
fs.writeFileSync(OUT, '');
const ORIGIN = 'http://localhost:3101';

const PROBE = () => {
  const rgba = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return s;
    const p = m[1].split(',').map((x) => x.trim());
    const a = p.length > 3 ? parseFloat(p[3]) : 1;
    return '#' + p.slice(0, 3).map((x) => parseInt(x).toString(16).padStart(2, '0')).join('') + (a < 0.999 ? '@' + a.toFixed(2) : '');
  };
  const of = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return 'ABSENT';
    const c = getComputedStyle(el);
    return `${rgba(c.backgroundColor)}/${rgba(c.color)}`;
  };
  const rows = [...document.querySelectorAll('table tbody tr')];
  const cellOf = (n, sel) => {
    const td = rows[n] && rows[n].querySelectorAll('td')[n === 0 ? 0 : n];
    return td && td.querySelector(sel);
  };
  const stack = (el) => {
    if (!el) return 'ABSENT';
    const out = [];
    let e = el;
    while (e && e !== document.body && out.length < 6) {
      const c = getComputedStyle(e);
      const bg = rgba(c.backgroundColor);
      if (bg !== 'rgba(0,0,0,0)' && bg !== '#0000') out.push((e.className || e.tagName).toString().split(/\s+/).pop() + ':' + bg);
      e = e.parentElement;
    }
    return out.join(' < ') || 'transparent all the way';
  };
  const first = (sel) => document.querySelector(sel);
  return {
    theme: document.querySelector('[data-admin-theme]') ? document.querySelector('[data-admin-theme]').getAttribute('data-admin-theme') : 'none',
    panel: of('[class*="gridPanel"]'),
    gridHeader: of('[class*="gridHeader"]'),
    filters: of('[class*="filters"]'),
    th: of('table th'),
    tdRow1: rows[0] ? rgba(getComputedStyle(rows[0].querySelector('td')).backgroundColor) : 'n/a',
    tdRow2: rows[1] ? rgba(getComputedStyle(rows[1].querySelector('td')).backgroundColor) : 'n/a',
    tdRow1Hoverish: rows[2] ? rgba(getComputedStyle(rows[2].querySelector('td')).backgroundColor) : 'n/a',
    branchLink: of('[class*="branchLink"]'),
    branchIdentityBgStack: stack(first('td [class*="branchIdentity"]')),
    branchMark: of('[class*="branchMark"]'),
    address: of('[class*="address"]'),
    statusOpen: of('[class*="statusOpen"]'),
    statusPaused: of('[class*="statusPaused"]'),
    managerCell: stack(cellOf(0, '[class*="status"], [class*="count"]')),
    channels: stack(first('[class*="channels"] span')),
    money: of('td [class*="money"]'),
    inactiveRow: (() => { const r = rows.find((x) => /inactive/i.test(x.className)); return r ? rgba(getComputedStyle(r.querySelector('td')).backgroundColor) + '/' + rgba(getComputedStyle(r.querySelector('td')).color) : 'none'; })(),
    gridFooter: of('[class*="gridFooter"]'),
  };
};

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ timeout: 60000 });
  for (const theme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: 1499, height: 1101 } });
    await ctx.addInitScript((m) => { try { localStorage.setItem('fastfood-admin-color-mode', m); } catch {} }, theme);
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
    const r = await page.evaluate(PROBE);
    log(`\n=========== ${theme} (data-admin-theme=${r.theme}) ===========`);
    for (const [k, v] of Object.entries(r)) if (k !== 'theme') log('  ' + k.padEnd(22) + v);
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { log('FATAL ' + e.message); process.exit(1); });