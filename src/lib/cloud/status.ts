// A tiny observable for the current cloud-sync state, so the UI can show what
// the auto-sync engine (CloudAutoSync) is doing without threading props around.
// The important one is 'conflict': both this device and the cloud changed since
// the last sync, so auto-sync deliberately stops to avoid clobbering either -
// the user resolves it with a manual Push or Pull.
import { useSyncExternalStore } from 'react'

export type SyncState = 'idle' | 'syncing' | 'synced' | 'conflict' | 'error'
export interface SyncStatus {
  state: SyncState
  /** ISO time of the last successful sync, when known. */
  at?: string
}

let current: SyncStatus = { state: 'idle' }
const listeners = new Set<(s: SyncStatus) => void>()

export function getSyncStatus(): SyncStatus {
  return current
}

export function setSyncStatus(next: SyncState, at?: string): void {
  // Preserve the last known sync time unless a fresh one is given.
  current = { state: next, at: at ?? current.at }
  listeners.forEach((l) => l(current))
}

function subscribe(fn: () => void): () => void {
  const wrapped = () => fn()
  listeners.add(wrapped)
  return () => {
    listeners.delete(wrapped)
  }
}

/** React binding for the sync status. */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, getSyncStatus, getSyncStatus)
}
