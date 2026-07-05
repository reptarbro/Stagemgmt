import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * A body-level printable sheet. On screen it's a modal preview; when printed it
 * fills the page alone (see the `.sheet-print-root` rules in global.css). Used
 * for the cast list, sign-in sheet, and rehearsal/performance reports.
 */
export function PrintSheet({
  hint = 'Print or save as PDF.',
  onClose,
  actions,
  children,
}: {
  hint?: string
  onClose: () => void
  actions?: ReactNode
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const print = () => {
    document.body.classList.add('printing-sheet')
    const cleanup = () => {
      document.body.classList.remove('printing-sheet')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
  }

  return createPortal(
    <div className="sheet-print-root">
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal sheet-modal" onClick={(e) => e.stopPropagation()}>
          <div className="row-between no-print" style={{ marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
            <span className="hint">{hint}</span>
            <div className="row wrap" style={{ gap: 6 }}>
              {actions}
              <button className="btn btn-sm btn-primary" onClick={print}>
                🖨 Print / PDF
              </button>
              <button className="btn btn-sm btn-ghost" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
          <div className="sheet-doc">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
