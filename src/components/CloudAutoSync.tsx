import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { supa } from '../lib/cloud/client'
import { CLOUD_ENABLED } from '../lib/cloud/config'
import {
  pushAll,
  pullAll,
  fetchCloudState,
  dataSignature,
  syncedSignature,
  setSyncedSignature,
  lastSyncedAt,
} from '../lib/cloud/sync'
import type { AppData } from '../lib/types'

const DEBOUNCE_MS = 2500
// While the app is open and in the foreground, quietly check the cloud on this
// cadence so a device left open still catches another device's changes without a
// reload. Cheap: reads one row + compares a signature, pulls only when behind.
const POLL_MS = 30000

function hasRealData(json: string): boolean {
  try {
    const d = JSON.parse(json) as AppData
    return d.productions.some((p) => !p.isSample)
  } catch {
    return false
  }
}

/**
 * Auto-sync engine (Stage 2.1). Renders nothing. When signed in:
 *  - pushes local changes to the cloud, debounced, and flushes the pending push
 *    when the app is hidden or closing (so the last edits are never stranded);
 *  - reconciles with the cloud on open, when the app returns to the foreground,
 *    and on a slow poll while open, pulling if this device is behind.
 * It never auto-clobbers when BOTH sides changed since the last sync — that
 * case is left to the manual Push/Pull buttons. Manual controls always win.
 */
export function CloudAutoSync() {
  const { exportJSON, importJSON, data } = useStore()
  const [signedIn, setSignedIn] = useState(false)
  const reconciledFor = useRef<string | null>(null)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Serialize sync work so a poll, a focus reconcile, and a flush never overlap.
  const syncing = useRef(false)

  // Always-fresh handles so event listeners never read a stale store snapshot.
  const exportRef = useRef(exportJSON)
  const importRef = useRef(importJSON)
  exportRef.current = exportJSON
  importRef.current = importJSON

  // Reconcile: decide pull vs push vs leave-alone. Safe to call repeatedly.
  const reconcile = async () => {
    if (syncing.current) return
    syncing.current = true
    try {
      const localJson = exportRef.current()
      const localSig = dataSignature(localJson)
      const cloud = await fetchCloudState()

      if (!cloud) {
        if (hasRealData(localJson)) {
          await pushAll(localJson)
        }
        setSyncedSignature(localSig)
        return
      }
      const cloudSig = dataSignature(JSON.stringify(cloud.data))
      if (cloudSig === localSig) {
        setSyncedSignature(localSig)
        return
      }
      const synced = syncedSignature()
      // A device with no real shows just takes the cloud copy.
      if (!hasRealData(localJson)) {
        const r = await pullAll(importRef.current)
        if (r.ok) setSyncedSignature(cloudSig)
        return
      }
      // Never synced here, and both sides have (different) data → real conflict.
      if (synced === null) return
      // Local unchanged since last sync, cloud moved on → safe to pull.
      if (localSig === synced) {
        const r = await pullAll(importRef.current)
        if (r.ok) setSyncedSignature(cloudSig)
        return
      }
      // Local changed since last sync. If the cloud also moved on, that's a
      // conflict → leave it to manual. Otherwise push our edits up.
      const cloudNewer = cloud.updatedAt > (lastSyncedAt() ?? '')
      if (cloudNewer) return
      await pushAll(localJson)
      setSyncedSignature(localSig)
    } catch {
      /* offline or transient; manual buttons remain */
    } finally {
      syncing.current = false
    }
  }

  // Push unsynced local changes right now — used when the app is hidden/closing,
  // where the debounce timer might not get to fire.
  const flushPush = async () => {
    if (pushTimer.current) {
      clearTimeout(pushTimer.current)
      pushTimer.current = null
    }
    const json = exportRef.current()
    const sig = dataSignature(json)
    if (sig === syncedSignature()) return // nothing new
    if (!hasRealData(json)) return // never push empty state over the cloud
    if (syncing.current) return
    syncing.current = true
    try {
      await pushAll(json)
      setSyncedSignature(sig)
    } catch {
      /* transient; recovered by the next change, next hide, or reopen reconcile */
    } finally {
      syncing.current = false
    }
  }

  // Track sign-in and reconcile once when a session first appears.
  useEffect(() => {
    if (!CLOUD_ENABLED) return
    let alive = true
    const apply = (userId: string | null) => {
      if (!alive) return
      setSignedIn(!!userId)
      if (userId && reconciledFor.current !== userId) {
        reconciledFor.current = userId
        void reconcile()
      }
      if (!userId) reconciledFor.current = null
    }
    supa()
      .auth.getUser()
      .then(({ data }) => apply(data.user?.id ?? null))
      .catch(() => apply(null))
    const { data: sub } = supa().auth.onAuthStateChange((_e, session) => apply(session?.user?.id ?? null))
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced push whenever local data actually changes.
  useEffect(() => {
    if (!CLOUD_ENABLED || !signedIn) return
    const json = exportJSON()
    const sig = dataSignature(json)
    if (sig === syncedSignature()) return // nothing new since last sync
    if (!hasRealData(json)) return // don't push an empty state over the cloud
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(async () => {
      try {
        await pushAll(json)
        setSyncedSignature(sig)
      } catch {
        /* transient; recovered on next change, on hide (flush), or reopen */
      }
    }, DEBOUNCE_MS)
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, signedIn])

  // Catch up other devices' changes on focus/return, and shove ours up before
  // this one is backgrounded or closed. Plus a slow poll while in the foreground
  // so a device left open still converges without a reload.
  useEffect(() => {
    if (!CLOUD_ENABLED || !signedIn) return
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void reconcile()
      else void flushPush()
    }
    const onFocus = () => void reconcile()
    const onPageHide = () => void flushPush()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    window.addEventListener('pagehide', onPageHide)
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') void reconcile()
    }, POLL_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pagehide', onPageHide)
      clearInterval(poll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn])

  return null
}
