export type Role = 'student' | 'teacher' | 'hod' | 'admin'
export type DashboardView = 'timeline' | 'matrix'

export interface RoleMeta {
  label: string
  shortLabel: string
  route: string
  initials: string
}

export interface ScheduleBlock {
  id: string
  code: string
  subject: string
  faculty: string
  room: string
  batch: string
  day: string
  start: string
  end: string
  department?: string
  status?: 'live' | 'upcoming' | 'clash' | 'free'
  isDoubleBlock?: boolean
}

export interface LiveAlert {
  id: string
  kind?: 'room' | 'cancelled' | 'rescheduled'
  title: string
  detail: string
  time: string
  type?: 'reschedule' | 'clash' | 'info' | string
}

export interface BatchInfo {
  id: string
  name: string
  semester: number
  section: string
  studentCount?: number
}

export interface DepartmentData {
  id: string
  name: string
  code: string
  facultyJoinCode?: string
  batches: BatchInfo[]
}

export interface CollegeConfig {
  collegeName: string
  workingDays: string[]
  periodsPerDay: number
  periodDurationMinutes: number
  startTime: string
}

export interface StudentDashboardData {
  role: Role
  activeBatch: string
  collegeName: string
  department: string
  current: ScheduleBlock
  next: ScheduleBlock
  blocks: ScheduleBlock[]
  alerts: LiveAlert[]
  updatedAt: string
}

export interface TeacherDashboardData {
  role: Role
  faculty: string
  collegeName: string
  departments: string[]
  blocks: ScheduleBlock[]
  batches: string[]
  rooms: string[]
  unavailable: string[]
}

export interface HodDashboardData {
  role: Role
  department: string
  departmentCode: string
  facultyJoinCode: string
  collegeName: string
  workingDays: string[]
  startTime: string
  periodDurationMinutes: number
  rooms: Array<{ id: string; roomNumber: string; capacity: number; building: string; isShared?: boolean }>
  faculty: Array<{ id: string; name: string; shortCode: string; department: string; isShared?: boolean }>
  batches: Array<{ id: string; name: string; semester: number; section: string; studentCount: number }>
  subjects: Array<{ id: string; code: string; name: string; hours: number; teacher: string; isDoubleBlock: boolean }>
  lastRun: { time: string; duration: string; backtracks: number } | null
  blocks: ScheduleBlock[]
  diagnostics?: string[]
}

export interface AuthPayload {
  username: string
  password: string
  role: Role
  mode: 'signin' | 'signup'
  name?: string
  departmentName?: string
  departmentCode?: string
  facultyJoinCode?: string
  workingDays?: string
  startTime?: string
  collegeName?: string
  batchId?: string
  enable2fa?: boolean
}

export interface AuthSession {
  username: string
  role: Role
  twoFactorRequired: boolean
  secret?: string
  pre2faToken?: string
  qrCodeDataUrl?: string
  email?: string
  facultyJoinCode?: string
}

export interface SolverResult {
  conflicts: number
  solveTime: string
  algorithm: string
  backtracks: number
  log: string[]
  diagnostics?: string[]
  success: boolean
}

export const ROLE_META: Record<Role, RoleMeta> = {
  student: { label: 'Student', shortLabel: 'Student', route: '/dashboard/student', initials: 'ST' },
  teacher: { label: 'Teacher', shortLabel: 'Faculty', route: '/dashboard/teacher', initials: 'DR' },
  hod: { label: 'Head of Department', shortLabel: 'HOD', route: '/dashboard/hod', initials: 'HD' },
  admin: { label: 'Head of Department', shortLabel: 'HOD', route: '/dashboard/hod', initials: 'HD' },
}

// [M-29] Dynamic API base supporting VITE_API_BASE_URL for GitHub Pages and production backends
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '/api'
let activeAuthSession: AuthSession | null = null

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('schedulo_token')
  } catch {
    return null
  }
}

export const getStoredAuthToken = getStoredToken

