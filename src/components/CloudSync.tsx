import { useEffect, useRef, useState } from 'react'
import { supa } from '../lib/cloud/client'
import { lastSyncedAt, deleteCloudData, deleteAuthAccount } from '../lib/cloud/sync'
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
  const [stage, setStage] = useState<Stage>('loading')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [synced, setSynced] = useState<string | null>(lastSyncedAt())
  const status = useSyncStatus()
  const handledSignIn = useRef(false)

  // Nothing to do on sign-in but reassure — the auto-sync engine (CloudAutoSync)
  // merges this device with the cloud on its own (on sign-in, focus, a poll, and
  // realtime), so shows appear here automatically with no Push/Pull to press.
  const onSignedIn = async () => {
    if (handledSignIn.current) return
    handledSignIn.current = true
    setMsg('Signed in — your shows sync automatically across your devices.')
  }

  // Keep the "last synced" line fresh as the engine works.
  useEffect(() => {
    const t = setInterval(() => setSynced(lastSyncedAt()), 3000)
    return () => clearInterval(t)
  }, [])

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

  return (
    <div className="card">
      <div className="card-title">
        Cloud Sync <span className="nav-hint" style={{ marginLeft: 6 }}>beta</span>
      </div>
      <p className="small muted">
        Sign in to sync your shows across your devices. It happens automatically and merges changes from
        every device — add a person on your iPad and a headshot on your laptop and you'll see both, no
        buttons to press. Signed out, nothing leaves this device.
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
            {status.state === 'syncing' ? (
              <span className="faint"> · syncing…</span>
            ) : synced ? (
              <span className="faint"> · synced {new Date(synced).toLocaleString()}</span>
            ) : (
              <span className="faint"> · up to date</span>
            )}
          </p>

          <p className="small muted" style={{ marginTop: 0 }}>
            ✓ Syncing automatically. To use another device, just open StandBy there and sign in with the
            same account — your shows appear on their own, and edits on any device merge together.
          </p>

          <div className="row wrap" style={{ gap: 10 }}>
            <button className="btn btn-ghost" onClick={signOut} disabled={busy}>
              Sign out
            </button>
          </div>

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
