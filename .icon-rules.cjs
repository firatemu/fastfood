const fs = require('node:fs');
const OUT = '/mnt/c/Users/AZEM/AppData/Local/Temp/ff-build/icon-rules.log';
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

  const client = await ctx.newCDPSession(page);
  await client.send('DOM.enable');
  await client.send('CSS.enable');

  const { root } = await client.send('DOM.getDocument', { depth: -1, pierce: true });
  const { nodeId } = await client.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: '[role="dialog"] [role="tab"] .material-symbols-outlined',
  });

  const matched = await client.send('CSS.getMatchedStylesForNode', { nodeId });
  log('=== rules touching font-family on the tab icon ===');
  let n = 0;
  for (const e of matched.matchedCSSRules) {
    const decls = (e.rule.style.cssProperties || []).filter((p) => /font-family/.test(p.name));
    const inlined = (e.rule.style.shorthandEntries || []).filter((s) => /font/.test(s.name));
    if (!decls.length && !inlined.length) continue;
    n++;
    log(`  ${e.rule.selectorList.text}`);
    log(`     stylesheet: ${e.rule.style.styleSheetId}  origin: ${e.rule.origin}`);
    log(`     matchedSelectors: ${JSON.stringify(e.rule.matchedSelectors || [])}`);
    for (const p of decls) log(`     ${p.name}: ${p.value}  (${p.disabled ? 'DISABLED' : 'active'})`);
  }
  log('rules setting font-family: ' + n);

  // The same question for an icon that renders correctly.
  const { nodeId: goodId } = await client.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: '[role="dialog"] [class*="dialogGlyph"] .material-symbols-outlined',
  });
  const good = await client.send('CSS.getMatchedStylesForNode', { nodeId: goodId });
  log('\n=== working icon: rules touching font-family ===');
  for (const e of good.matchedCSSRules) {
    const decls = (e.rule.style.cssProperties || []).filter((p) => /font-family/.test(p.name));
    if (!decls.length) continue;
    log(`  ${e.rule.selectorList.text}  ->  ${decls.map((d) => d.name + ': ' + d.value).join('; ')}`);
  }

  await browser.close();
})().catch((e) => { log('FATAL ' + e.message); process.exit(1); });