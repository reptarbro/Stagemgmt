import pkg from '/home/user/Stagemgmt/node_modules/playwright-core/index.js'
const { chromium } = pkg
import fs from 'fs'

const FONTS = '/home/user/Stagemgmt/node_modules/@fontsource-variable'
const b64 = (p) => fs.readFileSync(p).toString('base64')
const mont = b64(`${FONTS}/montserrat/files/montserrat-latin-wght-normal.woff2`)
const rale = b64(`${FONTS}/raleway/files/raleway-latin-wght-normal.woff2`)
const OUT = '/tmp/claude-0/-home-user-Stagemgmt/4423f9ed-f345-5b67-ad63-46660ed64f9b/scratchpad'

const CUE = `<svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true"><rect x="21" y="9" width="22" height="46" rx="7" fill="#151b18" stroke="#9fb8a6" stroke-width="2"/><circle cx="32" cy="24" r="6" fill="#d9a441"/><circle cx="32" cy="41" r="6" fill="#1c7a4d" fill-opacity="0.6"/></svg>`

const CSS = `
@font-face{font-family:'Montserrat';src:url(data:font/woff2;base64,${mont}) format('woff2');font-weight:100 900;font-display:block}
@font-face{font-family:'Raleway';src:url(data:font/woff2;base64,${rale}) format('woff2');font-weight:100 900;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#0E1311; --panel:#151B18; --elev:#13251C; --card:#1a231e; --line:#26302A;
  --ivory:#F1EFE7; --dim:#A7B6AB; --faint:#7f8f83; --sage:#9FB8A6;
  --emerald:#2FAE6B; --deep:#1C7A4D; --amber:#D9A441;
}
:root[data-theme=light]{
  --bg:#F1EFE7; --panel:#FFFFFF; --elev:#FBFAF5; --card:#FFFFFF; --line:#D8D3C4;
  --ivory:#17201B; --dim:#3f4b43; --faint:#6c7a70; --sage:#3f6b52;
  --emerald:#1C7A4D; --deep:#0E5233; --amber:#9a6b16;
}
@page{size:Letter;margin:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Raleway',sans-serif;background:var(--bg);color:var(--ivory);font-size:11px;line-height:1.5}
.page{width:8.5in;height:11in;background:var(--bg);padding:0.5in 0.55in;position:relative;overflow:hidden;display:flex;flex-direction:column}
.page+.page{page-break-before:always}
.body{flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:10px}
h1,h2,h3,.wm{font-family:'Montserrat',sans-serif}
.hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:9px;margin-bottom:12px}
.brand{display:flex;align-items:center;gap:9px}
.wm{font-weight:800;letter-spacing:.14em;font-size:14px;text-transform:uppercase}
.sub{font-size:8px;letter-spacing:.16em;color:var(--faint);text-transform:uppercase;margin-top:1px}
.kick{font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--emerald);font-weight:700}
.title{font-size:25px;font-weight:800;line-height:1.08;letter-spacing:-.01em;margin:2px 0 6px}
.title .g{color:var(--emerald)}
.lead{color:var(--dim);font-size:11.5px;max-width:6.6in}
.grid{display:grid;gap:9px}
.g3{grid-template-columns:repeat(3,1fr)}
.g2{grid-template-columns:1fr 1fr}
.card{background:var(--card);border:1px solid var(--line);border-radius:9px;padding:12px 13px}
.card.em{border-color:rgba(47,174,107,.5)}
.ct{font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--emerald);font-weight:700;margin-bottom:5px;display:flex;align-items:center;gap:6px}
.pill-t{font-weight:700;font-size:12px;margin-bottom:3px}
.muted{color:var(--dim)}
.sec-h{display:flex;align-items:baseline;gap:8px;margin:14px 0 8px}
.sec-h h2{font-size:15px;font-weight:800}
.sec-h .n{width:19px;height:19px;border-radius:50%;background:var(--emerald);color:#08130c;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;font-family:'Montserrat'}
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.step{background:var(--card);border:1px solid var(--line);border-radius:9px;padding:11px;position:relative}
.step .num{font-family:'Montserrat';font-weight:800;color:var(--emerald);font-size:15px;line-height:1}
.step h3{font-size:11px;font-weight:700;margin:5px 0 3px}
.step p{font-size:9.5px;color:var(--dim);line-height:1.45}
.callout{background:linear-gradient(135deg,rgba(47,174,107,.14),rgba(28,122,77,.05));border:1px solid rgba(47,174,107,.45);border-radius:9px;padding:12px 14px}
table{width:100%;border-collapse:collapse;font-size:10px}
th,td{text-align:left;padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top}
thead th{background:var(--panel);color:var(--sage);font-size:8px;letter-spacing:.08em;text-transform:uppercase;font-weight:700}
tbody td:first-child{color:var(--ivory);font-weight:600;width:30%}
.tick{color:var(--emerald);font-weight:700}
.cross{color:var(--amber);font-weight:700}
.umb{display:flex;align-items:center;gap:10px}
.acct{flex:0 0 auto;width:118px;text-align:center;background:var(--elev);border:1px solid rgba(47,174,107,.4);border-radius:10px;padding:12px 8px}
.acct .em{color:var(--emerald);font-weight:800;font-family:'Montserrat';font-size:12px}
.shows{display:grid;grid-template-columns:1fr 1fr;gap:7px;flex:1}
.show{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 9px;font-size:10px;display:flex;justify-content:space-between;align-items:center}
.tag{font-size:7.5px;letter-spacing:.05em;text-transform:uppercase;border-radius:999px;padding:2px 7px;font-weight:700}
.tag.live{background:rgba(47,174,107,.18);color:var(--emerald)}
.tag.arch{background:rgba(159,184,166,.14);color:var(--sage)}
.tag.soon{background:rgba(217,164,65,.16);color:var(--amber)}
.faq{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.qa{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:11px 13px;break-inside:avoid}
.qa .q{font-weight:700;font-size:11px;margin-bottom:4px;display:flex;gap:6px}
.qa .q b{color:var(--emerald);font-family:'Montserrat'}
.qa .a{font-size:9.7px;color:var(--dim);line-height:1.5}
.foot{margin-top:auto;border-top:1px solid var(--line);padding-top:8px;display:flex;justify-content:space-between;font-size:8px;color:var(--faint);letter-spacing:.03em}
.spacer{flex:1}
.rowfill{display:grid;gap:9px;flex:1}
`

