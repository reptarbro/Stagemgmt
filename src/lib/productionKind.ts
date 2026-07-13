import type { Production, ProductionKind } from './types'

/** Everything that varies by show type: labels and which modules show. The
    data model is identical across kinds — this is a presentation layer. */
export interface KindProfile {
  label: string
  /** One-line description shown in the type picker. */
  blurb: string
  /** Relabeled vocabulary. Keys are the theater defaults. */
  terms: { scenes: string; character: string; script: string; lineNotes: string }
  /** Singular name for one item in the "scenes" collection (e.g. "Number"). */
  unit: string
  /** True for running-order kinds: the "scenes" list shows a set-list layout
      (duration column, performers optional) instead of a scene breakdown. */
  setlist: boolean
  /** True where a musical key is meaningful (shows a Key field on set-list items). */
  musicalKeys: boolean
  /** Nav paths hidden by default for this kind (user can re-enable per show). */
  hiddenByDefault: string[]
}

/** Ordered for the creation picker; 'play' first as the default. */
export const PRODUCTION_KINDS: ProductionKind[] = [
  'play', 'musical', 'cabaret', 'oneact', 'dance', 'variety', 'other',
]

export const KIND_PROFILES: Record<ProductionKind, KindProfile> = {
  play: {
    label: 'Play',
    blurb: 'A scripted play.',
    terms: { scenes: 'Scenes', character: 'Character', script: 'Script', lineNotes: 'Line Notes' },
    unit: 'Scene',
    setlist: false,
    musicalKeys: false,
    hiddenByDefault: [],
  },
  musical: {
    label: 'Musical',
    blurb: 'A book musical.',
    terms: { scenes: 'Scenes', character: 'Character', script: 'Script', lineNotes: 'Line Notes' },
    unit: 'Scene',
    setlist: false,
    musicalKeys: false,
    hiddenByDefault: [],
  },
  cabaret: {
    label: 'Cabaret / Concert',
    blurb: 'A cabaret or concert set — songs, not a script.',
    terms: { scenes: 'Set List', character: 'Performer', script: 'Running Order', lineNotes: 'Notes' },
    unit: 'Number',
    setlist: true,
    musicalKeys: true,
    hiddenByDefault: ['/line-notes'],
  },
  oneact: {
    label: 'One-act / Festival',
    blurb: 'A one-act or a festival of short pieces.',
    terms: { scenes: 'Scenes', character: 'Character', script: 'Script', lineNotes: 'Line Notes' },
    unit: 'Scene',
    setlist: false,
    musicalKeys: false,
    hiddenByDefault: [],
  },
  dance: {
    label: 'Dance',
    blurb: 'A dance or movement piece.',
    terms: { scenes: 'Pieces', character: 'Dancer', script: 'Score Notes', lineNotes: 'Notes' },
    unit: 'Piece',
    setlist: true,
    musicalKeys: false,
    hiddenByDefault: ['/line-notes', '/script'],
  },
  variety: {
    label: 'Variety / Comedy',
    blurb: 'A variety, sketch, or comedy night.',
    terms: { scenes: 'Segments', character: 'Performer', script: 'Running Order', lineNotes: 'Notes' },
    unit: 'Segment',
    setlist: true,
    musicalKeys: false,
    hiddenByDefault: ['/line-notes'],
  },
  other: {
    label: 'Other',
    blurb: 'Any other staged live performance.',
    terms: { scenes: 'Scenes', character: 'Character', script: 'Script', lineNotes: 'Line Notes' },
    unit: 'Scene',
    setlist: false,
    musicalKeys: false,
    hiddenByDefault: [],
  },
}

/** The profile for a kind, defaulting to 'play' for undefined/legacy data. */
export function kindProfile(kind: ProductionKind | undefined): KindProfile {
  return KIND_PROFILES[kind ?? 'play']
}

/** A single relabeled term for a kind (e.g. term(kind, 'scenes') → 'Set list'). */
export function term(kind: ProductionKind | undefined, key: keyof KindProfile['terms']): string {
  return kindProfile(kind).terms[key]
}

/** Module labels that don't vary by kind — genuinely universal SM vocabulary
    (props, costume, cue, report, schedule, contact all stay put). */
const STATIC_MODULE_LABELS: Record<string, string> = {
  '/props': 'Props & Costumes',
  '/cues': 'Cue-to-Cue',
  '/assets': 'Assets',
  '/reports': 'Reports',
  '/schedule': 'Schedule',
  '/people': 'People',
  '/hub': 'Production Hub',
  '/settings': 'Settings',
}

/** The user-facing label for a nav/module path, relabeled per kind where the
    word is theater-specific (scenes, script, line notes) and left universal
    otherwise. Accepts a production, a bare kind, or undefined (⇒ 'play'). */
export function moduleLabel(
  prod: { kind?: ProductionKind } | ProductionKind | undefined,
  path: string,
): string {
  const kind = typeof prod === 'string' ? prod : prod?.kind
  switch (path) {
    case '/scenes':
      return term(kind, 'scenes')
    case '/script':
      return term(kind, 'script')
    case '/line-notes':
      return term(kind, 'lineNotes')
    default:
      return STATIC_MODULE_LABELS[path] ?? path
  }
}

/** Whether a nav module is visible for a production: a per-show override wins,
    otherwise the kind's default. */
export function moduleVisible(prod: Pick<Production, 'kind' | 'modules'>, to: string): boolean {
  const override = prod.modules?.[to]
  if (typeof override === 'boolean') return override
  return !kindProfile(prod.kind).hiddenByDefault.includes(to)
}
