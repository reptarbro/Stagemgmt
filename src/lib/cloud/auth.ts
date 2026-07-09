import { useEffect, useState } from 'react'
import { supa } from './client'
import { CLOUD_ENABLED } from './config'

/**
 * Reactive "is the user signed in to Cloud Sync?" for UI that must change with
 * auth — e.g. the local-only backup nudge, which is misleading once data also
 * lives in the cloud. Returns false when cloud is disabled or signed out.
 */
export function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    if (!CLOUD_ENABLED) return
    let alive = true
    supa()
      .auth.getUser()
      .then(({ data }) => {
        if (alive) setSignedIn(!!data.user)
      })
      .catch(() => {})
    const { data: sub } = supa().auth.onAuthStateChange((_e, session) => {
      if (alive) setSignedIn(!!session?.user)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])
  return signedIn
}
