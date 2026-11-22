import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export type Path =
  | '/'
  | '/auth'
  | '/dashboard/student'
  | '/dashboard/teacher'
  | '/dashboard/admin'
  | '/dashboard/hod'

function getCurrentPath(): Path {
  // [M-26] Support hash routing fallback for GitHub Pages
  if (typeof window !== 'undefined' && window.location.hash && window.location.hash.startsWith('#/')) {
    return (window.location.hash.slice(1) as Path) || '/'
  }
  return (typeof window !== 'undefined' ? (window.location.pathname as Path) : '/') || '/'
}

export function navigate(path: Path) {
  if (typeof window === 'undefined') return
  const isHashMode =
    window.location.protocol === 'file:' ||
    window.location.hash.startsWith('#/') ||
    window.location.pathname.includes('/schedulo')

  if (isHashMode) {
    window.location.hash = path
  } else {
    window.history.pushState({}, '', path)
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function formatClock(d: Date): string {
  const day = d.getDate().toString().padStart(2, '0')
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  const secs = d.getSeconds().toString().padStart(2, '0')
  return `${day} ${month} ${year} · ${hours}:${mins}:${secs} IST`
}

export function usePath() {
  const [path, setPath] = useState<Path>(getCurrentPath())
  useEffect(() => {
    const listener = () => setPath(getCurrentPath())
    window.addEventListener('popstate', listener)
    window.addEventListener('hashchange', listener)
    return () => {
      window.removeEventListener('popstate', listener)
      window.removeEventListener('hashchange', listener)
    }
  }, [])
  return path
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