const page1 = `
<div class="page">
  <div class="hdr">
    <div class="brand">${CUE}<div><div class="wm">StandBy</div><div class="sub">Prompt Book</div></div></div>
    <div class="kick">Accounts &amp; Sign-In</div>
  </div>
  <div class="body">
  <div>
    <div class="kick">The short version</div>
    <div class="title">How signing in works, and why <span class="g">there is no password</span></div>
    <p class="lead">StandBy uses modern passwordless sign-in. You never create or remember a password. Instead, you prove it is you by receiving a one-time link at your own email. Here is exactly what happens, why it is secure, and how your shows stay organized under one account.</p>
  </div>

  <div class="grid g3">
    <div class="card"><div class="ct">${CUE.replace(/34/g,'14')} Local first</div><div class="pill-t">Works with no account</div><div class="muted">Create a production and run your whole show on one device without ever signing in. Signing in is optional, and only adds syncing.</div></div>
    <div class="card"><div class="ct">🔑 Passwordless</div><div class="pill-t">Nothing to forget</div><div class="muted">No password to set, store, or leak. You sign in with a single-use link sent to your email, the same method banks and Slack use.</div></div>
    <div class="card"><div class="ct">🔒 Private by design</div><div class="pill-t">Only you can read it</div><div class="muted">Your cast contacts and emergency details are locked to your account. No one else, and no other user, can reach them.</div></div>
  </div>

  <div>
  <div class="sec-h" style="margin:0 0 8px"><span class="n">1</span><h2>Signing in, step by step</h2></div>
  <div class="steps">
    <div class="step"><div class="num">1</div><h3>Type your email</h3><p>On the Settings screen, open Cloud Sync and enter your email address. That address is the only thing you provide.</p></div>
    <div class="step"><div class="num">2</div><h3>We send a link</h3><p>StandBy asks its secure server to email you a one-time sign-in link. The app already knows how to reach that server, so nothing is set up in advance.</p></div>
    <div class="step"><div class="num">3</div><h3>Open it on that device</h3><p>Tap the link in your inbox on the same device. Your account is created automatically the first time, with no separate signup.</p></div>
    <div class="step"><div class="num">4</div><h3>You are in</h3><p>You return to StandBy signed in. Push your show to the cloud, then Pull it onto any other device where you sign in with the same email.</p></div>
  </div>

  </div>

  <div class="callout">
    <div class="ct">Is it safe without a password?</div>
    <p style="font-size:10.5px;color:var(--dim);line-height:1.5">Yes, and it is generally safer. A password can be guessed, reused across sites, phished, or leaked in a breach. A one-time link cannot: it works once, it expires quickly, and it only helps someone who can already open your email inbox. Access to your inbox becomes the proof of identity, which is exactly how password resets already work on every other service, just without the extra password step in front.</p>
  </div>

  <div class="card em">
    <div class="ct">Remember this</div>
    <p style="font-size:11.5px;color:var(--ivory);line-height:1.55"><b>Your email is your account.</b> There is no registration form and no password vault. The first time you request a link, the account is created for that address on the spot. Sign in with the same email anywhere, and the same shows follow you.</p>
  </div>
  </div>

  <div class="foot"><span>StandBy, the stage manager's prompt book</span><span>Accounts &amp; Sign-In, page 1 of 3</span></div>
</div>`

