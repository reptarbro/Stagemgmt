# Standby — Session Handoff

Snapshot for continuing work in a fresh session. **Standby** is a local-first
stage-management web app (a digital prompt book) for stage managers.

## Start a new session (copy/paste this)

Open a new session on the `reptarbro/Stagemgmt` repo and paste this as the first
message:

> Continue work on the Standby stage-manager app. Read `HANDOFF.md` first (this
> file) — it has the architecture, branch, and everything shipped so far — then
> read `ROADMAP.md` for the forward plan. Work on branch
> `claude/modal-form-ui-fixes-xjfci8` (it mirrors `main`). The app is live at
> https://reptarbro.github.io/Stagemgmt/ and is at **v4.0+**. **Stage 2.1 (harden
> the beta) is done:** cross-device auto-sync is verified on two devices, sync
> conflicts surface a banner, and "Delete account & data" works end-to-end.
> **Stage 2.2 (go public) is underway:** Privacy Policy + Terms are live
> (`/privacy`, `/terms`) and a marketing one-pager is live at `/site/`. **Next
> up:** pick and wire a custom domain (see "Domain decision" in HANDOFF), then
> publish Google OAuth out of "Testing." After any change: verify, commit (with
> the required trailers), push to `main`, mirror the dev branch, and confirm the
> Pages deploy is green.

**Backups are safe but optional now:** your data lives in this browser AND (when
signed in) in the cloud. **Settings → Export backup** saves a full bundle
(data + uploaded script/photos) as insurance. New deploys do **not** erase local
data.

**When reporting a bug:** where (page/module) · what you did · what happened vs.
what you expected · a screenshot if handy · which device/browser.

## Where it lives
- **Live site:** https://reptarbro.github.io/Stagemgmt/
- **Repo:** reptarbro/Stagemgmt
- **Default branch:** `main` (deploys to GitHub Pages on every push)
- **Dev branch:** `claude/modal-form-ui-fixes-xjfci8` (kept in sync with `main`)

## Stack & architecture
- React 18 + TypeScript + Vite; `HashRouter`; `base: './'`.
- **Local-first, optional cloud:** app state → `localStorage`; binary files
  (uploaded script, signed sign-in sheets) → IndexedDB. Signed in, the same
  state syncs to Supabase (see below); signed out, nothing leaves the device.
  - `src/lib/store.tsx` — React context store + actions.
  - `src/lib/storage.ts` — persistence, migrations (`normalizeProduction`),
    IndexedDB helpers (`putFile`/`getFile`/`deleteFile`, `getAllFiles`,
    `signInKey`).
  - `src/lib/types.ts` — domain model.
  - `src/lib/backup.ts` — full bundle export/import (data model **+** IndexedDB
    binaries as base64): `buildBundleString`, `applyBackupText`.
