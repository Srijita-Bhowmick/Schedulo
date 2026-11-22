import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ClipboardCheck, Send, X } from 'lucide-react'
import { ScheduleBlock } from '../../services/api'
import { Button, SelectField, cn } from '../ui'

export function RescheduleModal({
  selectedBlock,
  room,
  batch,
  rooms = [],
  batches = [],
  isThisWeekOnly,
  setIsThisWeekOnly,
  setRoom,
  setBatch,
  validation,
  loading,
  onValidate,
  onConfirm,
  onClose,
}: {
  selectedBlock: ScheduleBlock | null
  room: string
  batch: string
  rooms?: string[]
  batches?: string[]
  isThisWeekOnly: boolean
  setIsThisWeekOnly: (val: boolean) => void
  setRoom: (value: string) => void
  setBatch: (value: string) => void
  validation: string
  loading: boolean
  onValidate: () => void
  onConfirm: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <motion.div
        className="modal"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <div>
            <h3>Reschedule / Move Class</h3>
            <p>
              {selectedBlock
                ? `Moving ${selectedBlock.code} (${selectedBlock.subject}) from ${selectedBlock.day} ${selectedBlock.start}`
                : 'Validate target theory hall and batch availability before dispatching live alert.'}
            </p>
          </div>
          <button className="modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal__body">
          {/* "This Week Only" Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(5, 21, 24, 0.6)',
              borderRadius: 6,
              border: '1px solid rgba(144, 194, 231, 0.2)',
            }}
          >
            <div>
              <strong style={{ display: 'block', fontSize: 13, color: 'var(--pearl)' }}>This Week Only</strong>
              <span style={{ fontSize: 11, color: '#C7E3F7' }}>
                Temporary substitution without altering base timetable
              </span>
            </div>
            <input
              type="checkbox"
              checked={isThisWeekOnly}
              onChange={(e) => setIsThisWeekOnly(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--mist)', cursor: 'pointer' }}
            />
          </div>

          <SelectField label="TARGET THEORY ROOM" value={room} onChange={(event) => setRoom(event.target.value)}>
            {rooms.length > 0 ? (
              rooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))
            ) : (
              <option value={room}>{room || 'Room 101'}</option>
            )}
          </SelectField>

          <SelectField label="TARGET STUDENT BATCH" value={batch} onChange={(event) => setBatch(event.target.value)}>
            {batches.length > 0 ? (
              batches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))
            ) : (
              <option value={batch}>{batch || 'CSE-5A'}</option>
            )}
          </SelectField>

          <Button tone="dark" loading={loading} icon={ClipboardCheck} onClick={onValidate}>
            Validate Constraint Availability
          </Button>

          {validation && (
            <div
              className={cn('form-status', validation.includes('occupied') && 'form-status--clash')}
              style={
                validation.includes('occupied')
                  ? { borderColor: 'var(--ember)', color: '#ff9e87', background: 'rgba(224, 109, 83, 0.15)' }
                  : undefined
              }
            >
              {validation}
            </div>
          )}

          <Button
            tone="ember"
            icon={Send}
            disabled={!validation || validation.includes('occupied')}
            onClick={onConfirm}
          >
            Confirm &amp; Dispatch Live Alert
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
