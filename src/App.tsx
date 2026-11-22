import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  Layers3,
  LockKeyhole,
  LogOut,
  Menu,
  MonitorCog,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Radio,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  AdminDashboardData,
  AuthSession,
  DashboardView,
  LiveAlert,
  Role,
  ROLE_META,
  ScheduleBlock,
  StudentDashboardData,
  TeacherDashboardData,
  createAuthSession,
  getAdminDashboard,
  getStudentDashboard,
  getTeacherDashboard,
  publishTimetable,
  runDeterministicSolver,
  validateReschedule,
  verifyTwoFactor,
} from './services/api'
import {
  Badge,
  BrandMark,
  Button,
  Field,
  InlineArrow,
  SectionLabel,
  SelectField,
  StatusPill,
  Surface,
  cn,
} from './components/ui'
import { SpatialTimetable } from './components/SpatialTimetable'
import './styles.css'

type Path = '/' | '/auth' | '/dashboard/student' | '/dashboard/teacher' | '/dashboard/admin'

function navigate(path: Path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function usePath() {
  const [path, setPath] = useState<Path>((window.location.pathname as Path) || '/')
  useEffect(() => {
    const listener = () => setPath((window.location.pathname as Path) || '/')
    window.addEventListener('popstate', listener)
    return () => window.removeEventListener('popstate', listener)
  }, [])
  return path
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: 'easeOut' }}>
      {children}
    </motion.div>
  )
}

