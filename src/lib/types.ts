// Core domain model for the Stage Manager app.
// Everything is keyed under a Production so multiple shows can coexist.

export type ID = string

/** Broad grouping used for filtering the contact sheet and building call lists. */
export type PersonGroup = 'Cast' | 'Crew' | 'Creative' | 'Production' | 'Musician' | 'Front of House' | 'Other'

/** A date, range, or recurring window a person is unavailable. */
export interface Conflict {
  id: ID
  /** ISO date. The single day, or the START of a range / recurring window. */
  date: string
  /** Optional ISO end date (inclusive). Present = multi-day range or the end of
      a recurring window. Absent = single day (or open-ended if repeatWeekly). */
  endDate?: string
  /** When true, the conflict applies only on `weekdays`, every week from `date`
      through `endDate` (or ongoing if no `endDate`). For "every Tue/Thu" cases. */
  repeatWeekly?: boolean
  /** Weekdays it applies to when repeatWeekly (0 = Sunday … 6 = Saturday). */
  weekdays?: number[]
  /** Optional "HH:MM" start of the unavailable window. Absent = all day. */
  startTime?: string
  /** Optional "HH:MM" end of the unavailable window. */
  endTime?: string
  note?: string
}

export interface Person {
  id: ID
  name: string
  group: PersonGroup
  /** Role or position, e.g. "Hamlet", "Lighting Designer", "ASM". */
  role: string
  /** For cast: the character(s) they play. Kept separate from role for clarity. */
  character?: string
  email?: string
  phone?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  notes?: string
  /** Dates this person can't attend, surfaced against the schedule. */
  conflicts?: Conflict[]
  /** ISO time of the last local edit — used to auto-merge across devices. */
  updatedAt?: string
}

export type EventType =
  | 'Rehearsal'
  | 'Dress Rehearsal'
  | 'Performance'
  | 'Tech'
  | 'Meeting'
  | 'Fitting'
  | 'Other'

/** A single line in an event's hour-by-hour agenda / call times. */
export interface AgendaItem {
  id: ID
  /** "HH:MM" 24h. */
  time: string
  /** Optional end "HH:MM" for a block. */
  endTime?: string
  /** What happens, e.g. "Cast call", "Sound check", "LX crew". */
  what: string
  /** Who's called for this block (optional). */
  personIds?: ID[]
}

export interface ScheduleEvent {
  id: ID
  type: EventType
  title: string
  /** ISO date, e.g. "2026-07-15". */
  date: string
  /** "HH:MM" 24h. Optional so all-day items are possible. */
  callTime?: string
  startTime?: string
  endTime?: string
  location?: string
  /** Person ids called for this event. Empty = whole company / TBD. */
  calledPersonIds: ID[]
  /** Scene ids being worked in this event, linking Schedule <-> Scenes. */
  sceneIds?: ID[]
  /** Hour-by-hour call times / running order for the day (any increment). */
  agenda?: AgendaItem[]
  notes?: string
  /** ISO timestamp set when a photo/scan of the signed sheet is uploaded
      (bytes live in IndexedDB under `signin:<eventId>`). Past events only. */
  signInUploadedAt?: string
  /** MIME type of the uploaded signed sheet, e.g. "image/jpeg", "application/pdf". */
  signInMime?: string
  /** ISO time of the last local edit — used to auto-merge across devices. */
  updatedAt?: string
}

export type AttendanceStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'excused'
  | 'no-show'
  | 'unmarked'

/** Attendance is stored per event, keyed by person id. */
export interface Attendance {
  eventId: ID
  records: Record<ID, { status: AttendanceStatus; note?: string }>
  /** ISO time of the last local edit — used to auto-merge across devices. */
  updatedAt?: string
}

/** A single line item within a report section (e.g. one note for the LX dept). */
export interface ReportNote {
  id: ID
  text: string
}

export interface ReportSection {
  id: ID
  title: string
  notes: ReportNote[]
}

export type ReportType = 'Rehearsal' | 'Dress Rehearsal' | 'Performance'

export interface Report {
  id: ID
  type: ReportType
  /** ISO date of the rehearsal/performance the report covers. */
  date: string
  /** Optional link to the schedule event this report documents. */
  eventId?: ID
  /** Free-form summary shown at the top. */
  summary: string
  /** Timing / scene work covered. */
  workedOn?: string
  sections: ReportSection[]
  scheduleNote?: string
  createdAt: string
  /** ISO time of the last local edit — used to auto-merge across devices. */
  updatedAt?: string
}

/** A unit of the play — a French scene, a numbered scene, or a song. */
export interface Scene {
  id: ID
  /** Free-form label/number, e.g. "1.1", "Act 2 Sc 3", "Prologue". */
  number: string
  title?: string
  /** Script page(s), e.g. "12–15". */
  page?: string
  /** Person ids (usually cast) present in this scene. */
  characterIds: ID[]
  synopsis?: string
  notes?: string
  /** Set-list only: musical key (e.g. "Am"). Shown for music kinds. */
  key?: string
  /** Set-list only: running time (e.g. "3:10"). Shown for set-list kinds. */
  duration?: string
  /** Set-list only: a spoken patter/banter row between numbers, not a song. */
  patter?: boolean
  /** ISO time of the last local edit — used to auto-merge across devices. */
  updatedAt?: string
}

