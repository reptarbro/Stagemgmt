# Standby — Session Handoff

Snapshot for continuing work in a fresh session. **Standby** is a local-first
stage-management web app (a digital prompt book) for stage managers.

## Start a new session (copy/paste this)

Open a new session on the `reptarbro/Stagemgmt` repo and paste this as the first
message:

> Continue work on the Standby stage-manager app. Read `HANDOFF.md` first — it
> has the architecture, branch, and everything shipped so far. Work on branch
> `claude/stage-manager-app-mr0q9w` (it mirrors `main`). The app is live at
> https://reptarbro.github.io/Stagemgmt/. I used it on a real show and found
> bugs to fix. I'll describe each bug (and can attach a backup JSON to
> reproduce). After fixing, verify, commit, push to `main`, mirror the dev
> branch, and confirm the Pages deploy is green.

**Before starting, export your data:** in the app, **Settings → Export backup**
saves a `.json` of your production. Attach it to the new session so the bugs can
be reproduced (data lives only in your browser; a fresh session won't have it).
New deploys do **not** erase your data, but export anyway as insurance.

**Report each bug like this:** where (page/module) · what you did · what
happened vs. what you expected · a screenshot if handy.

## Where it lives
- **Live site:** https://reptarbro.github.io/Stagemgmt/
- **Repo:** reptarbro/Stagemgmt
- **Default branch:** `main` (deploys to GitHub Pages on every push)
- **Dev branch:** `claude/stage-manager-app-mr0q9w` (kept in sync with `main`)

## Stack & architecture
- React 18 + TypeScript + Vite; `HashRouter`; `base: './'`.
- **Local-first, no back-end:** app state → `localStorage`; binary files
  (uploaded script, signed sign-in sheets) → IndexedDB.
  - `src/lib/store.tsx` — React context store + actions.
  - `src/lib/storage.ts` — persistence, migrations (`normalizeProduction`),
    IndexedDB helpers (`putFile`/`getFile`/`deleteFile`, `signInKey`).
  - `src/lib/types.ts` — domain model.
- **UI:** `src/components/App.tsx` (routes + `Shell` sidebar layout),
  `src/components/ui.tsx` (`Modal` — body-portaled), `PrintSheet.tsx`
  (print/PDF sheets), `src/styles/global.css` (theme + responsive rules).
- **Modules** (`src/modules/`): Welcome, Hub, People, Schedule, Scenes, Props,
  LineNotes, Script, CueToCue, Reports, Settings.
- **Theme:** T-REX × brooklynONE palette (near-black bg, ivory text, sage +
  emerald accents); Montserrat (display) + Raleway (body) via @fontsource.

## Build / run / deploy
- Install: `npm ci` · Dev: `npm run dev` · Build: `npm run build` (→ `dist/`).
- Deploy: push to `main` → `.github/workflows/deploy.yml` (main-only,
  no-cancel concurrency, **3 deploy attempts** with back-off for transient
  GitHub Pages errors).
- Sync dev branch after a push: `git branch -f claude/stage-manager-app-mr0q9w main`
  then `git push -f origin claude/stage-manager-app-mr0q9w`.

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
  - Supabase project ref: `owqthtxmwsjxqdmehkgz`. Next: auto-sync (push on
    change, realtime), per-production cloud rows, archiving, teams/sharing.

## Branding
The app name is **Standby** everywhere in-app and in the PWA manifest / titles.
The GitHub repo stays named `Stagemgmt` on purpose — renaming it would change
the live Pages URL (`reptarbro.github.io/Stagemgmt/`). To make search results
say "Standby", edit the repo **description** in GitHub settings (external, not
in this codebase).

## Backlog
See `PHASE2.md` for the parked Phase 2 items (cross-device sync/accounts,
shareable read-only link, cast availability form, reminders, company
registration/subscription, script-page linking, email script to cast, etc.).
