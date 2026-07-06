# Standby — Session Handoff

Snapshot for continuing work in a fresh session. **Standby** is a local-first
stage-management web app (a digital prompt book) for stage managers.

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

## Shipped so far (through v3.5)
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

## Backlog
See `PHASE2.md` for the parked Phase 2 items (cross-device sync/accounts,
shareable read-only link, cast availability form, reminders, company
registration/subscription, script-page linking, email script to cast, etc.).