const page2 = `
<div class="page">
  <div class="hdr">
    <div class="brand">${CUE}<div><div class="wm">StandBy</div><div class="sub">Prompt Book</div></div></div>
    <div class="kick">Accounts &amp; Sign-In</div>
  </div>

  <div class="body">
  <div class="sec-h"><span class="n">2</span><h2>Password login versus StandBy sign-in</h2></div>
  <table>
    <thead><tr><th>What people worry about</th><th>Traditional password login</th><th>StandBy passwordless sign-in</th></tr></thead>
    <tbody>
      <tr><td>Setup</td><td class="cross">Create an account, invent a password, confirm it</td><td class="tick">Type your email once, and you are done</td></tr>
      <tr><td>Forgetting it</td><td class="cross">A forgotten password blocks you until you reset</td><td class="tick">Nothing to forget, request a fresh link anytime</td></tr>
      <tr><td>If a database leaks</td><td class="cross">Leaked passwords get reused on your other accounts</td><td class="tick">No password exists to leak</td></tr>
      <tr><td>Phishing</td><td class="cross">A fake page can capture a typed password</td><td class="tick">A link is single-use and tied to your inbox</td></tr>
      <tr><td>Using it day to day</td><td class="cross">Type a password on every new device</td><td class="tick">One tap from your inbox on each device</td></tr>
      <tr><td>Who can read your data</td><td>Depends on the account</td><td class="tick">Only your signed-in account, enforced by the server</td></tr>
    </tbody>
  </table>

  <div class="sec-h"><span class="n">3</span><h2>One account, all of your shows</h2></div>
  <p class="lead" style="margin-bottom:9px">You do not need a separate login for each production. Signing in gives you one umbrella account, and every show you create lives under it. Switch between them from the sidebar, and keep past shows tidy by archiving them.</p>
  <div class="umb">
    <div class="acct">${CUE}<div class="em" style="margin-top:5px">Your account</div><div style="font-size:8.5px;color:var(--faint)">you@email.com</div></div>
    <div style="color:var(--emerald);font-size:20px;font-weight:800">&rarr;</div>
    <div class="shows">
      <div class="show"><span>Hedda Gabler</span><span class="tag live">Active</span></div>
      <div class="show"><span>A Midsummer Night's Dream</span><span class="tag live">Active</span></div>
      <div class="show"><span>Twelfth Night, 2025</span><span class="tag arch">Archived</span></div>
      <div class="show"><span>The Crucible, 2024</span><span class="tag arch">Archived</span></div>
    </div>
  </div>

  <div class="grid g2" style="margin-top:12px">
    <div class="card"><div class="ct">Switching shows</div><div class="pill-t">Available now</div><div class="muted">Use New or Switch Production in the sidebar to jump between every show on your account. Each keeps its own people, schedule, scenes, props, and reports.</div></div>
    <div class="card"><div class="ct">Archiving <span class="tag soon" style="margin-left:4px">Planned</span></div><div class="pill-t">Retire a finished show</div><div class="muted">Archiving will hide a wrapped production from your main list without deleting it, and move it into an Archived section you can reopen or restore anytime.</div></div>
  </div>

  <div>
    <div class="ct" style="margin-bottom:7px">Once you are signed in</div>
    <div class="grid g3">
      <div class="card"><div class="pill-t" style="color:var(--emerald)">&uarr; Push</div><div class="muted">Save this device's latest work to your private cloud space.</div></div>
      <div class="card"><div class="pill-t" style="color:var(--emerald)">&darr; Pull</div><div class="muted">Bring the cloud copy onto any other device you sign in to.</div></div>
      <div class="card"><div class="pill-t" style="color:var(--emerald)">&#8635; Switch</div><div class="muted">Move between every production on your account from the sidebar.</div></div>
    </div>
  </div>

  <div class="callout">
    <div class="ct">Where your data lives</div>
    <p style="font-size:10.5px;color:var(--dim);line-height:1.5">Every show always exists on your own device first. When you sign in and Push, an encrypted copy is saved to your private cloud space so another device can Pull it. Signed out, nothing ever leaves the device. You are always holding your own data, and the cloud is only a mirror you choose to turn on.</p>
  </div>
  </div>

  <div class="foot"><span>StandBy, the stage manager's prompt book</span><span>Accounts &amp; Sign-In, page 2 of 3</span></div>
</div>`

