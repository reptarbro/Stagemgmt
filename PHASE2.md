# Phase 2 — Roadmap

Phase 2 is one shift: the app stops being a private notebook on one device and starts
talking to a small backend so it can **share, sync, and remind**. Everything below hangs
off that. (Phase 1 + the base-site revision round are done and live.)

## The gating decision: the backend

To share a link, sync across devices, or send a reminder, something has to live in the
cloud. Recommendation: **Supabase** (hosted Postgres + auth + storage + scheduled
functions, generous free tier). It bolts onto the current app — GitHub Pages keeps hosting
the front end; Supabase becomes the back end. The public "anon" key is safe to commit
(row-level security guards the data); the service-role key never leaves Supabase functions.

## Architecture shift

Today: **local-only** (browser → gone if device lost).
Phase 2: **local-first + cloud sync** — the browser stays the fast, offline copy (nothing
about the offline experience regresses); a sync layer mirrors it to the cloud so it can be
shared and restored.

## Build order (ship each independently)

### 🔗 2a — Shareable read-only link *(do first; the OOB adoption hinge)*
"Publish" the schedule / contact sheet / report → a plain URL the cast opens in any
browser, no app, no login. Clever shortcut: no accounts yet — publishing returns a public
**view** link plus a private **manage** link (unguessable token) to update/revoke.
Effort ~2–3 sessions.

### 👤 2b — Accounts + cross-device sync
Magic-link email login; shows follow you between devices; automatic cloud backup (retires
the single-device risk). Effort ~3–4 sessions.

### 📝 2c — Cast self-service availability form
Send one link; cast submit their own conflicts; flows into the schedule conflict-checker.
Effort ~2–3 sessions. (Builds on 2a plumbing + 2b accounts.)

### 🔔 2d — Call-time reminders (push + email)
Automatic "call in 2 hours" nudges via a scheduled function + email (e.g. Resend). Web
push already has a service worker in place; iOS delivers push to the installed PWA.
Effort ~3–4 sessions. (Depends on 2b.)

**Rough total:** ~6–8 weeks part-time, but a usable share-in-the-wild product by the end
of week 1 (2a).

## Elements to gather
- Supabase account + project; public anon key in build config; row-level security rules.
- Email sender (Resend or similar) for 2c/2d.
- A short privacy line + consent (storing cast contact info/conflicts on a server = data
  stewardship).
- Test data + e2e on the public viewer before any SM relies on it.
- (Optional) custom domain for nicer share links.

## Parking lot — captured from the screenshot review (Phase 2+)
These came up during the base-site revision and are explicitly deferred to Phase 2:
- **Onboarding autopopulate** — suggest Company / Venue from existing entries (needs a
  shared/back-end source of options to be meaningful).
- **Company / group registration** — companies register their troupe; members register
  their individual work under the company. Likely **subscription-based + vetting**. This is
  the multi-tenant/accounts story — sits on top of 2b.
- **Script-page linking** — scene page numbers pulled from the live uploaded script doc
  (deep-link scene ↔ script). Heavier; revisit after the script viewer is wired to sync.

## Cross-cutting still open (no backend needed)
- Bulk *paste conflicts* per person (only cast-list paste shipped).
- "Grid" (who's-in-it) scaling for very large casts.
- Accessibility pass (screen-reader labels, focus order).
