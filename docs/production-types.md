# Production types (multi-format support)

Lets StandBy serve more than scripted theater — cabaret, one-acts, dance,
variety — from a single codebase, by treating the "kind" of show as a
**presentation + config layer** over the existing data model.

Nothing about how a production is stored, merged, or synced changes. A
production gains two optional fields; everything else is derived at render
time from those fields.

## Why this is low-risk

- **Storage is untouched.** `kind` and `modules` are ordinary optional fields
  on `Production`. Old data has neither, and is treated as a classic play.
- **Sync is untouched.** The auto-merge model keys on record ids and
  `updatedAt`. The two new fields ride along like any other production field —
  newest edit wins — so devices still converge.
- **It's additive and reversible.** Existing theater users see no change:
  `kind` undefined ⇒ `'play'` ⇒ current labels, all modules visible.

## Data model

`src/lib/types.ts`

```ts
export type ProductionKind =
  | 'play' | 'musical' | 'cabaret' | 'oneact' | 'dance' | 'variety' | 'other'

interface Production {
  // …existing fields…
  kind?: ProductionKind                       // undefined ⇒ 'play' (back-compat)
  modules?: Partial<Record<string, boolean>>  // per-show nav overrides, keyed by path
}
```

- `kind` — the show type chosen at creation. Drives labels and default module
  visibility.
- `modules` — a per-production override map keyed by nav path (e.g.
  `'/line-notes'`). When a user turns a module on or off for one show, that
  choice is stored here and wins over the kind's default. Absent key ⇒ use the
  kind default.

## The profile registry

`src/lib/productionKind.ts` (new) is the single source of truth for every
type's vocabulary and default module set.

```ts
interface KindProfile {
  label: string                 // "Cabaret"
  blurb: string                 // one-line description for the picker
  terms: { scenes: string; character: string; script: string }
  hiddenByDefault: string[]     // nav paths hidden unless the user enables them
}
```

| Kind      | Scenes →  | Character → | Script →       | Hidden by default        |
|-----------|-----------|-------------|----------------|--------------------------|
| play      | Scenes    | Character   | Script         | —                        |
| musical   | Scenes    | Character   | Script         | —                        |
| cabaret   | Set list  | Performer   | Running order  | Line Notes               |
| oneact    | Scenes    | Character   | Script         | —                        |
| dance     | Pieces    | Dancer      | Score notes    | Line Notes, Script       |
| variety   | Segments  | Performer   | Running order  | Line Notes               |
| other     | Scenes    | Character   | Script         | —                        |

Helpers:

- `kindProfile(kind)` — profile for a kind, defaulting to `play`.
- `term(kind, key)` — a single relabeled term.
- `moduleVisible(prod, to)` — is a nav module shown for this production,
  honoring the per-show `modules` override then the kind default.

## Wiring

**Nav** (`src/components/App.tsx`, `Shell`) — the `nav` array filters by
`moduleVisible(production, to)` and relabels the Scenes and Script entries via
`term(...)`. Hub, People, Schedule, Props, Cue-to-Cue, Reports, Assets and
Settings are unconditional.

**Module headers** — three modules read `production.kind` and title
themselves through `term(...)`:

- `Scenes.tsx` → `term(kind, 'scenes')`
- `Script.tsx` → `term(kind, 'script')`
- `People.tsx` → the "Role / Character" column → `Role / ${term(kind, 'character')}`

The other six modules already use neutral language and need no change — this is
the "6 of 9 travel unchanged" claim, verified against the code.

**Creation** (`src/modules/Welcome.tsx`) — the "Start a new production" form
gets a **Type** `<select>` (default Play). Its value is passed to
`createProduction({ …, kind })`.

## Testing checklist

- Existing shows (no `kind`) still show all nine modules with theater labels.
- Creating a Cabaret hides Line Notes and relabels Scenes→Set list,
  Script→Running order, People's column →Role / Performer.
- Creating a Dance additionally hides Script.
- Switching the active production reflows the nav + labels for that show only.
- Export → import round-trips `kind` and `modules`.
- Sign in on a second device: the `kind` syncs and the nav matches.

## Out of scope (Phase 2)

- **Running order** as a purpose-built view (song, key, who's up, patter cues)
  replacing the plain Script upload for music-driven kinds.
- **Line Notes** reframed for the kinds that keep it.
- A per-show **module toggle UI** in Settings that writes `production.modules`
  (the data field and `moduleVisible` override already support it; only the UI
  is deferred).
- Kind-specific **sample productions** for onboarding.
