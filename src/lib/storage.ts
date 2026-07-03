import type { AppData } from './types'

const STORAGE_KEY = 'stagemgmt.data.v1'
const CURRENT_VERSION = 1

const EMPTY: AppData = {
  version: CURRENT_VERSION,
  productions: [],
  activeProductionId: null,
}

/** Load app data from localStorage, tolerating missing/corrupt data. */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(EMPTY)
    const parsed = JSON.parse(raw) as AppData
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.productions)) {
      return structuredClone(EMPTY)
    }
    // Future migrations would branch on parsed.version here.
    return { ...structuredClone(EMPTY), ...parsed, version: CURRENT_VERSION }
  } catch {
    return structuredClone(EMPTY)
  }
}

/** Persist app data. Throws are swallowed so the UI never crashes on quota errors. */
export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save data', err)
  }
}

/** Generate a stable-ish unique id without external deps. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`
}
