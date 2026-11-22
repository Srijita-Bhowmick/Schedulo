import React, { Suspense, lazy, useEffect } from 'react'
import { Path, navigate, usePath } from './utils/navigation'
import { LandingPage } from './pages/LandingPage'
import { getStoredAuthToken, getStoredUser } from './services/api'
import { LoadingDashboard } from './components/DashboardShell'
import './styles.css'

// [M-22] Code Splitting with React.lazy
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard').then((m) => ({ default: m.StudentDashboard })))
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard })))
const HodDashboard = lazy(() => import('./pages/HodDashboard').then((m) => ({ default: m.HodDashboard })))

// [M-17] Client-Side RBAC Auth Guard Component
function RouteGuard({
  children,
  requiredRoles,
  fallbackPath = '/dashboard/student',
  notice = 'Access Denied: Insufficient permissions for this portal.',
}: {
  children: React.ReactNode
  requiredRoles?: string[]
  fallbackPath?: Path
  notice?: string
}) {
  const token = getStoredAuthToken()
  const user = getStoredUser()
  const userRole = (user?.role || '').toUpperCase()

  useEffect(() => {
    if (!token) {
      sessionStorage.setItem('schedulo_auth_notice', 'Authentication required. Please sign in.')
      navigate('/auth')
      return
    }

    if (requiredRoles && !requiredRoles.includes(userRole)) {
      sessionStorage.setItem('schedulo_auth_notice', notice)
      navigate(fallbackPath)
    }
  }, [token, userRole, requiredRoles, fallbackPath, notice])

  if (!token) return <LoadingDashboard />
  if (requiredRoles && !requiredRoles.includes(userRole)) return <LoadingDashboard />

  return <>{children}</>
}

export default function App() {
  const path = usePath()
  const user = getStoredUser()
  const userRole = (user?.role || '').toUpperCase()

  return (
    <Suspense fallback={<LoadingDashboard />}>
      {path === '/auth' && <AuthPage />}
      {path === '/dashboard/student' && (
        <RouteGuard fallbackPath="/auth" notice="Please sign in to view your timetable.">
          <StudentDashboard />
        </RouteGuard>
      )}
      {path === '/dashboard/teacher' && (
        <RouteGuard
          requiredRoles={['TEACHER', 'ADMIN', 'HOD']}
          fallbackPath="/dashboard/student"
          notice="Access Denied: Students cannot access Faculty availability matrix."
        >
          <TeacherDashboard />
        </RouteGuard>
      )}
      {(path === '/dashboard/admin' || path === '/dashboard/hod') && (
        <RouteGuard
          requiredRoles={['ADMIN', 'HOD']}
          fallbackPath={userRole === 'TEACHER' ? '/dashboard/teacher' : '/dashboard/student'}
          notice="Access Denied: Head of Department privileges required."
        >
          <HodDashboard />
        </RouteGuard>
      )}
      {path === '/' && <LandingPage />}
      {!['/auth', '/dashboard/student', '/dashboard/teacher', '/dashboard/admin', '/dashboard/hod', '/'].includes(
        path
      ) && <LandingPage />}
    </Suspense>
  )
}
