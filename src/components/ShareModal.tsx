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
import { createProductionShare, fetchJoinToken, joinUrl } from '../lib/cloud/collab'

export function ShareModal({ onClose }: { onClose: () => void }) {
  const { production, updateProduction } = useStore()
  const signedIn = useSignedIn()
  const [inclSchedule, setInclSchedule] = useState(true)
  const [inclCompany, setInclCompany] = useState(true)
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shares, setShares] = useState<ShareRow[]>([])

  // Team (co-edit) link state.
  const [teamLink, setTeamLink] = useState<string | null>(null)
  const [teamBusy, setTeamBusy] = useState(false)
  const [teamErr, setTeamErr] = useState<string | null>(null)
  const [teamCopied, setTeamCopied] = useState(false)

  useEffect(() => {
    if (signedIn) listShares().then(setShares).catch(() => {})
  }, [signedIn])

  // If this show is already a shared team book, re-show its join link.
  useEffect(() => {
    if (signedIn && production?.shareId) {
      fetchJoinToken(production.shareId)
        .then((tok) => tok && setTeamLink(joinUrl(tok)))
        .catch(() => {})
    }
  }, [signedIn, production?.shareId])

  const createTeamLink = async () => {
    if (!production) return
    setTeamBusy(true)
    setTeamErr(null)
    const res = await createProductionShare(production)
    setTeamBusy(false)
    if ('error' in res) {
      setTeamErr(res.error)
      return
    }
    // Mark the show shared locally so this device starts team-syncing it.
    updateProduction(production.id, { shareId: res.shareId })
    setTeamLink(joinUrl(res.token))
  }

  const copyTeam = () => {
    if (!teamLink) return
    navigator.clipboard?.writeText(teamLink).then(() => {
      setTeamCopied(true)
      setTimeout(() => setTeamCopied(false), 1400)
    })
  }

  const emailTeam = () => {
    if (!teamLink) return
    const subject = `${production?.title ?? 'Production'} - join the StandBy book`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      `You've been added to the stage-management book for ${production?.title ?? 'our show'}.\n\n` +
        `1. Open this link on your device:\n${teamLink}\n\n` +
        `2. Sign in once (email or Google) to your own StandBy account.\n\n` +
        `The show then appears in your app, and everyone's edits sync automatically.`,
    )}`
  }

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
    <Modal title="Share" onClose={onClose}>
      {!signedIn ? (
        <p className="small muted" style={{ marginTop: 0 }}>
          Sign in first (Settings → Cloud Sync) to create a link. Share links live in your cloud
          account so you can update or revoke them from any device.
        </p>
      ) : (
        <>
          {/* Team co-editing first - it's the higher-value action people come here for. */}
          <div className="field-label" style={{ marginTop: 0 }}>👥 Co-run with your team</div>
          <p className="small muted" style={{ marginTop: 0 }}>
            Everyone you invite edits the <strong>same live show</strong> - co-SMs, ASMs, directors.
            Each person opens the link, signs in once to their own account, and the show appears in
            their StandBy. From then on every edit syncs automatically, no exports.
          </p>
          {teamLink ? (
            <div className="card" style={{ padding: '12px 14px', borderColor: 'var(--go)' }}>
              <div className="field-label" style={{ marginTop: 0 }}>Team link (this show is shared)</div>
              <div className="small" style={{ wordBreak: 'break-all', fontFamily: 'var(--font-mono, monospace)', marginBottom: 10 }}>{teamLink}</div>
              <div className="row wrap" style={{ gap: 8 }}>
                <button className="btn btn-sm btn-primary" onClick={copyTeam}>{teamCopied ? '✓ Copied' : '⧉ Copy link'}</button>
                <button className="btn btn-sm" onClick={emailTeam}>✉ Email link</button>
              </div>
              <p className="hint" style={{ marginTop: 10 }}>
                Anyone with this link can view and edit the show. Share it only with your team.
              </p>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={createTeamLink} disabled={teamBusy}>
              {teamBusy ? 'Creating…' : '👥 Create team link'}
            </button>
          )}
          {teamErr && <p className="hint" style={{ color: 'var(--danger)' }}>{teamErr}</p>}

          <div className="divider" />

          {/* View-only, for distributing to the cast / audience of the show. */}
          <div className="field-label" style={{ marginTop: 0 }}>🔗 Share view-only</div>
          <p className="small muted" style={{ marginTop: 0 }}>
            A read-only link anyone can open - no login. Line notes, reports, and private contact
            details are never included.
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
            <button className="btn" onClick={create} disabled={busy}>
              {busy ? 'Creating…' : '🔗 Create view-only link'}
            </button>
          )}
          {err && <p className="hint" style={{ color: 'var(--danger)' }}>{err}</p>}

          {shares.length > 0 && (
            <>
              <div className="divider" />
              <div className="field-label">Active view-only links ({shares.length})</div>
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
