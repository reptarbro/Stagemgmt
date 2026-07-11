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

## Log

Newest first. **Type:** Bug · Idea · Confusing · Praise. **Status:** New ·
Investigating · Planned · Done · Parked.

| Date | Tester | Show type | Area | Type | Note | Status |
|------|--------|-----------|------|------|------|--------|
| _2026-07-11_ | SM 1 | Cabaret | — | Praise | Adopted it for the ongoing cabaret. | New |
|  |  |  |  |  |  |  |

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