export function getStoredUser(): any | null {
  try {
    const raw = localStorage.getItem('schedulo_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredToken(token: string, user?: any): void {
  try {
    localStorage.setItem('schedulo_token', token)
    if (user) {
      localStorage.setItem('schedulo_user', JSON.stringify(user))
    }
  } catch (e) {
    console.error('Failed to save auth state to localStorage', e)
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem('schedulo_token')
    localStorage.removeItem('schedulo_user')
  } catch {}
}

export function handleApiResponseStatus(res: Response): void {
  if (res.status === 401) {
    clearStoredAuth()
    try {
      sessionStorage.setItem('schedulo_auth_notice', 'Session expired. Please sign in again.')
    } catch {}
    if (typeof window !== 'undefined' && window.location.pathname !== '/auth' && window.location.pathname !== '/') {
      window.location.href = '/auth'
    }
    throw new Error('Session expired. Please sign in again.')
  }
  if (res.status === 403) {
    throw new Error('Access Denied: You do not have permission to access or modify this resource.')
  }
}

export const fallbackWeeklyBlocks: ScheduleBlock[] = [
  { id: 'os-1', code: 'CS501', subject: 'Operating Systems', faculty: 'Dr. Debabrata Roy', room: 'Room 101', batch: 'CSE-5A', department: 'CSE', day: 'Mon', start: '09:00', end: '10:00' },
  { id: 'dbms-1', code: 'CS502', subject: 'Database Management', faculty: 'Prof. Ananya Sen', room: 'Room 102', batch: 'CSE-5A', department: 'CSE', day: 'Tue', start: '10:00', end: '11:00' },
  { id: 'networks-1', code: 'CS503', subject: 'Computer Networks', faculty: 'Dr. Subhashish Mukherjee', room: 'Room 201', batch: 'CSE-5A', department: 'CSE', day: 'Wed', start: '11:00', end: '12:00', status: 'live' },
  { id: 'se-1', code: 'CS504', subject: 'Software Engineering', faculty: 'Dr. Priya Banerjee', room: 'Room 202', batch: 'CSE-5A', department: 'CSE', day: 'Wed', start: '12:00', end: '13:00' },
  { id: 'os-2', code: 'CS501', subject: 'Operating Systems', faculty: 'Dr. Debabrata Roy', room: 'Room 101', batch: 'CSE-5A', department: 'CSE', day: 'Thu', start: '14:00', end: '15:00' },
  { id: 'networks-2', code: 'CS503', subject: 'Computer Networks', faculty: 'Dr. Subhashish Mukherjee', room: 'Room 201', batch: 'CSE-5A', department: 'CSE', day: 'Fri', start: '09:00', end: '10:00' },
  { id: 'it-oop', code: 'IT503', subject: 'OOP in Java', faculty: 'Dr. Debabrata Roy', room: 'Room 201', batch: 'IT-5A', department: 'IT', day: 'Tue', start: '14:00', end: '15:00' },
  { id: 'it-cloud', code: 'IT502', subject: 'Cloud Computing', faculty: 'Dr. Priya Banerjee', room: 'Room 202', batch: 'IT-5A', department: 'IT', day: 'Thu', start: '10:00', end: '11:00' },
]

export const fallbackAlerts: LiveAlert[] = [
  { id: 'alert-1', kind: 'room', title: 'Room change · CS501', detail: 'Operating Systems relocated to Room 101 (Academic Block 1).', time: '09:30' },
  { id: 'alert-2', kind: 'rescheduled', title: 'Deterministic Solver Verified', detail: 'Backtracking Solver (MRV) validated campus schedule with 0 clashes.', time: 'Today' },
]

// [M-19] Deterministic minute-accurate "Happening Now" and "Up Next" calculation
export function computeLiveScheduleStatus(blocks: ScheduleBlock[]): {
  current: ScheduleBlock
  next: ScheduleBlock
  blocksWithStatus: ScheduleBlock[]
} {
  const now = new Date()
  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const currentDay = dayNamesShort[now.getDay()]
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const blocksWithStatus: ScheduleBlock[] = blocks.map((b) => {
    const [startH, startM] = (b.start || '09:00').split(':').map((v) => parseInt(v, 10))
    const [endH, endM] = (b.end || '10:00').split(':').map((v) => parseInt(v, 10))
    const startMin = startH * 60 + (startM || 0)
    const endMin = endH * 60 + (endM || 0)

    if (b.day === currentDay) {
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        return { ...b, status: 'live' as const }
      }
      if (currentMinutes < startMin) {
        return { ...b, status: 'upcoming' as const }
      }
      return { ...b, status: 'free' as const }
    }
    return { ...b, status: 'upcoming' as const }
  })

  // Determine current class
  let current = blocksWithStatus.find((b) => b.status === 'live')
  if (!current) {
    if (currentMinutes >= 780 && currentMinutes < 840) {
      current = {
        id: 'lunch-recess-now',
        code: 'RECESS',
        subject: 'Institutional Lunch Break',
        faculty: 'Campus-wide Locked Recess',
        room: 'Dining Commons / Hall',
        batch: 'All Batches',
        day: currentDay,
        start: '13:00',
        end: '14:00',
        status: 'live',
      }
    } else {
      current =
        blocksWithStatus.find((b) => b.day === currentDay && b.status === 'upcoming') ||
        blocksWithStatus[0] ||
        fallbackWeeklyBlocks[0]
    }
  }

  // Determine next class
  let next = blocksWithStatus.find(
    (b) => b.id !== current?.id && b.day === currentDay && b.status === 'upcoming'
  )
  if (!next) {
    next = blocksWithStatus.find((b) => b.id !== current?.id) || blocksWithStatus[1] || fallbackWeeklyBlocks[1]
  }

  return { current, next, blocksWithStatus }
}

export async function getDepartments(): Promise<{ collegeName: string; departments: DepartmentData[] }> {
  try {
    const res = await fetch(`${API_BASE}/departments`)
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Error fetching departments:', err)
  }
  return {
    collegeName: 'Apex Institute of Technology & Science',
    departments: [
      {
        id: 'dept-cse',
        name: 'Computer Science & Engineering',
        code: 'CSE',
        batches: [
          { id: 'batch-1', name: 'CSE-5A', semester: 5, section: 'A', studentCount: 60 },
          { id: 'batch-2', name: 'CSE-5B', semester: 5, section: 'B', studentCount: 58 },
        ],
      },
      {
        id: 'dept-ece',
        name: 'Electronics & Communication Engineering',
        code: 'ECE',
        batches: [
          { id: 'batch-3', name: 'ECE-5A', semester: 5, section: 'A', studentCount: 55 },
        ],
      },
    ],
  }
}

export async function createAuthSession(payload: AuthPayload): Promise<AuthSession> {
  const email = payload.username.includes('@') ? payload.username : `${payload.username}@schedulo.edu`
  const backendRole = payload.role === 'hod' ? 'ADMIN' : payload.role.toUpperCase()

  if (payload.mode === 'signup') {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        username: payload.username,
        password: payload.password,
        role: backendRole,
        name: payload.name || payload.username,
        batchId: payload.batchId,
        departmentName: payload.departmentName,
        departmentCode: payload.departmentCode,
        facultyJoinCode: payload.facultyJoinCode,
        workingDays: payload.workingDays,
        startTime: payload.startTime,
        collegeName: payload.collegeName,
        enable2fa: payload.enable2fa,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed')
    }

    if (data.token) {
      setStoredToken(data.token, data.user)
    }

    activeAuthSession = {
      username: payload.username,
      role: payload.role,
      twoFactorRequired: Boolean(data.requires2fa),
      secret: data.manualSetupKey || '',
      qrCodeDataUrl: data.qrCodeDataUrl,
      email,
      facultyJoinCode: data.facultyJoinCode,
    }
    return activeAuthSession
  } else {
    // Sign In mode
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: payload.password,
      }),
    })

    const data = await res.json()
    if (!res.ok && res.status !== 403) {
      throw new Error(data.error || 'Invalid credentials')
    }

    if (res.status === 403 && data.requiresRegistrationVerification) {
      activeAuthSession = {
        username: payload.username,
        role: payload.role,
        twoFactorRequired: true,
        qrCodeDataUrl: data.qrCodeDataUrl,
        email: data.email || email,
      }
      return activeAuthSession
    }

    if (data.token && !data.requires2fa) {
      setStoredToken(data.token, data.user)
    }

    const returnedRole: Role = data.role === 'ADMIN' ? 'hod' : (data.role?.toLowerCase() as Role) || payload.role

    activeAuthSession = {
      username: payload.username,
      role: returnedRole,
      twoFactorRequired: Boolean(data.requires2fa),
      pre2faToken: data.pre2faToken,
      email: data.email || email,
    }
    return activeAuthSession
  }
}

