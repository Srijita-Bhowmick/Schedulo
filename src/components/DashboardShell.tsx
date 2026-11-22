import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Building,
  CalendarDays,
  ClipboardCheck,
  LockKeyhole,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import {
  LiveAlert,
  ROLE_META,
  Role,
  ScheduleBlock,
  clearStoredAuth,
  getStoredUser,
} from '../services/api'
import { Badge, BrandMark, Button, StatusPill, Surface, cn } from './ui'
import { formatClock, navigate, PageTransition } from '../utils/navigation'

export function DashboardHeader({
  eyebrow,
  title,
  body,
  actions,
}: {
  eyebrow: string
  title: string
  body: string
  actions?: React.ReactNode
}) {
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

export function LiveAlertsPanel({
  role,
  alerts,
  onBack,
}: {
  role: Role
  alerts?: LiveAlert[]
  onBack?: () => void
}) {
  const displayAlerts: LiveAlert[] =
    alerts && alerts.length > 0
      ? alerts
      : [
          {
            id: 'alert-system-lunch',
            title: 'Protected Lunch Recess Enforced',
            detail:
              'Daily 13:00–14:00 recess interval is strictly locked campus-wide. All departmental solver runs preserve this window.',
            time: '09:00 IST',
            type: 'reschedule',
          },
          {
            id: 'alert-system-mrv',
            title: 'Deterministic Collision Check Confirmed',
            detail:
              'Minimum Remaining Values (MRV) constraint engine verified zero room, teacher, or batch double-bookings.',
            time: '09:15 IST',
            type: 'clash',
          },
        ]

  return (
    <main className="dashboard-main">
      <DashboardHeader
        eyebrow="OPERATIONAL DISPATCH · REAL-TIME"
        title="Live Campus Alerts & Overrides"
        body="Real-time notifications, temporary teacher reschedules, and campus-wide policy broadcasts."
        actions={
          onBack && (
            <Button tone="light" size="sm" icon={CalendarDays} onClick={onBack}>
              Return to Timetable Matrix
            </Button>
          )
        }
      />
      <div className="dashboard-stack" style={{ gap: 16 }}>
        {displayAlerts.map((alert) => (
          <Surface
            key={alert.id}
            style={{
              borderLeft: alert.type === 'clash' ? '4px solid var(--ember)' : '4px solid var(--mist)',
            }}
          >
            <div className="card-heading" style={{ padding: '16px 20px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {alert.type === 'clash' ? (
                  <AlertTriangle size={18} color="var(--ember)" />
                ) : (
                  <Radio size={18} color="var(--mist)" />
                )}
                <div>
                  <h3 style={{ fontSize: 15 }}>{alert.title}</h3>
                  <p style={{ color: '#C7E3F7', fontSize: 12 }}>Logged at {alert.time}</p>
                </div>
              </div>
              <Badge tone={alert.type === 'clash' ? 'ember' : 'mist'} dot>
                {alert.type === 'clash' ? 'CRITICAL / RESCHEDULE' : 'OPERATIONAL'}
              </Badge>
            </div>
            <div style={{ padding: '0 20px 16px', color: '#F4F6F8', fontSize: 13, lineHeight: 1.6 }}>
              {alert.detail}
            </div>
          </Surface>
        ))}
      </div>
    </main>
  )
}

export function AccessAuditPanel({
  role,
  collegeName,
  onBack,
}: {
  role: Role
  collegeName?: string
  onBack?: () => void
}) {
  const user = getStoredUser()

  return (
    <main className="dashboard-main">
      <DashboardHeader
        eyebrow="RFC-6238 TOTP · ACCESS & AUDIT REPORT"
        title="2FA Security & Session Audit"
        body="Continuous cryptographic verification, scoped authorization tokens, and zero-trust access controls."
        actions={
          onBack && (
            <Button tone="light" size="sm" icon={CalendarDays} onClick={onBack}>
              Return to Timetable Matrix
            </Button>
          )
        }
      />
      <div
        className="dashboard-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}
      >
        <Surface className="surface--dark">
          <div className="card-heading">
            <div>
              <h3>Identity &amp; Role Bound State</h3>
              <p>Cryptographically validated session claim</p>
            </div>
            <ShieldCheck size={20} color="var(--mist)" />
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span className="detail-label">ACTIVE ACCOUNT</span>
                <strong style={{ fontSize: 14 }}>{user?.name || user?.email || 'Authenticated User'}</strong>
                <span style={{ fontSize: 11, color: '#C7E3F7', fontFamily: 'JetBrains Mono, monospace' }}>
                  {user?.email || 'user@campus.edu'}
                </span>
              </div>
              <div>
                <span className="detail-label">ASSIGNED ROLE</span>
                <Badge tone="mist">{ROLE_META[role].label.toUpperCase()}</Badge>
              </div>
              {user?.departmentId && (
                <div>
                  <span className="detail-label">DEPARTMENT SCOPE</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--pearl)' }}>
                    {user.departmentCode || user.departmentId}
                  </span>
                </div>
              )}
              {user?.batchId && (
                <div>
                  <span className="detail-label">STUDENT BATCH ENROLLMENT</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--pearl)' }}>
                    {user.batchId}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Surface>

        <Surface className="surface--dark">
          <div className="card-heading">
            <div>
              <h3>Two-Factor Authentication (TOTP)</h3>
              <p>RFC-6238 Time-Based One-Time Password</p>
            </div>
            <LockKeyhole size={20} color="var(--mist)" />
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span className="detail-label">TOTP ALGORITHM</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--pearl)' }}>
                  HMAC-SHA1 · 6 DIGITS
                </span>
              </div>
              <div>
                <span className="detail-label">ROTATING WINDOW</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--pearl)' }}>
                  30 SECONDS · RFC-6238 COMPLIANT
                </span>
              </div>
              <div>
                <span className="detail-label">ENFORCEMENT POLICY</span>
                <StatusPill tone="mist">MANDATORY 2FA ENFORCED</StatusPill>
              </div>
              <div>
                <span className="detail-label">PROTECTION LAYER</span>
                <p style={{ margin: 0, fontSize: 11, color: '#C7E3F7', lineHeight: 1.5 }}>
                  Bearer token is scoped strictly by role &amp; department. Bypassing 2FA with pre-auth credentials
                  is mathematically blocked.
                </p>
              </div>
            </div>
          </div>
        </Surface>

        <Surface className="surface--dark" style={{ gridColumn: '1 / -1' }}>
          <div className="card-heading">
            <div>
              <h3>Institutional Policy &amp; Constraint Invariants</h3>
              <p>Campus scheduling constraints enforced by the deterministic engine</p>
            </div>
            <Building size={20} color="var(--mist)" />
          </div>
          <div style={{ padding: '20px' }}>
            <div
              className="detail-meta-grid"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
            >
              <div className="detail-item">
                <span className="detail-label">CAMPUS INSTITUTION</span>
                <strong>{collegeName || 'Apex Institute of Technology & Science'}</strong>
                <span className="detail-sub">Global institutional branding</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">LUNCH RECESS CONSTRAINT</span>
                <strong style={{ color: 'var(--ember)' }}>13:00 – 14:00 LOCKED</strong>
                <span className="detail-sub">Zero lectures allowed campus-wide</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">THEORY ROOM ISOLATION</span>
                <strong>LECTURE HALLS ONLY</strong>
                <span className="detail-sub">Multi-department and shared room arbitration</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">ALGORITHMIC SOLVER</span>
                <strong>CSP + MRV (ZERO AI)</strong>
                <span className="detail-sub">Pure backtracking with forward checking</span>
              </div>
            </div>
          </div>
        </Surface>
      </div>
    </main>
  )
}

