const fs = require('node:fs');
const OUT = '/mnt/c/Users/AZEM/AppData/Local/Temp/ff-build/branch-soft-verify2.log';
const SHOTS = '/mnt/c/Users/AZEM/AppData/Local/Temp/ff-build/shots';
const log = (m) => { fs.appendFileSync(OUT, m + '\n'); process.stdout.write(m + '\n'); };
fs.writeFileSync(OUT, '');
fs.mkdirSync(SHOTS, { recursive: true });
// localhost, not 127.0.0.1 — Next 16 blocks /_next/hmr from the latter.
const ORIGIN = 'http://localhost:3101';

let fails = 0;
const check = (label, ok, detail) => {
  if (!ok) fails++;
  log((ok ? 'OK   ' : 'FAIL ') + label + (detail !== undefined ? '  | ' + detail : ''));
};
const px = (v) => (v === null ? null : Math.round(parseFloat(v) * 100) / 100);

async function signIn(browser, viewport, theme) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript((mode) => {
    try { localStorage.setItem('fastfood-admin-color-mode', mode); } catch {}
  }, theme);
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
  await page.waitForTimeout(2000);
  return page;
}

const openEdit = async (page) => {
  await page.locator('tr[aria-label$="şubesini düzenle"]').first().click({ timeout: 25000 });
  await page.waitForSelector('[role="dialog"]', { timeout: 25000 });
  await page.waitForTimeout(2200);
};

/* Tab geometry. The reported defect was ligature TEXT painting outside the icon
   span's own box and landing on the label, which a sibling-rect overlap test
   cannot see: the icon's border box was a correct 20px while its ink was ~130px.
   So the icon's own scrollWidth is measured too. */
const tabGeometry = (page) =>
  page.evaluate(() => {
    const list = document.querySelector('[role="dialog"] [role="tablist"]');
    const tabs = [...document.querySelectorAll('[role="dialog"] [role="tab"]')];
    const overlaps = [];
    for (let i = 1; i < tabs.length; i++) {
      if (tabs[i].getBoundingClientRect().x < tabs[i - 1].getBoundingClientRect().right - 0.5) overlaps.push(i - 1 + '/' + i);
    }
    return {
      count: tabs.length,
      listW: list ? Math.round(list.getBoundingClientRect().width) : 0,
      listScrollW: list ? list.scrollWidth : 0,
      overlaps,
      spills: tabs.filter((t) => t.scrollWidth > t.clientWidth + 1).map((t) => (t.textContent || '').trim()),
      totalW: tabs.reduce((s, t) => s + t.getBoundingClientRect().width, 0),
      rects: tabs.map((t) => { const b = t.getBoundingClientRect(); return { text: (t.textContent || '').replace(/\s+/g, ' ').trim(), x: Math.round(b.x), w: Math.round(b.width) }; }),
      icons: tabs.map((t) => {
        const i = t.querySelector('.material-symbols-outlined');
        if (!i) return null;
        const cs = getComputedStyle(i);
        return {
          box: Math.round(i.getBoundingClientRect().width * 10) / 10,
          shrink: cs.flexShrink,
          overflow: cs.overflow,
          em: cs.fontSize,
          inkW: i.scrollWidth,
          inkClipped: i.scrollWidth <= i.clientWidth + 1,
        };
      }),
    };
  });

/* Measured WITH the dialog open — the previous run read the dialog-scoped
   selectors while the dialog was closed, which is why they all came back null.
   .search is a <label>, not a <div>. */
const radiiOf = (page) =>
  page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).borderTopLeftRadius : null;
    };
    return {
      gridPanel: pick('section[class*="gridPanel"]'),
      gridHeader: pick('[class*="gridHeader"]'),
      search: pick('label[class*="search"]'),
      toolButton: pick('button[class*="toolButton"]'),
      primaryButton: pick('button[class*="primaryButton"]'),
      rowAction: pick('[class*="rowAction"]'),
      statusChip: pick('[class*="statusBadge"], td [class*="status"]'),
      dialog: pick('[role="dialog"]'),
      formSection: pick('[role="dialog"] section[class*="formSection"]'),
      summaryRail: pick('[role="dialog"] [class*="summaryRail"]'),
      fieldInput: pick('[role="dialog"] input'),
      dialogTab: pick('[role="dialog"] [role="tab"]'),
      tabStrip: pick('[role="dialog"] [role="tablist"]'),
    };
  });

// expected px per element: surfaces 12, controls 8, chips 4 (ADR-019 scale)
const LIST_EXPECT = { gridPanel: 12, gridHeader: 12, search: 8, toolButton: 8, primaryButton: 8, rowAction: 8, statusChip: 4 };
const DIALOG_EXPECT = { dialog: 12, formSection: 12, summaryRail: 12, fieldInput: 8, dialogTab: 8 };

const expectSet = (theme, tag, got, table) => {
  for (const [k, want] of Object.entries(table)) {
    const v = px(got[k]);
    check(`${theme} ${tag}: ${k} = ${want}px`, v === want, `${v}px`);
  }
};

