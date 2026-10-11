const fs = require('node:fs');
const crypto = require('node:crypto');
const OUT = '/mnt/c/Users/AZEM/AppData/Local/Temp/ff-build/datagrid-verify.log';
const SHOTS = '/mnt/c/Users/AZEM/AppData/Local/Temp/ff-build/shots';
const log = (m) => { fs.appendFileSync(OUT, m + '\n'); process.stdout.write(m + '\n'); };
fs.writeFileSync(OUT, '');
const ORIGIN = 'http://localhost:3101';
let fails = 0;
const check = (l, ok, d) => { if (!ok) fails++; log((ok ? 'OK   ' : 'FAIL ') + l + (d !== undefined ? '  | ' + d : '')); };
const hex = (s) => {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return s;
  const p = m[1].split(',').map((x) => x.trim());
  const a = p.length > 3 ? parseFloat(p[3]) : 1;
  // rgba(0,0,0,0) IS transparent. Comparing it to a '#00000000' literal failed
  // for two runs before I wrote this — the value was right, the expectation wrong.
  if (a === 0) return 'transparent';
  return '#' + p.slice(0, 3).map((x) => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase() + (a < 0.99 ? '@' + a.toFixed(2) : '');
};
const sig = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
let lastInactive = null;

/* page.evaluate serialises the function body only, so `hex` must live INSIDE
   it — a closure over an outer helper is a ReferenceError in the page. */
const READ = () => {
  const hex = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return s;
    const p = m[1].split(',').map((x) => x.trim());
    const a = p.length > 3 ? parseFloat(p[3]) : 1;
    if (a === 0) return 'transparent';
    return '#' + p.slice(0, 3).map((x) => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase() + (a < 0.99 ? '@' + a.toFixed(2) : '');
  };
  const g = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const c = getComputedStyle(el);
    return { bg: hex(c.backgroundColor), fg: hex(c.color), border: hex(c.borderTopColor) };
  };
  const rows = [...document.querySelectorAll('table tbody tr')];
  const cellsOf = (i) => [...rows[i].querySelectorAll('td')].map((td) => hex(getComputedStyle(td).backgroundColor));
  return {
    branchLink: g('td [class*="branchLink"]'),
    branchMark: g('[class*="branchMark"]'),
    branchName: g('[class*="branchIdentity"] strong'),
    branchCode: g('[class*="branchIdentity"] small'),
    th: g('table th'),
    row0: cellsOf(0),
    row1: cellsOf(1),
    open: g('[class*="statusOpen"]'),
    paused: g('[class*="statusPaused"]'),
    manager: g('[class*="managerCell"]'),
    pending: g('[class*="managerPending"]'),
    channel: g('[class*="channels"] span'),
    money: g('td [class*="money"]'),
    inactiveCells: rows.filter((r) => /inactive/i.test(r.className)).length,
  };
};