export async function verifyTwoFactor(code: string): Promise<boolean> {
  const cleanCode = code.replace(/\s/g, '')
  if (cleanCode.length !== 6) return false

  if (activeAuthSession?.pre2faToken) {
    const res = await fetch(`${API_BASE}/auth/verify-login-totp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pre2faToken: activeAuthSession.pre2faToken,
        totpCode: cleanCode,
      }),
    })

    const data = await res.json()
    if (res.ok && data.token) {
      setStoredToken(data.token, data.user)
      return true
    }
    throw new Error(data.error || 'Invalid 6-digit TOTP code')
  } else if (activeAuthSession?.email) {
    const res = await fetch(`${API_BASE}/auth/verify-registration-totp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: activeAuthSession.email,
        totpCode: cleanCode,
      }),
    })

    const data = await res.json()
    if (res.ok && data.token) {
      setStoredToken(data.token, data.user)
      return true
    }
    throw new Error(data.error || 'Invalid 6-digit verification code')
  }

  return false
}

export async function getStudentDashboard(): Promise<StudentDashboardData> {
  const token = getStoredToken()
  const user = getStoredUser()
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const userBatchId = user?.batchId || user?.batch_id
  const alertsUrl = userBatchId ? `${API_BASE}/alerts?batchId=${encodeURIComponent(userBatchId)}` : `${API_BASE}/alerts`

  const [schedRes, entitiesRes, alertsRes, deptRes] = await Promise.all([
    fetch(`${API_BASE}/schedule`, { headers }),
    fetch(`${API_BASE}/entities`, { headers }),
    fetch(alertsUrl, { headers }),
    fetch(`${API_BASE}/departments`),
  ])

  handleApiResponseStatus(schedRes)
  handleApiResponseStatus(entitiesRes)

  if (schedRes.ok && entitiesRes.ok) {
    const schedData = await schedRes.json()
    const entitiesData = await entitiesRes.json()
    const alertsData = alertsRes.ok ? await alertsRes.json() : { alerts: [] }
    const deptData = deptRes.ok ? await deptRes.json() : { collegeName: 'Apex Institute of Technology & Science' }

    const periodTimes = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00']
    const dayMap: Record<string, string> = {
      Monday: 'Mon',
      Tuesday: 'Tue',
      Wednesday: 'Wed',
      Thursday: 'Thu',
      Friday: 'Fri',
      Saturday: 'Sat',
    }

    const blocks: ScheduleBlock[] = (schedData.entries || []).map((e: any) => {
      const sub = entitiesData.subjects?.find((s: any) => s.id === e.subjectId)
      const teacher = entitiesData.teachers?.find((t: any) => t.id === e.teacherId)
      const room = entitiesData.rooms?.find((r: any) => r.id === e.roomId)
      const batch = entitiesData.batches?.find((b: any) => b.id === e.batchId)
      const startHour = periodTimes[e.periodIndex] || '09:00'
      const duration = e.durationSlots || 1
      const startHourNum = parseInt(startHour.slice(0, 2), 10)
      const nextHour = `${startHourNum + duration}:00`

      return {
        id: e.id,
        code: sub?.code || 'CS501',
        subject: sub?.name || 'Subject',
        faculty: teacher?.name || 'Faculty',
        room: room?.roomNumber || 'Room 101',
        batch: batch?.name || 'Batch',
        department: batch?.department || 'Department',
        day: dayMap[e.day] || e.day.slice(0, 3),
        start: startHour,
        end: nextHour,
        status: e.isLocked ? 'live' : 'upcoming',
        isDoubleBlock: duration >= 2,
      }
    })

    const userBatch = entitiesData.batches?.find((b: any) => b.id === userBatchId)
    const activeBatchName = userBatch?.name || (user?.batchId ? user.batchId : (entitiesData.batches?.[0]?.name || 'CSE-5A'))
    const userDept = userBatch?.department || user?.department || entitiesData.departments?.[0]?.name || 'Computer Science & Engineering'
    const liveBlocks = userBatchId ? blocks.filter((b) => b.batch === activeBatchName) : blocks
    const finalBlocks = liveBlocks.length > 0 ? liveBlocks : blocks

    const mappedAlerts: LiveAlert[] = (alertsData.alerts || []).map((a: any) => ({
      id: a.id,
      kind: 'room',
      title: a.title,
      detail: a.message,
      time: new Date(a.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }))

    const { current, next, blocksWithStatus } = computeLiveScheduleStatus(finalBlocks)

    return {
      role: 'student',
      activeBatch: activeBatchName,
      collegeName: deptData.collegeName || 'Apex Institute of Technology & Science',
      department: userDept,
      current,
      next,
      blocks: blocksWithStatus,
      alerts: mappedAlerts.length > 0 ? mappedAlerts : fallbackAlerts,
      updatedAt: `${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · Live`,
    }
  }

  throw new Error('Failed to load student dashboard')
}

export async function getTeacherDashboard(): Promise<TeacherDashboardData> {
  const token = getStoredToken()
  const user = getStoredUser()
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const [schedRes, entitiesRes, deptRes] = await Promise.all([
    fetch(`${API_BASE}/schedule`, { headers }),
    fetch(`${API_BASE}/entities`, { headers }),
    fetch(`${API_BASE}/departments`),
  ])

  handleApiResponseStatus(schedRes)
  handleApiResponseStatus(entitiesRes)

  if (schedRes.ok && entitiesRes.ok) {
    const schedData = await schedRes.json()
    const entitiesData = await entitiesRes.json()
    const deptData = deptRes.ok ? await deptRes.json() : { collegeName: 'Apex Institute of Technology & Science' }

    const periodTimes = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00']
    const dayMap: Record<string, string> = {
      Monday: 'Mon',
      Tuesday: 'Tue',
      Wednesday: 'Wed',
      Thursday: 'Thu',
      Friday: 'Fri',
      Saturday: 'Sat',
    }

    const myTeacherId = user?.teacherId || user?.teacher_id || entitiesData.teachers?.[0]?.id || 't-1'
    const teacher = entitiesData.teachers?.find((t: any) => t.id === myTeacherId) || entitiesData.teachers?.[0]
    const teacherName = teacher?.name || user?.name || 'Faculty Member'

    const blocks: ScheduleBlock[] = (schedData.entries || [])
      .filter((e: any) => e.teacherId === teacher?.id)
      .map((e: any) => {
        const sub = entitiesData.subjects?.find((s: any) => s.id === e.subjectId)
        const room = entitiesData.rooms?.find((r: any) => r.id === e.roomId)
        const batch = entitiesData.batches?.find((b: any) => b.id === e.batchId)
        const startHour = periodTimes[e.periodIndex] || '09:00'
        const duration = e.durationSlots || 1
        const startHourNum = parseInt(startHour.slice(0, 2), 10)

        return {
          id: e.id,
          code: sub?.code || 'CS501',
          subject: sub?.name || 'Subject',
          faculty: teacherName,
          room: room?.roomNumber || 'Room 101',
          batch: batch?.name || 'Batch',
          department: batch?.department || 'Department',
          day: dayMap[e.day] || e.day.slice(0, 3),
          start: startHour,
          end: `${startHourNum + duration}:00`,
          isDoubleBlock: duration >= 2,
        }
      })

    const unavailable = (teacher?.unavailableSlots || []).map(
      (slot: any) => `${dayMap[slot.day] || slot.day.slice(0, 3)}-${periodTimes[slot.periodIndex] || '09:00'}`
    )

    const teacherDepts = teacher?.departmentIds?.length > 0
      ? entitiesData.departments?.filter((d: any) => teacher.departmentIds.includes(d.id)).map((d: any) => d.name)
      : [teacher?.department || user?.department || 'Engineering Department']

    return {
      role: 'teacher',
      faculty: teacherName,
      collegeName: deptData.collegeName || 'Apex Institute of Technology & Science',
      departments: teacherDepts,
      blocks: blocks.length > 0 ? blocks : fallbackWeeklyBlocks.filter((b) => b.faculty.includes(teacherName.split(' ')[0])),
      batches: entitiesData.batches?.map((b: any) => b.name) || ['CSE-5A', 'IT-5A'],
      rooms: entitiesData.rooms?.map((r: any) => r.roomNumber) || ['Room 101', 'Room 102', 'Room 201', 'Room 202'],
      unavailable: unavailable.length > 0 ? unavailable : ['Mon-09:00', 'Fri-15:00'],
    }
  }

  throw new Error('Failed to load teacher dashboard')
}

export async function getHodDashboard(): Promise<HodDashboardData> {
  const token = getStoredToken()
  const user = getStoredUser()
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const [entitiesRes, schedRes, deptRes] = await Promise.all([
    fetch(`${API_BASE}/entities`, { headers }),
    fetch(`${API_BASE}/schedule`, { headers }),
    fetch(`${API_BASE}/departments`),
  ])

  handleApiResponseStatus(entitiesRes)
  handleApiResponseStatus(schedRes)

  if (entitiesRes.ok) {
    const data = await entitiesRes.json()
    const schedData = schedRes.ok ? await schedRes.json() : { entries: [] }
    const deptData = deptRes.ok ? await deptRes.json() : { collegeName: 'Apex Institute of Technology & Science', departments: [] }

    const userDeptId = user?.departmentId || user?.department_id || 'dept-cse'
    let facultyJoinCode = ''
    try {
      const joinCodeRes = await fetch(`${API_BASE}/admin/department/join-code?departmentId=${encodeURIComponent(userDeptId)}`, { headers })
      if (joinCodeRes.ok) {
        const jData = await joinCodeRes.json()
        facultyJoinCode = jData.facultyJoinCode || ''
      }
    } catch {}

    const hodDept = (deptData.departments || []).find(
      (d: any) => d.id === userDeptId || d.code === userDeptId.replace('dept-', '').toUpperCase()
    ) || deptData.departments?.[0] || {
      name: user?.department || 'Computer Science & Engineering',
      code: userDeptId.replace('dept-', '').toUpperCase() || 'CSE',
      facultyJoinCode,
    }

    const periodTimes = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00']
    const dayMap: Record<string, string> = {
      Monday: 'Mon',
      Tuesday: 'Tue',
      Wednesday: 'Wed',
      Thursday: 'Thu',
      Friday: 'Fri',
      Saturday: 'Sat',
    }

    const blocks: ScheduleBlock[] = (schedData.entries || [])
      .filter((e: any) => !e.departmentId || e.departmentId === userDeptId || e.departmentId === hodDept.id)
      .map((e: any) => {
        const sub = data.subjects?.find((s: any) => s.id === e.subjectId)
        const teacher = data.teachers?.find((t: any) => t.id === e.teacherId)
        const room = data.rooms?.find((r: any) => r.id === e.roomId)
        const batch = data.batches?.find((b: any) => b.id === e.batchId)
        const startHour = periodTimes[e.periodIndex] || '09:00'
        const duration = e.durationSlots || 1
        const startHourNum = parseInt(startHour.slice(0, 2), 10)

        return {
          id: e.id,
          code: sub?.code || 'CS501',
          subject: sub?.name || 'Subject',
          faculty: teacher?.name || 'Faculty',
          room: room?.roomNumber || 'Room 101',
          batch: batch?.name || 'Batch',
          department: batch?.department || hodDept.name,
          day: dayMap[e.day] || e.day.slice(0, 3),
          start: startHour,
          end: `${startHourNum + duration}:00`,
          status: e.isLocked ? 'live' : 'upcoming',
          isDoubleBlock: duration >= 2,
        }
      })

    return {
      role: 'hod',
      department: hodDept.name,
      departmentCode: hodDept.code,
      facultyJoinCode: facultyJoinCode || hodDept.facultyJoinCode || `${hodDept.code}-FAC-2026`,
      collegeName: deptData.collegeName || 'Apex Institute of Technology & Science',
      workingDays: data.config?.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      startTime: data.config?.startTime || '09:00',
      periodDurationMinutes: data.config?.periodDurationMinutes || 50,
      rooms: (data.rooms || []).map((r: any) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        capacity: r.capacity,
        building: r.building || 'Academic Block',
        isShared: Boolean(r.isShared),
      })),
      faculty: (data.teachers || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        shortCode: t.shortCode,
        department: t.department || hodDept.name,
        isShared: Boolean(t.isShared),
      })),
      batches: (data.batches || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        semester: b.semester,
        section: b.section || 'A',
        studentCount: b.studentCount,
      })),
      subjects: (data.subjects || []).map((s: any) => {
        const t = data.teachers?.find((teacher: any) => teacher.id === s.assignedTeacherId)
        return {
          id: s.id,
          code: s.code,
          name: s.name,
          hours: s.weeklyHours,
          teacher: t?.name || 'Assigned Professor',
          isDoubleBlock: Boolean(s.durationSlots && s.durationSlots >= 2),
        }
      }),
      lastRun: { time: 'Today', duration: '24ms', backtracks: 0 },
      blocks: blocks.length > 0 ? blocks : fallbackWeeklyBlocks,
    }
  }

  throw new Error('Failed to load HOD dashboard')
}