- **Cloud Sync (`src/lib/cloud/`):**
  - `config.ts` — Supabase URL + **publishable** anon key + `CLOUD_ENABLED`
    (browser-safe; committed on purpose).
  - `client.ts` — lazy Supabase client (`flowType:'implicit'`,
    `detectSessionInUrl`, storageKey `standby.auth`); created at boot in
    `main.tsx` so magic-link/OAuth tokens are consumed on any route.
  - `sync.ts` — `pushAll` / `pullAll` (data row + Storage binaries),
    `fetchCloudState`, `cloudHasData`, `dataSignature` (djb2),
    `syncedSignature`/`setSyncedSignature`, `lastSyncedAt`.
  - `src/components/CloudSync.tsx` — Settings card: sign in (Google + email),
    manual Push/Pull, sign out, and a guarded **Delete account & cloud data**
    action (danger zone).
  - `sync.ts` also has `deleteCloudData` (removes the app_state row + all
    Storage binaries) and `deleteAuthAccount` (calls the `delete_account` RPC).
  - `supabase/delete_account.sql` — one-time SQL to install the `delete_account`
    RPC so account deletion also removes the auth user (run in the SQL editor).
  - `src/components/CloudAutoSync.tsx` — Stage 2.1 engine (renders null):
    reconcile on sign-in / focus / return-to-foreground / 30s poll / **Realtime
    push**, debounced push-on-change with a flush on hide/close, never
    auto-clobbers when both sides changed. Conflict detection is by **signature**
    (`cloudSig !== syncedSignature`), not wall-clock — the old timestamp check
    mis-fired when `lastSyncedAt` was null and silently dropped new edits (the
    "uploaded asset keeps disappearing" bug). Mounted in `App.tsx`.
  - **Realtime auto-sync:** subscribes to the user's `app_state` row via Supabase
    Realtime; a remote change triggers `reconcile()` (~1s), so another device's
    save lands without waiting for the poll. Reuses reconcile's safety (pulls
    only when this device has no unsynced edits). Needs the table in the
    `supabase_realtime` publication — run `supabase/enable_realtime.sql` ONCE;
    until then the 30s poll is the fallback. `src/lib/cloud/auth.ts` exposes
    `useSignedIn()`; the "data lives on this device only" backup nudge in
    `App.tsx` is suppressed when signed in (cloud is the backup).
  - `src/lib/cloud/status.ts` — observable sync state (`useSyncStatus`):
    idle/syncing/synced/conflict/error. Drives the amber **sync-conflict
    banner** (`App.tsx`) and the live status + resolve-guidance in `CloudSync`.
  - `src/components/GoogleG.tsx` — Google "G" mark.
- **UI:** `src/components/App.tsx` (routes + `Shell` sidebar layout),
  `src/components/ui.tsx` (`Modal` — body-portaled), `PrintSheet.tsx`
  (print/PDF sheets), `src/styles/global.css` (theme + responsive rules).
- **Modules** (`src/modules/`): Welcome, Hub, People, Schedule, Scenes, Props,
  LineNotes, Script, Assets, CueToCue, Reports, Settings, Legal (Privacy/Terms).
- **Assets** (`src/modules/Assets.tsx`): a general file drawer per production —
  headshots, contracts, budgets, design plates, any file. Multi-file upload files
  each immediately with a guessed category (rename / re-file / link-to-person /
  note via the row ✎). Bytes live in IndexedDB under `asset:<id>` (`assetKey`), so
  they ride the existing binary path — cloud sync (`getAllFiles`) and full backups
  (`buildBundleString`) — with no extra wiring. Store actions: `addAsset`,
  `updateAsset`, `getAssetURL`, `removeAsset`. Model: `Asset`/`AssetCategory` +
  `Production.assets` (types.ts), defaulted in `normalizeProduction`. Larger
  cloud storage is the planned paid lever — see ROADMAP Stage 2.3.
- **Link-preview cards (two, 1200×630 @2×):** the app and the marketing site
  preview differently. `public/og-app.png` — "▶ Open the app" pill + feature
  strip, wired in `index.html` (title "open your prompt book"). `public/og-card.png`
  — the tagline poster ("a digital binder for stage managers"), wired in
  `public/site/index.html` (the pitch page). Both set via `og:*`/`twitter:*` tags
  with absolute URLs. Regenerate from the scratchpad HTML → Chromium screenshot
  pattern. Social caches are sticky; re-scrape via each platform's debugger or a
  `?v=` cache-buster after changing them.
- **Legal:** `src/modules/Legal.tsx` renders standalone `/privacy` and `/terms`
  pages (top-level routes, no active production needed), linked from Welcome and
  Settings. Plain-language, app-specific. Update `UPDATED`/`CONTACT` constants
  there when the text or contact changes. Needs counsel review before monetizing
  (see ROADMAP Stage 2.2).
- **Theme:** T-REX × brooklynONE palette (near-black bg, ivory text, sage +
  emerald accents); Montserrat (display) + Raleway (body) via @fontsource.

## Build / run / deploy
- Install: `npm ci` · Dev: `npm run dev` · Build: `npm run build` (→ `dist/`).
- Deploy: push to `main` → `.github/workflows/deploy.yml` (main-only,
  no-cancel concurrency, **3 deploy attempts** with back-off for transient
  GitHub Pages errors).
