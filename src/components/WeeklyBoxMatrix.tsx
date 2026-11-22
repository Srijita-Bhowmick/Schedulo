import React from 'react'
import { Calendar, Clock, MapPin, User, Users, Lock, Sparkles, AlertCircle, ArrowRight, Building } from 'lucide-react'
import { ScheduleBlock } from '../services/api'
import { Badge, cn } from './ui'

export interface WeeklyBoxMatrixProps {
  blocks: ScheduleBlock[]
  mode: 'student' | 'teacher' | 'admin'
  unavailableSlots?: string[] // e.g. ['Mon-09:00', 'Wed-14:00']
  onToggleSlot?: (day: string, time: string) => void
  onSelectBlock?: (block: ScheduleBlock) => void
  activeSlot?: { day: string; time: string }
  secondaryLabel?: 'faculty' | 'batch' | 'both'
}

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
export const DAY_NAMES: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
}

export interface TimePeriod {
  id: string
  label: string
  end: string
  period: string
  isLunch?: boolean
}

export const TIME_PERIODS: TimePeriod[] = [
  { id: '09:00', label: '09:00', end: '10:00', period: 'P1', isLunch: false },
  { id: '10:00', label: '10:00', end: '11:00', period: 'P2', isLunch: false },
  { id: '11:00', label: '11:00', end: '12:00', period: 'P3', isLunch: false },
  { id: '12:00', label: '12:00', end: '13:00', period: 'P4', isLunch: false },
  { id: '13:00', label: '13:00', end: '14:00', period: 'LUNCH', isLunch: true },
  { id: '14:00', label: '14:00', end: '15:00', period: 'P5', isLunch: false },
  { id: '15:00', label: '15:00', end: '16:00', period: 'P6', isLunch: false },
]