const faqs = [
  ['Do I even need to sign in?', 'No. StandBy is fully usable on one device with no account. Sign in only when you want the same show on your iPad, phone, and computer at once.'],
  ['How does the app email me if I never registered?', 'The app ships already knowing how to reach StandBy\'s secure server. When you type your email, it asks that server to send the link, and your account is created for that address on the spot.'],
  ['What if the email does not arrive?', 'Check spam or promotions, then use Resend. Free email has a small hourly limit, so if you are signing in on several devices at once, wait a few minutes between them.'],
  ['Is a one-time link really secure?', 'Yes. The link works once, expires quickly, and only helps someone who can already open your inbox. It cannot be reused, and there is no stored password to steal.'],
  ['What if I lose access to my email?', 'The cloud copy is tied to that address, so keep a file backup as insurance (Settings, Export). A second sign-in method with Google is on the roadmap for extra safety.'],
  ['Can anyone else see my cast\'s contacts?', 'No. The server enforces that only your signed-in account can read your data. The key inside the app cannot bypass that rule, so no other user can reach your shows.'],
  ['Do I need internet to use StandBy?', 'No. Everything works offline on your device. Internet is only needed at the moment you Push or Pull to sync.'],
  ['How do I use it on more than one device?', 'Sign in with the same email on each device. Push from the device that has your latest work, then Pull on the others.'],
  ['Can I keep more than one production?', 'Yes. All of your shows live under one account. Switch between them from the sidebar, with no extra login per show.'],
  ['Can I archive an old show?', 'Soon. Archiving will move a finished production into a separate list, hidden from your day to day view but never deleted, and reopenable anytime.'],
  ['Can my ASM or team share a show with me?', 'Not yet. Today each person has their own account. Shared productions for a team are planned. For now you can hand off a full backup file to a colleague.'],
  ['What does an account cost?', 'Nothing. Accounts and cloud sync are free.'],
  ['Can I sign in with Google instead?', 'That option is planned. Google sign-in will let you sign in with one tap and no email step at all, alongside the email link.'],
  ['How do I sign out or switch accounts?', 'Open Settings, then Cloud Sync, and tap Sign out. Your data stays on the device, and you can sign back in, or use a different email, anytime.'],
  ['Is this less legitimate than a password app?', 'No. One-time links and codes are used by banks, Slack, and government portals. It is a recognized, secure standard, not a shortcut.'],
  ['Will I get signed out at random?', 'No. Once a device is signed in, it stays signed in until you choose to sign out, so you are not asked for a new link every time you open the app.'],
]

const page3 = `
<div class="page">
  <div class="hdr">
    <div class="brand">${CUE}<div><div class="wm">StandBy</div><div class="sub">Prompt Book</div></div></div>
    <div class="kick">Accounts &amp; Sign-In</div>
  </div>
  <div class="body">
  <div>
  <div class="sec-h"><span class="n">4</span><h2>Frequently asked questions</h2></div>
  <div class="faq">
    ${faqs.map(([q,a])=>`<div class="qa"><div class="q"><b>Q</b><span>${q}</span></div><div class="a">${a}</div></div>`).join('')}
  </div>
  </div>
  <div class="callout">
    <div class="ct">The bottom line</div>
    <p style="font-size:11px;color:var(--dim);line-height:1.55">Passwordless sign-in is not a workaround, it is a deliberate, modern choice used across banking, healthcare, and major workplace tools. It removes the weakest link in most accounts, the password, while keeping your data private to you and portable across every device you use.</p>
  </div>
  </div>
  <div class="foot"><span>StandBy, the stage manager's prompt book</span><span>Accounts &amp; Sign-In, page 3 of 3</span></div>
</div>`

const html = (theme) => `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${page1}${page2}${page3}</body></html>`

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
for (const [theme, name] of [['dark','StandBy-How-SignIn-Works.pdf'],['light','StandBy-How-SignIn-Works-Print-Light.pdf']]) {
  const page = await browser.newContext().then(c=>c.newPage())
  await page.setContent(html(theme), { waitUntil: 'networkidle' })
  await page.emulateMedia({ media: 'print' })
  await page.pdf({ path: `${OUT}/${name}`, width: '8.5in', height: '11in', printBackground: true, pageRanges: '1-3' })
  if (theme==='dark') { await page.screenshot({ path: `${OUT}/login_p1.png`, clip: {x:0,y:0,width:816,height:1056} }); }
  await page.close()
}
fs.writeFileSync(`${OUT}/how-sign-in-works.html`, html('dark'))
await browser.close()
console.log('DONE')
