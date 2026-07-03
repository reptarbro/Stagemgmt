import { useEffect, useState, type ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** A button that requires a second click to confirm a destructive action. */
export function ConfirmButton({
  onConfirm,
  children = 'Delete',
  className = 'btn btn-danger btn-sm',
}: {
  onConfirm: () => void
  children?: ReactNode
  className?: string
}) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])

  return (
    <button
      className={className}
      onClick={() => {
        if (armed) {
          onConfirm()
          setArmed(false)
        } else {
          setArmed(true)
        }
      }}
    >
      {armed ? 'Sure?' : children}
    </button>
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
