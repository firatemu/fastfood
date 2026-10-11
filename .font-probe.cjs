const fs = require('node:fs');
const OUT='/mnt/c/Users/AZEM/AppData/Local/Temp/ff-build/font-probe.log';
const log=m=>{fs.appendFileSync(OUT,m+'\n');process.stdout.write(m+'\n');};
fs.writeFileSync(OUT,'');
const ORIGIN='http://localhost:3101';
async function signIn(browser){
  const ctx=await browser.newContext({viewport:{width:1499,height:1101}});
  await ctx.addInitScript(()=>{try{localStorage.setItem('fastfood-admin-color-mode','dark');}catch{}});
  const page=await ctx.newPage();
  const failed=[];
  page.on('requestfailed', r=>failed.push(r.url().slice(0,90)+' :: '+(r.failure()&&r.failure().errorText)));
  page.on('response', r=>{ if(r.url().includes('fonts.g')) log('RESP '+r.status()+' '+r.url().slice(0,120)); });
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
  await page.locator('tr[aria-label$="şubesini düzenle"]').first().click({timeout:25000});
  await page.waitForSelector('[role="dialog"]',{timeout:25000});
  await page.waitForTimeout(2500);
  return {page,failed};
}
(async()=>{
  const {chromium}=require('playwright');
  const browser=await chromium.launch({timeout:60000});
  const {page,failed}=await signIn(browser);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1500);
  const info=await page.evaluate(()=>{
    const cs=(el)=>{const c=getComputedStyle(el);return{family:c.fontFamily.split(',')[0].replace(/["']/g,''),size:c.fontSize,weight:c.fontWeight,feature:c.fontFeatureSettings,variation:c.fontVariationSettings,lig:c.fontVariantLigatures,display:c.display,w:c.width,h:c.height};};
    const tab=[...document.querySelectorAll('[role="dialog"] [role="tab"]')].map(t=>{
      const i=t.querySelector('.material-symbols-outlined');
      return {text:(i&&i.textContent||'').trim(),cls:i&&i.className,...(i?cs(i):{})};
    });
    const glyph=document.querySelector('[role="dialog"] [class*="dialogGlyph"] .material-symbols-outlined');
    const secIcon=document.querySelector('[role="dialog"] section[class*="formSection"] .material-symbols-outlined');
    return {
      fontAvailable: document.fonts.check('18px "Material Symbols Outlined"'),
      loadedFaces:[...document.fonts].map(f=>f.family+':'+f.status).slice(0,8),
      tabIcons:tab,
      dialogGlyph: glyph?{text:glyph.textContent.trim(),cls:glyph.className,...cs(glyph)}:null,
      formSectionIcon: secIcon?{text:secIcon.textContent.trim(),cls:secIcon.className,...cs(secIcon)}:null,
      theme: document.documentElement.getAttribute('data-admin-theme'),
    };
  });
  log(JSON.stringify(info,null,1));
  log('--- failed requests ---'); log(failed.length?failed.join('\n'):'(none)');
  await browser.close();
})().catch(e=>{log('FATAL '+e.message);process.exit(1);});