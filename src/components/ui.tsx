import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'

export function Modal({
  title,
  onClose,
  children,
  className,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  /** Extra class on the .modal panel, e.g. "modal-wide" for wider forms. */
  className?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Portal to <body> so the fixed backdrop is anchored to the viewport - not
  // trapped inside .main (a scroll container), which on iOS Safari would clip
  // the modal behind the sidebar. Centers over the whole screen every time.
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${className ?? ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** A button that requires a second click to confirm a destructive action. */
const SKIP_CONFIRMS_KEY = 'standby.skipConfirms'

export function ConfirmButton({
  onConfirm,
  children = 'Delete',
  className = 'btn btn-danger btn-sm',
  ariaLabel,
  title,
  message,
  confirmLabel = 'Delete',
}: {
  onConfirm: () => void
  children?: ReactNode
  className?: string
  /** Accessible name - set for icon-only buttons (🗑) that otherwise have none.
      Leave unset when `children` is meaningful text (that becomes the name). */
  ariaLabel?: string
  title?: string
  /** Body text in the confirm dialog. */
  message?: string
  /** Label on the confirming button. */
  confirmLabel?: string
}) {
  const [open, setOpen] = useState(false)

  const start = () => {
    // Honor a prior "don't ask again" choice.
    if (localStorage.getItem(SKIP_CONFIRMS_KEY) === '1') {
      onConfirm()
      return
    }
    setOpen(true)
  }

  return (
    <>
      <button className={className} aria-label={ariaLabel} title={title ?? ariaLabel} onClick={start}>
        {children}
      </button>
      {open && (
        <ConfirmDialog
          message={message}
          confirmLabel={confirmLabel}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false)
            onConfirm()
          }}
        />
      )}
    </>
  )
}

function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message?: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const [dontAsk, setDontAsk] = useState(false)
  return (
    <Modal title="Are you sure?" onClose={onCancel}>
      <p className="small muted" style={{ marginTop: 0 }}>
        {message ?? "This can't be undone."}
      </p>
      <label className="row" style={{ gap: 8, alignItems: 'center', cursor: 'pointer', marginTop: 4 }}>
        <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} />
        <span className="small">Don't ask me again</span>
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (dontAsk) localStorage.setItem(SKIP_CONFIRMS_KEY, '1')
            onConfirm()
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export function EmptyState({
  mark,
  title,
  children,
}: {
  mark: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-mark">{mark}</div>
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
    </div>
  )
}

/** Scrolls the content pane to the top whenever the route changes. The page
    body no longer scrolls (the shell owns scrolling), so reset .main directly. */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.querySelector('.main')?.scrollTo({ top: 0 })
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** Red asterisk marking a required field, e.g. <span>Name<ReqStar/></span>. */
export function ReqStar() {
  return <span className="req-star" aria-hidden="true">*</span>
}

export type SortDir = 'asc' | 'desc'

/**
 * Tiny sort controller for tables. Clicking the active column flips direction.
 * `compare` maps each row to a comparable value for the current key.
 */
export function useSort<K extends string>(initialKey: K, initialDir: SortDir = 'asc') {
  const [key, setKey] = useState<K>(initialKey)
  const [dir, setDir] = useState<SortDir>(initialDir)

  const toggle = (k: K) => {
    if (k === key) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setKey(k)
      setDir('asc')
    }
  }

  function sorted<T>(rows: T[], value: (row: T, key: K) => string | number): T[] {
    const factor = dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = value(a, key)
      const vb = value(b, key)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor
      return String(va).localeCompare(String(vb), undefined, { numeric: true }) * factor
    })
  }

  return { key, dir, toggle, sorted }
}

/** A sortable table header cell showing an active/idle arrow. */
export function SortTh<K extends string>({
  label,
  sortKey,
  ctrl,
  style,
}: {
  label: string
  sortKey: K
  ctrl: { key: K; dir: SortDir; toggle: (k: K) => void }
  style?: React.CSSProperties
}) {
  const active = ctrl.key === sortKey
  return (
    <th
      className={`sort-th ${active ? 'active' : ''}`}
      onClick={() => ctrl.toggle(sortKey)}
      style={style}
    >
      {label}
      <span className="sort-arrow">{active && ctrl.dir === 'asc' ? '▲' : '▼'}</span>
    </th>
  )
}

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="row wrap">{actions}</div>}
    </div>
  )
}
