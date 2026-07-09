# StandBy — Roadmap (canonical)

This is the forward plan. Older notes (`PHASE2.md`, `FEEDBACK.md`, `PROJECT.md`)
are historical and superseded by this file.

## Where the numbering stands
- **Phase 1 — Build the app.** Done and live (v1 through v3.6).
- **Phase 2 — The cloud shift.** In progress. **v4.0 shipped the core of it:**
  accounts and cross-device sync (this was item "2b" in the old `PHASE2.md`),
  passwordless sign-in (Google and email), complete backups, and PWA
  auto-update. Verified live: a production moved iPad to cloud to desktop.

The remaining work to reach public availability and revenue is broken into the
stages below. Older feature ideas (a shareable read-only link, a cast
availability form, call-time reminders) are folded in where they fit.

---

## Stage 2.1 — Make it trustworthy for people who are not you
*Goal: a stranger signs up and runs a whole show without you in the room.
Estimate: 1 to 2 focused weeks.*

- **Auto-sync (in progress now).** Push on change and pull on open, so users
  never think about Push and Pull. Manual controls stay as a backup.
- **Open Google sign-in.** Move the OAuth consent screen out of "Testing" so any
  Google account works, not only listed test users.
- **Real email.** Add a sending service (Resend) with a verified domain so magic
  links are not rate-limited and do not land in spam.
- **Account basics — done.** "Delete my account and data" (guarded delete in
  Settings → Cloud Sync; the `delete_account` RPC is installed, so it removes
  cloud data, Storage files, and the auth account) and a clear "signed in as".
- **Safety net.** Error monitoring (Sentry free tier).

**Done when:** a brand-new account can sign in, sync across two devices, and
delete everything, with no help.

## Stage 2.2 — Become a legitimate public product
*Goal: anyone can find it and use it without you assuming legal risk.
Estimate: 1 to 2 weeks plus outside help.*

- **Custom domain** (for example getstandby.app). Better URL, email delivery,
  and sign-in branding. About 15 dollars a year.
- **Privacy Policy and Terms of Service. Hard blocker — drafted and live.**
  Plain-language, app-specific pages ship at `/privacy` and `/terms` (in-app
  routes; linked from Welcome + Settings), covering local-first storage,
  Supabase as processor, Google/email sign-in, third-party personal data, and
  the export/delete rights that already exist. **Still to do:** have a lawyer
  review before taking money, and set the contact address (currently the account
  email). Note: these are JS-rendered routes — if Google's OAuth verifier needs
  a no-JS-crawlable URL, add static mirrors under `public/` at that point.
- **Data rights.** Document what is stored, for how long, and how to export or
  delete it. The export and delete building blocks already exist.
- **Supabase Pro** (about 25 dollars a month) once real users arrive, so the
  project does not pause after inactivity and gets daily backups.
- **A one-page marketing site** from the existing deck and screenshots.
- **Privacy-friendly analytics** (for example Plausible).
- Folds in the old **2a shareable read-only link** as an adoption hook.

**Done when:** a stranger can land on the site, understand it and how their data
is handled, and start using it.

## Stage 2.3 — Charge for it
*Goal: revenue tied to the value already built. Estimate: 1 to 2 weeks.*

- **Model: freemium, paywall on sync.** Free covers one production on a single
  device. Paid unlocks cloud sync across devices and unlimited productions. The
  paywall sits exactly on the thing people want and cannot easily do themselves.
- **Storage tiers (Assets).** The Assets area (headshots, contracts, budgets,
  design plates — arbitrary files, shipped) is the main driver of cloud-storage
  cost, so it doubles as a natural paid lever. Free keeps assets on-device and in
  exported backups; paid syncs them across devices with a generous per-account
  allowance (e.g. a few GB). A heavier **storage add-on / Company tier** covers
  companies that keep large design or video files. Surface a usage meter in
  Settings so it never surprises anyone, and gate uploads gracefully (keep the
  file local, prompt to upgrade) rather than failing mid-show.
- **Billing with Stripe.** Stripe Checkout for subscriptions and the Customer
  Portal for self-serve. A Supabase Edge Function receives Stripe webhooks and
  sets a `plan` flag on the user; the app unlocks cloud features when `plan` is
  paid. Stripe takes roughly 2.9 percent plus 30 cents per charge, no monthly fee.
