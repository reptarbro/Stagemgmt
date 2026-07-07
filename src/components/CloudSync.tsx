import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { supa } from '../lib/cloud/client'
import { pushAll, pullAll, lastSyncedAt } from '../lib/cloud/sync'
import { ConfirmButton } from './ui'

type Stage = 'loading' | 'email' | 'code' | 'in'

/** Optional account-backed sync. Signed out, it changes nothing — the app stays
    local-first. Signed in, you can Push this device's data to the cloud and Pull
    it onto another (data model + uploaded script/photos). */
export function CloudSync() {
  const { exportJSON, importJSON } = useStore()
  const [stage, setStage] = useState<Stage>('loading')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [synced, setSynced] = useState<string | null>(lastSyncedAt())

  useEffect(() => {
    let alive = true
    supa()
      .auth.getUser()
      .then(({ data }) => {
        if (!alive) return
        if (data.user) {
          setEmail(data.user.email ?? '')
          setStage('in')
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
      } else {
        setStage('email')
      }
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const sendCode = async () => {
    if (!email.trim()) return
    setBusy(true)
    setMsg(null)
    const { error } = await supa().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (error) setMsg(error.message)
    else {
      setStage('code')
      setMsg('Check your email for a 6-digit code and enter it below.')
    }
  }

  const verify = async () => {
    if (!code.trim()) return
    setBusy(true)
    setMsg(null)
    // A first-time email sends a "signup" OTP; a returning email sends an "email"
    // (magic-link) OTP. Try both so the same code box works either way.
    const token = code.trim()
    let lastErr: string | null = null
    for (const type of ['email', 'signup'] as const) {
      const { error } = await supa().auth.verifyOtp({ email: email.trim(), token, type })
      if (!error) {
        lastErr = null
        break
      }
      lastErr = error.message
    }
    setBusy(false)
    if (lastErr) setMsg(lastErr)
    else setMsg(null) // onAuthStateChange flips to 'in'
  }

  const signOut = async () => {
    await supa().auth.signOut()
    setCode('')
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
          <button className="btn btn-primary" onClick={sendCode} disabled={busy || !email.trim()}>
            {busy ? '…' : 'Email me a code'}
          </button>
        </div>
      )}

      {stage === 'code' && (
        <div className="row wrap" style={{ gap: 8, alignItems: 'flex-end' }}>
          <label className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
            <span className="field-label">6-digit code (from your email)</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
          </label>
          <button className="btn btn-primary" onClick={verify} disabled={busy || !code.trim()}>
            {busy ? '…' : 'Verify & sign in'}
          </button>
          <button className="btn btn-ghost" onClick={() => setStage('email')} disabled={busy}>
            Back
          </button>
        </div>
      )}

      {stage === 'in' && (
        <>
          <p className="small" style={{ margin: '2px 0 12px' }}>
            Signed in as <strong>{email}</strong>
            {synced && (
              <span className="faint"> · last synced {new Date(synced).toLocaleString()}</span>
            )}
          </p>
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
            Pull <strong>replaces</strong> this device's data with the cloud copy. Push overwrites the
            cloud with this device. (Beta: manual, last-write-wins — automatic sync comes next.)
          </p>
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