(async () => {
  const hard = setTimeout(() => { log('HARD TIMEOUT'); process.exit(2); }, 540000);
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ timeout: 60000 });

  for (const theme of ['dark', 'light']) {
    /* ---- 1. the reported viewport, dialog open ---- */
    log(`\n================ ${theme} @ 1499x1101 (the reported viewport) ================`);
    const page = await signIn(browser, { width: 1499, height: 1101 }, theme);
    await openEdit(page);

    const t = await tabGeometry(page);
    log('tabs=' + t.count + ' listW=' + t.listW + ' tabStripTotal=' + Math.round(t.totalW) + ' overlaps=' + JSON.stringify(t.overlaps));
    for (const x of t.rects) log(`   "${x.text}" x=${x.x} w=${x.w}`);
    for (const i of t.icons) log('   icon ' + JSON.stringify(i));
    check(`${theme}: three tabs render`, t.count === 3, 'n=' + t.count);
    check(`${theme}: no tab overlaps its neighbour`, t.overlaps.length === 0, JSON.stringify(t.overlaps));
    check(`${theme}: no tab content spills out of its box`, t.spills.length === 0, JSON.stringify(t.spills));
    check(`${theme}: tab strip does not scroll`, t.listScrollW <= t.listW, t.listScrollW + ' <= ' + t.listW);
    check(`${theme}: icons never shrink`, t.icons.every((i) => i.shrink === '0'), JSON.stringify(t.icons.map((i) => i.shrink)));
    // The real assertion is the family: a monospace or inherited face has no
    // Material Symbols ligatures, so the raw ligature text gets painted.
    const fam = await page.evaluate(() =>
      [...document.querySelectorAll('.material-symbols-outlined')]
        .filter((el) => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '') !== 'Material Symbols Outlined')
        .map((el) => (el.textContent || '').trim().slice(0, 18)),
    );
    check(`${theme}: every icon resolves to the icon font`, fam.length === 0, JSON.stringify(fam));
    check(`${theme}: icon box is pinned to ~1.15em`, t.icons.every((i) => Math.abs(i.box - parseFloat(i.em) * 1.15) < 1.5), JSON.stringify(t.icons.map((i) => i.box + '/' + i.em)));

    const r = await radiiOf(page);
    log('dialog radii: ' + JSON.stringify(r));
    expectSet(theme, 'dialog', r, DIALOG_EXPECT);
    expectSet(theme, 'page', r, LIST_EXPECT);
    await page.screenshot({ path: `${SHOTS}/a926-edit-${theme}.png` });

    /* ---- 2. schedule tab: the one control that had no radius at all ---- */
    await page.getByRole('tab', { name: /Çalışma saatleri/ }).click({ timeout: 15000 });
    await page.waitForTimeout(900);
    const hour = await page.evaluate(() => {
      const el = document.querySelector('[role="dialog"] input[type="time"]');
      return el ? getComputedStyle(el).borderTopLeftRadius : null;
    });
    check(`${theme}: schedule time inputs are 8px`, px(hour) === 8, `${px(hour)}px`);
    await page.screenshot({ path: `${SHOTS}/a926-schedule-${theme}.png` });
    await page.context().close();

    /* ---- 3. list view at the same viewport ---- */
    log(`\n---------------- ${theme} list ----------------`);
    const p2 = await signIn(browser, { width: 1499, height: 1101 }, theme);
    const r2 = await radiiOf(p2);
    log('list radii: ' + JSON.stringify(r2));
    expectSet(theme, 'list', r2, LIST_EXPECT);
    check(`${theme}: no stray dialog is present`, px(r2.dialog) === null, String(r2.dialog));
    await p2.screenshot({ path: `${SHOTS}/a926-list-${theme}.png` });
    await p2.context().close();
  }

  /* ---- 4. regression: force the ligature to render as text everywhere ---- */
  log('\n================ icon-font-degradation regression ================');
  const p3 = await signIn(browser, { width: 1499, height: 1101 }, 'dark');
  await openEdit(p3);
  await p3.evaluate(() => {
    document.querySelectorAll('.material-symbols-outlined').forEach((el) => { el.style.fontFamily = 'sans-serif'; });
  });
  await p3.waitForTimeout(700);
  const f = await tabGeometry(p3);
  check('no overlap when every ligature renders as text', f.overlaps.length === 0, JSON.stringify(f.overlaps));
  check('no spill when every ligature renders as text', f.spills.length === 0, JSON.stringify(f.spills));
  await p3.screenshot({ path: SHOTS + '/a926-font-fallback.png' });
  await p3.context().close();

  await browser.close();
  clearTimeout(hard);
  log('\nverdict: ' + (fails === 0 ? 'PASS - 0 failures' : fails + ' FAILURE(S)'));
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { log('FATAL ' + e.message); process.exit(1); });