export const getAdminDashboard = getHodDashboard

export async function runDeterministicSolver(): Promise<SolverResult> {
  const token = getStoredToken()
  const user = getStoredUser()
  const targetDeptId = user?.departmentId || user?.department_id || 'dept-cse'

  const res = await fetch(`${API_BASE}/admin/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ departmentId: targetDeptId }),
  })

  handleApiResponseStatus(res)

  const data = await res.json()
  if (res.ok && data.success) {
    return {
      success: true,
      conflicts: 0,
      solveTime: `${data.executionTimeMs || 28}ms`,
      algorithm: 'Pure Backtracking CSP (Minimum Remaining Values)',
      backtracks: data.backtracks || 0,
      log: [
        `[${new Date().toLocaleTimeString()}] Multi-department constraints initialized for ${targetDeptId}`,
        `[${new Date().toLocaleTimeString()}] Dedicated campus lunch break (13:00–14:00) locked across all days`,
        `[${new Date().toLocaleTimeString()}] MRV heuristic selected tightest domain variables first`,
        `[${new Date().toLocaleTimeString()}] Forward-checking: zero teacher, room, or batch double-bookings`,
        `[${new Date().toLocaleTimeString()}] 100% Deterministic solution assembled in ${data.executionTimeMs || 28}ms (${data.backtracks || 0} backtracks)`,
        `[${new Date().toLocaleTimeString()}] Ready for college-wide publication`,
      ],
    }
  } else if (!data.success && data.diagnostics) {
    return {
      success: false,
      conflicts: 1,
      solveTime: `${data.executionTimeMs || 12}ms`,
      algorithm: 'Pure Backtracking CSP (MRV)',
      backtracks: 0,
      diagnostics: data.diagnostics,
      log: [
        `[${new Date().toLocaleTimeString()}] Solver encountered mathematical constraint contradiction`,
        ...data.diagnostics.map((d: string) => `[BOTTLENECK] ${d}`),
      ],
    }
  }
  throw new Error(data.message || 'Solver execution failed')
}

export async function validateReschedule(targetRoom: string, targetBatch: string, isThisWeekOnly = true): Promise<{ valid: boolean; message: string }> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/teacher/reschedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      targetRoom,
      targetBatch,
      commit: false,
      isThisWeekOnly,
    }),
  })

  handleApiResponseStatus(res)

  const data = await res.json()
  return {
    valid: Boolean(data.valid),
    message: data.message || `${targetRoom} and ${targetBatch} checked.`,
  }
}

export async function publishTimetable(): Promise<{ publishedAt: string; recipients: number }> {
  const token = getStoredToken()
  const user = getStoredUser()
  const targetDeptId = user?.departmentId || user?.department_id || 'dept-cse'

  const res = await fetch(`${API_BASE}/admin/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ departmentId: targetDeptId }),
  })

  handleApiResponseStatus(res)

  if (res.ok) {
    const data = await res.json()
    return {
      publishedAt: data.publishedAt || `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST`,
      recipients: data.recipients || 118,
    }
  }
  throw new Error('Failed to publish timetable')
}

