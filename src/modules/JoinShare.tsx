import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { StandbyMark, APP_NAME } from '../components/Brand'
import { GoogleG } from '../components/GoogleG'
import { supa } from '../lib/cloud/client'
import { CLOUD_ENABLED } from '../lib/cloud/config'
import { joinProductionShare, joinUrl } from '../lib/cloud/collab'
import { useStore } from '../lib/store'

type Stage = 'checking' | 'signin' | 'sent' | 'joining' | 'done' | 'error'

/** Chromeless page for a team join link (#/join/:token). Signed in, it adds the
    shared show to this account and hands off to the app. Signed out, it asks the
    person to sign in first (their own account), then joins automatically. */
export function JoinShare() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { syncInProduction } = useStore()
  const [stage, setStage] = useState<Stage>('checking')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [showTitle, setShowTitle] = useState<string | null>(null)
  const joined = useRef(false)

  const doJoin = async () => {
    if (joined.current || !token) return
    joined.current = true
    setStage('joining')
    const res = await joinProductionShare(token)
    if ('error' in res) {
      if (res.error === 'not-signed-in') {
        joined.current = false
        setStage('signin')
        return
      }
      setMsg(res.error)
      setStage('error')
      return
    }
    setShowTitle(res.production.title)
    syncInProduction(res.production, { activate: true })
    setStage('done')
    setTimeout(() => navigate('/hub'), 1200)
  }

  useEffect(() => {
    if (!CLOUD_ENABLED || !token) {
      setMsg('This link is not valid.')
      setStage('error')
      return
    }
    let alive = true
    supa()
      .auth.getUser()
      .then(({ data }) => {
        if (!alive) return
        if (data.user) void doJoin()
        else setStage('signin')
      })
      .catch(() => alive && setStage('signin'))
    // If they sign in on this page, join as soon as the session appears.
    const { data: sub } = supa().auth.onAuthStateChange((_e, session) => {
      if (alive && session?.user) void doJoin()
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const sendLink = async () => {
    if (!email.trim() || !token) return
    setBusy(true)
    setMsg(null)
    const { error } = await supa().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: joinUrl(token) },
    })
    setBusy(false)
    if (error) setMsg(error.message)
    else setStage('sent')
  }

  const signInGoogle = async () => {
    if (!token) return
    setMsg(null)
    const { error } = await supa().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: joinUrl(token) },
    })
    if (error) setMsg(error.message)
  }

  return (
    <div className="shared-wrap">
      <div className="shared-card">
        <div className="shared-brand">
          <StandbyMark size={24} />
          <span>{APP_NAME}</span>
        </div>

        {stage === 'checking' && <p className="muted">Checking your link…</p>}

        {stage === 'signin' && (
          <>
            <p className="shared-kicker">You've been invited</p>
            <h1>Join the show book</h1>
            <p className="muted" style={{ marginTop: 0 }}>
              Sign in once to your own account and this show appears in your {APP_NAME}. Everyone on
              the team edits the same book, and changes sync automatically.
            </p>
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
                {busy ? '…' : 'Email me a link'}
              </button>
            </div>
          </>
        )}

        {stage === 'sent' && (
          <>
            <h1>Check your email</h1>
            <p className="muted">
              📩 A sign-in link is on its way to <strong>{email}</strong>. Open it on this device -
              you'll come back here and join the show automatically.
            </p>
          </>
        )}

        {stage === 'joining' && <p className="muted">Adding the show to your account…</p>}

        {stage === 'done' && (
          <>
            <h1>You're in 🎭</h1>
            <p className="muted">
              {showTitle ? <strong>{showTitle}</strong> : 'The show'} is now in your {APP_NAME} and
              syncing with your team. Opening it…
            </p>
          </>
        )}

        {stage === 'error' && (
          <>
            <h1>Link unavailable</h1>
            <p className="muted">{msg || 'This team link is invalid or has been revoked. Ask your stage manager for a fresh one.'}</p>
            <p className="shared-foot">
              <Link to="/">Open {APP_NAME}</Link>
            </p>
          </>
        )}

        {msg && stage !== 'error' && (
          <p className="small" style={{ marginTop: 10, color: 'var(--text-dim)' }}>{msg}</p>
        )}
      </div>
    </div>
  )
}
