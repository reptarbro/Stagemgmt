import { useEffect, useState } from 'react'
import { Modal, ConfirmButton } from './ui'
import { useStore } from '../lib/store'
import { useSignedIn } from '../lib/cloud/auth'
import {
  buildSharePayload,
  createShare,
  listShares,
  revokeShare,
  shareUrl,
  type ShareRow,
  type SharePayload,
} from '../lib/cloud/share'

export function ShareModal({ onClose }: { onClose: () => void }) {
  const { production } = useStore()
  const signedIn = useSignedIn()
  const [inclSchedule, setInclSchedule] = useState(true)
  const [inclCompany, setInclCompany] = useState(true)
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shares, setShares] = useState<ShareRow[]>([])

  useEffect(() => {
    if (signedIn) listShares().then(setShares).catch(() => {})
  }, [signedIn])

  const refresh = () => {
    if (signedIn) listShares().then(setShares).catch(() => {})
  }

  const create = async () => {
    if (!production) return
    const includes: SharePayload['includes'] = []
    if (inclSchedule) includes.push('schedule')
    if (inclCompany) includes.push('company')
    if (includes.length === 0) {
      setErr('Pick at least one section to share.')
      return
    }
    setBusy(true)
    setErr(null)
    const res = await createShare(buildSharePayload(production, includes))
    setBusy(false)
    if ('error' in res) {
      setErr(res.error)
      return
    }
    setLink(shareUrl(res.token))
    refresh()
  }

  const copy = () => {
    if (!link) return
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    })
  }

  const email = () => {
    if (!link) return
    const subject = `${production?.title ?? 'Production'} - view-only link`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      `Here's a read-only view of the show:\n\n${link}\n\nNo login needed - open it on any device.`,
    )}`
  }

  const revoke = async (token: string) => {
    await revokeShare(token)
    if (link && link.endsWith(token)) setLink(null)
    refresh()
  }

  return (
    <Modal title="Share view-only" onClose={onClose}>
      {!signedIn ? (
        <p className="small muted" style={{ marginTop: 0 }}>
          Sign in first (Settings → Cloud Sync) to create a link. Share links live in your cloud
          account so you can update or revoke them from any device.
        </p>
      ) : (
        <>
          <p className="small muted" style={{ marginTop: 0 }}>
            Create a read-only link anyone can open - no login. Line notes, reports, and private
            contact details are never included.
          </p>

          <div className="field-label">Include</div>
          <label className="row" style={{ gap: 8, alignItems: 'center', cursor: 'pointer', marginBottom: 6 }}>
            <input type="checkbox" checked={inclSchedule} onChange={(e) => setInclSchedule(e.target.checked)} />
            <span className="small">Schedule &amp; call times</span>
          </label>
          <label className="row" style={{ gap: 8, alignItems: 'center', cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={inclCompany} onChange={(e) => setInclCompany(e.target.checked)} />
            <span className="small">Company / cast list (names &amp; roles only)</span>
          </label>

          {link ? (
            <div className="card" style={{ padding: '12px 14px', borderColor: 'var(--accent-strong)' }}>
              <div className="field-label" style={{ marginTop: 0 }}>Your link</div>
              <div className="small" style={{ wordBreak: 'break-all', fontFamily: 'var(--font-mono, monospace)', marginBottom: 10 }}>{link}</div>
              <div className="row wrap" style={{ gap: 8 }}>
                <button className="btn btn-sm btn-primary" onClick={copy}>{copied ? '✓ Copied' : '⧉ Copy link'}</button>
                <button className="btn btn-sm" onClick={email}>✉ Email link</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setLink(null)}>+ New link</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={create} disabled={busy}>
              {busy ? 'Creating…' : '🔗 Create link'}
            </button>
          )}
          {err && <p className="hint" style={{ color: 'var(--danger)' }}>{err}</p>}

          {shares.length > 0 && (
            <>
              <div className="divider" />
              <div className="field-label">Active links ({shares.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {shares.map((s) => (
                  <div key={s.token} className="row-between" style={{ gap: 10, alignItems: 'center' }}>
                    <span className="small" style={{ wordBreak: 'break-all' }}>
                      …/view/{s.token}
                    </span>
                    <ConfirmButton
                      className="btn btn-sm btn-danger"
                      confirmLabel="Revoke"
                      message="Revoke this link? Anyone holding it will lose access immediately."
                      onConfirm={() => void revoke(s.token)}
                    >
                      Revoke
                    </ConfirmButton>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}