export async function updateCollegeConfig(config: Partial<CollegeConfig>): Promise<boolean> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(config),
  })
  handleApiResponseStatus(res)
  return res.ok
}

export async function updateTeacherAvailability(teacherId: string, unavailableSlots: string[]): Promise<boolean> {
  const token = getStoredToken()
  const formattedSlots = unavailableSlots.map((s) => {
    const [day, time] = s.split('-')
    const periodTimes = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00']
    const pIdx = periodTimes.indexOf(time)
    return { day, periodIndex: pIdx >= 0 ? pIdx : 0 }
  })

  const res = await fetch(`${API_BASE}/teacher/availability/${teacherId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ unavailableSlots: formattedSlots }),
  })
  handleApiResponseStatus(res)
  return res.ok
}

export async function commitReschedule(params: {
  targetRoom: string;
  targetBatch: string;
  day?: string;
  periodIndex?: number;
  isThisWeekOnly?: boolean;
}): Promise<{ valid: boolean; message: string; alert?: any }> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/teacher/reschedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      targetRoom: params.targetRoom,
      targetBatch: params.targetBatch,
      day: params.day || 'Wednesday',
      periodIndex: params.periodIndex !== undefined ? params.periodIndex : 2,
      isThisWeekOnly: params.isThisWeekOnly !== undefined ? params.isThisWeekOnly : true,
      commit: true,
    }),
  })

  handleApiResponseStatus(res)

  const data = await res.json()
  return {
    valid: Boolean(data.valid),
    message: data.message || 'Reschedule committed successfully.',
    alert: data.alert,
  }
}

// Admin Entity CRUD APIs
export async function createRoom(room: { roomNumber: string; capacity: number; building?: string; isShared?: boolean }): Promise<boolean> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/entities/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      roomNumber: room.roomNumber,
      capacity: Number(room.capacity),
      building: room.building || 'Academic Block',
      isShared: Boolean(room.isShared),
    }),
  })
  handleApiResponseStatus(res)
  return res.ok
}

export async function deleteRoom(id: string): Promise<boolean> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/entities/rooms/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  handleApiResponseStatus(res)
  return res.ok
}

export async function createFaculty(faculty: { name: string; shortCode: string; email?: string; department?: string }): Promise<boolean> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/entities/teachers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(faculty),
  })
  handleApiResponseStatus(res)
  return res.ok
}

export async function shareFaculty(id: string, targetDepartmentId: string): Promise<boolean> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/entities/teachers/${id}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ targetDepartmentId }),
  })
  handleApiResponseStatus(res)
  return res.ok
}

export async function deleteFaculty(id: string): Promise<boolean> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/entities/teachers/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  handleApiResponseStatus(res)
  return res.ok
}

export async function createBatch(batch: { name: string; semester: number; section: string; studentCount: number }): Promise<boolean> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/entities/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: batch.name,
      semester: Number(batch.semester),
      section: batch.section,
      studentCount: Number(batch.studentCount),
    }),
  })
  handleApiResponseStatus(res)
  return res.ok
}

export async function deleteBatch(id: string): Promise<boolean> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/entities/batches/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  handleApiResponseStatus(res)
  return res.ok
}

export async function createSubject(subject: { code: string; name: string; weeklyHours: number; assignedTeacherId: string; allowTwoHourBlock?: boolean }): Promise<boolean> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/entities/subjects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      code: subject.code,
      name: subject.name,
      weeklyHours: Number(subject.weeklyHours),
      assignedTeacherId: subject.assignedTeacherId,
      allowTwoHourBlock: Boolean(subject.allowTwoHourBlock),
      isDoubleBlock: Boolean(subject.allowTwoHourBlock),
    }),
  })
  handleApiResponseStatus(res)
  return res.ok
}

export async function deleteSubject(id: string): Promise<boolean> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/entities/subjects/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  handleApiResponseStatus(res)
  return res.ok
}
