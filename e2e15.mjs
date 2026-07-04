import { chromium } from 'playwright-core'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'})
const ctx=await b.newContext({viewport:{width:420,height:900}, acceptDownloads:true})
const p=await ctx.newPage()
const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
const nav=async(name)=>{ await p.locator('.topbar .icon-btn').first().click(); await p.locator(`.sidebar.open a.nav-link:has-text("${name}")`).click() }
let step='load'
try{
  await p.goto('http://localhost:4178/',{waitUntil:'networkidle'})
  await p.getByText('Explore a sample production').click(); await p.waitForSelector('text=A Midsummer',{timeout:8000})
  step='signin'; await nav('Schedule'); await p.waitForSelector('text=Opening night',{timeout:8000})
  await p.getByText('🖊 Sign-in').first().click(); await p.waitForSelector('text=Time in',{timeout:6000})
  await p.keyboard.press('Escape')
  console.log('sign-in sheet OK')
  step='people'; await nav('People'); await p.getByText('Paste list').click()
  await p.locator('.modal textarea').fill('Zoe Test, Actor, Cobweb\nAlex Crew, ASM')
  await p.getByRole('button',{name:/Add 2 people/}).click(); await p.waitForSelector('td:has-text("Zoe Test")',{timeout:6000})
  console.log('bulk add OK')
  step='reports'; await nav('Reports'); await p.getByRole('button',{name:'View'}).first().click()
  await p.waitForSelector('text=Ready to distribute',{timeout:6000})
  console.log('report email+copy:', (await p.getByRole('button',{name:'✉ Email'}).count())>0 && (await p.getByText('⧉ Copy').count())>0)
  step='settings'; await p.keyboard.press('Escape'); await nav('Settings'); await p.waitForSelector('text=Send feedback',{timeout:6000})
  console.log('feedback button OK')
  console.log('ALL STEPS PASSED')
}catch(e){ console.log('FAILED at', step, '-', e.message.split('\n')[0]) }
console.log('ERRORS:', errs.length?errs:'none')
await b.close()