export function WeeklyBoxMatrix({
  blocks,
  mode,
  unavailableSlots = [],
  onToggleSlot,
  onSelectBlock,
  activeSlot = { day: 'Wed', time: '11:00' },
  secondaryLabel = 'faculty',
}: WeeklyBoxMatrixProps) {
  return (
    <div className="box-matrix-wrap">
      <div className="box-matrix-grid">
        {/* Header Row: Corner Cell + 5 Day Headers */}
        <div className="box-matrix-corner-head">
          <Clock size={12} className="inline mr-1 text-mist" />
          <span>SLOT</span>
        </div>
        {DAYS.map((day) => (
          <div key={day} className="box-matrix-day-head">
            <span className="day-abbr">{day.toUpperCase()}</span>
            <span className="day-full">{DAY_NAMES[day]}</span>
          </div>
        ))}

        {/* Rows: Time Period Cell + 5 Day Slots */}
        {TIME_PERIODS.map(({ id: time, label, end, period, isLunch }) => (
          <React.Fragment key={time}>
            {/* Time Slot Column Cell */}
            <div className={cn('box-matrix-time-cell', isLunch && 'box-matrix-time-cell--lunch')}>
              <span className={cn('time-period-tag', isLunch && 'time-period-tag--lunch')}>{period}</span>
              <strong className="time-start">{label}</strong>
              <span className="time-end">{end}</span>
            </div>

            {/* If Lunch Recess: Render Locked Lunch Band Across All 5 Days */}
            {isLunch ? (
              DAYS.map((day) => (
                <div key={`${day}-lunch`} className="box-tile box-tile--lunch" title="13:00 - 14:00 Campus Lunch Break">
                  <div className="lunch-badge">
                    <Lock size={10} />
                    <span>LUNCH RECESS</span>
                  </div>
                  <span className="lunch-subtext">Protected Break</span>
                </div>
              ))
            ) : (
              /* Regular Period: 5 Day Slot Cells */
              DAYS.map((day) => {
                const key = `${day}-${time}`
                const isBlocked = unavailableSlots.includes(key)
                const block = blocks.find((b) => b.day === day && b.start === time)
                const isLive =
                  block?.status === 'live' || (activeSlot.day === day && activeSlot.time === time && Boolean(block))
                const isClash = block?.status === 'clash'

                // 1. Teacher Unavailable / Blocked Slot
                if (mode === 'teacher' && isBlocked && !block) {
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onToggleSlot?.(day, time)}
                      className="box-tile box-tile--blocked"
                      title={`Click to unblock ${day} ${label}`}
                    >
                      <div className="blocked-badge">
                        <Lock size={10} />
                        <span>BLOCKED</span>
                      </div>
                      <span className="empty-subtext">Click to open</span>
                    </button>
                  )
                }

                // 2. Scheduled Class Box
                if (block) {
                  const subLabel =
                    secondaryLabel === 'batch'
                      ? block.batch
                      : secondaryLabel === 'both'
                      ? `${block.batch} · ${block.faculty.split(' ').slice(-1)[0]}`
                      : block.faculty

                  return (
                    <div
                      key={key}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectBlock?.(block)}
                      onKeyDown={(e) => e.key === 'Enter' && onSelectBlock?.(block)}
                      className={cn(
                        'box-tile box-tile--class',
                        isLive && 'box-tile--live',
                        isClash && 'box-tile--clash'
                      )}
                      title={`Click to view details for ${block.code} ${block.subject}`}
                    >
                      {/* Top line: Subject code + Room badge + Optional Dept badge */}
                      <div className="box-tile__top">
                        <span className="box-tile__code">{block.code}</span>
                        <div className="flex items-center gap-1">
                          {block.department && (
                            <span className="box-tile__dept" title={`Department: ${block.department}`}>
                              {block.department.split(' ')[0]}
                            </span>
                          )}
                          <span className="box-tile__room">{block.room}</span>
                        </div>
                      </div>

                      {/* Middle line: Short Subject Title */}
                      <div className="box-tile__title" title={block.subject}>
                        {block.subject}
                      </div>

                      {/* Bottom line: Muted faculty / batch + Live/Clash badge */}
                      <div className="box-tile__bottom">
                        <span className="box-tile__sub">{subLabel}</span>
                        {isLive && (
                          <span className="live-indicator">
                            <span className="live-indicator-dot" />
                            <span>LIVE</span>
                          </span>
                        )}
                        {isClash && (
                          <span className="clash-indicator">
                            <AlertCircle size={9} />
                            <span>CLASH</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                }

                // 3. Empty / Free Slot Box
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (mode === 'teacher') {
                        onToggleSlot?.(day, time)
                      }
                    }}
                    className={cn('box-tile box-tile--empty', mode === 'teacher' && 'cursor-pointer hover:border-mist')}
                    title={mode === 'teacher' ? `Click to block ${day} ${label}` : `${day} ${label} is an open free hour`}
                  >
                    <span className="empty-label">{mode === 'teacher' ? '+ Open' : '— Free —'}</span>
                    {mode === 'teacher' && <span className="empty-subtext">Click to block</span>}
                  </button>
                )
              })
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export function ClassDetailModal({
  block,
  mode,
  onClose,
  onReschedule,
}: {
  block: ScheduleBlock | null
  mode: 'student' | 'teacher' | 'admin'
  onClose: () => void
  onReschedule?: (block: ScheduleBlock) => void
}) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!block) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal class-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="class-code">{block.code}</span>
              <Badge tone={block.status === 'live' ? 'mist' : block.status === 'clash' ? 'ember' : 'neutral'}>
                {block.status === 'live' ? 'LIVE NOW' : block.status === 'clash' ? 'CLASH DETECTED' : 'CONFIRMED'}
              </Badge>
              {block.department && (
                <Badge tone="mist">
                  <Building size={10} className="inline mr-1" />
                  {block.department}
                </Badge>
              )}
            </div>
            <h3>{block.subject}</h3>
            <p>
              {block.day} · {block.start} - {block.end}
            </p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close details">
            ✕
          </button>
        </div>

        <div className="modal__body">
          <div className="detail-meta-grid">
            <div className="detail-item">
              <span className="detail-label">
                <MapPin size={11} className="inline mr-1 text-mist" /> ROOM / LOCATION
              </span>
              <strong>{block.room}</strong>
              <span className="detail-sub">Academic Block · Theory Hall</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">
                <User size={11} className="inline mr-1 text-mist" /> FACULTY
              </span>
              <strong>{block.faculty}</strong>
              <span className="detail-sub">Instructor assigned</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">
                <Users size={11} className="inline mr-1 text-mist" /> BATCH DOMAIN
              </span>
              <strong>{block.batch}</strong>
              <span className="detail-sub">Semester Section</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">
                <Clock size={11} className="inline mr-1 text-mist" /> TIMETABLE PERIOD
              </span>
              <strong>
                {block.start} - {block.end}
              </strong>
              <span className="detail-sub">50 min lecture</span>
            </div>
          </div>

          {block.status === 'clash' && (
            <div className="clash-detail-box">
              <AlertCircle size={15} className="text-ember shrink-0 mt-0.5" />
              <div>
                <strong>Double-Booking Conflict Detected</strong>
                <p>
                  Another class shares the {block.day} {block.start} slot. Use the Teacher Reschedule tool or run the
                  deterministic solver to resolve.
                </p>
              </div>
            </div>
          )}

          <div className="modal-actions-row">
            {mode === 'teacher' && onReschedule && (
              <button
                type="button"
                className="btn btn--ember"
                onClick={() => {
                  onClose()
                  onReschedule(block)
                }}
              >
                <span>Reschedule / Move Class</span>
                <ArrowRight size={13} className="inline ml-1" />
              </button>
            )}
            <button type="button" className="btn btn--light" onClick={onClose}>
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