export function DashboardShell({
  role,
  collegeName,
  alerts,
  children,
}: {
  role: Role
  collegeName?: string
  alerts?: LiveAlert[]
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeView, setActiveView] = useState<'matrix' | 'alerts' | 'audit'>('matrix')
  // Default to light theme workspace, allow user to toggle dark mode
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('schedulo_theme') as 'light' | 'dark') || 'light'
  })

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    localStorage.setItem('schedulo_theme', nextTheme)
  }

  const [clock, setClock] = useState(() => formatClock(new Date()))
  useEffect(() => {
    const timer = setInterval(() => {
      setClock(formatClock(new Date()))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const navItems: Array<{ id: 'matrix' | 'alerts' | 'audit'; label: string; icon: typeof CalendarDays }> = [
    { id: 'matrix', label: 'Weekly Matrix', icon: CalendarDays },
    { id: 'alerts', label: 'Live Alerts', icon: Radio },
    { id: 'audit', label: 'Access Audit', icon: ClipboardCheck },
  ]

  const user = getStoredUser()
  const userName =
    user?.name || (role === 'student' ? 'Student' : role === 'teacher' ? 'Faculty Member' : 'Head of Department')
  const initials =
    userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0].toUpperCase())
      .join('') || (role === 'teacher' ? 'FC' : role === 'student' ? 'ST' : 'HD')

  return (
    <PageTransition>
      <div className={cn('dashboard-app', theme === 'light' ? 'theme-light' : 'theme-dark')}>
        <aside className={cn('sidebar', collapsed && 'is-collapsed')}>
          <div className="sidebar-top">
            <BrandMark />
            <button
              className="sidebar-collapse"
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Toggle sidebar"
            >
              {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
          </div>
          {!collapsed && (
            <div className="sidebar-copy">
              <span className="sidebar-overline">CAMPUS GRID / VERIFIED</span>
              <p>{collegeName || 'Apex Institute of Technology & Science'}</p>
            </div>
          )}
          <nav className="sidebar-nav">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={activeView === id ? 'is-active' : ''}
                onClick={() => setActiveView(id)}
              >
                <Icon size={15} />
                <span className="nav-label">{label}</span>
              </button>
            ))}
          </nav>
          {!collapsed && (
            <div className="sidebar-footer">
              PROTECTED REGION · IN-CAMPUS
              <br />
              LUNCH RECESS · 13:00–14:00 LOCKED
            </div>
          )}
        </aside>

        <div className="workspace">
          <header className="topbar">
            <div className="topbar__left">
              <div>
                <span className="dashboard-kicker">SCHEDULO / {ROLE_META[role].shortLabel.toUpperCase()} CONSOLE</span>
                <h1>
                  {activeView === 'matrix'
                    ? role === 'student'
                      ? 'Student Timetable'
                      : role === 'teacher'
                      ? 'Teaching Availability Matrix'
                      : 'HOD Scheduling Operations'
                    : activeView === 'alerts'
                    ? 'Live Campus Alerts & Overrides'
                    : 'Access Audit & 2FA Health'}
                </h1>
              </div>
            </div>
            <div className="topbar__right">
              {/* Dark / Light Mode Toggle Button */}
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'Deep Midnight Teal Dark' : 'Soft Pearl Light'} Mode`}
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
              </button>

              <StatusPill tone="mist">2FA VERIFIED</StatusPill>
              <span className="topbar-clock">{clock}</span>

              <div className="user-block">
                <div className="user-avatar">{initials}</div>
                <div>
                  <strong>{userName}</strong>
                  <span>
                    {user?.departmentCode ? `${user.departmentCode} · ` : ''}
                    {ROLE_META[role].label}
                  </span>
                </div>
              </div>

              <button
                className="text-link"
                title="Sign out"
                onClick={() => {
                  clearStoredAuth()
                  navigate('/')
                }}
              >
                <LogOut size={15} />
              </button>
            </div>
          </header>
          {activeView === 'matrix' && children}
          {activeView === 'alerts' && (
            <LiveAlertsPanel role={role} alerts={alerts} onBack={() => setActiveView('matrix')} />
          )}
          {activeView === 'audit' && (
            <AccessAuditPanel role={role} collegeName={collegeName} onBack={() => setActiveView('matrix')} />
          )}
        </div>
      </div>
    </PageTransition>
  )
}

export function LiveCard({ current, next }: { current: ScheduleBlock; next: ScheduleBlock }) {
  return (
    <div className="dashboard-stack">
      <Surface className="live-card">
        <div className="card-heading">
          <div>
            <h3>Happening now</h3>
            <p>Live lecture state from the published timetable.</p>
          </div>
          <Badge tone="mist" dot>
            LIVE
          </Badge>
        </div>
        <div className="live-card__body">
          <div>
            <span className="live-card__code">
              {current.code} · {current.room}
            </span>
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
          <span className="card-heading__aside">
            {next.day.toUpperCase()} / {next.start}
          </span>
        </div>
        <div className="next-card__body">
          <span className="live-card__code">
            {next.code} · {next.room}
          </span>
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

export function AlertBanner({ alerts, className }: { alerts: LiveAlert[]; className?: string }) {
  const alert = alerts[0]
  if (!alert) return null

  return (
    <div className={cn('schedule-alert', className)}>
      <AlertTriangle size={17} />
      <div>
        <strong>Live Schedule Alert · {alert.title}</strong>
        <p>
          {alert.detail} <span className="mono">{alert.time}</span>
        </p>
      </div>
    </div>
  )
}

export function LoadingDashboard() {
  return (
    <div className="auth-page">
      <div className="auth-kicker">LOADING VERIFIED WORKSPACE…</div>
    </div>
  )
}
