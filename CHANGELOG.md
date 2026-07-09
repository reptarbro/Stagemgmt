# StandBy — Changelog

StandBy is a local-first stage-management web app (a digital prompt book) for
stage managers. Live at https://reptarbro.github.io/Stagemgmt/.

## v4.0 — Cross-device sync 🎉 (milestone)

**The app is no longer local-only.** Verified live: a production moved from an
iPad to the cloud to a desktop with one sign-in and a tap.

- **Cloud Sync (beta)** backed by Supabase: each account gets a private
  `app_state` record plus a Storage bucket for the uploaded script and sign-in
  photos, protected by row-level security. Manual Push / Pull for v1
  (last-write-wins, nothing clobbered silently).
- **Passwordless sign-in:** email magic link (works across devices) and
  **"Continue with Google."** No passwords to set, forget, or leak.
- **Complete backups:** Export / Import now bundle the data model *and* the
  binary files, so a whole show (script included) moves in one file. A fresh
  device can Import, or sign in and **Load My Shows**, right from the Welcome
  page.
- **Condensed Welcome ("the fold")** and **PWA auto-update** so new deploys load
  themselves instead of getting stuck on a cached build.
- Availability conflicts gained **date ranges and recurring weekly** patterns.
- Added a "How Sign-In Works" explainer deck under `pitch/`.

## v3.6

Sidebar no longer `position: sticky`, so modals never split behind it;
**Add Multiple People** modal (Group/Role dropdowns); emergency contact reduced
to a 🚑 marker (revealed on hover/tap, hidden on the printed cast sheet); eye
(👁) emoji removed app-wide; date/time inputs render as full-width boxes on
every engine; full-bleed dark app icons; accessibility names on icon-only
buttons; responsive/overlap sweep at 390/412/834/1194/1440.

## v3.5

All modals body-portaled (fixed iOS clipping behind the sidebar); responsive
audit; report PDF white background; Reports → Download PDF + Email.

## v3 and earlier

Base modules and screenshot-driven revisions; rebrand to sage/emerald and the
**StandBy** name; home landing page and deploy hardening; copy/labels, tappable
Hub tiles, switch-production menu, print/PDF overhaul, calendar legend;
cast-first roster sort; past-event sign-in upload/view; app-shell scroll model.

---

Full detail and architecture notes live in `HANDOFF.md`.
