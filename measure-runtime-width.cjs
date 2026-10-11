const { chromium } = require('playwright');

const API = 'http://localhost:4000/api/v1';
const ORIGIN = 'http://localhost:3101';

// Acquire a session through the real flow (same path the page uses).
async function getSession() {
  const login = await fetch(`${API}/auth/staff/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({ identifier: 'staff@fastfood.local', password: 'DevStaffPass1!' }),
  });
  const lj = await login.json();
  if (!lj.data) throw new Error('login failed: ' + JSON.stringify(lj).slice(0, 160));
  const verify = await fetch(`${API}/auth/staff/mfa/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({ refreshToken: lj.data.refreshToken, totp: '000000' }),
  });
  const vj = await verify.json();
  if (!vj.data) throw new Error('verify failed: ' + JSON.stringify(vj).slice(0, 160));
  return { accessToken: vj.data.accessToken, userId: vj.data.userId };
}

const ROUTES = [
  '/catalog/products', // reference the owner called correct
  '/couriers',
  '/branches',
  '/branches/availability',
  '/catalog/categories',
  '/catalog/modifiers',
  '/catalog/allergens',
  '/customers',
  '/loyalty',
  '/payments',
  '/promotions',
  '/roles',
  '/orders',
  '/users',
  '/dashboard-not-a-route',
];

(async () => {
  const session = await getSession();
  console.log('session acquired (accessToken len=' + session.accessToken.length + ')\n');

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript(
    ([t, u]) => {
      window.localStorage.setItem('ff_staff_access_token', t);
      window.localStorage.setItem('ff_staff_user_id', u);
    },
    [session.accessToken, session.userId],
  );

  console.log('route | http | content box | page root | padding | used');
  console.log('------+--------+--------------+-----------+---------+------');
  const results = [];
  for (const route of ROUTES) {
    const page = await ctx.newPage();
    let status = 0;
    try {
      const res = await page.goto(ORIGIN + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      status = res ? res.status() : 0;
      await page.waitForTimeout(700);
      const m = await page.evaluate(() => {
        const main = document.querySelector('.ops-main');
        if (!main) return null;
        const cs = getComputedStyle(main);
        const contentW = main.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const kid = main.firstElementChild;
        const kb = kid ? kid.getBoundingClientRect() : null;
        return {
          contentW: Math.round(contentW),
          rootW: kb ? Math.round(kb.width) : null,
          rootClass: kid ? kid.className.slice(0, 44) : null,
          rootPad: kid ? parseFloat(getComputedStyle(kid).paddingLeft) : null,
          scrollW: document.documentElement.scrollWidth,
        };
      });
      if (!m) {
        console.log(route.padEnd(6) + ' | ' + status + '   | no .ops-main');
      } else {
        const used = m.rootW ? Math.round(((m.rootW - (m.rootPad || 0) * 2) / m.contentW) * 100) : null;
        console.log(
          route.padEnd(16) +
            '| ' +
            String(status).padEnd(4) +
            '| ' +
            String(m.contentW).padEnd(12) +
            '| ' +
            String(m.rootW).padEnd(9) +
            '| ' +
            String(m.rootPad).padEnd(7) +
            '| ' +
            (used === null ? '-' : used + '%'),
        );
        results.push({ route, ...m, used });
      }
    } catch (e) {
      console.log(route.padEnd(16) + ' | ERROR ' + String(e.message).slice(0, 60));
    }
    await page.close();
  }

  await browser.close();

  // Compare every route against the reference.
  const ref = results.find((r) => r.route === '/catalog/products');
  console.log('\nreference /catalog/products: content=' + ref.contentW + ' root=' + ref.rootW);
  let narrow = 0;
  for (const r of results) {
    if (r.route === ref.route) continue;
    const gap = ref.contentW - r.rootW;
    const ok = Math.abs(gap) <= 2;
    if (!ok) narrow++;
    console.log((ok ? 'OK   ' : 'GAP  ') + r.route.padEnd(22) + ' gap=' + gap + 'px');
  }
  console.log('\nroutes narrower than the reference: ' + narrow);
})();