const HOVER_READ = () => {
  const hex = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return s;
    const p = m[1].split(',').map((x) => x.trim());
    return '#' + p.slice(0, 3).map((x) => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const rows = [...document.querySelectorAll('table tbody tr')];
  const row = rows[1];
  const cells = [...row.querySelectorAll('td')].map((td) => hex(getComputedStyle(td).backgroundColor));
  return { cells, distinct: [...new Set(cells)].length };
};

async function signIn(browser, theme) {
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
  return { ctx, page };
}

(async () => {
  const hard = setTimeout(() => { log('HARD TIMOUT'); process.exit(2); }, 540000);
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ timeout: 60000 });

  for (const theme of ['dark', 'light']) {
    log(`\n================ ${theme} ================`);
    const { ctx, page } = await signIn(browser, theme);

    // The saturated slab that made every row look like a button.
    const rest = await page.evaluate(READ);
    log('branchLink ' + JSON.stringify(rest.branchLink));
    log('branchMark ' + JSON.stringify(rest.branchMark));
    log('open      ' + JSON.stringify(rest.open));
    log('paused    ' + JSON.stringify(rest.paused));
    log('manager   ' + JSON.stringify(rest.manager));
    log('pending   ' + JSON.stringify(rest.pending));
    log('channel   ' + JSON.stringify(rest.channel));
    log('money     ' + JSON.stringify(rest.money));
    log('th        ' + JSON.stringify(rest.th));

    check(`${theme}: the identity cell is no longer a filled block`, rest.branchLink.bg === 'transparent', rest.branchLink.bg);
    check(`${theme}: the mark keeps the brand accent`, rest.branchMark.bg.includes('@'), rest.branchMark.bg + ' / icon ' + rest.branchMark.fg);
    check(`${theme}: paused is neutral, not the info blue`, rest.paused.bg.includes('@') === false, rest.paused.bg);
    check(`${theme}: channels are neutral, not info blue`, rest.channel.bg.includes('@') === false, rest.channel.bg);
    check(`${theme}: money is not the ready green`, sig(rest.money.fg) !== sig(rest.open.fg), rest.money.fg + ' vs open ' + rest.open.fg);
    check(`${theme}: the manager column is no longer a status pill`, rest.manager !== null && rest.manager.bg.includes('@') === false, JSON.stringify(rest.manager));
    check(`${theme}: all rows share one surface (divide-y, no zebra)`, new Set([...rest.row0, ...rest.row1]).size === 1, [...new Set([...rest.row0, ...rest.row1])].join(' '));

    // The pending manager label must ellipsise, not stop mid-word.
    const ell = await page.evaluate(() => {
      const el = document.querySelector('[class*="managerPending"] [class*="managerLabel"]');
      if (!el) return null;
      return { clipped: el.scrollWidth > el.clientWidth + 1, rendered: el.scrollWidth - el.clientWidth };
    });
    check(`${theme}: the pending manager label ellipsises`, ell !== null && ell.clipped, ell ? ell.rendered + 'px hidden' : 'ABSENT');

    // The row action used to sit 240px off-screen: table 1389px in a 1149px box.
    const fit = await page.evaluate(() => {
      const sc = document.querySelector('[class*="tableScroll"]');
      const ths = [...document.querySelectorAll('table thead th')];
      const box = sc.getBoundingClientRect();
      return {
        over: sc.scrollWidth - sc.clientWidth,
        lastVisible: ths[ths.length - 1].getBoundingClientRect().right <= box.right + 1,
        cols: ths.length,
      };
    });
    log(`fit: ${fit.cols} columns, overflow ${fit.over}px, action column in view: ${fit.lastVisible}`);
    check(`${theme}: the grid fits without horizontal scrolling`, fit.over <= 0, fit.over + 'px');
    check(`${theme}: the action column is inside the visible box`, fit.lastVisible, String(fit.lastVisible));

    await page.screenshot({ path: `${SHOTS}/a928-list-${theme}.png` });

    // Hover must raise EVERY cell. The theme block used to pin td:first-child to
    // the panel surface, which left a notch down the left edge.
    await page.locator('table tbody tr').nth(1).hover();
    await page.waitForTimeout(400);
    const hov = await page.evaluate(HOVER_READ);
    log('hover cells: ' + JSON.stringify(hov.cells));
    check(`${theme}: hover raises every cell including the first`, hov.distinct === 1, hov.distinct + ' distinct ' + JSON.stringify(hov.cells));
    check(`${theme}: hover is visibly above the row surface`, sig(hov.cells[0]) !== sig(rest.row1[0]), hov.cells[0] + ' vs ' + rest.row1[0]);

    // Close-up of the recoloured identity cell and the chip row.
    const first = page.locator('table tbody tr').first();
    await first.hover();
    await page.waitForTimeout(300);
    await first.screenshot({ path: `${SHOTS}/a928-row-${theme}.png` });

    lastInactive = rest.inactiveCells;
    await ctx.close();
  }

  log('\ninactive rows on the current page: ' + lastInactive);
  await browser.close();
  clearTimeout(hard);
  log('\nverdict: ' + (fails === 0 ? 'PASS - 0 failures' : fails + ' FAILURE(S)'));
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { log('FATAL ' + e.message); process.exit(1); });