# Standby — the stage manager's prompt book

A web app that helps stage managers track and fully manage their productions —
their prompt book, contact sheet, schedule, and report desk in one place.

Everything is **local-first**: your data is saved privately in your own browser.
No account, no server, no internet required once loaded. Export a backup anytime
to keep it safe or move it to another device.

## Features

- **Production Hub** — a dashboard for each show with key dates, a countdown to
  opening, and an at-a-glance view of people, upcoming calls, and reports.
- **People** — a searchable cast & crew contact sheet with roles, characters,
  groups (Cast/Crew/Creative/…), phone/email, and emergency (ICE) contacts.
- **Schedule & Attendance** — rehearsals, tech, and performances with call
  times, locations, and per-event call lists; tap to track who's present, late,
  absent, or excused.
- **Reports** — build rehearsal & performance reports by department (Scenic,
  Costumes, Lighting, Sound, SM, …), then print or save to PDF for distribution.
- **Multiple productions** — manage several shows and switch between them.
- **Backup & restore** — export/import all data as a single JSON file.

## Tech

React + TypeScript + Vite. State is persisted to `localStorage` behind a small
store (`src/lib/store.tsx`); the domain model lives in `src/lib/types.ts`.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build    # type-check and produce a static build in dist/
npm run preview  # serve the production build locally
npm run lint     # type-check only
```

The build in `dist/` is fully static — host it anywhere (Netlify, GitHub Pages,
an S3 bucket) or even open it from the filesystem.

## Project structure

```
src/
  lib/         types, localStorage layer, store, formatting helpers
  components/   app shell, routing, shared UI (modals, buttons)
  modules/      Hub, People, Schedule, Reports, Settings, Welcome
  styles/       global theme
```

## Roadmap ideas

Scene/character breakdown (French scenes), cue tracking & calling script,
props/costume running lists, line notes, and a cloud backend for live
collaboration with ASMs and the design team.
