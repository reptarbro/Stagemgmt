import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
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
  const [importErr, setImportErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // A fresh device with no production lands here and can't reach Settings, so
  // Welcome is also the sign-in + restore entry point for cross-device sync.
  const [cloudStage, setCloudStage] = useState<'checking' | 'out' | 'sent' | 'in'>('checking')
  const [cloudEmail, setCloudEmail] = useState('')
  const [cloudReady, setCloudReady] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [cloudMsg, setCloudMsg] = useState<string | null>(null)

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
  const sample = data.productions.find((p) => p.isSample)
  const [openId, setOpenId] = useState(realProductions[0]?.id ?? '')

  const canSubmit = title.trim() !== '' && venue.trim() !== ''

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    createProduction({ title: title.trim(), company: company.trim(), venue: venue.trim() })
    navigate('/hub')
  }

  const openExisting = () => {
    if (!openId) return
    setActiveProduction(openId)
    navigate('/hub')
  }

  const openSample = () => {
    if (sample) setActiveProduction(sample.id)
    else loadSampleProduction()
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
          Your prompt book, contact sheet, calling script, and report desk — in one place.
        </p>

        <div className="card" style={{ textAlign: 'left', marginTop: 22 }}>
          {/* 1) Create a new production */}
          <form onSubmit={submit}>
            <div className="card-title">Start a New Production</div>
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
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Theatre / troupe"
                />
              </label>
              <label className="field">
                <span className="field-label">
                  Venue <ReqStar />
                </span>
                <input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Main Stage"
                />
              </label>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={!canSubmit}>
              Create Production →
            </button>
          </form>

          {/* 1b) Cross-device sync: sign in and load shows saved from another device */}
          {CLOUD_ENABLED && cloudStage !== 'checking' && (
            <>
              <Divider label="or sync across your devices" />
              {cloudStage === 'out' && (
                <>
                  <button
                    className="btn"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={signInGoogle}
                  >
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
                      {pulling ? '…' : 'Sign in'}
                    </button>
                  </div>
                  <p className="hint" style={{ margin: '6px 0 0' }}>
                    Sign in to load shows you saved from another device.
                  </p>
                </>
              )}
              {cloudStage === 'sent' && (
                <p className="hint" style={{ textAlign: 'center', margin: 0 }}>
                  Sign-in link sent to <strong>{cloudEmail}</strong>. Open it on this device and you will
                  come back here signed in.
                </p>
              )}
              {cloudStage === 'in' && cloudReady && (
                <div className="card" style={{ background: 'var(--bg-elev-2)', borderColor: 'var(--accent-strong)' }}>
                  <div className="small" style={{ marginBottom: 8 }}>
                    Signed in as <strong>{cloudEmail}</strong>.
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={loadFromCloud} disabled={pulling}>
                    {pulling ? 'Loading…' : '⤵ Load My Shows'}
                  </button>
                </div>
              )}
              {cloudStage === 'in' && !cloudReady && (
                <p className="hint" style={{ textAlign: 'center', margin: 0 }}>
                  Signed in as <strong>{cloudEmail}</strong>. No shows are saved in the cloud yet. Push
                  from the device that has them, then come back here.
                </p>
              )}
              {cloudMsg && (
                <p className="hint" style={{ color: 'var(--danger)', textAlign: 'center', margin: '6px 0 0' }}>
                  {cloudMsg}
                </p>
              )}
            </>
          )}

          {/* 2) Open an existing production (only if you already have some) */}
          {realProductions.length > 0 && (
            <>
              <Divider label="or open an existing production" />
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

          {/* 3) Restore from a backup — how you move a show onto a new device */}
          <Divider label="or move a show onto this device" />
          <button
            type="button"
            className="btn"
            style={{ width: '100%' }}
            onClick={() => fileRef.current?.click()}
          >
            ⬆ Import a backup file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onImport}
            style={{ display: 'none' }}
          />
          {importErr && (
            <p className="hint" style={{ color: 'var(--danger)', textAlign: 'center', margin: '8px 0 0' }}>
              {importErr}
            </p>
          )}

          {/* 4) Sample — always the last option */}
          <Divider label="or" />
          <button type="button" className="btn" style={{ width: '100%' }} onClick={openSample}>
            ✨ Explore a Sample Production
          </button>
          <p className="hint" style={{ textAlign: 'center', margin: '12px 0 0' }}>
            Everything is stored privately in this browser. Export a full backup anytime to move it to
            another device.
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}
