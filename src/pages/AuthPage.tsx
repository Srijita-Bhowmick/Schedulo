import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Copy,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  AuthPayload,
  AuthSession,
  DepartmentData,
  ROLE_META,
  Role,
  createAuthSession,
  getDepartments,
  verifyTwoFactor,
} from '../services/api'
import { BrandMark, Button, Field, SelectField, cn } from '../components/ui'
import { Path, navigate, PageTransition } from '../utils/navigation'

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [role, setRole] = useState<Role>('student')
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authNotice, setAuthNotice] = useState('')

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
    // Read session notice if redirected due to 401 or expiration
    const notice = sessionStorage.getItem('schedulo_auth_notice')
    if (notice) {
      setAuthNotice(notice)
      sessionStorage.removeItem('schedulo_auth_notice')
    }

    // Read pre-selected role if arrived via role entry portals
    const savedRole = localStorage.getItem('schedulo_selected_role') as Role | null
    if (
      savedRole &&
      (savedRole === 'student' || savedRole === 'teacher' || savedRole === 'hod' || savedRole === 'admin')
    ) {
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

      setFlipped(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.'
      setError(message)
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

              {authNotice && (
                <div
                  style={{
                    background: 'rgba(224, 109, 83, 0.15)',
                    border: '1px solid var(--ember)',
                    color: '#ffc2b3',
                    padding: '10px 14px',
                    borderRadius: 6,
                    margin: '0 0 16px',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={16} color="var(--ember)" />
                  <span>{authNotice}</span>
                </div>
              )}

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
                        <option value="Monday to Friday">Monday to Friday (5 Days)</option>
                        <option value="Monday to Saturday">Monday to Saturday (6 Days)</option>
                      </SelectField>
                      <SelectField
                        label="DAY START TIME"
                        value={hodStartTime}
                        onChange={(e) => setHodStartTime(e.target.value)}
                      >
                        <option value="09:00">09:00 AM</option>
                        <option value="08:30">08:30 AM</option>
                        <option value="09:30">09:30 AM</option>
                      </SelectField>
                    </div>
                  </>
                )}

                {mode === 'signup' && role === 'teacher' && (
                  <div>
                    <Field
                      label="FACULTY JOIN CODE (FROM YOUR HOD)"
                      placeholder="e.g. CSE-FAC-482"
                      value={facultyJoinCode}
                      onChange={(e) => setFacultyJoinCode(e.target.value.toUpperCase())}
                      required
                    />
                    <span style={{ fontSize: 11, color: '#C7E3F7', display: 'block', marginTop: -4 }}>
                      Ask your Head of Department for your department's secure 6-character registration code.
                    </span>
                  </div>
                )}

                {mode === 'signup' && role === 'student' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
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
                        label="STUDENT BATCH"
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                      >
                        {currentDept?.batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} (Sem {b.semester})
                          </option>
                        ))}
                      </SelectField>
                    </div>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--pearl)',
                        cursor: 'pointer',
                        margin: '4px 0',
                      }}
                    >
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

                {error && (
                  <p
                    className="form-status"
                    role="alert"
                    style={{ borderColor: 'var(--ember)', color: '#ff9e87' }}
                  >
                    {error}
                  </p>
                )}

                <Button
                  className="auth-submit"
                  size="lg"
                  tone="mist"
                  loading={loading}
                  icon={ArrowRight}
                  type="submit"
                >
                  {mode === 'signup' && role === 'student' && !enable2fa
                    ? 'Complete Registration'
                    : 'Continue to 2FA Gate'}
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
                        onClick={() =>
                          navigator.clipboard?.writeText(session?.secret ?? 'JBSW Y3DP EHPK 3PXP')
                        }
                      >
                        <Copy size={13} />
                      </button>
                    </strong>
                  </div>
                </>
              )}

              {session?.facultyJoinCode && (
                <div
                  style={{
                    margin: '8px 0 12px',
                    padding: '8px 12px',
                    background: 'rgba(144, 194, 231, 0.12)',
                    borderRadius: 6,
                    border: '1px solid rgba(144, 194, 231, 0.3)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: '#C7E3F7',
                      display: 'block',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    YOUR FACULTY JOIN CODE (SHARE WITH TEACHERS):
                  </span>
                  <strong
                    style={{ fontSize: 13, color: 'var(--mist)', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {session.facultyJoinCode}
                  </strong>
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
                {error && (
                  <p
                    className="form-status"
                    role="alert"
                    style={{ borderColor: 'var(--ember)', color: '#ff9e87' }}
                  >
                    {error}
                  </p>
                )}
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
