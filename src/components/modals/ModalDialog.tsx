import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

// [M-35] WAI-ARIA Accessible Modal Dialog with Focus Trap & Escape Handler
export function ModalDialog({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  onClose: () => void
}) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Tab trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === last) {
            first.focus()
            e.preventDefault()
          }
        }
      }
    }

    // Auto-focus first focusable element inside modal
    if (modalRef.current) {
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'button:not(.modal__close), input, select, textarea'
      )
      firstFocusable?.focus()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-dialog-title"
        className="modal"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <div>
            <h3 id="modal-dialog-title">{title}</h3>
            <p>{subtitle}</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </motion.div>
    </motion.div>
  )
}
