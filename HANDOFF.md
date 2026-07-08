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
> https://reptarbro.github.io/Stagemgmt/ and is at **v4.0**: cross-device Cloud
> Sync is live (Supabase + Google/email sign-in, verified iPad → desktop) and
> **Stage 2.1 auto-sync is deployed** but still pending my two-device
> verification. We're working through **ROADMAP.md Stage 2.1** (harden the beta).
> After any change: verify, commit (with the required trailers), push to `main`,
> mirror the dev branch, and confirm the Pages deploy is green.

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
    reconcile on sign-in / focus / return-to-foreground / 30s poll, debounced
    push-on-change with a flush on hide/close, never auto-clobbers when both
    sides changed. Mounted in `App.tsx`.
  - `src/lib/cloud/status.ts` — observable sync state (`useSyncStatus`):
    idle/syncing/synced/conflict/error. Drives the amber **sync-conflict
    banner** (`App.tsx`) and the live status + resolve-guidance in `CloudSync`.
  - `src/components/GoogleG.tsx` — Google "G" mark.
- **UI:** `src/components/App.tsx` (routes + `Shell` sidebar layout),
  `src/components/ui.tsx` (`Modal` — body-portaled), `PrintSheet.tsx`
  (print/PDF sheets), `src/styles/global.css` (theme + responsive rules).
- **Modules** (`src/modules/`): Welcome, Hub, People, Schedule, Scenes, Props,
  LineNotes, Script, CueToCue, Reports, Settings, Legal (Privacy/Terms).
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

## Current state (Stage 2.1, in progress)
- **Auto-sync is deployed and hardened** (`CloudAutoSync`): pushes on change
  (2.5s debounce), **flushes the pending push when the app is hidden/closing**
  (so the last desktop edits are never stranded), and reconciles on sign-in,
  **on focus/return to the foreground, and on a 30s poll while open** (so a
  device left open still catches another device's changes without a reload). It
  still never auto-clobbers when both sides changed — that's left to manual
  Push/Pull. **Pending my two-device verification** — could not E2E test
  multi-device from the build environment (needs my inbox + signed-in devices).
- **Sync conflicts are now visible, not silent.** When auto-sync detects that
  both this device and the cloud changed since the last sync, it surfaces an
  amber banner (Resolve in Settings) and a callout in the Cloud Sync card
  explaining Push (this device wins) vs Pull (cloud wins). Resolving via Push or
  Pull clears it automatically.
- **Delete my account & data — shipped and live.** Settings → Cloud Sync (signed
  in) has a guarded **Delete account & cloud data** button: it removes the cloud
  data row + all Storage binaries, deletes the auth user via the `delete_account`
  RPC, and signs out. The local device copy is left intact (local-first). The
  `delete_account` RPC (`supabase/delete_account.sql`) **is installed** in the
  Supabase project, so full auth-account deletion works end-to-end.
- **Remaining Stage 2.1 work** (see `ROADMAP.md`): publish Google OAuth out of
  "Testing", wire Resend email for magic links, add error monitoring; optionally
  realtime sync (one Supabase publication setting).
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
