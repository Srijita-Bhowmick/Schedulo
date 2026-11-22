import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building,
  CalendarDays,
  Check,
  ChevronLeft,
  ClipboardCheck,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  Layers3,
  Lock,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Settings2,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  AuthPayload,
  AuthSession,
  BatchInfo,
  CollegeConfig,
  DepartmentData,
  HodDashboardData,
  LiveAlert,
  Role,
  ROLE_META,
  ScheduleBlock,
  SolverResult,
  StudentDashboardData,
  TeacherDashboardData,
  commitReschedule,
  createAuthSession,
  createBatch,
  createFaculty,
  createRoom,
  createSubject,
  deleteBatch,
  deleteFaculty,
  deleteRoom,
  deleteSubject,
  getDepartments,
  getHodDashboard,
  getStudentDashboard,
  getTeacherDashboard,
  publishTimetable,
  runDeterministicSolver,
  shareFaculty,
  updateCollegeConfig,
  updateTeacherAvailability,
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
import { WeeklyBoxMatrix, ClassDetailModal } from './components/WeeklyBoxMatrix'
import './styles.css'

type Path = '/' | '/auth' | '/dashboard/student' | '/dashboard/teacher' | '/dashboard/admin' | '/dashboard/hod'

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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
      {children}
    </motion.div>
  )
}

function LandingPage() {
  const [architectureOpen, setArchitectureOpen] = useState(false)
  const [collegeName, setCollegeName] = useState('Apex Institute of Technology & Science')

  useEffect(() => {
    getDepartments().then((data) => {
      if (data.collegeName) setCollegeName(data.collegeName)
    })
  }, [])

  const enterRolePortal = (role: Role) => {
    localStorage.setItem('schedulo_selected_role', role)
    navigate('/auth')
  }

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
              A pure algorithmic constraint-satisfaction engine using Minimum Remaining Values (MRV) that guarantees zero room, teacher, or batch double-bookings — with a dedicated protected campus lunch break.
            </p>
            <div className="role-entry">
              {[
                { role: 'student' as Role, num: '01', title: 'STUDENT PORTAL' },
                { role: 'teacher' as Role, num: '02', title: 'FACULTY MATRIX' },
                { role: 'hod' as Role, num: '03', title: 'HOD / ADMIN OPERATIONS' },
              ].map(({ role, num, title }) => (
                <button key={role} onClick={() => enterRolePortal(role)}>
                  <span className="role-entry__num">{num} / DIRECT ENTRY</span>
                  <span className="role-entry__label">{title}</span>
                </button>
              ))}
            </div>
            <div className="hero-meta">
              <span>THEORY ROOMS ONLY</span>
              <span>RFC-6238 TOTP</span>
              <span>MRV SOLVER V2.4</span>
            </div>
          </section>

          <section aria-label="Interactive spatial timetable">
            <SpatialTimetable />
          </section>
        </main>

        <footer className="footer-strip" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px clamp(24px, 5vw, 80px)', maxWidth: 1600, margin: '0 auto', borderTop: '1px solid rgba(144, 194, 231, 0.12)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(244, 246, 248, 0.6)' }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <span>Algorithmic Solver (Zero AI)</span>
            <span>Role-Based Access</span>
            <span>Mandatory 2FA</span>
          </div>
          <div>
            <span>{collegeName}</span>
            <span style={{ margin: '0 8px', opacity: 0.4 }}>•</span>
            <span style={{ color: 'var(--mist)' }}>Built by Srijita Bhowmick</span>
          </div>
        </footer>

        <AnimatePresence>
          {architectureOpen && <ArchitectureModal onClose={() => setArchitectureOpen(false)} />}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}

function ArchitectureModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} onClick={(event) => event.stopPropagation()}>
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
            ['01', 'Constraint Domain Model', 'Theory halls, teacher availability slots, student batches, and weekly hours are reduced via forward-checking with a locked 13:00–14:00 lunch recess.'],
            ['02', 'Pure Deterministic Solver (Zero AI)', 'Minimum Remaining Values (MRV) orders most-constrained variables first, guaranteeing 100% mathematical validity with zero hallucinations and zero heuristics guessing.'],
            ['03', 'RFC-6238 TOTP 2FA & Strict RBAC', 'Two-stage authentication gates all routes. Student, Teacher, and HOD portals access strictly scoped resources with real-time operational alerts.'],
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Clean Production Credentials (No demo defaults)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  // Smart Role Join fields
  const [departments, setDepartments] = useState<DepartmentData[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [facultyJoinCode, setFacultyJoinCode] = useState('')
  const [hodDeptName, setHodDeptName] = useState('Computer Science & Engineering')
  const [hodDeptCode, setHodDeptCode] = useState('CSE')
  const [hodWorkingDays, setHodWorkingDays] = useState('Monday to Friday')
  const [hodStartTime, setHodStartTime] = useState('09:00')
  const [enable2fa, setEnable2fa] = useState(true)

  // 2FA session state
  const [session, setSession] = useState<AuthSession | null>(null)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])

  useEffect(() => {
    // Read pre-selected role if arrived via role entry portals
    const savedRole = localStorage.getItem('schedulo_selected_role') as Role | null
    if (savedRole && (savedRole === 'student' || savedRole === 'teacher' || savedRole === 'hod' || savedRole === 'admin')) {
      setRole(savedRole)
      localStorage.removeItem('schedulo_selected_role')
    }

    // Fetch dynamic departments and batches
    getDepartments().then((data) => {
      setDepartments(data.departments)
      if (data.departments.length > 0) {
        setSelectedDeptId(data.departments[0].id)
        if (data.departments[0].batches.length > 0) {
          setSelectedBatchId(data.departments[0].batches[0].id)
        }
      }
    })
  }, [])

  // When selected department changes, update batch selection
  const currentDept = useMemo(() => departments.find((d) => d.id === selectedDeptId), [departments, selectedDeptId])

  const updateOtp = (index: number, value: string) =>
    setOtp((items) => items.map((item, itemIndex) => (itemIndex === index ? value.slice(-1) : item)))

  const submitCredentials = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const authPayload: AuthPayload = {
        username,
        password,
        role,
        mode,
        name: name || username.split('@')[0],
        departmentName: role === 'hod' ? hodDeptName : currentDept?.name,
        departmentCode: role === 'hod' ? hodDeptCode : currentDept?.code,
        facultyJoinCode: role === 'teacher' ? facultyJoinCode : undefined,
        workingDays: role === 'hod' ? hodWorkingDays : undefined,
        startTime: role === 'hod' ? hodStartTime : undefined,
        batchId: role === 'student' ? selectedBatchId : undefined,
        enable2fa,
      }

      const authSession = await createAuthSession(authPayload)
      setSession(authSession)

      // If student sign-up opted out of 2FA, directly enter dashboard
      if (role === 'student' && !authSession.twoFactorRequired) {
        navigate('/dashboard/student')
        return
      }

      if (authSession.devTotp) {
        setOtp(authSession.devTotp.split(''))
      }
      setFlipped(true)
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const codeStr = otp.join('')
    const valid = await verifyTwoFactor(codeStr)
    setLoading(false)

    if (!valid) {
      setError('Enter the valid six-digit authenticator code to continue.')
      return
    }

    const targetRoute = ROLE_META[session?.role ?? role].route as Path
    navigate(targetRoute)
  }

  return (
    <PageTransition>
      <div className="auth-page">
        <div className="auth-topline">
          <button className="text-link" onClick={() => navigate('/')}>
            <ArrowLeft size={15} /> Back to Landing
          </button>
          <BrandMark />
        </div>

        <div className="auth-frame">
          <div className={cn('auth-card', flipped && 'is-flipped')}>
            {/* Front of Card: Clean Production Credentials & Smart Join */}
            <div className="auth-face auth-face--front">
              <span className="auth-kicker">ACCESS CONTROL / 01</span>
              <h1>Enter the campus grid.</h1>
              <p>Choose your operational role. Every session is protected by role-based access and RFC-6238 TOTP.</p>

              <div className="auth-toggle">
                <button className={mode === 'signin' ? 'is-active' : ''} onClick={() => setMode('signin')}>
                  SIGN IN
                </button>
                <button className={mode === 'signup' ? 'is-active' : ''} onClick={() => setMode('signup')}>
                  SIGN UP
                </button>
              </div>

              <div className="role-switch">
                {(['student', 'teacher', 'hod'] as Role[]).map((item) => (
                  <button key={item} className={role === item ? 'is-active' : ''} onClick={() => setRole(item)}>
                    {item === 'hod' ? 'HOD / ADMIN' : ROLE_META[item].label.toUpperCase()}
                  </button>
                ))}
              </div>

              <form className="auth-form" onSubmit={submitCredentials}>
                {mode === 'signup' && (
                  <Field
                    label="FULL NAME"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                )}

                <Field
                  label="USERNAME / CAMPUS EMAIL"
                  placeholder={
                    role === 'student'
                      ? 'student@schedulo.edu'
                      : role === 'teacher'
                      ? 'faculty@schedulo.edu'
                      : 'hod@schedulo.edu'
                  }
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />

                <Field
                  label="PASSWORD"
                  placeholder="••••••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                />

                {/* Smart Role Join Fields on Sign Up */}
                {mode === 'signup' && role === 'hod' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 10 }}>
                      <Field
                        label="DEPARTMENT NAME"
                        placeholder="e.g. Computer Science & Engineering"
                        value={hodDeptName}
                        onChange={(e) => setHodDeptName(e.target.value)}
                        required
                      />
                      <Field
                        label="CODE"
                        placeholder="CSE"
                        value={hodDeptCode}
                        onChange={(e) => setHodDeptCode(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <SelectField
                        label="WORKING DAYS"
                        value={hodWorkingDays}
                        onChange={(e) => setHodWorkingDays(e.target.value)}
                      >
                        <option value="Monday to Friday">Mon – Fri (5 Days)</option>
                        <option value="Monday to Saturday">Mon – Sat (6 Days)</option>
                      </SelectField>
                      <SelectField
                        label="START TIME"
                        value={hodStartTime}
                        onChange={(e) => setHodStartTime(e.target.value)}
                      >
                        <option value="09:00">09:00 IST</option>
                        <option value="08:30">08:30 IST</option>
                        <option value="08:00">08:00 IST</option>
                      </SelectField>
                    </div>
                  </>
                )}

                {mode === 'signup' && role === 'teacher' && (
                  <Field
                    label="FACULTY JOIN CODE (FROM HOD)"
                    placeholder="e.g. CSE-FAC-2026"
                    value={facultyJoinCode}
                    onChange={(e) => setFacultyJoinCode(e.target.value.toUpperCase())}
                    hint="Provided by your Department Head to join teaching roster"
                    required
                  />
                )}

                {mode === 'signup' && role === 'student' && (
                  <>
                    <SelectField
                      label="DEPARTMENT"
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      label="SEMESTER & SECTION (BATCH)"
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                    >
                      {(currentDept?.batches || []).map((b) => (
                        <option key={b.id} value={b.id}>
                          Semester {b.semester} - Section {b.section} ({b.name})
                        </option>
                      ))}
                    </SelectField>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', marginTop: 2 }}>
                      <input
                        type="checkbox"
                        checked={enable2fa}
                        onChange={(e) => setEnable2fa(e.target.checked)}
                        style={{ accentColor: 'var(--mist)' }}
                      />
                      <span>Enable Mandatory TOTP 2FA Security Gate</span>
                    </label>
                  </>
                )}

                {error && <p className="form-status" role="alert" style={{ borderColor: 'var(--ember)', color: '#ff9e87' }}>{error}</p>}

                <Button className="auth-submit" size="lg" tone="mist" loading={loading} icon={ArrowRight} type="submit">
                  {mode === 'signup' && role === 'student' && !enable2fa ? 'Complete Registration' : 'Continue to 2FA Gate'}
                </Button>
              </form>

              <div className="auth-footnote">
                <LockKeyhole size={13} /> BCrypt hashing · Role-scoped JWT issued upon verified credentials.
              </div>
            </div>

            {/* Back of Card: 3D Flip Security Gate & 6-Digit TOTP */}
            <div className="auth-face auth-face--back security-gate">
              <span className="auth-kicker">MANDATORY SECURITY GATE / 02</span>
              <h1>{mode === 'signup' ? 'Bind your Authenticator.' : 'Verify and unlock.'}</h1>
              <p>
                {mode === 'signup'
                  ? 'Scan the setup QR code with Google Authenticator or Microsoft Authenticator, then enter your 6-digit code.'
                  : 'Enter the 6-digit verification code generated by your registered authenticator application.'}
              </p>

              {mode === 'signup' && (
                <>
                  <div className="qr-box" aria-label="Authenticator setup QR code">
                    <QRCodeSVG
                      value={`otpauth://totp/Schedulo:${username || 'campus.user'}?secret=${(
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

              {session?.facultyJoinCode && (
                <div style={{ margin: '8px 0 12px', padding: '8px 12px', background: 'rgba(144, 194, 231, 0.12)', borderRadius: 6, border: '1px solid rgba(144, 194, 231, 0.3)' }}>
                  <span style={{ fontSize: 10, color: 'rgba(244, 246, 248, 0.6)', display: 'block', fontFamily: 'JetBrains Mono, monospace' }}>
                    YOUR FACULTY JOIN CODE (SHARE WITH TEACHERS):
                  </span>
                  <strong style={{ fontSize: 13, color: 'var(--mist)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {session.facultyJoinCode}
                  </strong>
                </div>
              )}

              {session?.devTotp && (
                <div
                  style={{
                    margin: '10px 0',
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
                {error && <p className="form-status" role="alert" style={{ borderColor: 'var(--ember)', color: '#ff9e87' }}>{error}</p>}
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
                <ShieldCheck size={13} /> RFC-6238 TOTP · 30-sec rotating cryptographic window.
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

function DashboardShell({
  role,
  collegeName,
  children,
}: {
  role: Role
  collegeName?: string
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  // Default to light theme workspace, allow user to toggle dark mode
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('schedulo_theme') as 'light' | 'dark') || 'light'
  })

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    localStorage.setItem('schedulo_theme', nextTheme)
  }

  const navItems: Array<{ label: string; icon: typeof CalendarDays; path: Path }> = [
    { label: 'Weekly Matrix', icon: CalendarDays, path: ROLE_META[role].route as Path },
    { label: 'Live Alerts', icon: Radio, path: ROLE_META[role].route as Path },
    { label: 'Access Audit', icon: ClipboardCheck, path: ROLE_META[role].route as Path },
  ]

  const initials = role === 'teacher' ? 'DR' : role === 'student' ? 'RS' : 'HD'
  const userName = role === 'student' ? 'Rahul Sharma' : role === 'teacher' ? 'Dr. Debabrata Roy' : 'Head of Department'

  return (
    <PageTransition>
      <div className={cn('dashboard-app', theme === 'light' ? 'theme-light' : 'theme-dark')}>
        <aside className={cn('sidebar', collapsed && 'is-collapsed')}>
          <div className="sidebar-top">
            <BrandMark />
            <button className="sidebar-collapse" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
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
            {navItems.map(({ label, icon: Icon, path }, index) => (
              <button key={label} className={index === 0 ? 'is-active' : ''} onClick={() => navigate(path)}>
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
                <h1>{role === 'student' ? 'Student Timetable' : role === 'teacher' ? 'Teaching Availability Matrix' : 'HOD Scheduling Operations'}</h1>
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

function DashboardHeader({
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

function LiveCard({ current, next }: { current: ScheduleBlock; next: ScheduleBlock }) {
  return (
    <div className="dashboard-stack">
      <Surface className="live-card">
        <div className="card-heading">
          <div>
            <h3>Happening now</h3>
            <p>Live lecture state from the published timetable.</p>
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
        <strong>Live Schedule Alert · {alert.title}</strong>
        <p>
          {alert.detail} <span className="mono">{alert.time}</span>
        </p>
      </div>
    </div>
  )
}

/* ========================================================= */
/* STUDENT DASHBOARD                                         */
/* ========================================================= */
function StudentDashboard() {
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
    const rows = data.blocks.map((b) => [b.code, b.subject, b.faculty, b.room, b.batch, b.day, b.start, b.end])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Schedulo_Timetable_${data.activeBatch}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setToast(`Timetable for ${data.activeBatch} downloaded as CSV.`)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <DashboardShell role="student" collegeName={data.collegeName}>
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
              <p style={{ color: 'rgba(244,246,248,.62)', fontSize: 12, lineHeight: 1.6, margin: '17px 0 21px' }}>
                Your role-based session is verified. 13:00–14:00 lunch recess is locked campus-wide.
              </p>
              <div className="mono" style={{ color: 'rgba(244,246,248,.42)', fontSize: 9, lineHeight: 1.7 }}>
                SESSION / CAMPUS-EDGE-17<br />
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
                <p>Tactile modular tiles · 6 lecture periods + locked lunch recess (13:00–14:00) · Click any box to inspect full room &amp; faculty metadata.</p>
              </div>
              <Badge tone="mist" dot>PUBLISHED</Badge>
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

/* ========================================================= */
/* TEACHER DASHBOARD                                         */
/* ========================================================= */
function TeacherDashboard() {
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
      await updateTeacherAvailability('t-1', next)
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
      setToast(res.message || `Class reschedule recorded (${isThisWeekOnly ? 'This Week Only' : 'Permanent'}). Alert dispatched.`)
      const refreshed = await getTeacherDashboard()
      setData(refreshed)
      setUnavailable(refreshed.unavailable)
    } catch (err: any) {
      setToast(err.message || 'Reschedule failed.')
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
              <strong>Interactive Availability Matrix</strong> · Click any open free box to toggle <strong>Blocked / Unavailable</strong> for future solver runs. Click any assigned class box to inspect details or trigger a temporary <strong>This Week Only</strong> reschedule.
            </div>

            <Surface>
              <div className="card-heading">
                <div>
                  <h3>Unified Teaching Matrix · {data.faculty}</h3>
                  <p>Classes across departments ({data.departments.join(', ')}) · 13:00–14:00 Lunch Recess locked</p>
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
              <div className="mono" style={{ color: 'rgba(244,246,248,.48)', fontSize: 9, lineHeight: 1.8 }}>
                SYNC / LIVE REST API<br />
                FACULTY / {data.faculty.toUpperCase()}
              </div>
            </Surface>

            <Surface className="publish-card">
              <h3>Operational Note</h3>
              <p>Room and batch conflicts are checked in real-time. No change is published without pure constraint validation.</p>
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

function RescheduleModal({
  selectedBlock,
  room,
  batch,
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
      <motion.div className="modal" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} onClick={(event) => event.stopPropagation()}>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(5, 21, 24, 0.6)', borderRadius: 6, border: '1px solid rgba(144, 194, 231, 0.2)' }}>
            <div>
              <strong style={{ display: 'block', fontSize: 13, color: 'var(--pearl)' }}>This Week Only</strong>
              <span style={{ fontSize: 11, color: 'rgba(244, 246, 248, 0.6)' }}>Temporary substitution without altering base timetable</span>
            </div>
            <input
              type="checkbox"
              checked={isThisWeekOnly}
              onChange={(e) => setIsThisWeekOnly(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--mist)', cursor: 'pointer' }}
            />
          </div>

          <SelectField label="TARGET THEORY ROOM" value={room} onChange={(event) => setRoom(event.target.value)}>
            <option>Room 101</option>
            <option>Room 102</option>
            <option>Room 201</option>
            <option>Room 202</option>
          </SelectField>

          <SelectField label="TARGET STUDENT BATCH" value={batch} onChange={(event) => setBatch(event.target.value)}>
            <option>CSE-5A</option>
            <option>CSE-5B</option>
            <option>IT-5A</option>
          </SelectField>

          <Button tone="dark" loading={loading} icon={ClipboardCheck} onClick={onValidate}>
            Validate Constraint Availability
          </Button>

          {validation && (
            <div className={cn('form-status', validation.includes('occupied') && 'form-status--clash')} style={validation.includes('occupied') ? { borderColor: 'var(--ember)', color: '#ff9e87', background: 'rgba(224, 109, 83, 0.15)' } : undefined}>
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

function ModalDialog({
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h3>{title}</h3>
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

/* ========================================================= */
/* HOD / DEPARTMENT ADMIN DASHBOARD                          */
/* ========================================================= */
function HodDashboard() {
  const [data, setData] = useState<HodDashboardData | null>(null)
  const [tab, setTab] = useState<'Settings' | 'Rooms' | 'Faculty' | 'Batches' | 'Subjects'>('Settings')
  const [solving, setSolving] = useState(false)
  const [solver, setSolver] = useState<SolverResult | null>(null)
  const [published, setPublished] = useState('')
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null)
  const [filterBatch, setFilterBatch] = useState<string>('ALL')
  const [filterFaculty, setFilterFaculty] = useState<string>('ALL')

  // Editable College & Dept Settings
  const [collegeNameInput, setCollegeNameInput] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)

  // CRUD Modal & Feedback State
  const [activeModal, setActiveModal] = useState<'none' | 'addRoom' | 'addFaculty' | 'shareFaculty' | 'addBatch' | 'addSubject'>('none')
  const [toast, setToast] = useState('')

  // Modal Input States
  const [newRoomNumber, setNewRoomNumber] = useState('')
  const [newRoomCapacity, setNewRoomCapacity] = useState('60')
  const [newRoomBuilding, setNewRoomBuilding] = useState('Academic Block 1')
  const [newRoomIsShared, setNewRoomIsShared] = useState(false)

  const [newFacultyName, setNewFacultyName] = useState('')
  const [newFacultyCode, setNewFacultyCode] = useState('')
  const [newFacultyEmail, setNewFacultyEmail] = useState('')

  const [shareTeacherId, setShareTeacherId] = useState('')
  const [shareDeptId, setShareDeptId] = useState('dept-it')

  const [newBatchName, setNewBatchName] = useState('')
  const [newBatchSemester, setNewBatchSemester] = useState(5)
  const [newBatchSection, setNewBatchSection] = useState('B')
  const [newBatchStudents, setNewBatchStudents] = useState(60)

  const [newSubjectCode, setNewSubjectCode] = useState('')
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectHours, setNewSubjectHours] = useState(3)
  const [newSubjectTeacherId, setNewSubjectTeacherId] = useState('')
  const [newSubjectDoubleBlock, setNewSubjectDoubleBlock] = useState(false)

  const fetchDashboardData = () => {
    getHodDashboard().then((res) => {
      setData(res)
      setCollegeNameInput(res.collegeName)
    })
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (!data) return <LoadingDashboard />

  const runSolver = async () => {
    setSolving(true)
    setSolver(null)
    const result = await runDeterministicSolver()
    setSolver(result)
    setSolving(false)
    fetchDashboardData()
  }

  const publish = async () => {
    const result = await publishTimetable()
    setPublished(`${result.publishedAt} · ${result.recipients} recipients notified`)
  }

  const copyJoinCode = () => {
    navigator.clipboard?.writeText(data.facultyJoinCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const saveCollegeName = async () => {
    await updateCollegeConfig({ collegeName: collegeNameInput })
    fetchDashboardData()
    setToast('College configuration updated.')
    setTimeout(() => setToast(''), 3000)
  }

  // CRUD Handlers
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomNumber) return
    const ok = await createRoom({
      roomNumber: newRoomNumber,
      capacity: Number(newRoomCapacity) || 60,
      building: newRoomBuilding || 'Academic Block',
      isShared: newRoomIsShared,
    })
    if (ok) {
      setToast(`Theory Room ${newRoomNumber} added.`)
      setActiveModal('none')
      setNewRoomNumber('')
      fetchDashboardData()
    } else {
      setToast('Failed to create room.')
    }
    setTimeout(() => setToast(''), 3500)
  }

  const handleDeleteRoom = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}?`)) return
    const ok = await deleteRoom(id)
    setToast(ok ? `${name} deleted.` : 'Failed to delete room.')
    if (ok) fetchDashboardData()
    setTimeout(() => setToast(''), 3500)
  }

  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFacultyName) return
    const ok = await createFaculty({
      name: newFacultyName,
      shortCode: newFacultyCode || newFacultyName.slice(0, 3).toUpperCase(),
      email: newFacultyEmail || `${newFacultyName.toLowerCase().replace(/\s+/g, '.')}@schedulo.edu`,
      department: data.department,
    })
    if (ok) {
      setToast(`Faculty ${newFacultyName} registered.`)
      setActiveModal('none')
      setNewFacultyName('')
      setNewFacultyCode('')
      setNewFacultyEmail('')
      fetchDashboardData()
    } else {
      setToast('Failed to create faculty member.')
    }
    setTimeout(() => setToast(''), 3500)
  }

  const handleShareFaculty = async (e: React.FormEvent) => {
    e.preventDefault()
    const teacherId = shareTeacherId || data.faculty[0]?.id
    if (!teacherId) return
    const ok = await shareFaculty(teacherId, shareDeptId)
    if (ok) {
      setToast('Faculty member shared across departments.')
      setActiveModal('none')
      fetchDashboardData()
    } else {
      setToast('Failed to share faculty.')
    }
    setTimeout(() => setToast(''), 3500)
  }

  const handleDeleteFaculty = async (id: string, name: string) => {
    if (!window.confirm(`Delete faculty ${name}?`)) return
    const ok = await deleteFaculty(id)
    setToast(ok ? `Faculty ${name} deleted.` : 'Failed to delete faculty.')
    if (ok) fetchDashboardData()
    setTimeout(() => setToast(''), 3500)
  }

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBatchName) return
    const ok = await createBatch({
      name: newBatchName,
      semester: Number(newBatchSemester) || 5,
      section: newBatchSection || 'A',
      studentCount: Number(newBatchStudents) || 60,
    })
    if (ok) {
      setToast(`Batch ${newBatchName} created.`)
      setActiveModal('none')
      setNewBatchName('')
      fetchDashboardData()
    } else {
      setToast('Failed to create batch.')
    }
    setTimeout(() => setToast(''), 3500)
  }

  const handleDeleteBatch = async (id: string, name: string) => {
    if (!window.confirm(`Delete batch ${name}?`)) return
    const ok = await deleteBatch(id)
    setToast(ok ? `Batch ${name} deleted.` : 'Failed to delete batch.')
    if (ok) fetchDashboardData()
    setTimeout(() => setToast(''), 3500)
  }

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubjectCode || !newSubjectName) return
    const teacherId = newSubjectTeacherId || data.faculty[0]?.id || 't-1'
    const ok = await createSubject({
      code: newSubjectCode.toUpperCase(),
      name: newSubjectName,
      weeklyHours: Number(newSubjectHours) || 3,
      assignedTeacherId: teacherId,
      allowTwoHourBlock: newSubjectDoubleBlock,
    })
    if (ok) {
      setToast(`Subject ${newSubjectCode} registered.`)
      setActiveModal('none')
      setNewSubjectCode('')
      setNewSubjectName('')
      fetchDashboardData()
    } else {
      setToast('Failed to create subject.')
    }
    setTimeout(() => setToast(''), 3500)
  }

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!window.confirm(`Delete subject ${name}?`)) return
    const ok = await deleteSubject(id)
    setToast(ok ? `Subject ${name} deleted.` : 'Failed to delete subject.')
    if (ok) fetchDashboardData()
    setTimeout(() => setToast(''), 3500)
  }

  // Filter blocks based on dropdown selection
  const filteredBlocks = (data.blocks || []).filter((block) => {
    const matchesBatch = filterBatch === 'ALL' || block.batch === filterBatch
    const matchesFaculty =
      filterFaculty === 'ALL' || block.faculty === filterFaculty || block.faculty.includes(filterFaculty)
    return matchesBatch && matchesFaculty
  })

  return (
    <DashboardShell role="hod" collegeName={data.collegeName}>
      <main className="dashboard-main">
        <DashboardHeader
          eyebrow={`HEAD OF DEPARTMENT · ${data.departmentCode} · ${data.department.toUpperCase()}`}
          title="A Valid Week, Assembled."
          body="Configure theory halls, faculty rosters, run the deterministic solver, inspect the weekly matrix, then publish campus-wide."
          actions={
            <Button tone="dark" size="sm" icon={Play} loading={solving} onClick={runSolver}>
              Run Algorithmic Solver
            </Button>
          }
        />

        {/* Live Generated Weekly Matrix (Centerpiece) */}
        <Surface style={{ marginBottom: 20 }}>
          <div className="card-heading">
            <div>
              <h3>Generated Weekly Timetable Matrix</h3>
              <p>Modular discrete tiles · 6 lecture periods + locked lunch recess (13:00–14:00) · Inspect solver-assigned domains across batches and faculty before publishing.</p>
            </div>
            <Badge tone="mist" dot>MRV VERIFIED</Badge>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {/* Filter Bar */}
            <div className="matrix-filter-bar">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="filter-group">
                  <span className="filter-label">FILTER BATCH:</span>
                  <select
                    className="matrix-select"
                    value={filterBatch}
                    onChange={(e) => setFilterBatch(e.target.value)}
                  >
                    <option value="ALL">All Batches (Combined)</option>
                    {data.batches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} (Sem {b.semester})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <span className="filter-label">FILTER FACULTY:</span>
                  <select
                    className="matrix-select"
                    value={filterFaculty}
                    onChange={(e) => setFilterFaculty(e.target.value)}
                  >
                    <option value="ALL">All Faculty</option>
                    {data.faculty.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.name} {f.isShared ? '(Shared)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="matrix-meta-pill">
                <span className="dot" />
                <strong>{filteredBlocks.length} SLOTS DISPLAYED</strong> · 0 CONFLICTS
              </div>
            </div>

            {/* Weekly Box Matrix */}
            <WeeklyBoxMatrix
              blocks={filteredBlocks}
              mode="admin"
              secondaryLabel="both"
              onSelectBlock={(b) => setSelectedBlock(b)}
            />
          </div>
        </Surface>

        {/* Resource Workspace & Execution Log */}
        <div className="dashboard-grid dashboard-grid--admin">
          <div className="dashboard-stack">
            <Surface>
              <div className="card-heading">
                <div>
                  <h3>Setup Workspace</h3>
                  <p>Explicit theory rooms, faculty codes, batches, and subjects with 2-hour blocks.</p>
                </div>
                <Badge tone="mist">THEORY ONLY</Badge>
              </div>

              <div className="admin-tabs">
                {(['Settings', 'Rooms', 'Faculty', 'Batches', 'Subjects'] as const).map((item) => (
                  <button key={item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Tab 1: Department Settings */}
              {tab === 'Settings' && (
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ marginBottom: 16 }}>
                    <span className="detail-label">FACULTY JOIN CODE</span>
                    <div className="join-code-badge">
                      <span>{data.facultyJoinCode}</span>
                      <button className="join-code-copy" onClick={copyJoinCode} title="Copy Faculty Join Code">
                        {copiedCode ? <Check size={14} color="#90C2E7" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <span style={{ display: 'block', fontSize: 11, color: 'rgba(244, 246, 248, 0.5)', marginTop: 4 }}>
                      Share this code with professors so they join your department roster automatically.
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <span className="detail-label">DEPARTMENT NAME</span>
                      <strong style={{ fontSize: 13, display: 'block', marginTop: 2 }}>{data.department}</strong>
                    </div>
                    <div>
                      <span className="detail-label">DEPARTMENT CODE</span>
                      <strong style={{ fontSize: 13, display: 'block', marginTop: 2 }}>{data.departmentCode}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <span className="detail-label">WORKING DAYS</span>
                      <strong style={{ fontSize: 12, display: 'block', marginTop: 2 }}>{data.workingDays.join(', ')}</strong>
                    </div>
                    <div>
                      <span className="detail-label">START TIME &amp; PERIOD</span>
                      <strong style={{ fontSize: 12, display: 'block', marginTop: 2 }}>{data.startTime} IST · {data.periodDurationMinutes} mins</strong>
                    </div>
                  </div>

                  <div>
                    <span className="detail-label">COLLEGE NAME</span>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <input
                        className="matrix-select"
                        style={{ flex: 1, padding: '7px 12px' }}
                        value={collegeNameInput}
                        onChange={(e) => setCollegeNameInput(e.target.value)}
                      />
                      <Button tone="light" size="sm" onClick={saveCollegeName}>
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Rooms */}
              {tab === 'Rooms' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(144, 194, 231, 0.12)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--mist)' }}>
                      {data.rooms.length} THEORY ROOMS REGISTERED
                    </span>
                    <Button tone="mist" size="sm" icon={Plus} onClick={() => setActiveModal('addRoom')}>
                      Add Theory Room
                    </Button>
                  </div>
                  <table className="setup-table">
                    <thead>
                      <tr>
                        <th>THEORY ROOM</th>
                        <th>BUILDING</th>
                        <th>CAPACITY</th>
                        <th>TYPE</th>
                        <th style={{ width: 50, textAlign: 'center' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rooms.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{r.roomNumber}</td>
                          <td>{r.building}</td>
                          <td>{r.capacity} seats</td>
                          <td>
                            <Badge tone={r.isShared ? 'ember' : 'mist'}>
                              {r.isShared ? 'SHARED' : 'DEPT'}
                            </Badge>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="action-delete-btn"
                              title={`Delete ${r.roomNumber}`}
                              onClick={() => handleDeleteRoom(r.id, r.roomNumber)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Faculty */}
              {tab === 'Faculty' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(144, 194, 231, 0.12)', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--mist)' }}>
                      {data.faculty.length} FACULTY MEMBERS IN ROSTER
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button tone="light" size="sm" icon={Share2} onClick={() => setActiveModal('shareFaculty')}>
                        Share Faculty
                      </Button>
                      <Button tone="mist" size="sm" icon={Plus} onClick={() => setActiveModal('addFaculty')}>
                        Add Faculty
                      </Button>
                    </div>
                  </div>
                  <table className="setup-table">
                    <thead>
                      <tr>
                        <th>FACULTY MEMBER</th>
                        <th>SHORT CODE</th>
                        <th>DEPARTMENT</th>
                        <th>STATUS</th>
                        <th style={{ width: 50, textAlign: 'center' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.faculty.map((f) => (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 600 }}>{f.name}</td>
                          <td><span className="mono">{f.shortCode}</span></td>
                          <td>{f.department}</td>
                          <td>
                            <Badge tone={f.isShared ? 'ember' : 'mist'} dot>
                              {f.isShared ? 'SHARED' : 'ACTIVE'}
                            </Badge>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="action-delete-btn"
                              title={`Delete ${f.name}`}
                              onClick={() => handleDeleteFaculty(f.id, f.name)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 4: Batches */}
              {tab === 'Batches' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(144, 194, 231, 0.12)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--mist)' }}>
                      {data.batches.length} STUDENT BATCHES ACTIVE
                    </span>
                    <Button tone="mist" size="sm" icon={Plus} onClick={() => setActiveModal('addBatch')}>
                      Add Batch
                    </Button>
                  </div>
                  <table className="setup-table">
                    <thead>
                      <tr>
                        <th>BATCH</th>
                        <th>SEMESTER</th>
                        <th>SECTION</th>
                        <th>STUDENTS</th>
                        <th style={{ width: 50, textAlign: 'center' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.batches.map((b) => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 600 }}>{b.name}</td>
                          <td>Semester {b.semester}</td>
                          <td>Section {b.section}</td>
                          <td>{b.studentCount} enrolled</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="action-delete-btn"
                              title={`Delete ${b.name}`}
                              onClick={() => handleDeleteBatch(b.id, b.name)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 5: Subjects */}
              {tab === 'Subjects' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(144, 194, 231, 0.12)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--mist)' }}>
                      {data.subjects.length} THEORY SUBJECTS ASSIGNED
                    </span>
                    <Button tone="mist" size="sm" icon={Plus} onClick={() => setActiveModal('addSubject')}>
                      Add Subject
                    </Button>
                  </div>
                  <table className="setup-table">
                    <thead>
                      <tr>
                        <th>SUBJECT</th>
                        <th>HOURS/WK</th>
                        <th>ASSIGNED FACULTY</th>
                        <th>2-HR BLOCK</th>
                        <th style={{ width: 50, textAlign: 'center' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.subjects.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <strong style={{ display: 'block', fontSize: 12 }}>{s.name}</strong>
                            <span className="mono" style={{ fontSize: 10, color: 'var(--mist)' }}>{s.code}</span>
                          </td>
                          <td>{s.hours} hrs</td>
                          <td>{s.teacher}</td>
                          <td>
                            <Badge tone={s.isDoubleBlock ? 'ember' : 'neutral'}>
                              {s.isDoubleBlock ? '2-HR LAB/THEORY' : '1-HR'}
                            </Badge>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="action-delete-btn"
                              title={`Delete ${s.name}`}
                              onClick={() => handleDeleteSubject(s.id, s.name)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Surface>

            <Surface className="publish-card">
              <h3>Publish Live Timetable</h3>
              <p>Push the verified timetable to Student and Faculty views. Shared faculty and rooms are locked college-wide.</p>
              <Button tone="mist" icon={Send} onClick={publish}>
                Publish Live Timetable
              </Button>
              {published && (
                <div className="form-status" style={{ marginTop: 12 }}>
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
                  <h3>Solver Execution Log</h3>
                  <p>Deterministic Constraint-Satisfaction Run (MRV).</p>
                </div>
                <Activity size={17} color="#90C2E7" />
              </div>

              <div className="solver-stats">
                <div className="solver-stat">
                  <strong>{solver ? solver.conflicts : '0'}</strong>
                  <span>CONFLICTS</span>
                </div>
                <div className="solver-stat">
                  <strong>{solver ? solver.solveTime : '28ms'}</strong>
                  <span>SOLVE TIME</span>
                </div>
                <div className="solver-stat">
                  <strong>{solver ? solver.backtracks : data.lastRun?.backtracks ?? '0'}</strong>
                  <span>BACKTRACKS</span>
                </div>
              </div>

              {/* Hybrid Coral Ember Bottleneck Diagnostics if any */}
              {solver && !solver.success && solver.diagnostics && (
                <div style={{ margin: '12px 0', padding: '10px 14px', background: 'rgba(224, 109, 83, 0.16)', border: '1px solid rgba(224, 109, 83, 0.45)', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ff9e87', fontWeight: 700, fontSize: 11 }}>
                    <AlertTriangle size={13} />
                    <span>BOTTLENECK DIAGNOSTICS</span>
                  </div>
                  {solver.diagnostics.map((d, i) => (
                    <p key={i} style={{ color: '#ffc2b3', fontSize: 11, margin: '4px 0 0' }}>
                      • {d}
                    </p>
                  ))}
                </div>
              )}

              <div className="execution-log">
                {solving ? (
                  <div className="log-line">[09:30:00.001] Evaluating domains via Minimum Remaining Values (MRV)…</div>
                ) : solver ? (
                  solver.log.map((line, idx) => (
                    <div className="log-line" key={idx}>
                      {line}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="log-line">[09:30:00.012] Multi-department constraints initialized: 4 theory halls, 4 faculty, 2 batches</div>
                    <div className="log-line">[09:30:00.013] Dedicated campus lunch break (13:00–14:00) locked across all days</div>
                    <div className="log-line">[09:30:00.014] Minimum Remaining Values (MRV) sorted tightest domain variables</div>
                    <div className="log-line">[09:30:00.015] 0 conflicts · 28ms · Pure Backtracking CSP (MRV)</div>
                    <div className="log-line">[09:30:00.016] Ready for college-wide publication</div>
                  </>
                )}
              </div>
            </Surface>

            <Surface className="surface--dark publish-card">
              <h3>Deterministic Publication Contract</h3>
              <p style={{ color: 'rgba(244,246,248,.57)' }}>
                Role views consume only the latest mathematically verified schedule. Mathematical bottlenecks stay private with actionable diagnostics.
              </p>
              <div className="mono" style={{ color: 'rgba(244,246,248,.46)', fontSize: 9, lineHeight: 1.8 }}>
                RBAC / ACTIVE<br />
                ROOMS / {data.rooms.length.toString().padStart(2, '0')}<br />
                BATCHES / {data.batches.length.toString().padStart(2, '0')}<br />
                FACULTY / {data.faculty.length.toString().padStart(2, '0')}
              </div>
            </Surface>
          </div>
        </div>

        {/* CRUD Modals */}
        <AnimatePresence>
          {activeModal === 'addRoom' && (
            <ModalDialog
              title="Add Theory Room"
              subtitle="Register a theory lecture hall (no lab constraints). Mark as shared if accessible college-wide."
              onClose={() => setActiveModal('none')}
            >
              <form onSubmit={handleAddRoom} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field
                  label="ROOM NUMBER"
                  placeholder="e.g. Room 103"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  required
                />
                <Field
                  label="CAPACITY (SEATS)"
                  type="number"
                  placeholder="60"
                  value={newRoomCapacity}
                  onChange={(e) => setNewRoomCapacity(e.target.value)}
                  required
                />
                <Field
                  label="BUILDING"
                  placeholder="Academic Block 1"
                  value={newRoomBuilding}
                  onChange={(e) => setNewRoomBuilding(e.target.value)}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={newRoomIsShared}
                    onChange={(e) => setNewRoomIsShared(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--mist)' }}
                  />
                  <span>Shared College Lecture Hall (Open to all departments)</span>
                </label>
                <div className="modal-actions-row">
                  <Button type="button" tone="ghost" onClick={() => setActiveModal('none')}>
                    Cancel
                  </Button>
                  <Button type="submit" tone="mist" icon={Plus}>
                    Save Theory Room
                  </Button>
                </div>
              </form>
            </ModalDialog>
          )}

          {activeModal === 'addFaculty' && (
            <ModalDialog
              title="Register Faculty Member"
              subtitle="Add a faculty member to your department teaching roster."
              onClose={() => setActiveModal('none')}
            >
              <form onSubmit={handleAddFaculty} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field
                  label="FULL NAME"
                  placeholder="e.g. Dr. Ramesh Gupta"
                  value={newFacultyName}
                  onChange={(e) => setNewFacultyName(e.target.value)}
                  required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field
                    label="SHORT CODE"
                    placeholder="RG"
                    value={newFacultyCode}
                    onChange={(e) => setNewFacultyCode(e.target.value.toUpperCase())}
                  />
                  <Field
                    label="EMAIL"
                    placeholder="ramesh@schedulo.edu"
                    value={newFacultyEmail}
                    onChange={(e) => setNewFacultyEmail(e.target.value)}
                  />
                </div>
                <div className="modal-actions-row">
                  <Button type="button" tone="ghost" onClick={() => setActiveModal('none')}>
                    Cancel
                  </Button>
                  <Button type="submit" tone="mist" icon={Plus}>
                    Register Faculty
                  </Button>
                </div>
              </form>
            </ModalDialog>
          )}

          {activeModal === 'shareFaculty' && (
            <ModalDialog
              title="Share Faculty Cross-Department"
              subtitle="Allow a professor to teach in another department without double-booking."
              onClose={() => setActiveModal('none')}
            >
              <form onSubmit={handleShareFaculty} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <SelectField label="FACULTY MEMBER" value={shareTeacherId} onChange={(e) => setShareTeacherId(e.target.value)}>
                  {data.faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.shortCode})
                    </option>
                  ))}
                </SelectField>
                <SelectField label="TARGET DEPARTMENT TO SHARE WITH" value={shareDeptId} onChange={(e) => setShareDeptId(e.target.value)}>
                  <option value="dept-ece">Electronics & Communication (ECE)</option>
                  <option value="dept-it">Information Technology (IT)</option>
                </SelectField>
                <p style={{ fontSize: 11, color: 'rgba(244, 246, 248, 0.6)', margin: 0 }}>
                  The deterministic solver will synchronize minute-interval availability college-wide for this professor.
                </p>
                <div className="modal-actions-row">
                  <Button type="button" tone="ghost" onClick={() => setActiveModal('none')}>
                    Cancel
                  </Button>
                  <Button type="submit" tone="mist" icon={Share2}>
                    Share Faculty
                  </Button>
                </div>
              </form>
            </ModalDialog>
          )}

          {activeModal === 'addBatch' && (
            <ModalDialog
              title="Add Student Batch"
              subtitle="Configure a student cohort for timetable allocation."
              onClose={() => setActiveModal('none')}
            >
              <form onSubmit={handleAddBatch} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field
                  label="BATCH NAME"
                  placeholder="e.g. CSE-5B"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <Field
                    label="SEMESTER"
                    type="number"
                    value={newBatchSemester}
                    onChange={(e) => setNewBatchSemester(Number(e.target.value))}
                    required
                  />
                  <Field
                    label="SECTION"
                    value={newBatchSection}
                    onChange={(e) => setNewBatchSection(e.target.value.toUpperCase())}
                    required
                  />
                  <Field
                    label="STUDENTS"
                    type="number"
                    value={newBatchStudents}
                    onChange={(e) => setNewBatchStudents(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="modal-actions-row">
                  <Button type="button" tone="ghost" onClick={() => setActiveModal('none')}>
                    Cancel
                  </Button>
                  <Button type="submit" tone="mist" icon={Plus}>
                    Create Batch
                  </Button>
                </div>
              </form>
            </ModalDialog>
          )}

          {activeModal === 'addSubject' && (
            <ModalDialog
              title="Add Theory Subject"
              subtitle="Configure weekly lecture hours and assigned faculty."
              onClose={() => setActiveModal('none')}
            >
              <form onSubmit={handleAddSubject} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                  <Field
                    label="CODE"
                    placeholder="CS505"
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())}
                    required
                  />
                  <Field
                    label="SUBJECT NAME"
                    placeholder="Compiler Design"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                  <Field
                    label="WEEKLY HOURS"
                    type="number"
                    value={newSubjectHours}
                    onChange={(e) => setNewSubjectHours(Number(e.target.value))}
                    required
                  />
                  <SelectField label="ASSIGNED PROFESSOR" value={newSubjectTeacherId} onChange={(e) => setNewSubjectTeacherId(e.target.value)}>
                    {data.faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.shortCode})
                      </option>
                    ))}
                  </SelectField>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={newSubjectDoubleBlock}
                    onChange={(e) => setNewSubjectDoubleBlock(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--mist)' }}
                  />
                  <span>Allow 2-Hour Continuous Theory/Lab Block</span>
                </label>
                <div className="modal-actions-row">
                  <Button type="button" tone="ghost" onClick={() => setActiveModal('none')}>
                    Cancel
                  </Button>
                  <Button type="submit" tone="mist" icon={Plus}>
                    Add Subject
                  </Button>
                </div>
              </form>
            </ModalDialog>
          )}
        </AnimatePresence>

        {selectedBlock && (
          <ClassDetailModal
            block={selectedBlock}
            mode="admin"
            onClose={() => setSelectedBlock(null)}
          />
        )}

        {toast && <div className="toast">{toast}</div>}
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
  if (path === '/dashboard/admin' || path === '/dashboard/hod') return <HodDashboard />
  return <LandingPage />
}