export type PropCategory = 'Prop' | 'Costume' | 'Set' | 'Furniture' | 'Other'
export type PropStatus = 'Needed' | 'In progress' | 'Ready' | 'Cut'

export interface PropItem {
  id: ID
  name: string
  category: PropCategory
  /** Where it's used, e.g. "Act 1", "1.3". */
  sceneRef?: string
  /** Person ids who handle/wear it. */
  usedByPersonIds: ID[]
  status: PropStatus
  notes?: string
  /** ISO time of the last local edit — used to auto-merge across devices. */
  updatedAt?: string
}

export type LineNoteType =
  | 'dropped'
  | 'paraphrased'
  | 'jumped'
  | 'added'
  | 'called for line'
  | 'other'

export interface LineNote {
  id: ID
  /** ISO date of the run the note came from. */
  date: string
  /** The actor the note is for. */
  personId: ID
  /** Where in the script, e.g. "p. 34" or "2.1". */
  location?: string
  type: LineNoteType
  note?: string
  resolved?: boolean
  /** ISO time of the last local edit — used to auto-merge across devices. */
  updatedAt?: string
}

/**
 * A single technical cue for the calling script / cue-to-cue.
 * Surfaced as tech approaches (roughly three weeks out from opening).
 */
export type CueDept = 'Lighting' | 'Sound' | 'Fly' | 'Deck' | 'Spot' | 'Projection' | 'Other'
export type CueStatus = 'dry-tech' | 'teched' | 'set'

export interface Cue {
  id: ID
  /** Call number, e.g. "Q1", "LX 12", "SQ 3". */
  number: string
  dept: CueDept
  /** Where it fires — page/scene + line or a visual, e.g. "p.12 / 'goodnight'". */
  placement?: string
  /** What happens on the GO. */
  action?: string
  /** The standby line the caller reads before the GO. */
  standby?: string
  status: CueStatus
  notes?: string
  /** ISO time of the last local edit — used to auto-merge across devices. */
  updatedAt?: string
}

/** Metadata for an uploaded script file; the bytes live in IndexedDB. */
export interface ScriptMeta {
  id: ID
  filename: string
  mimeType: string
  size: number
  uploadedAt: string
}

/** How an uploaded asset is filed. Free-form use is fine — these are just the
    grouping chips (headshots, contracts, budgets, design plates, etc.). */
export type AssetCategory =
  | 'Headshot'
  | 'Contract'
  | 'Budget'
  | 'Design'
  | 'Document'
  | 'Photo'
  | 'Other'

/** A general file kept with the production — a headshot, a signed contract, a
    budget spreadsheet, a set rendering, and so on. The bytes live in IndexedDB
    under `asset:<id>` (so they sync to the cloud and pack into backups like any
    other binary); this is just the metadata shown in the Assets list. */
export interface Asset {
  id: ID
  filename: string
  category: AssetCategory
  mimeType: string
  /** Bytes, for the size readout and storage totals. */
  size: number
  uploadedAt: string
  /** Optional person this file belongs to — e.g. whose headshot it is. */
  personId?: ID
  note?: string
  /** ISO time of the last local edit — used to auto-merge across devices.
      (Distinct from uploadedAt, which is when the bytes were first added.) */
  updatedAt?: string
}

/** The kind of show a production is. Drives module labels and default
    visibility; the underlying data model is identical across all kinds.
    Undefined on older data ⇒ treated as a classic 'play'. */
export type ProductionKind =
  | 'play' | 'musical' | 'cabaret' | 'oneact' | 'dance' | 'variety' | 'other'

export interface Production {
  id: ID
  title: string
  company?: string
  venue?: string
  director?: string
  /** ISO dates. */
  firstRehearsal?: string
  openingNight?: string
  closingNight?: string
  notes?: string
  people: Person[]
  events: ScheduleEvent[]
  attendance: Attendance[]
  reports: Report[]
  scenes: Scene[]
  props: PropItem[]
  lineNotes: LineNote[]
  /** Calling-script cues (cue-to-cue). */
  cues: Cue[]
  /** Uploaded script document (static for now; annotation comes in Phase 2). */
  script?: ScriptMeta
  /** General uploaded files kept with the show (headshots, contracts, budgets…). */
  assets: Asset[]
  /** What kind of show this is — drives module labels and default visibility.
      Undefined means a classic play (back-compat with pre-kinds data). */
  kind?: ProductionKind
  /** Per-show module show/hide overrides keyed by nav path (e.g. '/line-notes').
      Overrides the kind's default when the user toggles a module for this show. */
  modules?: Partial<Record<string, boolean>>
  /** True for the built-in demo show, so it can be shown as a removable preview. */
  isSample?: boolean
  createdAt: string
  /** ISO time of the last edit to the production's own fields (title, dates,
      notes…). Record edits carry their own updatedAt. Drives auto-merge. */
  updatedAt?: string
  /** Tombstones for records deleted from THIS production: record id → ISO time
      of deletion. Lets a delete on one device survive an auto-merge instead of
      the record resurrecting from another device that still has it. */
  deleted?: Record<ID, string>
}

export interface AppData {
  /** Schema version to allow safe future migrations. */
  version: number
  productions: Production[]
  activeProductionId: ID | null
  /** Tombstones for deleted PRODUCTIONS: production id → ISO deletion time, so a
      show deleted on one device doesn't come back via auto-merge from another. */
  deleted?: Record<ID, string>
}
