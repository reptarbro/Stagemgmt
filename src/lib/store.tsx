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
} from './storage'
import type {
  AppData,
  Attendance,
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
  // Script (static document)
  setScript: (file: File) => Promise<void>
  getScriptURL: () => Promise<string | null>
  removeScript: () => Promise<void>
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
          people: [],
          events: [],
          attendance: [],
          reports: [],
          scenes: [],
          props: [],
          lineNotes: [],
          createdAt: new Date().toISOString(),
        }
        setData((d) => ({
          ...d,
          productions: [...d.productions, prod],
          activeProductionId: prod.id,
        }))
        return prod
      },

      updateProduction: (id, patch) =>
        setData((d) => ({
          ...d,
          productions: d.productions.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        })),

      deleteProduction: (id) =>
        setData((d) => {
          const productions = d.productions.filter((p) => p.id !== id)
          const activeProductionId =
            d.activeProductionId === id
              ? (productions[0]?.id ?? null)
              : d.activeProductionId
          return { ...d, productions, activeProductionId }
        }),

      setActiveProduction: (id) =>
        setData((d) => ({ ...d, activeProductionId: id })),

      addPerson: (p) =>
        patchActive((prod) => ({
          ...prod,
          people: [...prod.people, { ...p, id: newId() }],
        })),

      updatePerson: (id, patch) =>
        patchActive((prod) => ({
          ...prod,
          people: prod.people.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),

      deletePerson: (id) =>
        patchActive((prod) => ({
          ...prod,
          people: prod.people.filter((x) => x.id !== id),
          // Also drop them from any event call lists.
          events: prod.events.map((e) => ({
            ...e,
            calledPersonIds: e.calledPersonIds.filter((pid) => pid !== id),
          })),
        })),

      addEvent: (e) =>
        patchActive((prod) => ({
          ...prod,
          events: [...prod.events, { ...e, id: newId() }],
        })),

      updateEvent: (id, patch) =>
        patchActive((prod) => ({
          ...prod,
          events: prod.events.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),

      deleteEvent: (id) =>
        patchActive((prod) => ({
          ...prod,
          events: prod.events.filter((x) => x.id !== id),
          attendance: prod.attendance.filter((a) => a.eventId !== id),
        })),

      getAttendance: (eventId) =>
        production?.attendance.find((a) => a.eventId === eventId),

      setAttendance: (att) =>
        patchActive((prod) => {
          const exists = prod.attendance.some((a) => a.eventId === att.eventId)
          return {
            ...prod,
            attendance: exists
              ? prod.attendance.map((a) =>
                  a.eventId === att.eventId ? att : a,
                )
              : [...prod.attendance, att],
          }
        }),

      addReport: (r) => {
        const report: Report = {
          ...r,
          id: newId(),
          createdAt: new Date().toISOString(),
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
            x.id === id ? { ...x, ...patch } : x,
          ),
        })),

      deleteReport: (id) =>
        patchActive((prod) => ({
          ...prod,
          reports: prod.reports.filter((x) => x.id !== id),
        })),

      addScene: (s) =>
        patchActive((prod) => ({
          ...prod,
          scenes: [...prod.scenes, { ...s, id: newId() }],
        })),
      updateScene: (id, patch) =>
        patchActive((prod) => ({
          ...prod,
          scenes: prod.scenes.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      deleteScene: (id) =>
        patchActive((prod) => ({
          ...prod,
          scenes: prod.scenes.filter((x) => x.id !== id),
        })),

      addProp: (p) =>
        patchActive((prod) => ({
          ...prod,
          props: [...prod.props, { ...p, id: newId() }],
        })),
      updateProp: (id, patch) =>
        patchActive((prod) => ({
          ...prod,
          props: prod.props.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      deleteProp: (id) =>
        patchActive((prod) => ({
          ...prod,
          props: prod.props.filter((x) => x.id !== id),
        })),

      addLineNote: (n) =>
        patchActive((prod) => ({
          ...prod,
          lineNotes: [...prod.lineNotes, { ...n, id: newId() }],
        })),
      updateLineNote: (id, patch) =>
        patchActive((prod) => ({
          ...prod,
          lineNotes: prod.lineNotes.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      deleteLineNote: (id) =>
        patchActive((prod) => ({
          ...prod,
          lineNotes: prod.lineNotes.filter((x) => x.id !== id),
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
        patchActive((prod) => ({ ...prod, script: meta }))
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
        patchActive((prod) => ({ ...prod, script: undefined }))
      },

      exportJSON: () => JSON.stringify(data, null, 2),

      importJSON: (json) => {
        try {
          const parsed = JSON.parse(json) as AppData
          if (!parsed || !Array.isArray(parsed.productions)) {
            return { ok: false, error: 'File does not look like Stage Manager data.' }
          }
          const productions = parsed.productions.map(normalizeProduction)
          setData({
            version: 1,
            productions,
            activeProductionId:
              parsed.activeProductionId ?? productions[0]?.id ?? null,
          })
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
