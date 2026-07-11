import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { PRODUCTION_KINDS, KIND_PROFILES } from '../lib/productionKind'
import type { ProductionKind } from '../lib/types'
import { ReqStar } from '../components/ui'
import { StandbyMark, APP_NAME } from '../components/Brand'
import { applyBackupText } from '../lib/backup'
import { CLOUD_ENABLED } from '../lib/cloud/config'
import { supa } from '../lib/cloud/client'
import { cloudHasData, pullAll } from '../lib/cloud/sync'
import { GoogleG } from '../components/GoogleG'

export function Welcome() {
  const { createProduction, loadSampleProduction, setActiveProduction, importJSON, data } = useStore()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [venue, setVenue] = useState('')
  const [kind, setKind] = useState<ProductionKind>('play')
  const [importErr, setImportErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // A fresh device with no production lands here and can't reach Settings, so
  // Welcome is also the sign-in + restore entry point for cross-device sync.
  const [cloudStage, setCloudStage] = useState<'checking' | 'out' | 'sent' | 'in'>('checking')
  const [cloudEmail, setCloudEmail] = useState('')
  const [cloudReady, setCloudReady] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [cloudMsg, setCloudMsg] = useState<string | null>(null)
  const [showSignIn, setShowSignIn] = useState(false)

  useEffect(() => {
    if (!CLOUD_ENABLED) return
    let alive = true
    const check = async () => {
      try {
        const { data: u } = await supa().auth.getUser()
        if (!alive) return
        if (u.user) {
          setCloudEmail(u.user.email ?? '')
          setCloudStage('in')
          setCloudReady(await cloudHasData())
        } else setCloudStage('out')
      } catch {
        if (alive) setCloudStage('out')
      }
    }
    void check()
    const { data: sub } = supa().auth.onAuthStateChange(() => void check())
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const sendLink = async () => {
    if (!cloudEmail.trim()) return
    setPulling(true)
    setCloudMsg(null)
    const { error } = await supa().auth.signInWithOtp({
      email: cloudEmail.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.href.split('#')[0].split('?')[0] },
    })
    setPulling(false)
    if (error) setCloudMsg(error.message)
    else setCloudStage('sent')
  }

  const signInGoogle = async () => {
    setCloudMsg(null)
    const { error } = await supa().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href.split('#')[0].split('?')[0] },
    })
    if (error) setCloudMsg(error.message)
  }

  const loadFromCloud = async () => {
    setPulling(true)
    setImportErr(null)
    const r = await pullAll(importJSON)
    setPulling(false)
    if (r.ok) navigate('/hub')
    else setImportErr(r.error ?? 'Could not load your saved shows.')
  }

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportErr(null)
    const reader = new FileReader()
    reader.onload = async () => {
      const res = await applyBackupText(String(reader.result), importJSON)
      if (res.ok) navigate('/hub')
      else setImportErr(res.error ?? 'Could not read that file.')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const realProductions = data.productions.filter((p) => !p.isSample)
  const [openId, setOpenId] = useState(realProductions[0]?.id ?? '')

  const canSubmit = title.trim() !== '' && venue.trim() !== ''

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    createProduction({ title: title.trim(), company: company.trim(), venue: venue.trim(), kind })
    navigate('/hub')
  }

  const openExisting = () => {
    if (!openId) return
    setActiveProduction(openId)
    navigate('/hub')
  }

  const openSample = (kind: ProductionKind = 'play') => {
    const existing = data.productions.find((p) => p.isSample && (p.kind ?? 'play') === kind)
    if (existing) setActiveProduction(existing.id)
    else loadSampleProduction(kind)
    navigate('/hub')
  }

  const Divider = ({ label }: { label: string }) => (
    <div className="row" style={{ gap: 10, alignItems: 'center', margin: '16px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span className="hint">{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )

  return (
    <div className="welcome-scroll">
      <div className="welcome-center">
      <div style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <StandbyMark size={76} />
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.5rem',
            margin: '0 0 4px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {APP_NAME}
        </h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Your prompt book, contact sheet, calling script, and report desk, all in one place.
        </p>

        {/* Signed in with a cloud copy → load it (fresh-device / returning landing) */}
        {CLOUD_ENABLED && cloudStage === 'in' && cloudReady && (
          <div
            className="card"
            style={{ textAlign: 'left', marginTop: 18, borderColor: 'var(--accent-strong)', background: 'var(--bg-elev-2)' }}
          >
            <div className="card-title" style={{ color: 'var(--accent-strong)' }}>Your synced shows</div>
            <div className="small" style={{ marginBottom: 10 }}>
              Signed in as <strong>{cloudEmail}</strong>.
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={loadFromCloud} disabled={pulling}>
              {pulling ? 'Loading…' : '⤵ Load My Shows'}
            </button>
          </div>
        )}

        {/* Create a new production */}
        <div className="card" style={{ textAlign: 'left', marginTop: 18 }}>
          <form onSubmit={submit}>
            <div className="card-title">Start a new production</div>
            <label className="field">
              <span className="field-label">
                Show title <ReqStar />
              </span>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. A Midsummer Night's Dream"
              />
            </label>
            <div className="form-row">
              <label className="field">
                <span className="field-label">Company</span>
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Theatre / troupe" />
              </label>
              <label className="field">
                <span className="field-label">
                  Venue <ReqStar />
                </span>
                <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Main Stage" />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Type of show</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as ProductionKind)}>
                {PRODUCTION_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_PROFILES[k].label}
                  </option>
                ))}
              </select>
              <span className="hint" style={{ marginTop: 4 }}>{KIND_PROFILES[kind].blurb}</span>
            </label>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!canSubmit}>
              Create Production →
            </button>
          </form>

          {/* Open an existing local production, only when this device has some */}
          {realProductions.length > 0 && (
            <>
              <Divider label="or open an existing show" />
              <div className="row" style={{ gap: 8, alignItems: 'stretch' }}>
                <select
                  value={openId}
                  onChange={(e) => setOpenId(e.target.value)}
                  style={{ flex: 1 }}
                  aria-label="Choose a production to open"
                >
                  {realProductions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn" onClick={openExisting} disabled={!openId}>
                  Open →
                </button>
              </div>
            </>
          )}
        </div>

        {/* Compact secondary actions */}
        <p className="hint" style={{ margin: '16px 0 8px' }}>
          Already using StandBy, or moving from another device?
        </p>
        <div className="row" style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {CLOUD_ENABLED &&
            (cloudStage === 'in' ? (
              <span className="hint" style={{ alignSelf: 'center' }}>
                Signed in as {cloudEmail || 'your account'}
              </span>
            ) : (
              <button type="button" className="btn btn-sm" onClick={() => setShowSignIn((s) => !s)}>
                <GoogleG /> Sign in
              </button>
            ))}
          <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
            ⬆ Import backup
          </button>
          <button type="button" className="btn btn-sm" onClick={() => openSample('play')}>
            ✨ Play sample
          </button>
          <button type="button" className="btn btn-sm" onClick={() => openSample('cabaret')}>
            🎵 Cabaret sample
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onImport} style={{ display: 'none' }} />

        {/* Inline sign-in panel (opens under the row) */}
        {CLOUD_ENABLED && showSignIn && (cloudStage === 'out' || cloudStage === 'sent') && (
          <div className="card" style={{ textAlign: 'left', marginTop: 10 }}>
            {cloudStage === 'out' ? (
              <>
                <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={signInGoogle}>
                  <GoogleG /> Continue with Google
                </button>
                <div className="row" style={{ gap: 10, alignItems: 'center', margin: '10px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span className="hint">or use email</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
                <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
                  <label className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <span className="field-label">Email</span>
                    <input
                      type="email"
                      value={cloudEmail}
                      onChange={(e) => setCloudEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>
                  <button className="btn" onClick={sendLink} disabled={pulling || !cloudEmail.trim()}>
                    {pulling ? '…' : 'Send link'}
                  </button>
                </div>
              </>
            ) : (
              <p className="hint" style={{ margin: 0 }}>
                Sign-in link sent to <strong>{cloudEmail}</strong>. Open it on this device and you will
                come back here signed in.
              </p>
            )}
          </div>
        )}

        {(importErr || cloudMsg) && (
          <p className="hint" style={{ color: 'var(--danger)', textAlign: 'center', margin: '8px 0 0' }}>
            {importErr || cloudMsg}
          </p>
        )}

        <p className="hint" style={{ textAlign: 'center', margin: '14px 0 0' }}>
          Everything is stored privately in this browser. Export a full backup anytime to move it to
          another device.
        </p>
        <p className="hint" style={{ textAlign: 'center', margin: '10px 0 0' }}>
          <Link to="/privacy">Privacy</Link>
          <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
          <Link to="/terms">Terms</Link>
        </p>
      </div>
      </div>
    </div>
  )
}
