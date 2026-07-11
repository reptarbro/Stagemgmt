import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loadData,
  saveData,
  newId,
  normalizeProduction,
  putScriptFile,
  getScriptFile,
  deleteScriptFile,
  putFile,
  getFile,
  deleteFile,
  assetKey,
} from './storage'
import { makeSampleProduction } from './sample'
import type {
  AppData,
  Asset,
  AssetCategory,
  Attendance,
  Cue,
  LineNote,
  Person,
  Production,
  PropItem,
  Report,
  Scene,
  ScheduleEvent,
  ScriptMeta,
} from './types'

interface StoreValue {
  data: AppData
  production: Production | null
  // Productions
  createProduction: (fields: Partial<Production> & { title: string }) => Production
  loadSampleProduction: () => void
  updateProduction: (id: string, patch: Partial<Production>) => void
  deleteProduction: (id: string) => void
  setActiveProduction: (id: string) => void
  // People
  addPerson: (p: Omit<Person, 'id'>) => void
  updatePerson: (id: string, patch: Partial<Person>) => void
  deletePerson: (id: string) => void
  // Events
  addEvent: (e: Omit<ScheduleEvent, 'id'>) => void
  updateEvent: (id: string, patch: Partial<ScheduleEvent>) => void
  deleteEvent: (id: string) => void
  // Attendance
  getAttendance: (eventId: string) => Attendance | undefined
  setAttendance: (att: Attendance) => void
  // Reports
  addReport: (r: Omit<Report, 'id' | 'createdAt'>) => Report
  updateReport: (id: string, patch: Partial<Report>) => void
  deleteReport: (id: string) => void
  // Scenes
  addScene: (s: Omit<Scene, 'id'>) => void
  updateScene: (id: string, patch: Partial<Scene>) => void
  deleteScene: (id: string) => void
  // Props & costumes
  addProp: (p: Omit<PropItem, 'id'>) => void
  updateProp: (id: string, patch: Partial<PropItem>) => void
  deleteProp: (id: string) => void
  // Line notes
  addLineNote: (n: Omit<LineNote, 'id'>) => void
  updateLineNote: (id: string, patch: Partial<LineNote>) => void
  deleteLineNote: (id: string) => void
  // Cues (cue-to-cue / calling script)
  addCue: (c: Omit<Cue, 'id'>) => void
  updateCue: (id: string, patch: Partial<Cue>) => void
  deleteCue: (id: string) => void
  // Script (static document)
  setScript: (file: File) => Promise<void>
  getScriptURL: () => Promise<string | null>
  removeScript: () => Promise<void>
  // Assets (general uploaded files: headshots, contracts, budgets…)
  addAsset: (file: File, meta?: { category?: AssetCategory; personId?: string; note?: string }) => Promise<void>
  updateAsset: (id: string, patch: Partial<Pick<Asset, 'filename' | 'category' | 'personId' | 'note'>>) => void
  getAssetURL: (id: string) => Promise<string | null>
  removeAsset: (id: string) => Promise<void>
  // Data portability
  exportJSON: () => string
  importJSON: (json: string) => { ok: boolean; error?: string }
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const value = useMemo<StoreValue>(() => {
    const production =
      data.productions.find((p) => p.id === data.activeProductionId) ?? null

    /** Apply a patch to the active production immutably. */
    const patchActive = (fn: (p: Production) => Production) => {
      setData((d) => {
        if (!d.activeProductionId) return d
        return {
          ...d,
          productions: d.productions.map((p) =>
            p.id === d.activeProductionId ? fn(p) : p,
          ),
        }
      })
    }

    // Auto-merge across devices needs a per-record edit time and delete
    // tombstones. `now()` stamps updatedAt on every add/edit; `tomb()` records a
    // deleted record's id so the delete survives a merge instead of the record
    // resurrecting from another device that still has it.
    const now = () => new Date().toISOString()
    const tomb = (prod: Production, ...ids: string[]): Record<string, string> => {
      const out = { ...(prod.deleted ?? {}) }
      const t = now()
      for (const id of ids) out[id] = t
      return out
    }

    return {
      data,
      production,

      createProduction: (fields) => {
        const prod: Production = {
          id: newId(),
          title: fields.title,
          company: fields.company,
          venue: fields.venue,
          director: fields.director,
          firstRehearsal: fields.firstRehearsal,
          openingNight: fields.openingNight,
          closingNight: fields.closingNight,
          notes: fields.notes,
          kind: fields.kind,
          modules: fields.modules,
          people: [],
          events: [],
          attendance: [],
          reports: [],
          scenes: [],
          props: [],
          lineNotes: [],
          cues: [],
          assets: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deleted: {},
        }
        setData((d) => ({
          ...d,
          productions: [...d.productions, prod],
          activeProductionId: prod.id,
        }))
        return prod
      },

      loadSampleProduction: () => {
        // Never create a second sample — just switch to the existing one.
        const existing = data.productions.find((p) => p.isSample)
        if (existing) {
          setData((d) => ({ ...d, activeProductionId: existing.id }))
          return
        }
        const prod = makeSampleProduction()
        setData((d) => ({
          ...d,
          productions: [...d.productions, prod],
          activeProductionId: prod.id,
        }))
      },

      updateProduction: (id, patch) =>
        setData((d) => ({
          ...d,
          productions: d.productions.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: now() } : p,
          ),
        })),

      deleteProduction: (id) =>
        setData((d) => {
          const productions = d.productions.filter((p) => p.id !== id)
          const activeProductionId =
            d.activeProductionId === id
              ? (productions[0]?.id ?? null)
              : d.activeProductionId
          // Tombstone the production so the delete survives an auto-merge.
          return { ...d, productions, activeProductionId, deleted: { ...(d.deleted ?? {}), [id]: now() } }
        }),

      setActiveProduction: (id) =>
        setData((d) => ({ ...d, activeProductionId: id })),

      addPerson: (p) =>
        patchActive((prod) => ({
          ...prod,
          people: [...prod.people, { ...p, id: newId(), updatedAt: now() }],
        })),

      updatePerson: (id, patch) =>
        patchActive((prod) => ({
          ...prod,
          people: prod.people.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)),
        })),

      deletePerson: (id) =>
        patchActive((prod) => ({
          ...prod,
          people: prod.people.filter((x) => x.id !== id),
          // Also drop them from any event call lists (stamp only the events that
          // actually change, so unrelated events aren't marked edited).
          events: prod.events.map((e) =>
            e.calledPersonIds.includes(id)
              ? { ...e, calledPersonIds: e.calledPersonIds.filter((pid) => pid !== id), updatedAt: now() }
              : e,
          ),
          deleted: tomb(prod, id),
        })),

      addEvent: (e) =>
        patchActive((prod) => ({
          ...prod,
          events: [...prod.events, { ...e, id: newId(), updatedAt: now() }],
        })),

      updateEvent: (id, patch) =>
        patchActive((prod) => ({
          ...prod,
          events: prod.events.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)),
        })),

      deleteEvent: (id) =>
        patchActive((prod) => ({
          ...prod,
          events: prod.events.filter((x) => x.id !== id),
          attendance: prod.attendance.filter((a) => a.eventId !== id),
          // The event id also keys its attendance record, so one tombstone covers both.
          deleted: tomb(prod, id),
        })),

      getAttendance: (eventId) =>
        production?.attendance.find((a) => a.eventId === eventId),

      setAttendance: (att) =>
        patchActive((prod) => {
          const stamped = { ...att, updatedAt: now() }
          const exists = prod.attendance.some((a) => a.eventId === att.eventId)
          return {
            ...prod,
            attendance: exists
              ? prod.attendance.map((a) => (a.eventId === att.eventId ? stamped : a))
              : [...prod.attendance, stamped],
          }
        }),

      addReport: (r) => {
        const report: Report = {
          ...r,
          id: newId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        patchActive((prod) => ({
          ...prod,
          reports: [...prod.reports, report],
        }))
        return report
      },

      updateReport: (id, patch) =>
        patchActive((prod) => ({
          ...prod,
          reports: prod.reports.map((x) =>
            x.id === id ? { ...x, ...patch, updatedAt: now() } : x,
          ),
        })),

      deleteReport: (id) =>
        patchActive((prod) => ({
          ...prod,
          reports: prod.reports.filter((x) => x.id !== id),
          deleted: tomb(prod, id),
        })),

      addScene: (s) =>
        patchActive((prod) => ({
          ...prod,
          scenes: [...prod.scenes, { ...s, id: newId(), updatedAt: now() }],
        })),
      updateScene: (id, patch) =>
        patchActive((prod) => ({
          ...prod,
          scenes: prod.scenes.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)),
        })),
      deleteScene: (id) =>
        patchActive((prod) => ({
          ...prod,
          scenes: prod.scenes.filter((x) => x.id !== id),
          deleted: tomb(prod, id),
        })),

      addProp: (p) =>
        patchActive((prod) => ({
          ...prod,
          props: [...prod.props, { ...p, id: newId(), updatedAt: now() }],
        })),
      updateProp: (id, patch) =>
        patchActive((prod) => ({
          ...prod,
          props: prod.props.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)),
        })),
      deleteProp: (id) =>
        patchActive((prod) => ({
          ...prod,
          props: prod.props.filter((x) => x.id !== id),
          deleted: tomb(prod, id),
        })),

      addLineNote: (n) =>
        patchActive((prod) => ({
          ...prod,
          lineNotes: [...prod.lineNotes, { ...n, id: newId(), updatedAt: now() }],
        })),
      updateLineNote: (id, patch) =>
        patchActive((prod) => ({
          ...prod,
          lineNotes: prod.lineNotes.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)),
        })),
      deleteLineNote: (id) =>
        patchActive((prod) => ({
          ...prod,
          lineNotes: prod.lineNotes.filter((x) => x.id !== id),
          deleted: tomb(prod, id),
        })),

      addCue: (c) =>
        patchActive((prod) => ({
          ...prod,
          cues: [...(prod.cues ?? []), { ...c, id: newId(), updatedAt: now() }],
        })),
      updateCue: (id, patch) =>
        patchActive((prod) => ({
          ...prod,
          cues: (prod.cues ?? []).map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)),
        })),
      deleteCue: (id) =>
        patchActive((prod) => ({
          ...prod,
          cues: (prod.cues ?? []).filter((x) => x.id !== id),
          deleted: tomb(prod, id),
        })),

      setScript: async (file) => {
        if (!production) return
        // Reuse existing id (overwrite) or mint a new one.
        const scriptId = production.script?.id ?? newId()
        await putScriptFile(scriptId, file)
        const meta: ScriptMeta = {
          id: scriptId,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          uploadedAt: new Date().toISOString(),
        }
        // Bump the production's own updatedAt so the script change wins in a merge.
        patchActive((prod) => ({ ...prod, script: meta, updatedAt: now() }))
      },

      getScriptURL: async () => {
        if (!production?.script) return null
        const blob = await getScriptFile(production.script.id)
        if (!blob) return null
        return URL.createObjectURL(blob)
      },

      removeScript: async () => {
        if (!production?.script) return
        await deleteScriptFile(production.script.id)
        patchActive((prod) => ({ ...prod, script: undefined, updatedAt: now() }))
      },

      addAsset: async (file, meta) => {
        if (!production) return
        const id = newId()
        // Store the bytes in IndexedDB under `asset:<id>`; that key is picked up
        // by getAllFiles(), so it syncs to the cloud and packs into backups like
        // the script and sign-in photos, with no extra plumbing.
        await putFile(assetKey(id), file)
        const asset: Asset = {
          id,
          filename: file.name,
          category: meta?.category ?? 'Other',
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          uploadedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          personId: meta?.personId,
          note: meta?.note,
        }
        patchActive((prod) => ({ ...prod, assets: [...(prod.assets ?? []), asset] }))
      },

      updateAsset: (id, patch) =>
        patchActive((prod) => ({
          ...prod,
          assets: (prod.assets ?? []).map((a) => (a.id === id ? { ...a, ...patch, updatedAt: now() } : a)),
        })),

      getAssetURL: async (id) => {
        const blob = await getFile(assetKey(id))
        if (!blob) return null
        return URL.createObjectURL(blob)
      },

      removeAsset: async (id) => {
        await deleteFile(assetKey(id))
        patchActive((prod) => ({
          ...prod,
          assets: (prod.assets ?? []).filter((a) => a.id !== id),
          deleted: tomb(prod, id),
        }))
      },

      exportJSON: () => JSON.stringify(data, null, 2),

      importJSON: (json) => {
        try {
          const parsed = JSON.parse(json) as AppData
          if (!parsed || !Array.isArray(parsed.productions)) {
            return { ok: false, error: 'File does not look like StandBy data.' }
          }
          const productions = parsed.productions.map(normalizeProduction)
          setData((d) => ({
            version: 1,
            productions,
            // Keep the current device's open production if it still exists.
            activeProductionId:
              (d.activeProductionId && productions.some((p) => p.id === d.activeProductionId)
                ? d.activeProductionId
                : parsed.activeProductionId) ?? productions[0]?.id ?? null,
            // Preserve production-level tombstones so deletes survive a merge/import.
            deleted: parsed.deleted ?? d.deleted ?? {},
          }))
          return { ok: true }
        } catch (err) {
          return { ok: false, error: (err as Error).message }
        }
      },
    }
  }, [data])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}
