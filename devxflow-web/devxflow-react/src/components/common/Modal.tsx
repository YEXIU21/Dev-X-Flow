import { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative bg-[#1e293b] border border-[#334155] rounded-lg p-6 max-w-md w-full mx-4 glass-card",
          className
        )}
      >
        {title && (
          <h2 className="text-xl font-semibold text-[#f8fafc] mb-4">{title}</h2>
        )}
        {children}
      </div>
    </div>
  )
}
