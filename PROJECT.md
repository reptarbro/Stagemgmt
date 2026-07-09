# Stage Manager — Project State & Roadmap

A living map of this project so any future session (or collaborator) can pick up
instantly. **Start here.**

- **Live app:** https://reptarbro.github.io/Stagemgmt/
- **Repo:** https://github.com/reptarbro/Stagemgmt
- **Naming/brand study:** https://claude.ai/code/artifact/8df13e9a-10e3-48f8-971f-fd40b03d7419

---

## What this is

A web app that helps stage managers track and fully manage their productions.
**Local-first**: all data is stored privately in the user's own browser — no
account, no server, works offline. A backup can be exported/imported as JSON.

## Tech & architecture

- **Stack:** React 18 + TypeScript + Vite. Routing via `react-router-dom` **HashRouter**
  (so deep links work on static hosting).
- **State:** a single React context store — `src/lib/store.tsx` — persisted to
  `localStorage`. Binary files (the uploaded script) live in **IndexedDB**
  (`src/lib/storage.ts`), since localStorage is too small for PDFs.
- **Data model:** `src/lib/types.ts`. Everything hangs off a `Production`
  (people, events, attendance, reports, scenes, props, lineNotes, script meta).
  `normalizeProduction()` backfills new fields on load so older saved data keeps working.
- **Deploy:** GitHub Actions (`.github/workflows/deploy.yml`) builds and publishes to
  **GitHub Pages** on every push to `main`. Pages is enabled (Source: GitHub Actions),
  and the repo is **public** (required for free Pages).

### Run it locally
```bash
npm install
npm run dev        # http://localhost:5173  (add -- --host to reach it from a phone on same Wi-Fi)
npm run build      # type-check + production build to dist/
npm run preview    # serve the built app
```

## Features shipped

**Core (v1)**
- **Production Hub** — dashboard: key dates, opening-night countdown, stat tiles; multi-production switcher.
- **People** — cast & crew contact sheet: roles, characters, groups, email/phone, emergency (ICE) contacts, and **availability conflicts** (unavailable dates).
- **Schedule & Attendance** — events with call/start/end times, locations, per-event call lists; tap-to-cycle attendance; **month Calendar view**; conflict warnings when a called person is unavailable that date.
- **Reports** — department-based rehearsal/performance reports; printable / save-to-PDF.
- **Settings** — JSON backup/restore; per-production delete.

**Phase 1 additions**
- **Scenes** — scene/character breakdown + a "who's-in-it" grid (scene × cast).
- **Props & Costumes** — running lists with category, scene, handlers, status.
- **Line Notes** — per-actor line tracking with an "outstanding by actor" rollup.
- **Script** — upload a script document (PDF/Word/TXT), stored in IndexedDB; view/download/replace/remove. **Static for now** (annotation comes in Phase 2).

## Source map
```
src/
  lib/       types.ts · storage.ts (localStorage + IndexedDB) · store.tsx · format.ts
  components/ App.tsx (shell, nav, routes) · ui.tsx (Modal, ConfirmButton, EmptyState, PageHead)
  modules/   Hub · People · Schedule · Scenes · Props · LineNotes · Script · Reports · Settings · Welcome
  styles/    global.css (theme + calendar + print)
```

## Branding

- **Type:** Montserrat (display/headings) + Raleway (body).
- **Palette:** stage black `#0E1311`, emerald `#2FAE6B`, deep green `#1C7A4D`,
  sage `#9FB8A6`, warm ivory `#F1EFE7`. (Current in-app theme still uses the original
  emerald-on-dark; a full rebrand to a chosen name is pending.)
- **Favicon:** `public/favicon.svg` — currently 🎭 masks. Will change with the chosen name.

### Naming study (decision pending)
Five directions explored; all have real-world holders, so the play is a distinctive
wordmark + modifier/TLD (`.show` fits theatre). Leading options:
1. **StandBy** — strongest brand; theatre lane open. Recommended form: `standby.show`, `@onstandby`.
2. **Ghostlight** — most shareable, but clashes with **Ghostlight Records** (Broadway label) — clear trademark first.
3. **Promptly** — clean but crowded in general SaaS.
- Parked (already used in-niche): **Callboard** (VirtualCallboard), **OnCue** (theatre soundboard app).
- Wildcards worth exploring: **Half**, **Cued**, **Prompt Corner**.
> Availability above is web-research only, **not** a legal/trademark clearance — verify per registrar + each social platform before committing.

## Roadmap

**Phase 2 — tech-table power (local-first, needs IndexedDB already in place)**
- Script **annotation** on the uploaded document (notes/markup layer over the same file).
- **Blocking** on ground plans (upload plan image; place actors per scene).
- **Cue list** (LX / SND / deck) + **Show / Calling Mode** (GO button + run-time stopwatch).

**Phase 3 — the cloud layer (opt-in; requires backend + accounts)**
- Real-time sharing to cast/crew phones, live schedules & RSVPs, emailed reports.
- Local-first data would sync rather than be replaced — nothing built so far is thrown away.

## Deploy / git notes for future sessions
- Develop on branch `claude/stage-manager-app-mr0q9w`; open a PR into `main`; **merging to `main` auto-deploys** to Pages.
- Pages only publishes from the **default branch (`main`)** — feature-branch runs build but can't deploy.
- If the working PR is already merged, restart the branch from latest `main` for follow-up work (don't stack on merged history).

## How to resume
Reopen this session from your Claude Code history at **claude.ai/code**, or start a
fresh session pointed at `reptarbro/Stagemgmt` — everything is in git, and this file
is the briefing. Then say what's next (e.g. "pick the name StandBy and rebrand the app"
or "start Phase 2 with the cue list").