function LandingPage() {
  const [architectureOpen, setArchitectureOpen] = useState(false)
  return (
    <PageTransition>
      <div className="landing-page">
        <header className="landing-header">
          <BrandMark />
          <div className="landing-header__actions">
            <button className="text-link" onClick={() => setArchitectureOpen(true)}>
              Architecture <InlineArrow />
            </button>
            <Button tone="dark" size="sm" onClick={() => navigate('/auth')}>
              Sign In / Sign Up
            </Button>
          </div>
        </header>
        <main className="landing-page__main">
          <section className="hero-copy">
            <span className="eyebrow">DETERMINISTIC ENGINE · ZERO AI · MANDATORY 2FA</span>
            <h1>
              Clash-Free Campus Scheduling. <br />
              <span style={{ color: 'var(--mist)' }}>Secured by 2FA.</span>
            </h1>
            <p className="hero-copy__intro">
              A deterministic constraint-satisfaction engine using Minimum Remaining Values (MRV) that guarantees zero room, teacher, or batch overlaps — before the timetable reaches campus.
            </p>
            <div className="role-entry">
              {(['student', 'teacher', 'admin'] as Role[]).map((role, index) => (
                <button key={role} onClick={() => navigate('/auth')}>
                  <span className="role-entry__num">0{index + 1} / ENTRY</span>
                  <span className="role-entry__label">{ROLE_META[role].label}</span>
                </button>
              ))}
            </div>
            <div className="hero-meta">
              <span>THEORY ROOMS ONLY</span>
              <span>RFC-6238 COMPLIANT</span>
              <span>MRV SOLVER V2.4</span>
            </div>
          </section>
          <section aria-label="Interactive spatial timetable">
            <SpatialTimetable />
          </section>
        </main>
        <footer className="footer-strip">
          <span>Algorithmic Solver (Zero AI)</span>
          <span>Role-Based Access</span>
          <span>Mandatory 2FA</span>
        </footer>
        <AnimatePresence>
          {architectureOpen && <ArchitectureModal onClose={() => setArchitectureOpen(false)} />}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}

function ArchitectureModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h3>Platform architecture</h3>
            <p>Three bounded layers keep the schedule legible, verifiable, and secure.</p>
          </div>
          <button className="modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal__body">
          {[
            ['01', 'Constraint Domain Model', 'Theory rooms, teacher unavailable slots, student batches, and weekly hours are reduced via forward-checking before assignment.'],
            ['02', 'Deterministic Backtracking Solver (Zero AI)', 'Minimum Remaining Values (MRV) selects the most-constrained teacher/batch first, guaranteeing 100% mathematical validity with zero hallucinations.'],
            ['03', 'RFC-6238 TOTP 2FA & Strict RBAC', 'Two-stage authentication gates all routes. Student, Teacher, and Admin portals access only role-scoped resources with real-time operational change alerts.'],
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

function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [role, setRole] = useState<Role>('student')
  const [flipped, setFlipped] = useState(false)
  const [payload, setPayload] = useState({ username: 'student@schedulo.edu', password: 'Student@1234', batch: 'CSE-5A' })
  const [session, setSession] = useState<AuthSession | null>(null)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const updateOtp = (index: number, value: string) =>
    setOtp((items) => items.map((item, itemIndex) => (itemIndex === index ? value.slice(-1) : item)))

  const quickFill = (r: Role, user: string, pass: string) => {
    setRole(r)
    setMode('signin')
    setPayload({ username: user, password: pass, batch: 'CSE-5A' })
  }

  const submitCredentials = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const authSession = await createAuthSession({
        username: payload.username,
        password: payload.password,
        role,
        mode,
        batchOrDepartment: payload.batch,
      })
      setSession(authSession)
      if (authSession.devTotp) {
        setOtp(authSession.devTotp.split(''))
      }
      setFlipped(true)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    const valid = await verifyTwoFactor(otp.join(''))
    setLoading(false)
    if (!valid) {
      setError('Enter the valid six-digit authenticator code to continue.')
      return
    }
    navigate(ROLE_META[session?.role ?? role].route as Path)
  }

  return (
    <PageTransition>
      <div className="auth-page">
        <div className="auth-topline">
          <button className="text-link" onClick={() => navigate('/')}>
            <ArrowLeft size={15} /> Back to landing
          </button>
          <BrandMark />
        </div>
        <div className="auth-frame">
          <div className={cn('auth-card', flipped && 'is-flipped')}>
            {/* Front of Card: Credentials & Role */}
            <div className="auth-face auth-face--front">
              <span className="auth-kicker">ACCESS CONTROL / 01</span>
              <h1>Enter the campus grid.</h1>
              <p>Choose your operational role. Every session is gated by mandatory TOTP 2FA.</p>

              <div style={{ display: 'flex', gap: 6, margin: '14px 0 16px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="text-link"
                  style={{
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                    background: 'rgba(144,194,231,0.1)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: '1px solid rgba(144,194,231,0.2)',
                  }}
                  onClick={() => quickFill('admin', 'admin@schedulo.edu', 'Admin@1234')}
                >
                  ⚡ Admin
                </button>
                <button
                  type="button"
                  className="text-link"
                  style={{
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                    background: 'rgba(144,194,231,0.1)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: '1px solid rgba(144,194,231,0.2)',
                  }}
                  onClick={() => quickFill('teacher', 'dr.roy@schedulo.edu', 'Teacher@1234')}
                >
                  ⚡ Teacher (Dr. Roy)
                </button>
                <button
                  type="button"
                  className="text-link"
                  style={{
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                    background: 'rgba(144,194,231,0.1)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: '1px solid rgba(144,194,231,0.2)',
                  }}
                  onClick={() => quickFill('student', 'student@schedulo.edu', 'Student@1234')}
                >
                  ⚡ Student (Rahul)
                </button>
              </div>

              <div className="auth-toggle">
                <button className={mode === 'signin' ? 'is-active' : ''} onClick={() => setMode('signin')}>
                  SIGN IN
                </button>
                <button className={mode === 'signup' ? 'is-active' : ''} onClick={() => setMode('signup')}>
                  SIGN UP
                </button>
              </div>

              <div className="role-switch">
                {(['student', 'teacher', 'admin'] as Role[]).map((item) => (
                  <button key={item} className={role === item ? 'is-active' : ''} onClick={() => setRole(item)}>
                    {ROLE_META[item].label.toUpperCase()}
                  </button>
                ))}
              </div>

              <form className="auth-form" onSubmit={submitCredentials}>
                <Field
                  label="USERNAME / EMAIL"
                  placeholder={role === 'student' ? 'student@schedulo.edu' : role === 'teacher' ? 'dr.roy@schedulo.edu' : 'admin@schedulo.edu'}
                  value={payload.username}
                  onChange={(event) => setPayload({ ...payload, username: event.target.value })}
                  autoComplete="username"
                  required
                />
                <Field
                  label="PASSWORD"
                  placeholder="••••••••••••"
                  type="password"
                  value={payload.password}
                  onChange={(event) => setPayload({ ...payload, password: event.target.value })}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
                {mode === 'signup' && (
                  <SelectField
                    label={role === 'admin' ? 'DEPARTMENT' : 'BATCH'}
                    value={payload.batch}
                    onChange={(event) => setPayload({ ...payload, batch: event.target.value })}
                  >
                    <option>CSE-5A</option>
                    <option>IT-5A</option>
                    <option>Computer Science &amp; Engineering</option>
                    <option>Information Technology</option>
                  </SelectField>
                )}
                {error && <p className="form-status" role="alert">{error}</p>}
                <Button className="auth-submit" size="lg" tone="mist" loading={loading} icon={ArrowRight} type="submit">
                  Continue to 2FA
                </Button>
              </form>
              <div className="auth-footnote">
                <LockKeyhole size={13} /> BCrypt hashing · Role-scoped JWT issued only upon valid 6-digit TOTP verification.
              </div>
            </div>

            {/* Back of Card: 3D Flip Security Gate & TOTP */}
            <div className="auth-face auth-face--back security-gate">
              <span className="auth-kicker">MANDATORY SECURITY GATE / 02</span>
              <h1>{mode === 'signup' ? 'Bind your authenticator.' : 'Verify and unlock.'}</h1>
              <p>
                {mode === 'signup'
                  ? 'Scan the setup QR code with Google Authenticator or any TOTP app, then enter the 6-digit code.'
                  : 'Enter the 6-digit code generated by your registered RFC-6238 authenticator.'}
              </p>

              {mode === 'signup' && (
                <>
                  <div className="qr-box" aria-label="Authenticator setup QR code">
                    <QRCodeSVG
                      value={`otpauth://totp/Schedulo:${payload.username || 'campus.user'}?secret=${(
                        session?.secret ?? 'JBSWY3DPEHPK3PXP'
                      ).replace(/\s/g, '')}&issuer=Schedulo`}
                      size={110}
                      bgColor="#F7FBFD"
                      fgColor="#092327"
                      includeMargin={false}
                    />
                  </div>
                  <div className="manual-secret">
                    <span>BASE32 MANUAL SECRET</span>
                    <strong>
                      {session?.secret ?? 'JBSW Y3DP EHPK 3PXP'}
                      <button
                        className="copy-button"
                        type="button"
                        title="Copy Secret"
                        onClick={() => navigator.clipboard?.writeText(session?.secret ?? 'JBSW Y3DP EHPK 3PXP')}
                      >
                        <Copy size={13} />
                      </button>
                    </strong>
                  </div>
                </>
              )}

              {session?.devTotp && (
                <div
                  style={{
                    margin: '12px 0 10px',
                    padding: '8px 12px',
                    background: 'rgba(144, 194, 231, 0.12)',
                    borderRadius: 6,
                    border: '1px solid rgba(144, 194, 231, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--mist)', fontFamily: 'JetBrains Mono, monospace' }}>
                    DEV TOTP: <strong>{session.devTotp}</strong>
                  </span>
                  <button
                    type="button"
                    className="text-link"
                    style={{ fontSize: 11, color: 'var(--pearl)' }}
                    onClick={() => setOtp(session.devTotp!.split(''))}
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              <form onSubmit={unlock}>
                <div className="otp-row">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      aria-label={`Authenticator digit ${index + 1}`}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => updateOtp(index, event.target.value.replace(/\D/g, ''))}
                    />
                  ))}
                </div>
                {error && <p className="form-status" role="alert">{error}</p>}
                <div className="auth-back-actions">
                  <Button size="lg" tone="mist" loading={loading} icon={ShieldCheck} type="submit">
                    Verify &amp; Unlock Dashboard
                  </Button>
                  <Button type="button" tone="ghost" onClick={() => setFlipped(false)}>
                    Return to credentials
                  </Button>
                </div>
              </form>
              <div className="auth-footnote">
                <ShieldCheck size={13} /> RFC-6238 TOTP window · 30 sec rotation · Dev code logged in terminal.
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

function DashboardShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const navItems: Array<{ label: string; icon: typeof CalendarDays; path: Path }> = [
    { label: 'Schedule', icon: CalendarDays, path: ROLE_META[role].route as Path },
    { label: 'Alerts', icon: Radio, path: ROLE_META[role].route as Path },
    { label: 'Access log', icon: ClipboardCheck, path: ROLE_META[role].route as Path },
  ]
  const initials = role === 'teacher' ? 'DR' : role === 'admin' ? 'DA' : 'RS'
  const userName = role === 'student' ? 'Rahul Sharma' : role === 'teacher' ? 'Dr. Debabrata Roy' : 'Dept. Admin'

  return (
    <PageTransition>
      <div className="dashboard-app">
        <aside className={cn('sidebar', collapsed && 'is-collapsed')}>
          <div className="sidebar-top">
            <BrandMark />
            <button className="sidebar-collapse" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
              {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
          </div>
          {!collapsed && (
            <div className="sidebar-copy">
              <span className="sidebar-overline">OPERATING INSTANCE / 05</span>
              <p>One verified schedule surface for every campus role.</p>
            </div>
          )}
          <nav className="sidebar-nav">
            {navItems.map(({ label, icon: Icon, path }, index) => (
              <button key={label} className={index === 0 ? 'is-active' : ''} onClick={() => navigate(path)}>
                <Icon size={15} />
                <span className="nav-label">{label}</span>
              </button>
            ))}
          </nav>
          {!collapsed && <div className="sidebar-footer">DATA REGION / IN-CAMPUS<br />LAST SYNC / 09:30:00 IST</div>}
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="topbar__left">
              <div>
                <span className="dashboard-kicker">SCHEDULO / {ROLE_META[role].shortLabel.toUpperCase()} CONSOLE</span>
                <h1>{role === 'student' ? 'My schedule' : role === 'teacher' ? 'Teaching matrix' : 'Scheduling operations'}</h1>
              </div>
            </div>
            <div className="topbar__right">
              <StatusPill>2FA VERIFIED</StatusPill>
              <span className="topbar-clock">22 NOV 2026 · 09:30 IST</span>
              <div className="user-block">
                <div className="user-avatar">{initials}</div>
                <div>
                  <strong>{userName}</strong>
                  <span>{ROLE_META[role].label}</span>
                </div>
              </div>
              <button className="text-link" title="Sign out" onClick={() => navigate('/')}>
                <LogOut size={15} />
              </button>
            </div>
          </header>
          {children}
        </div>
      </div>
    </PageTransition>
  )
}

function DashboardHeader({ eyebrow, title, body, actions }: { eyebrow: string; title: string; body: string; actions?: React.ReactNode }) {
  return (
    <div className="dashboard-header">
      <div>
        <span className="dashboard-kicker">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      {actions && <div className="dashboard-header__actions">{actions}</div>}
    </div>
  )
}

function LiveCard({ current, next }: { current: ScheduleBlock; next: ScheduleBlock }) {
  return (
    <div className="dashboard-stack">
      <Surface className="live-card">
        <div className="card-heading">
          <div>
            <h3>Happening now</h3>
            <p>Live class state from the published timetable.</p>
          </div>
          <Badge tone="mist" dot>LIVE</Badge>
        </div>
        <div className="live-card__body">
          <div>
            <span className="live-card__code">{current.code} · {current.room}</span>
            <h3>{current.subject}</h3>
            <div className="live-card__meta">
              <span>{current.faculty}</span>
              <span>{current.batch}</span>
            </div>
          </div>
          <div className="progress-block">
            <div className="progress-block__time">
              <span>{current.start}</span>
              <span>In Progress / {current.end}</span>
            </div>
            <div className="progress">
              <span style={{ width: '68%' }} />
            </div>
          </div>
        </div>
      </Surface>
      <Surface className="next-card">
        <div className="card-heading">
          <div>
            <h3>Up next</h3>
            <p>Next confirmed slot for your batch.</p>
          </div>
          <span className="card-heading__aside">{next.day.toUpperCase()} / {next.start}</span>
        </div>
        <div className="next-card__body">
          <span className="live-card__code">{next.code} · {next.room}</span>
          <div className="next-card__subject">{next.subject}</div>
          <div className="live-card__meta">
            <span>{next.faculty}</span>
            <span>{next.batch}</span>
          </div>
        </div>
      </Surface>
    </div>
  )
}

function AlertBanner({ alerts, className }: { alerts: LiveAlert[]; className?: string }) {
  const alert = alerts[0]
  if (!alert) return null
  return (
    <div className={cn('schedule-alert', className)}>
      <AlertTriangle size={17} />
      <div>
        <strong>Live schedule alert · {alert.title}</strong>
        <p>
          {alert.detail} <span className="mono">{alert.time}</span>
        </p>
      </div>
    </div>
  )
}

function StudentDashboard() {
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [view, setView] = useState<DashboardView>('timeline')
  const [toast, setToast] = useState('')

  useEffect(() => {
    getStudentDashboard().then(setData)
  }, [])

  if (!data) return <LoadingDashboard />
  const exportSchedule = (format: string) => {
    setToast(`${format} export staged locally.`)
    window.setTimeout(() => setToast(''), 2200)
  }

  return (
    <DashboardShell role="student">
      <main className="dashboard-main">
        <DashboardHeader
          eyebrow={`STUDENT / ${data.activeBatch}`}
          title="Your week, without the collision."
          body={`Published schedule · Last sync ${data.updatedAt}`}
          actions={
            <>
              <Button tone="light" size="sm" icon={FileDown} onClick={() => exportSchedule('PDF')}>
                Export PDF
              </Button>
              <Button tone="dark" size="sm" icon={Download} onClick={() => exportSchedule('CSV')}>
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
                <h3>Security state</h3>
                <p>Session and publication health.</p>
              </div>
              <ShieldCheck size={17} color="#90C2E7" />
            </div>
            <div style={{ padding: '20px 21px' }}>
              <StatusPill tone="mist">2FA VERIFIED</StatusPill>
              <p style={{ color: 'rgba(244,246,248,.62)', fontSize: 12, lineHeight: 1.6, margin: '17px 0 21px' }}>
                Your role-based session is active. All schedule changes are published by Department Admin.
              </p>
              <div className="mono" style={{ color: 'rgba(244,246,248,.42)', fontSize: 9, lineHeight: 1.7 }}>
                SESSION / CAMPUS-EDGE-17<br />
                TOKEN ROTATION / 00:24:12
              </div>
            </div>
          </Surface>
          <AlertBanner alerts={data.alerts} className="schedule-alert--wide" />
          <Surface className="timeline-card">
            <div className="card-heading">
              <div>
                <h3>Schedule surface</h3>
                <p>Every published class for {data.activeBatch}.</p>
              </div>
              <div className="timeline-tabs">
                <button className={view === 'timeline' ? 'is-active' : ''} onClick={() => setView('timeline')}>
                  TODAY'S TIMELINE
                </button>
                <button className={view === 'matrix' ? 'is-active' : ''} onClick={() => setView('matrix')}>
                  FULL WEEKLY MATRIX
                </button>
              </div>
            </div>
            {view === 'timeline' ? <ScheduleTable blocks={data.blocks} /> : <WeeklyMatrix blocks={data.blocks} />}
          </Surface>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </main>
    </DashboardShell>
  )
}

function ScheduleTable({ blocks }: { blocks: ScheduleBlock[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="timeline-table">
        <thead>
          <tr>
            <th>TIME</th>
            <th>SUBJECT</th>
            <th>FACULTY</th>
            <th>ROOM</th>
            <th>STATE</th>
          </tr>
        </thead>
        <tbody>
          {blocks.slice(0, 6).map((block) => (
            <tr key={block.id}>
              <td>
                {block.day} / {block.start}
              </td>
              <td>
                <span className="class-code">{block.code}</span>
                {block.subject}
              </td>
              <td>{block.faculty}</td>
              <td className="mono">{block.room}</td>
              <td>
                {block.status === 'live' ? (
                  <Badge tone="mist" dot>LIVE</Badge>
                ) : block.status === 'clash' ? (
                  <Badge tone="ember" dot>CLASH</Badge>
                ) : (
                  <Badge tone="neutral">CONFIRMED</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WeeklyMatrix({ blocks }: { blocks: ScheduleBlock[] }) {
  const rows = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00']
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  return (
    <div className="matrix-wrap">
      <div className="weekly-matrix">
        <div className="matrix-head">LOCAL</div>
        {days.map((day) => (
          <div className="matrix-head" key={day}>
            {day.toUpperCase()}
          </div>
        ))}
        {rows.map((time) => (
          <React.Fragment key={time}>
            <div className="matrix-time" key={`${time}-label`}>
              {time}
            </div>
            {days.map((day) => {
              const block = blocks.find((item) => item.day === day && item.start === time)
              return (
                <div className="matrix-cell" key={`${day}-${time}`}>
                  {block && (
                    <div className={cn('matrix-block', block.status === 'clash' && 'is-clash')}>
                      <strong>{block.code}</strong>
                      <span>{block.room}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function TeacherDashboard() {
  const [data, setData] = useState<TeacherDashboardData | null>(null)
  const [unavailable, setUnavailable] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [targetRoom, setTargetRoom] = useState('Room 201')
  const [targetBatch, setTargetBatch] = useState('CSE-5A')
  const [validation, setValidation] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getTeacherDashboard().then((result) => {
      setData(result)
      setUnavailable(result.unavailable)
    })
  }, [])

  if (!data) return <LoadingDashboard />
  const slots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00']
  const toggleSlot = (day: string, time: string) => {
    const key = `${day}-${time}`
    setUnavailable((items) => (items.includes(key) ? items.filter((item) => item !== key) : [...items, key]))
  }

  const validate = async () => {
    setLoading(true)
    const result = await validateReschedule(targetRoom, targetBatch)
    setValidation(result.message)
    setLoading(false)
  }

  return (
    <DashboardShell role="teacher">
      <main className="dashboard-main">
        <DashboardHeader
          eyebrow={`TEACHER / ${data.faculty.toUpperCase()}`}
          title="Teaching matrix"
          body="Assigned theory classes across batches · 0 room collisions"
          actions={
            <Button tone="ember" size="sm" icon={RefreshCw} onClick={() => setModalOpen(true)}>
              Reschedule / Cancel
            </Button>
          }
        />
        <div className="teacher-grid">
          <div className="dashboard-stack">
            <div className="instruction-strip">
              <strong>Block unavailable slots</strong> · Select any open cell below to exclude it from future solver runs. Assigned classes remain locked.
            </div>
            <Surface>
              <div className="card-heading">
                <div>
                  <h3>My teaching matrix</h3>
                  <p>{data.faculty} · Assigned Theory Courses</p>
                </div>
                <Badge tone="mist">EDIT MODE</Badge>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="timeline-table availability-table">
                  <thead>
                    <tr>
                      <th>DAY</th>
                      {slots.map((slot) => (
                        <th key={slot}>{slot}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
                      <tr key={day}>
                        <td>{day}</td>
                        {slots.map((slot) => {
                          const assigned = data.blocks.find((block) => block.day === day && block.start === slot)
                          const key = `${day}-${slot}`
                          return (
                            <td key={slot}>
                              {assigned ? (
                                <button className="slot-button is-occupied" type="button" title={`${assigned.code} assigned`}>
                                  {assigned.code}
                                </button>
                              ) : (
                                <button
                                  className={cn('slot-button', unavailable.includes(key) && 'is-unavailable')}
                                  type="button"
                                  onClick={() => toggleSlot(day, slot)}
                                >
                                  {unavailable.includes(key) ? 'BLOCKED' : 'OPEN'}
                                </button>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Surface>
          </div>
          <div className="dashboard-stack">
            <Surface className="surface--dark solver-card">
              <h3>Availability register</h3>
              <p>These exclusions are local to your faculty profile and applied before the next deterministic run.</p>
              <div className="solver-stats">
                <div className="solver-stat">
                  <strong>{unavailable.length.toString().padStart(2, '0')}</strong>
                  <span>BLOCKED SLOTS</span>
                </div>
                <div className="solver-stat">
                  <strong>{data.blocks.length.toString().padStart(2, '0')}</strong>
                  <span>ASSIGNED CLASS</span>
                </div>
                <div className="solver-stat">
                  <strong>{data.batches.length.toString().padStart(2, '0')}</strong>
                  <span>BATCHES</span>
                </div>
              </div>
              <div className="mono" style={{ color: 'rgba(244,246,248,.48)', fontSize: 9, lineHeight: 1.8 }}>
                SYNC / FUTURE SOLVER INPUT<br />
                SCOPE / FACULTY: {data.faculty.toUpperCase()}
              </div>
            </Surface>
            <Surface className="publish-card">
              <h3>Operational note</h3>
              <p>Room and batch checks run before a change becomes a live alert. No change is published from this panel without validation.</p>
              <Button tone="light" icon={Settings2} onClick={() => setModalOpen(true)}>
                Open change request
              </Button>
            </Surface>
          </div>
        </div>
        {modalOpen && (
          <RescheduleModal
            room={targetRoom}
            batch={targetBatch}
            setRoom={setTargetRoom}
            setBatch={setTargetBatch}
            validation={validation}
            loading={loading}
            onValidate={validate}
            onClose={() => setModalOpen(false)}
          />
        )}
      </main>
    </DashboardShell>
  )
}

function RescheduleModal({
  room,
  batch,
  setRoom,
  setBatch,
  validation,
  loading,
  onValidate,
  onClose,
}: {
  room: string
  batch: string
  setRoom: (value: string) => void
  setBatch: (value: string) => void
  validation: string
  loading: boolean
  onValidate: () => void
  onClose: () => void
}) {
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <motion.div className="modal" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h3>Reschedule / cancel class</h3>
            <p>Validate the target domain before an alert is dispatched.</p>
          </div>
          <button className="modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal__body">
          <SelectField label="TARGET ROOM" value={room} onChange={(event) => setRoom(event.target.value)}>
            <option>Room 201</option>
            <option>Room 202</option>
            <option>Room 101</option>
            <option>Room 102</option>
          </SelectField>
          <SelectField label="TARGET BATCH" value={batch} onChange={(event) => setBatch(event.target.value)}>
            <option>CSE-5A</option>
            <option>IT-5A</option>
          </SelectField>
          <Button tone="dark" loading={loading} icon={ClipboardCheck} onClick={onValidate}>
            Validate availability
          </Button>
          {validation && <div className="form-status">{validation}</div>}
          <Button tone="ember" icon={Send} disabled={!validation || validation.includes('occupied')} onClick={onClose}>
            Prepare live alert
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [tab, setTab] = useState('Theory Rooms')
  const [solving, setSolving] = useState(false)
  const [solver, setSolver] = useState<Awaited<ReturnType<typeof runDeterministicSolver>> | null>(null)
  const [published, setPublished] = useState('')

  useEffect(() => {
    getAdminDashboard().then(setData)
  }, [])

  if (!data) return <LoadingDashboard />

  const runSolver = async () => {
    setSolving(true)
    setSolver(null)
    const result = await runDeterministicSolver()
    setSolver(result)
    setSolving(false)
  }

  const publish = async () => {
    const result = await publishTimetable()
    setPublished(`${result.publishedAt} · ${result.recipients} recipients`)
  }

  const tabData: Record<string, string[]> = {
    'Theory Rooms': data.rooms,
    Faculty: data.faculty,
    'Student Batches': data.batches,
    Subjects: data.subjects.map((subject) => `${subject.code} · ${subject.name} (${subject.hours}h/wk)`),
  }

  return (
    <DashboardShell role="admin">
      <main className="dashboard-main">
        <DashboardHeader
          eyebrow="DEPARTMENT ADMIN / SCHEDULING OPERATIONS"
          title="A valid week, assembled."
          body="Configure theory resources, run the deterministic solver, then publish one schedule surface."
          actions={
            <Button tone="dark" size="sm" icon={Play} loading={solving} onClick={runSolver}>
              Run Algorithmic Solver
            </Button>
          }
        />
        <div className="dashboard-grid dashboard-grid--admin">
          <div className="dashboard-stack">
            <Surface>
              <div className="card-heading">
                <div>
                  <h3>Setup workspace</h3>
                  <p>Every resource is explicit before the solver receives a domain.</p>
                </div>
                <Badge tone="mist">THEORY ONLY</Badge>
              </div>
              <div className="admin-tabs">
                {Object.keys(tabData).map((item) => (
                  <button key={item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>
              <table className="setup-table">
                <thead>
                  <tr>
                    <th>RESOURCE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {tabData[tab].map((item) => (
                    <tr key={item}>
                      <td>{item}</td>
                      <td>
                        <Badge tone="mist" dot>READY</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Surface>
            <Surface className="publish-card">
              <h3>Publish live timetable</h3>
              <p>Push the latest valid schedule to Student and Teacher views. Publishing creates alerts only for changed domains.</p>
              <Button tone="mist" icon={Send} onClick={publish}>
                Publish Live Timetable
              </Button>
              {published && (
                <div className="form-status">
                  <Check size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                  Published · {published}
                </div>
              )}
            </Surface>
          </div>
          <div className="dashboard-stack">
            <Surface className="surface--dark solver-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <h3>Execution log</h3>
                  <p>Deterministic constraint-satisfaction run.</p>
                </div>
                <Activity size={17} color="#90C2E7" />
              </div>
              <div className="solver-stats">
                <div className="solver-stat">
                  <strong>{solver ? solver.conflicts : '0'}</strong>
                  <span>CONFLICTS</span>
                </div>
                <div className="solver-stat">
                  <strong>{solver ? solver.solveTime : '3.8ms'}</strong>
                  <span>SOLVE TIME</span>
                </div>
                <div className="solver-stat">
                  <strong>{solver ? solver.backtracks : data.lastRun?.backtracks ?? '0'}</strong>
                  <span>BACKTRACKS</span>
                </div>
              </div>
              <div className="execution-log">
                {solving ? (
                  <div className="log-line">[09:30:00.001] Evaluating domains via Minimum Remaining Values (MRV)…</div>
                ) : solver ? (
                  solver.log.map((line) => (
                    <div className="log-line" key={line}>
                      {line}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="log-line">[09:30:00.012] Last successful run</div>
                    <div className="log-line">[09:30:00.014] 0 conflicts · 3.8ms · Backtracking (MRV)</div>
                    <div className="log-line">[09:30:00.016] Ready for next solver run</div>
                  </>
                )}
              </div>
            </Surface>
            <Surface className="surface--dark publish-card">
              <h3>Publication contract</h3>
              <p style={{ color: 'rgba(244,246,248,.57)' }}>
                Role views consume only the most recent valid schedule. Unsolvable inputs stay private and return an exact bottleneck reason.
              </p>
              <div className="mono" style={{ color: 'rgba(244,246,248,.46)', fontSize: 9, lineHeight: 1.8 }}>
                RBAC / ACTIVE<br />
                ROOMS / {data.rooms.length.toString().padStart(2, '0')}<br />
                BATCHES / {data.batches.length.toString().padStart(2, '0')}
              </div>
            </Surface>
          </div>
        </div>
      </main>
    </DashboardShell>
  )
}

function LoadingDashboard() {
  return (
    <div className="auth-page">
      <div className="auth-kicker">LOADING VERIFIED WORKSPACE…</div>
    </div>
  )
}

export default function App() {
  const path = usePath()
  if (path === '/auth') return <AuthPage />
  if (path === '/dashboard/student') return <StudentDashboard />
  if (path === '/dashboard/teacher') return <TeacherDashboard />
  if (path === '/dashboard/admin') return <AdminDashboard />
  return <LandingPage />
}