- Sync dev branch after a push: `git branch -f claude/modal-form-ui-fixes-xjfci8 main`
  then `git push -f origin claude/modal-form-ui-fixes-xjfci8`.

## Verification harness (no test framework)
- `playwright-core` (reinstall with `npm i playwright-core --no-save` if pruned)
  driving Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
  against `npx vite preview`. Ad-hoc scripts live in the scratchpad.

## Shipped so far (through v4.0 — cross-device sync)
- v1: base modules + screenshot-driven revisions.
- Rebrand to sage/emerald; renamed to **Standby**; favicon-matched colors.
- Home landing page (create / open existing / sample); deploy hardening.
- v2: copy/labels, tappable Hub tiles, switch-production menu, print/PDF
  overhaul (`PrintSheet` + jsPDF), calendar legend, Dress Rehearsal type.
- v3: cast-first roster sort; **past-event sign-in upload/view** (IndexedDB);
  killed the negative-space / endless-scroll void (app-shell scroll model).
- v3.5: **all modals body-portaled** (fixed iOS clipping behind sidebar);
  responsive audit at 390/834/1440 (no page-level horizontal overflow, table
  scroll affordance, Reports card fix); report PDF **white background**;
  Reports action → **Download PDF** (clean title) + **Email** (mailto with the
  subject pre-filled, no body).
- v3.6 (branch `claude/modal-form-ui-fixes-xjfci8`): sidebar no longer
  `position:sticky` so modals never split behind it (z-index 1000); **Add
  Multiple People** modal (Group/Role dropdowns, Name/Character text, rows
  inherit prior group/role); emergency contact reduced to a 🚑 marker
  (name/number on hover-tap + detail view) and dropped from the printed cast
  sheet; removed the eye (👁) emoji app-wide; date/time inputs render as
  full-width left-aligned boxes on every engine (no iOS "skinny/empty box");
  full-bleed dark app/browser icons (no white edges); a11y names on all
  icon-only buttons; responsive/overlap sweep at 390/412/834/1194/1440 (clean);
  availability conflicts extended to **date ranges + recurring weekly** with an
  Availability pass; **How Sign-In Works** explainer added to `pitch/`.
- **v4.0 — CROSS-DEVICE SYNC (milestone, tag `v4.0`).** The app is no longer
  local-only. Verified live: a production moved iPad → cloud → desktop.
  - **Cloud Sync (beta)** via **Supabase** (`src/lib/cloud/`): a per-user
    `app_state` jsonb row + a private Storage bucket for the script PDF /
    sign-in photos, guarded by row-level security. Manual Push / Pull for v1
    (last-write-wins, no silent clobber).
  - **Auth is passwordless:** email magic link (implicit flow, works
    cross-device) **and Google OAuth** ("Continue with Google"). Google client
    lives in Supabase (Auth → Providers → Google) — **secret is NOT in the
    repo** (public). Publishable Supabase creds are in `src/lib/cloud/config.ts`.
  - **Complete file backup** (`src/lib/backup.ts`): Export/Import now bundles
    the data model **plus** IndexedDB binaries; a fresh device can Import or
    sign in and **Load My Shows** straight from the Welcome page.
  - **Welcome condensed** ("the fold"): one create card + a compact
    Sign-in / Import / Sample row; **PWA auto-updates** on each deploy.
  - Supabase project ref: `owqthtxmwsjxqdmehkgz`. Google OAuth is configured
    (client in Supabase Auth → Providers → Google; **client secret is NOT in
    the repo** — it's public — kept only in Supabase + a password manager).

## Current state (Stage 2.1 done · Stage 2.2 underway)
**Stage 2.1 — harden the beta — DONE:**
- **Auto-sync deployed, hardened, and two-device verified** (`CloudAutoSync`):
  pushes on change (2.5s debounce), **flushes the pending push when the app is
  hidden/closing**, and reconciles on sign-in, **on focus/return to the
  foreground, and on a 30s poll while open**. Never auto-clobbers when both sides
  changed — that's left to manual Push/Pull. (Fixed the reported "desktop edits
  didn't reach the iPad" bug: the receiving device used to reconcile only once at
  sign-in, and the debounced push could be lost on close.) The debounced push now
  runs *through* `reconcile()` (not a blind `pushAll`), and `flushPush` bails when
  a conflict is already known — so a pending push can no longer clobber the cloud
  after a conflict was detected. The never-auto-clobber guarantee now actually
  holds for the debounce/flush paths, not just the reconcile path.
