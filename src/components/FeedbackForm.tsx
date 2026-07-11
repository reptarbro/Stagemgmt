import { useState } from 'react'
import { Modal } from './ui'
import { useStore } from '../lib/store'
import { supa } from '../lib/cloud/client'
import { APP_VERSION } from './Brand'

const CATEGORIES = ['Bug', 'Idea', 'Confusing', 'Praise'] as const
type Category = (typeof CATEGORIES)[number]

/** A lightweight in-app feedback form that writes straight to the private
    Supabase `feedback` table — no email step. Works signed-in or not. */
export function FeedbackForm({ onClose }: { onClose: () => void }) {
  const { production } = useStore()
  const [category, setCategory] = useState<Category>('Idea')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'edit' | 'sending' | 'done' | 'error'>('edit')
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    if (!message.trim() || state === 'sending') return
    setState('sending')
    setErr(null)
    try {
      const { data: sess } = await supa().auth.getSession()
      const user = sess.session?.user
      const context = {
        page: window.location.hash || '#/',
        kind: production?.kind ?? 'play',
        show: production?.title ?? null,
        version: APP_VERSION,
        userAgent: navigator.userAgent,
      }
      const { error } = await supa()
        .from('feedback')
        .insert({
          user_id: user?.id ?? null,
          email: email.trim() || user?.email || null,
          category,
          message: message.trim(),
          context,
        })
      if (error) throw error
      setState('done')
    } catch (e) {
      setErr(
        (e as Error).message ||
          "Couldn't send just now. Check your connection and try again, or use the email option.",
      )
      setState('error')
    }
  }

  return (
    <Modal title="Send feedback" onClose={onClose}>
      {state === 'done' ? (
        <div>
          <p style={{ marginTop: 0 }}>Thanks — that's landed. 🎭</p>
          <p className="small muted">Real notes from real shows are exactly what shapes what gets built next.</p>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="field-label">What kind of note?</div>
          <div className="row wrap" style={{ gap: 6, marginBottom: 12 }}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`btn btn-sm ${category === c ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 999 }}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="field">
            <span className="field-label">Your note</span>
            <textarea
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What worked, what didn't, what you wish it did…"
              rows={5}
            />
          </label>
          <label className="field">
            <span className="field-label">
              Email <span className="faint">(optional — only if you'd like a reply)</span>
            </span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <p className="hint">
            Your note plus basic app info (the page you're on, show type, and app version) goes to StandBy's
            private feedback inbox. Nothing else is collected.
          </p>
          {state === 'error' && (
            <p className="hint" style={{ color: 'var(--danger)' }}>
              {err}
            </p>
          )}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!message.trim() || state === 'sending'}
              onClick={submit}
            >
              {state === 'sending' ? 'Sending…' : 'Send feedback'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
