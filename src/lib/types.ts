// Core domain model for the Stage Manager app.
// Everything is keyed under a Production so multiple shows can coexist.

export type ID = string

/** Broad grouping used for filtering the contact sheet and building call lists. */
export type PersonGroup = 'Cast' | 'Crew' | 'Creative' | 'Production' | 'Musician' | 'Front of House' | 'Other'

/** A date (or range note) a person is unavailable. */
export interface Conflict {
  id: ID
  /** ISO date. */
  date: string
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
}

export type EventType = 'Rehearsal' | 'Performance' | 'Tech' | 'Meeting' | 'Fitting' | 'Other'

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
  notes?: string
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused' | 'unmarked'

/** Attendance is stored per event, keyed by person id. */
export interface Attendance {
  eventId: ID
  records: Record<ID, { status: AttendanceStatus; note?: string }>
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

export type ReportType = 'Rehearsal' | 'Performance'

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
}

export type PropCategory = 'Prop' | 'Costume' | 'Set' | 'Furniture' | 'Sound' | 'Other'
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
}

/** Metadata for an uploaded script file; the bytes live in IndexedDB. */
export interface ScriptMeta {
  id: ID
  filename: string
  mimeType: string
  size: number
  uploadedAt: string
}

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
  /** Uploaded script document (static for now; annotation comes in Phase 2). */
  script?: ScriptMeta
  createdAt: string
}

export interface AppData {
  /** Schema version to allow safe future migrations. */
  version: number
  productions: Production[]
  activeProductionId: ID | null
}
