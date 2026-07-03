import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadData, saveData, newId } from './storage'
import type {
  AppData,
  Attendance,
  Person,
  Production,
  Report,
  ScheduleEvent,
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

      exportJSON: () => JSON.stringify(data, null, 2),

      importJSON: (json) => {
        try {
          const parsed = JSON.parse(json) as AppData
          if (!parsed || !Array.isArray(parsed.productions)) {
            return { ok: false, error: 'File does not look like Stage Manager data.' }
          }
          setData({
            version: 1,
            productions: parsed.productions,
            activeProductionId:
              parsed.activeProductionId ?? parsed.productions[0]?.id ?? null,
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
