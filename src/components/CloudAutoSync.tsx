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
 *  - pushes local changes to the cloud, debounced;
 *  - on open, reconciles with the cloud and pulls if this device is behind.
 * It never auto-clobbers when BOTH sides changed since the last sync — that
 * case is left to the manual Push/Pull buttons. Manual controls always win.
 */
export function CloudAutoSync() {
  const { exportJSON, importJSON, data } = useStore()
  const [signedIn, setSignedIn] = useState(false)
  const reconciledFor = useRef<string | null>(null)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reconcile once when a session appears: decide pull vs push vs leave-alone.
  const reconcile = async () => {
    try {
      const localJson = exportJSON()
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
        const r = await pullAll(importJSON)
        if (r.ok) setSyncedSignature(cloudSig)
        return
      }
      // Never synced here, and both sides have (different) data → real conflict.
      if (synced === null) return
      // Local unchanged since last sync, cloud moved on → safe to pull.
      if (localSig === synced) {
        const r = await pullAll(importJSON)
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
    }
  }

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
        /* transient; will retry on next change or manual push */
      }
    }, DEBOUNCE_MS)
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, signedIn])

  return null
}
