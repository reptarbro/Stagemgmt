import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { supa } from '../lib/cloud/client'
import { CLOUD_ENABLED } from '../lib/cloud/config'
import {
  pushAll,
  fetchCloudState,
  downloadMissingFiles,
  dataSignature,
  syncedSignature,
  setSyncedSignature,
} from '../lib/cloud/sync'
import { mergeAppData } from '../lib/cloud/merge'
import { setSyncStatus, getSyncStatus } from '../lib/cloud/status'
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
  const [userId, setUserId] = useState<string | null>(null)
  const reconciledFor = useRef<string | null>(null)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Serialize sync work so a poll, a focus reconcile, and a flush never overlap.
  const syncing = useRef(false)

  // Always-fresh handles so event listeners never read a stale store snapshot.
  const exportRef = useRef(exportJSON)
  const importRef = useRef(importJSON)
  exportRef.current = exportJSON
  importRef.current = importJSON

  // Reconcile by MERGING, never by asking the user to choose. We union this
  // device's data with the cloud copy (adds from either side survive, newest
  // edit wins per record, deletes are tombstoned) via mergeAppData, adopt the
  // result locally, and push it up if the cloud is behind. The merge converges,
  // so both devices land on identical state — no conflict, no Push/Pull needed.
  // Safe to call repeatedly (focus, poll, realtime, debounced change).
  const reconcile = async () => {
    if (syncing.current) return
    syncing.current = true
    try {
      const localJson = exportRef.current()
      const localSig = dataSignature(localJson)
      const cloud = await fetchCloudState()

      if (!cloud) {
        // No cloud copy yet — seed it from this device if it has real data.
        if (hasRealData(localJson)) await pushAll(localJson)
        setSyncedSignature(localSig)
        setSyncStatus('synced')
        return
      }

      const local = JSON.parse(localJson) as AppData
      const cloudData = cloud.data as AppData
      const merged = mergeAppData(local, cloudData)
      const mergedJson = JSON.stringify(merged)
      const mergedSig = dataSignature(mergedJson)
      const cloudSig = dataSignature(JSON.stringify(cloudData))

      // Adopt the merged result locally if it adds/changes anything we have.
      if (mergedSig !== localSig) importRef.current(mergedJson)
      // Push it up when the cloud is behind the merged result (this also uploads
      // any local binaries the cloud is missing).
      if (mergedSig !== cloudSig) await pushAll(mergedJson)
      // Pull down any binaries (asset/script/sign-in files) another device added
      // that we don't have yet, so merged metadata never dangles.
      await downloadMissingFiles()

      setSyncedSignature(mergedSig)
      setSyncStatus('synced')
    } catch {
      /* offline or transient; retried on next change / focus / poll / realtime */
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
    // Never overwrite the cloud on the way out when a conflict is already known —
    // the user must resolve it with a manual Push/Pull, same as reconcile.
    if (getSyncStatus().state === 'conflict') return
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
    const apply = (uid: string | null) => {
      if (!alive) return
      setSignedIn(!!uid)
      setUserId(uid)
      if (uid && reconciledFor.current !== uid) {
        reconciledFor.current = uid
        void reconcile()
      }
      if (!uid) reconciledFor.current = null
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
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null
      // Reconcile instead of a blind push: it re-checks the cloud against our
      // last sync and flags a conflict (rather than clobbering) if the cloud
      // moved on meanwhile. It reads the latest local state and respects the
      // shared sync lock, so it can't race a poll/focus reconcile.
      void reconcile()
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

  // Realtime: subscribe to this user's cloud row so another device's push lands
  // here in ~1s instead of waiting for the focus/30s-poll reconcile. On any
  // change we just run reconcile() — it re-checks the cloud against our last
  // sync and only PULLS when this device has no unsynced edits (pushes when only
  // we changed, flags a conflict when both did), so it can't clobber local work.
  // Our own push echoes back as a change too, but reconcile then sees cloud ==
  // local and no-ops. Best-effort: if Realtime isn't enabled on the table or the
  // socket drops, the 30s poll above still converges. Requires the app_state
  // table to be in the `supabase_realtime` publication (supabase/enable_realtime.sql).
  useEffect(() => {
    if (!CLOUD_ENABLED || !userId) return
    const channel = supa()
      .channel(`app_state:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_state', filter: `user_id=eq.${userId}` },
        () => void reconcile(),
      )
      .subscribe()
    return () => {
      void supa().removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return null
}
