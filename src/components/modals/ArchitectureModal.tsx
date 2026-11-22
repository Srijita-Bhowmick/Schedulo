import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Badge } from '../ui'

export function ArchitectureModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
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
        className="modal"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <div>
            <h3>Platform Architecture</h3>
            <p>Three bounded layers keep the campus schedule mathematically verified and secure.</p>
          </div>
          <button className="modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal__body">
          {[
            [
              '01',
              'Constraint Domain Model',
              'Theory halls, teacher availability slots, student batches, and weekly hours are reduced via forward-checking with a locked 13:00–14:00 lunch recess.',
            ],
            [
              '02',
              'Pure Deterministic Solver (Zero AI)',
              'Minimum Remaining Values (MRV) orders most-constrained variables first, guaranteeing 100% mathematical validity with zero hallucinations and zero heuristics guessing.',
            ],
            [
              '03',
              'RFC-6238 TOTP 2FA & Strict RBAC',
              'Two-stage authentication gates all routes. Student, Teacher, and HOD portals access strictly scoped resources with real-time operational alerts.',
            ],
          ].map(([number, title, body]) => (
            <div className="architecture-row" key={number}>
              <Badge tone="mist">{number}</Badge>
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
