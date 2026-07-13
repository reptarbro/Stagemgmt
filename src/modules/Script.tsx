import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, EmptyState, ConfirmButton } from '../components/ui'
import { term } from '../lib/productionKind'
import { formatDate } from '../lib/format'

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPT = '.pdf,.doc,.docx,.txt,.rtf,application/pdf'

export function Script() {
  const { production, setScript, getScriptURL, removeScript } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const script = production?.script
  const label = term(production?.kind, 'script')
  const lower = label.toLowerCase()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErr(null)
    setBusy(true)
    try {
      await setScript(file)
    } catch {
      setErr('Could not save that file. It may be too large for browser storage.')
    } finally {
      setBusy(false)
    }
  }

  const open = async (download: boolean) => {
    const url = await getScriptURL()
    if (!url) {
      setErr('The file could not be found in this browser.')
      return
    }
    if (download && script) {
      const a = document.createElement('a')
      a.href = url
      a.download = script.filename
      a.click()
    } else {
      window.open(url, '_blank')
    }
    // Release the object URL after the browser has had time to use it.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <>
      <PageHead
        title={label}
        subtitle={`The master ${lower} document`}
        actions={
          script ? (
            <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
              ⟳ Replace file
            </button>
          ) : undefined
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        onChange={onFile}
        style={{ display: 'none' }}
      />

      {err && (
        <div className="card" style={{ borderColor: 'rgba(229,101,79,.4)', color: 'var(--danger)' }}>
          {err}
        </div>
      )}

      {!script ? (
        <div className="card">
          <EmptyState mark="📄" title={`No ${lower} uploaded yet`}>
            Upload your {lower} as a single document (PDF works best). It's stored privately in this
            browser so you can open it anytime.
          </EmptyState>
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? 'Saving…' : `⬆ Upload ${lower}`}
            </button>
            <p className="hint" style={{ marginTop: 10 }}>
              Accepted: PDF, Word, TXT, RTF.
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">Current {lower}</div>
          <div className="row-between wrap" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 14 }}>
              <div style={{ fontSize: '2.4rem' }}>📄</div>
              <div>
                <div style={{ fontWeight: 650, fontSize: '1.05rem' }}>{script.filename}</div>
                <div className="faint small">
                  {humanSize(script.size)} · uploaded {formatDate(script.uploadedAt)}
                </div>
              </div>
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              <button className="btn btn-primary" style={{ minWidth: 128, justifyContent: 'center' }} onClick={() => open(false)}>
                View
              </button>
              <button className="btn" style={{ minWidth: 128, justifyContent: 'center' }} onClick={() => open(true)}>
                ⬇ Download
              </button>
              <ConfirmButton className="btn btn-danger" onConfirm={() => void removeScript()}>
                Remove
              </ConfirmButton>
            </div>
          </div>
          <div className="divider" />
          <p className="hint" style={{ margin: 0 }}>
            Stored on this device. To use it on another device, keep the original file handy and upload
            it there too.
          </p>
        </div>
      )}
    </>
  )
}