- **Starter pricing.** An individual tier around 6 to 9 dollars a month, or a
  per-season pass around 29 dollars, with a 14-day free trial.

**Done when:** someone who is not you enters a card and gets cloud sync, and the
charge appears in Stripe.

## Stage 2.4 — Grow, and sell to companies
*Goal: higher-value customers and word of mouth. Ongoing.*

- **Shared productions** (stage manager, ASM, producers, with roles). Justifies a
  Company or Team plan at a higher price.
- **Retention features:** archiving finished shows, call-time reminders (old 2d),
  a cast availability form (old 2c), script-page linking.
- **Distribution:** stage-management communities and unions, theatre schools,
  and word of mouth, seeded by the pitch deck and release notes.

---

## Hard blockers for "public and paid"
1. Privacy Policy and Terms (third-party personal data). Non-negotiable.
2. Google OAuth published out of Testing, and real email via Resend.
3. Auto-sync, so the core promise is effortless.
4. Stripe billing plus a paid/free gate.
5. Supabase Pro so nothing pauses or is lost.

## Rough running costs at launch
Domain about 15 dollars a year, Supabase Pro about 25 dollars a month, Resend
free to start, Stripe per-transaction only. Roughly 25 to 30 dollars a month plus
Stripe's cut until volume grows. Note on storage: the free Supabase tier includes
1 GB of file storage and Pro includes 100 GB — that pool is what the Assets
feature consumes, so it's the cost line to watch as uploads grow, and the reason
asset storage is a paid lever above.

## Recommended sequencing
Finish **2.1**, then run a small closed beta (5 to 10 stage managers) on the free
tier before spending. Do **2.2 and 2.3** together, since legal, domain, and
billing are the launch bundle. Hold **2.4** until people pay for sync, so the
market confirms it is worth building.

---

## Appendix A — Closed-beta invite (draft)

> **Subject: Want to test StandBy, a prompt book that finally follows your show
> across devices?**
>
> Hi [name],
>
> I built a stage-management app called StandBy: a digital prompt book for your
> cast and crew list, schedule and call times, attendance, scenes, props, line
> notes, and reports. It is free, it works offline, and it now syncs a whole
> production across your iPad, phone, and laptop with one sign-in.
>
> I am running a small, free beta and would love your eyes on it during a real
> show. There is nothing to install: open the link, tap "Explore a sample
> production" to look around, or start your own.
>
> Try it: https://reptarbro.github.io/Stagemgmt/
>
> Two things that help me most: tell me where it felt slow or confusing, and tell
> me the one feature that would make you actually use it on your next show. There
> is a "Send feedback" button in Settings, or just reply here.
>
> Your data stays private to you (it lives on your device, and in your own
> account only if you sign in). Thank you for helping shape it.
>
> [your name]

## Appendix B — Free vs Paid split (draft)

Model: **freemium, with the paywall on cross-device sync**, because sync is the
proven, hard-to-replicate value.

| Capability | Free | Paid |
|---|---|---|
| Core prompt book (people, schedule, scenes, props, line notes, reports) | Yes | Yes |
| Works offline, local-first | Yes | Yes |
| Number of productions | 1 active | Unlimited |
| Export and import backup files | Yes | Yes |
| Printable and PDF sheets | Yes | Yes |
| Cloud sync across devices | No | Yes |
| Cloud backup and restore of a lost device | No | Yes |
| Uploaded script and sign-in photos synced | No | Yes |
| Assets (headshots, contracts, budgets, design files) | On device + in backups | Synced, with a larger storage allowance |
| Archiving finished shows | No | Yes |
| Priority support | No | Yes |
| Shared productions and team roles (Stage 2.4) | No | Team plan |

Two pricing options to test:
- **Monthly:** individual around 6 to 9 dollars a month, with a 14-day free trial.
- **Season pass:** around 29 dollars for a fixed run, which matches how contract
  and community theatre budgets actually work.

A **Company / Team** tier arrives with shared productions in Stage 2.4, priced
per active production or per seat.
