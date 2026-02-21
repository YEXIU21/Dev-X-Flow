import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = {
  open: boolean
  title: string
  ariaLabel: string
  onClose: () => void
  children: ReactNode
  actions?: ReactNode
  className?: string
}

export function Modal({ open, title, ariaLabel, onClose, children, actions, className }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={className ? `modal ${className}` : 'modal'}>
        <div className="modal-title">{title}</div>
        <div className="modal-body">{children}</div>
        {actions ? <div className="modal-actions">{actions}</div> : null}
      </div>
    </div>,
    document.body
  )
}
