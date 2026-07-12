# Beta feedback log

A running record of what testers say, so three (soon more) stage managers don't
turn into three forgotten conversations. **Patterns across testers drive the
roadmap; one-off asks get parked, not built.**

## How feedback arrives

1. **In-app form (primary).** Settings → Help & feedback → **Send feedback**.
   Writes straight to the private Supabase `feedback` table — no email step,
   works signed-in or not. Each note carries the page, show type, app version,
   and browser automatically.
   - **Read it:** Supabase Dashboard → Table editor → `feedback`.
   - **One-time setup:** run `supabase/feedback.sql` in the SQL editor (creates
     the table + insert-only RLS) before the form can accept notes.
2. **Email (fallback).** The same section has an "or email instead" link for
   anyone offline.
3. **In person / text.** Whatever a tester tells you directly — log it here too
   so it isn't lost.

## Triage rhythm

- Skim new `feedback` rows a couple of times a week; copy anything actionable
  into the log below.
- Tag each note's **type** and **area**, then look for repeats.
- **2+ testers hit the same thing → candidate for the roadmap.**
- Single strong opinion → park it under "Parked" with a date; revisit if it
  recurs.
- Close the loop: when you ship a fix, mark the row **Done** and, if they left
  an email, tell them.

## Testers

| Tester | Role / context | Devices | Notes |
|--------|----------------|---------|-------|
| SM 1 | **Actively using it on a live cabaret** | _(fill in)_ | Highest-signal tester — real show data |
| SM 2 | _(fill in)_ | | |
| SM 3 | _(fill in)_ | | |

## Themes (from the first live SM brief, 2026-07-12)

1. **Scheduling depth** — the #1 gap by volume: hour-by-hour day schedules, per-person
   in/out times, adjustable increments, an emailable call sheet, and reports whose
   schedule section auto-fills from it.
2. **Email & sharing** — email blasts to contacts, email reports/call sheets to crew,
   a view-only share for the cast. (Matches the roadmap's Phase 2 sharing layer.)
3. **Inline editing & friction** — edit in place instead of a hidden "edit details"
   button; fewer required fields; a gentler confirm than the inline "Sure?".
4. **Reports** — PDF preview before download, more structure (see the St. Bart's
   *A New Brain* example), and an "email to crew" action.
5. **Loved** — branding/look ("sleek, professional"), line notes, scene views, reports,
   conflict reminders, attendance & sign-in, emergency contact on tap, scene tracker.
   *(Note: this SM praised the current design — the "AI-default" critique came from a
   separate design-trained reviewer, so the reskin is a parallel track, not a blocker.)*

## Log

Newest first. **Type:** Bug · Idea · Confusing · Praise. **Status:** New ·
Investigating · Planned · Done · Parked.

| Date | Tester | Area | Type | Note | Status |
|------|--------|------|------|------|--------|
| 2026-07-12 | SM 1 | People | Confusing | Email + phone shouldn't be required to save a contact. | **Quick win** |
| 2026-07-12 | SM 1 | Scenes | Idea | Numbered scenes should always sort numerically; add drag handles to reorder. | **Quick win** |
| 2026-07-12 | SM 1 | Reports | Confusing | The "add" buttons for designer/section notes are easy to miss. | **Quick win** |
| 2026-07-12 | SM 1 | Scenes | Bug | Tagging who's in a scene: the name bubbles reflow and shift names around. | **Quick win** |
| 2026-07-12 | SM 1 | Global | Idea | Inline "Sure?" is ugly — use a confirm dialog with a "don't ask again". | **Quick win** |
| 2026-07-12 | SM 1 | Schedule | Idea | Hour-by-hour day schedule; the View button should show it and be sendable to cast. | Planned (epic) |
| 2026-07-12 | SM 1 | Schedule | Idea | Schedule people in/out hour-by-hour, adjustable increments (half-hours). | Planned (epic) |
| 2026-07-12 | SM 1 | Schedule | Idea | Auto-generate an emailable call sheet from the schedule. | Planned (epic) |
| 2026-07-12 | SM 1 | Reports | Idea | Report schedule section should auto-fill scenes from the schedule. | Planned |
| 2026-07-12 | SM 1 | People/Contacts | Idea | Email-blast button from the contact page. | Planned (email) |
| 2026-07-12 | SM 1 | Global | Idea | Share a view-only version with the cast. | Planned (share) |
| 2026-07-12 | SM 1 | Reports | Idea | PDF preview before download; more structure; "email to crew" button. | Planned |
| 2026-07-12 | SM 1 | Hub | Idea | Auto-populate last performance (from schedule) + Director (from contacts). | Planned |
| 2026-07-12 | SM 1 | People | Idea | Allow multiple roles per person (e.g. a director who casts themselves), on both lists. | Planned |
| 2026-07-12 | SM 1 | Script/Cues | Idea | Open the script in-app and drop cues on the page, linked to Cue-to-Cue. | Roadmap (Phase 2) |
| 2026-07-12 | SM 1 | Global | Confusing | The "edit details" button is hidden — prefer tapping the box to edit in place. | Planned |
| 2026-07-12 | SM 1 | People | Idea | Emergency contact on tap is great — also show allergies. | Backlog |
| 2026-07-12 | SM 1 | Scenes/Schedule | Idea | Alert on scenes that can't run because someone's absent. | Backlog |

## Questions worth asking the active cabaret SM

- Does the **running order** match what you actually call from — anything
  missing (encore, intermission, sound-check order)?
- Did **patter vs. number** feel like the right distinction?
- Is **key / duration** useful, or noise you'd rather hide?
- Are you on **more than one device**? Is the set list staying in sync between
  them?
- What's the **one thing** that would make tomorrow's show easier?

## Parked (single-tester asks, awaiting a second voice)

- _(nothing yet)_