- **Sync conflicts are visible, not silent** (`src/lib/cloud/status.ts` +
  `useSyncStatus`): amber banner (Resolve in Settings) + a Cloud Sync callout
  explaining Push (this device wins) vs Pull (cloud wins). Push/Pull clears it.
- **Delete my account & data — live end-to-end.** Guarded button in Cloud Sync
  removes the cloud row + all Storage binaries, deletes the auth user via the
  `delete_account` RPC, and signs out (local copy left intact). The RPC
  (`supabase/delete_account.sql`) **is installed** in Supabase.

**Stage 2.2 — go public — underway:**
- **Privacy Policy + Terms are live** as in-app routes `/privacy` and `/terms`
  (`src/modules/Legal.tsx`), linked from Welcome + Settings. Contact +
  last-updated are constants at the top of that file (contact =
  `Tiffany.rexach@gmail.com`). **Still needs a lawyer review before charging money.**
- **Marketing one-pager is live** at `/site/` (`public/site/index.html`) — a
  self-contained static page built from the pitch deck, with self-hosted fonts
  (`public/site/fonts/`) and live-app screenshots (`public/site/shots/`). Tagline
  used throughout: **"a digital binder for stage managers."** Re-capture shots by
  driving `vite preview` with playwright-core (see the scratchpad scripts pattern).

**Remaining before a public/paid launch** (see `ROADMAP.md`): custom domain
(decision below), publish Google OAuth out of "Testing" (now has a privacy-policy
URL to submit), Resend email, Sentry (hold until just before the closed beta),
Stripe + a free/paid gate, Supabase Pro.

## Domain decision (pending my purchase)
Hosting stays free on GitHub Pages (HTTPS + custom domain included), so the whole
~$50 budget covers the domain (~$10–35/yr). Options ranked: **`standby.show`**
(theatre-native, top pick), **`getstandby.app`** (safe SaaS pattern),
`onstandby.app`, `promptbook.app`, `standbybinder.com`. Registrar: Cloudflare
(cheapest, at-cost, must use their nameservers, thin support) vs Namecheap
(balanced, any DNS, real support, rising renewals) vs GoDaddy (works, ~2×, pushy
upsells, but consolidates with my existing photography domain) — Porkbun is a
cheap third option. **When a domain is bought:** add a `CNAME` file (repo root /
`public/`) with the domain, set the DNS records at the registrar, and confirm
HTTPS in GitHub Pages settings.

- Environment quirks to expect: git **tags can't push** through this
  environment's proxy (branch pushes only — the `v4.0` tag is local); GitHub
  Actions MCP output can be too large (save to file + parse); `playwright-core`
  may be pruned by npm (reinstall `--no-save`); `vite preview` is flaky (retry).

## Branding
The app name is **Standby** everywhere in-app and in the PWA manifest / titles.
The GitHub repo stays named `Stagemgmt` on purpose — renaming it would change
the live Pages URL (`reptarbro.github.io/Stagemgmt/`). To make search results
say "Standby", edit the repo **description** in GitHub settings (external, not
in this codebase).

## Roadmap / backlog
See **`ROADMAP.md`** (canonical) for the forward plan: stages **2.1 harden →
2.2 go public → 2.3 monetize → 2.4 teams**, plus a closed-beta invite and a
free-vs-paid split. Cross-device sync/accounts (old "2b") shipped in v4.0.
`PHASE2.md` is kept as historical context (shareable link, availability form,
reminders, company registration, script-page linking, email script to cast).
