import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { supa } from '../lib/cloud/client'
import { pushAll, pullAll, lastSyncedAt, cloudHasData, deleteCloudData, deleteAuthAccount } from '../lib/cloud/sync'
import { useSyncStatus, setSyncStatus } from '../lib/cloud/status'
import { ConfirmButton } from './ui'
import { GoogleG } from './GoogleG'

type Stage = 'loading' | 'email' | 'sent' | 'in'

/** The app's base URL (no hash route), used as the magic-link return target. */
function appBaseUrl(): string {
  return window.location.href.split('#')[0].split('?')[0]
}

/** Optional account-backed sync. Signed out, it changes nothing — the app stays
    local-first. Signed in, you can Push this device's data to the cloud and Pull
    it onto another (data model + uploaded script/photos). */
export function CloudSync() {
  const { exportJSON, importJSON, data } = useStore()
  const [stage, setStage] = useState<Stage>('loading')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [synced, setSynced] = useState<string | null>(lastSyncedAt())
  const status = useSyncStatus()
  const handledSignIn = useRef(false)

  // When a session appears (fresh sign-in or restored), guide the next step:
  // a brand-new device with no shows auto-loads the cloud copy; a device that
  // already has shows is asked to choose Push or Pull so nothing is clobbered.
  const onSignedIn = async () => {
    if (handledSignIn.current) return
    handledSignIn.current = true
    const hasLocal = data.productions.some((p) => !p.isSample)
    let cloud = false
    try {
      cloud = await cloudHasData()
    } catch {
      /* offline or transient */
    }
    if (cloud && !hasLocal) {
      setBusy(true)
      const r = await pullAll(importJSON)
      setBusy(false)
      setSynced(lastSyncedAt())
      setMsg(r.ok ? `Loaded your shows from the cloud (${r.files} file(s)).` : r.error ?? 'Could not load.')
    } else if (cloud && hasLocal) {
      setMsg('Signed in. A cloud copy exists — Pull to load it here, or Push to overwrite it with this device.')
    } else {
      setMsg('Signed in. Tap Push to save this device to the cloud.')
    }
  }

  useEffect(() => {
    let alive = true
    supa()
      .auth.getUser()
      .then(({ data }) => {
        if (!alive) return
        if (data.user) {
          setEmail(data.user.email ?? '')
          setStage('in')
          void onSignedIn()
        } else setStage('email')
      })
      .catch(() => {
        if (alive) setStage('email')
      })
    const { data: sub } = supa().auth.onAuthStateChange((_e, session) => {
      if (!alive) return
      if (session?.user) {
        setEmail(session.user.email ?? '')
        setStage('in')
        void onSignedIn()
      } else {
        setStage('email')
        handledSignIn.current = false
      }
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendLink = async () => {
    if (!email.trim()) return
    setBusy(true)
    setMsg(null)
    const { error } = await supa().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: appBaseUrl() },
    })
    setBusy(false)
    if (error) setMsg(error.message)
    else {
      setStage('sent')
      setMsg(null)
    }
  }

  const signInGoogle = async () => {
    setMsg(null)
    const { error } = await supa().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: appBaseUrl() },
    })
    // On success the browser redirects to Google; only errors return here.
    if (error) setMsg(error.message)
  }

  const signOut = async () => {
    await supa().auth.signOut()
    setSyncStatus('idle')
    setMsg('Signed out. Your data stays on this device.')
  }

  const doPush = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await pushAll(exportJSON())
      setSynced(lastSyncedAt())
      setMsg(`Pushed to the cloud — data + ${r.files} file(s).`)
    } catch (e) {
      setMsg(`Push failed: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const doDeleteAccount = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await deleteCloudData()
      const accountGone = await deleteAuthAccount()
      await supa().auth.signOut()
      setSynced(null)
      setSyncStatus('idle')
      setMsg(
        accountGone
          ? `Account and cloud data deleted (${r.files} file(s) removed). Your copy on this device is untouched — export a backup if you want to keep it.`
          : `Cloud data deleted (${r.files} file(s) removed) and you're signed out. Your copy on this device is untouched.`,
      )
    } catch (e) {
      setMsg(`Delete failed: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const doPull = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await pullAll(importJSON)
      if (r.ok) {
        setSynced(lastSyncedAt())
        setMsg(`Pulled from the cloud — data + ${r.files} file(s).`)
      } else setMsg(r.error ?? 'Pull failed.')
    } catch (e) {
      setMsg(`Pull failed: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <div className="card-title">
        Cloud Sync <span className="nav-hint" style={{ marginLeft: 6 }}>beta</span>
      </div>
      <p className="small muted">
        Sign in with your email to move your show between devices without a file. Push from the device
        that has your latest work, then Pull on the others. Signed out, nothing leaves this device.
      </p>

      {stage === 'loading' && <p className="small muted">Checking sign-in…</p>}

      {stage === 'email' && (
        <>
          <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={signInGoogle}>
            <GoogleG /> Continue with Google
          </button>
          <div className="row" style={{ gap: 10, alignItems: 'center', margin: '10px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span className="hint">or use email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div className="row wrap" style={{ gap: 8, alignItems: 'flex-end' }}>
            <label className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <span className="field-label">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            <button className="btn btn-primary" onClick={sendLink} disabled={busy || !email.trim()}>
              {busy ? '…' : 'Email me a sign-in link'}
            </button>
          </div>
        </>
      )}

      {stage === 'sent' && (
        <div>
          <p className="small" style={{ margin: '2px 0 10px' }}>
            📩 Sign-in link sent to <strong>{email}</strong>. Open it <strong>on this device</strong> —
            you'll come back here signed in. (Same tab or a new one is fine.)
          </p>
          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn btn-ghost" onClick={sendLink} disabled={busy}>
              {busy ? '…' : 'Resend link'}
            </button>
            <button className="btn btn-ghost" onClick={() => setStage('email')} disabled={busy}>
              Use a different email
            </button>
          </div>
        </div>
      )}

      {stage === 'in' && (
        <>
          <p className="small" style={{ margin: '2px 0 12px' }}>
            Signed in as <strong>{email}</strong>
            {status.state === 'syncing' && <span className="faint"> · syncing…</span>}
            {status.state !== 'syncing' && synced && (
              <span className="faint"> · last synced {new Date(synced).toLocaleString()}</span>
            )}
          </p>

          {status.state === 'conflict' && (
            <div
              className="card"
              style={{
                marginBottom: 12,
                background: 'rgba(224, 168, 70, 0.10)',
                borderColor: 'rgba(224, 168, 70, 0.5)',
              }}
            >
              <p className="small" style={{ margin: 0 }}>
                ⚠️ <strong>Sync conflict.</strong> This device and your cloud copy both changed since
                they last synced. Pick which one to keep: <strong>Push</strong> to make this device win
                (overwrites the cloud), or <strong>Pull</strong> to make the cloud win (replaces this
                device). Export a backup first if you're unsure.
              </p>
            </div>
          )}

          <div className="row wrap" style={{ gap: 10 }}>
            <button className="btn btn-primary" onClick={doPush} disabled={busy}>
              ⤴ Push this device → cloud
            </button>
            <ConfirmButton
              className="btn"
              ariaLabel="Pull from cloud"
              title="Replace this device with the cloud copy"
              onConfirm={doPull}
            >
              ⤵ Pull cloud → this device
            </ConfirmButton>
            <button className="btn btn-ghost" onClick={signOut} disabled={busy}>
              Sign out
            </button>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Standby syncs automatically while you are signed in: changes upload on their own, and this
            device catches up when you open or return to it. Push and Pull are manual overrides. Pull{' '}
            <strong>replaces</strong> this device with the cloud copy, and Push overwrites the cloud with
            this device.
          </p>

          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: '1px solid var(--border)',
            }}
          >
            <div className="row wrap" style={{ gap: 10, alignItems: 'center' }}>
              <ConfirmButton
                className="btn btn-danger"
                title="Permanently delete your account and everything stored in the cloud"
                onConfirm={doDeleteAccount}
              >
                🗑 Delete account &amp; cloud data
              </ConfirmButton>
            </div>
            <p className="hint" style={{ marginTop: 8 }}>
              Removes your cloud copy and account for good. This <strong>cannot be undone.</strong> The
              copy on this device stays put — export a backup first if you want to keep it.
            </p>
          </div>
        </>
      )}

      {msg && (
        <p className="small" style={{ marginTop: 10, color: 'var(--text-dim)' }}>
          {msg}
        </p>
      )}
    </div>
  )
}
