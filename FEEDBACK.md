# Feedback & Backlog

Notes captured while testing, plus a prioritized backlog. **How this works:** while
using the app (often on the go), tell Claude in the session — typing or dictating —
e.g. *"the Add button is hard to reach with my thumb."* Notes get logged here, then
worked through and checked off.

Status key: `[ ]` open · `[~]` in progress · `[x]` done
Tags: `[no-backend]` shippable client-side now · `[needs-backend]` requires hosting/DB/accounts

---

## Evaluation summary (external SM lenses, Phase 1)

Two outside perspectives pressure-tested the app.

- **Broadway PSM/SM — wrong customer at Phase 1.** A shared, contractual, security-
  sensitive, show-calling system. Blockers: no real-time multi-user book, no cloud/
  sync/backup, script confidentiality (NDA), no calling/cue tools, no Equity timers/
  hour tracking, distribution to 30–50 people, understudy/track sheets, and it's yet
  another silo vs. ProductionPro/Propared/Stage Write. Treat Broadway as a **north
  star**, not a near-term buyer — it requires the whole backend + calling + compliance
  stack first.
- **Off-off-Broadway SM — the real audience, and close.** Free, no login, consolidates
  the Sheets/Docs/Forms stack; conflict-vs-schedule is a standout. **The hinge: it
  can't share anything with the cast.** An SM's job is ~60% distribution, and today
  it's a private notebook. The highest-value OOB fixes are cheap and client-side, so we
  can win this tier well before any backend.

**Net:** focus Phase 1.5 on OOB — make it *shareable through channels the cast already
uses (calendar + email)* and *reliable*, then trial with real OOB SMs.

---

## Prioritized backlog

### Phase 1.5 — make it testable & shareable for OOB (all `[no-backend]`)
Ordered by priority (impact ÷ effort).

| # | Item | Impact | Effort | Why it matters |
|---|------|--------|--------|----------------|
| 1 | **Calendar export (`.ics`)** — whole schedule or per event | High | Low | Drops call times into everyone's real phone calendar — biggest distribution win with zero backend |
| 2 | **Send report to the team** — "Copy as text" + prefilled `mailto:` | High | Low | Turns the daily-report ritual into one tap; meets the cast in email |
| 3 | **Offline (PWA: manifest + service worker)** | High | Med | Works in no-signal rehearsal rooms; earns trust; enables real "add to home screen" app |
| 4 | **Printable sign-in sheet + contact sheet CSV/print** | Med-High | Low | Callboard sign-in is a core artifact; CSV/print is how OOB shares people info today |
| 5 | **Bulk add** — paste a cast list; paste conflicts as text | Med | Med | Kills the slowest first-setup friction (one modal at a time on a phone) |
| 6 | **Backup nudge** — gentle reminder / periodic auto-export | Med | Low | De-risks the single-device model until sync exists (data-loss = churn) |
| 7 | **Mobile ergonomics pass** — tap targets, faster add flows | Med | Med | The SM runs the room from a phone; speed beats depth here |
| 8 | **In-app "Send feedback"** (`mailto:`) for trialists | Med | Low | Closes the loop during the live trial |

### Phase 2 — the real sharing unlock + power tools
| # | Item | Impact | Effort | Tag |
|---|------|--------|--------|-----|
| 9 | **Shareable read-only link** (schedule / contact sheet / report) | **Very High** | High | `[needs-backend]` — the true OOB adoption hinge |
| 10 | **Cast self-service availability form** (they submit conflicts) | High | High | `[needs-backend]` |
| 11 | **Accounts + cross-device / team sync** | High | High | `[needs-backend]` — also the gate for any Broadway conversation |
| 12 | **Call-time reminders** (push / email) | Med-High | High | `[needs-backend]` |
| 13 | **Cue list + Show/Calling mode + run timer** | Med (OOB) | Med | `[no-backend]` — more Broadway; still useful for OOB board ops |
| 14 | **Script annotation / blocking on ground plans** | Med | High | `[no-backend]`, heavier — lower OOB priority |

### Phase 3 / Broadway north-star (not now)
Real-time shared book · report distribution to large distros · Equity break/hour
timers & legal sign-in · security posture (SSO, roles, encryption, data ownership) ·
understudy/swing track sheets · integrations with existing tools.

### Cross-cutting / smaller
- [ ] "Who's-in-it" grid needs to scale for large casts (horizontal scroll / condense) `[no-backend]`
- [ ] Accessibility pass — big tap targets, screen-reader labels, forgiving flows `[no-backend]`

---

## Log

### In progress

### Done
- [x] **Base-site revision round (from 21 annotated screenshots):** Title Case app-wide ·
  fit-to-viewport (no dead space / iPad white gap) · bigger uniform row icons · sortable
  table columns · tap-any-row → detail modal (People incl. conflicts, Schedule, Scenes,
  Props, Cues) · scroll-to-top on navigation · required-field `*` convention & validation
  across every form · onboarding requires Show title + Venue · "+ New Production" moved to
  the sidebar bottom (removed from Hub) · People: "ICE" → "🚑 Emergency contact",
  email/phone required for everyone, conflicts now support a time range · Schedule: all
  event fields required, **Scene picker links events↔scenes**, **conflict-warning list**
  when called cast clash, attendance is a **dropdown** (adds **No-show**), "Clear All",
  scene in attendance title, sign-in prints **sheet-only full page** · Scenes: "Grid"
  rename, required number/title/characters · Props: removed "Sound" category, required
  fields, ⚠️ flag + clearer "still to sort" counter · Reports: **Dress Rehearsal** type,
  Title Case, required type/date, default 4 sections, **View** moved opposite Edit/Delete ·
  **New Cue-to-Cue calling sheet** (Q#, dept, placement, standby, GO, status; sortable,
  printable) auto-surfacing ~21–25 days before opening · Settings: sample is a removable
  **preview**, Storage moved up with totals across all shows
- [x] **Phase 1.5 shipped (client-side):** `.ics` calendar export · report Email/Copy ·
  offline PWA (installable + service worker) · printable **sign-in sheet** · contact-sheet
  **CSV** + print · **bulk add** (paste cast list) · **backup reminder** banner ·
  **Send feedback** button · mobile polish (16px inputs, bigger tap targets)
- [x] Load-sample-production button for smooth phone demos `[no-backend]`
- [x] This feedback log + prioritized backlog `[no-backend]`

### Still open (next up)
- [ ] `[needs-backend]` Shareable read-only link — the true adoption hinge (Phase 2 decision)
- [ ] `[needs-backend]` Cast self-service availability form
- [ ] `[no-backend]` Bulk *paste conflicts* per person (only cast-list paste shipped)
- [ ] `[no-backend]` "Who's-in-it" grid scaling for large casts
- [ ] `[no-backend]` Accessibility pass
