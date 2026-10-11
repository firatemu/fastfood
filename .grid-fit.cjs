const fs=require('fs');
const OUT='/mnt/c/Users/AZEM/AppData/Local/Temp/ff-build/grid-fit.log';
const log=m=>{fs.appendFileSync(OUT,m+'\n');process.stdout.write(m+'\n');};
fs.writeFileSync(OUT,'');
const ORIGIN='http://localhost:3101';
(async()=>{
  const {chromium}=require('playwright');
  const browser=await chromium.launch({timeout:60000});
  const ctx=await browser.newContext({viewport:{width:1499,height:1101}});
  await ctx.addInitScript(()=>{try{localStorage.setItem('fastfood-admin-color-mode','dark');}catch{}});
  const page=await ctx.newPage();
  await page.goto(ORIGIN+'/login',{waitUntil:'domcontentloaded',timeout:60000});
  for(let a=1;a<=5;a++){await page.waitForTimeout(a===1?3500:2500);
    await page.fill('#identifier','staff@fastfood.local');await page.fill('#password','DevStaffPass1!');
    await page.getByRole('button',{name:'Devam et'}).click();await page.waitForTimeout(4000);
    if(!page.url().includes('identifier='))break;
    await page.goto(ORIGIN+'/login',{waitUntil:'domcontentloaded',timeout:60000});}
  await page.waitForURL(u=>!u.pathname.startsWith('/login'),{timeout:45000});
  await page.locator('[data-admin-nav-item="branch-list"]').first().click({timeout:25000});
  await page.waitForFunction(()=>location.pathname==='/branches',{timeout:25000});
  await page.waitForTimeout(2500);
  const r=await page.evaluate(()=>{
    const sc=document.querySelector('[class*="tableScroll"]');
    const table=document.querySelector('table');
    const ths=[...document.querySelectorAll('table thead th')];
    return {
      viewport: innerWidth,
      scrollClient: sc.clientWidth,
      scrollContent: sc.scrollWidth,
      overflowBy: sc.scrollWidth - sc.clientWidth,
      tableW: Math.round(table.getBoundingClientRect().width),
      cols: ths.map(th=>({h:(th.textContent||'').replace(/\s+/g,' ').trim().slice(0,22), w:Math.round(th.getBoundingClientRect().width)})),
    };
  });
  log('viewport        '+r.viewport);
  log('scroll client   '+r.scrollClient);
  log('scroll content  '+r.scrollContent);
  log('OVERFLOW BY     '+r.overflowBy+'px');
  log('table width     '+r.tableW);
  log('columns:');
  for(const c of r.cols) log('   '+String(c.w).padStart(5)+'px  '+c.h);
  await browser.close();
})().catch(e=>{log('FATAL '+e.message);process.exit(1);});