import React, { useEffect, useState } from 'react'
import { RefreshCw, Settings2 } from 'lucide-react'
import {
  ScheduleBlock,
  TeacherDashboardData,
  commitReschedule,
  getStoredUser,
  getTeacherDashboard,
  updateTeacherAvailability,
  validateReschedule,
} from '../services/api'
import { Badge, Button, Surface } from '../components/ui'
import { WeeklyBoxMatrix } from '../components/WeeklyBoxMatrix'
import { ClassDetailModal } from '../components/modals/ClassDetailModal'
import { RescheduleModal } from '../components/modals/RescheduleModal'
import { DashboardHeader, DashboardShell, LoadingDashboard } from '../components/DashboardShell'

export function TeacherDashboard() {
  const [data, setData] = useState<TeacherDashboardData | null>(null)
  const [unavailable, setUnavailable] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null)
  const [targetRoom, setTargetRoom] = useState('Room 201')
  const [targetBatch, setTargetBatch] = useState('CSE-5A')
  const [isThisWeekOnly, setIsThisWeekOnly] = useState(true)
  const [validation, setValidation] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    getTeacherDashboard().then((result) => {
      setData(result)
      setUnavailable(result.unavailable)
    })
  }, [])

  if (!data) return <LoadingDashboard />

  const toggleSlot = async (day: string, time: string) => {
    const key = `${day}-${time}`
    const next = unavailable.includes(key) ? unavailable.filter((item) => item !== key) : [...unavailable, key]
    setUnavailable(next)
    setToast(next.includes(key) ? `Blocked ${day} ${time} for solver.` : `Unblocked ${day} ${time}.`)
    setTimeout(() => setToast(''), 3000)

    try {
      await updateTeacherAvailability(getStoredUser()?.teacherId || 't-1', next)
    } catch (err) {
      console.warn('Failed to update teacher availability:', err)
    }
  }

  const handleRescheduleBlock = (block: ScheduleBlock) => {
    setSelectedBlock(block)
    setTargetRoom(block.room)
    setTargetBatch(block.batch)
    setValidation('')
    setModalOpen(true)
  }

  const validate = async () => {
    setLoading(true)
    const result = await validateReschedule(targetRoom, targetBatch, isThisWeekOnly)
    setValidation(result.message)
    setLoading(false)
  }

  const confirmReschedule = async () => {
    setLoading(true)
    try {
      const res = await commitReschedule({
        targetRoom,
        targetBatch,
        isThisWeekOnly,
        day: selectedBlock?.day || 'Wednesday',
      })
      setModalOpen(false)
      setToast(
        res.message ||
          `Class reschedule recorded (${isThisWeekOnly ? 'This Week Only' : 'Permanent'}). Alert dispatched.`
      )
      const refreshed = await getTeacherDashboard()
      setData(refreshed)
      setUnavailable(refreshed.unavailable)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reschedule failed.'
      setToast(message)
    } finally {
      setLoading(false)
      setTimeout(() => setToast(''), 4000)
    }
  }

  return (
    <DashboardShell role="teacher" collegeName={data.collegeName}>
      <main className="dashboard-main">
        <DashboardHeader
          eyebrow={`FACULTY / ${data.faculty.toUpperCase()} · ${data.departments.join(' & ')}`}
          title="Teaching Availability Matrix"
          body="Cross-department teaching schedule · Click empty boxes to toggle Blocked/Unavailable, or click assigned classes to reschedule"
          actions={
            <Button tone="ember" size="sm" icon={RefreshCw} onClick={() => setModalOpen(true)}>
              Reschedule Class
            </Button>
          }
        />

        <div className="teacher-grid">
          <div className="dashboard-stack">
            <div className="instruction-strip">
              <strong>Interactive Availability Matrix</strong> · Click any open free box to toggle{' '}
              <strong>Blocked / Unavailable</strong> for future solver runs. Click any assigned class box to inspect
              details or trigger a temporary <strong>This Week Only</strong> reschedule.
            </div>

            <Surface>
              <div className="card-heading">
                <div>
                  <h3>Unified Teaching Matrix · {data.faculty}</h3>
                  <p>
                    Classes across departments ({data.departments.join(', ')}) · 13:00–14:00 Lunch Recess locked
                  </p>
                </div>
                <Badge tone="mist">INTERACTIVE</Badge>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <WeeklyBoxMatrix
                  blocks={data.blocks}
                  mode="teacher"
                  unavailableSlots={unavailable}
                  onToggleSlot={toggleSlot}
                  onSelectBlock={(b) => setSelectedBlock(b)}
                  secondaryLabel="batch"
                />
              </div>
            </Surface>
          </div>

          <div className="dashboard-stack">
            <Surface className="surface--dark solver-card">
              <h3>Availability Register</h3>
              <p>These blocked exclusions are applied deterministically before the next solver run.</p>
              <div className="solver-stats">
                <div className="solver-stat">
                  <strong>{unavailable.length.toString().padStart(2, '0')}</strong>
                  <span>BLOCKED SLOTS</span>
                </div>
                <div className="solver-stat">
                  <strong>{data.blocks.length.toString().padStart(2, '0')}</strong>
                  <span>ASSIGNED CLASSES</span>
                </div>
                <div className="solver-stat">
                  <strong>{data.batches.length.toString().padStart(2, '0')}</strong>
                  <span>BATCHES</span>
                </div>
              </div>
              <div className="mono" style={{ color: '#90C2E7', fontSize: 9, lineHeight: 1.8 }}>
                SYNC / LIVE REST API
                <br />
                FACULTY / {data.faculty.toUpperCase()}
              </div>
            </Surface>

            <Surface className="publish-card">
              <h3>Operational Note</h3>
              <p>
                Room and batch conflicts are checked in real-time. No change is published without pure constraint
                validation.
              </p>
              <Button tone="light" icon={Settings2} onClick={() => setModalOpen(true)}>
                Open Change Request
              </Button>
            </Surface>
          </div>
        </div>

        {selectedBlock && !modalOpen && (
          <ClassDetailModal
            block={selectedBlock}
            mode="teacher"
            onClose={() => setSelectedBlock(null)}
            onReschedule={handleRescheduleBlock}
          />
        )}

        {modalOpen && (
          <RescheduleModal
            selectedBlock={selectedBlock}
            room={targetRoom}
            batch={targetBatch}
            rooms={data.rooms}
            batches={data.batches}
            isThisWeekOnly={isThisWeekOnly}
            setIsThisWeekOnly={setIsThisWeekOnly}
            setRoom={setTargetRoom}
            setBatch={setTargetBatch}
            validation={validation}
            loading={loading}
            onValidate={validate}
            onConfirm={confirmReschedule}
            onClose={() => setModalOpen(false)}
          />
        )}

        {toast && <div className="toast">{toast}</div>}
      </main>
    </DashboardShell>
  )
}
