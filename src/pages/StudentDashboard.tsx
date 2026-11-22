import React, { useEffect, useState } from 'react'
import { Download, FileDown, ShieldCheck } from 'lucide-react'
import {
  ScheduleBlock,
  StudentDashboardData,
  getStudentDashboard,
} from '../services/api'
import { Badge, Button, StatusPill, Surface } from '../components/ui'
import { WeeklyBoxMatrix } from '../components/WeeklyBoxMatrix'
import { ClassDetailModal } from '../components/modals/ClassDetailModal'
import {
  AlertBanner,
  DashboardHeader,
  DashboardShell,
  LiveCard,
  LoadingDashboard,
} from '../components/DashboardShell'

export function StudentDashboard() {
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    getStudentDashboard().then(setData)
  }, [])

  if (!data) return <LoadingDashboard />

  const exportPDF = () => {
    window.print()
    setToast('PDF Print dialog opened for your timetable.')
    setTimeout(() => setToast(''), 3000)
  }

  const exportCSV = () => {
    const headers = ['Subject Code', 'Subject Title', 'Faculty', 'Room', 'Batch', 'Day', 'Start Time', 'End Time']
    const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const rows = data.blocks.map((b) => [b.code, b.subject, b.faculty, b.room, b.batch, b.day, b.start, b.end])
    const csvContent = [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join(
      '\r\n'
    )
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Schedulo_Timetable_${data.activeBatch}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setToast(`Timetable for ${data.activeBatch} downloaded as CSV.`)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <DashboardShell role="student" collegeName={data.collegeName} alerts={data.alerts}>
      <main className="dashboard-main">
        <DashboardHeader
          eyebrow={`STUDENT · ${data.activeBatch} · ${data.department}`}
          title="Your Week, Without the Collision."
          body={`Published Schedule · ${data.collegeName} · Last Sync ${data.updatedAt}`}
          actions={
            <>
              <Button tone="light" size="sm" icon={FileDown} onClick={exportPDF}>
                Export PDF
              </Button>
              <Button tone="dark" size="sm" icon={Download} onClick={exportCSV}>
                Export CSV
              </Button>
            </>
          }
        />

        <div className="dashboard-grid">
          <LiveCard current={data.current} next={data.next} />

          <Surface className="surface--dark">
            <div className="card-heading">
              <div>
                <h3>Security &amp; Policy State</h3>
                <p>2FA verified session health.</p>
              </div>
              <ShieldCheck size={17} color="#90C2E7" />
            </div>
            <div style={{ padding: '20px 21px' }}>
              <StatusPill tone="mist">2FA VERIFIED</StatusPill>
              <p style={{ color: '#C7E3F7', fontSize: 12, lineHeight: 1.6, margin: '17px 0 21px' }}>
                Your role-based session is verified. 13:00–14:00 lunch recess is locked campus-wide.
              </p>
              <div className="mono" style={{ color: '#90C2E7', fontSize: 9, lineHeight: 1.7 }}>
                SESSION / CAMPUS-EDGE-17
                <br />
                TOKEN ROTATION / 00:24:12
              </div>
            </div>
          </Surface>

          <AlertBanner alerts={data.alerts} className="schedule-alert--wide" />

          {/* Modular Weekly Box Matrix as the primary centerpiece */}
          <Surface className="timeline-card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-heading">
              <div>
                <h3>Weekly Box Matrix · {data.activeBatch}</h3>
                <p>
                  Tactile modular tiles · 6 lecture periods + locked lunch recess (13:00–14:00) · Click any box to inspect
                  full room &amp; faculty metadata.
                </p>
              </div>
              <Badge tone="mist" dot>
                PUBLISHED
              </Badge>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <WeeklyBoxMatrix
                blocks={data.blocks}
                mode="student"
                secondaryLabel="faculty"
                onSelectBlock={(b) => setSelectedBlock(b)}
              />
            </div>
          </Surface>
        </div>

        {selectedBlock && (
          <ClassDetailModal
            block={selectedBlock}
            mode="student"
            onClose={() => setSelectedBlock(null)}
          />
        )}

        {toast && <div className="toast">{toast}</div>}
      </main>
    </DashboardShell>
  )
}
