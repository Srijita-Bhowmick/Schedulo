import React from 'react'
import { usePath } from './utils/navigation'
import { LandingPage } from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { StudentDashboard } from './pages/StudentDashboard'
import { TeacherDashboard } from './pages/TeacherDashboard'
import { HodDashboard } from './pages/HodDashboard'
import './styles.css'

export default function App() {
  const path = usePath()

  if (path === '/auth') {
    return <AuthPage />
  }

  if (path === '/dashboard/student') {
    return <StudentDashboard />
  }

  if (path === '/dashboard/teacher') {
    return <TeacherDashboard />
  }

  if (path === '/dashboard/admin' || path === '/dashboard/hod') {
    return <HodDashboard />
  }

  return <LandingPage />
}
