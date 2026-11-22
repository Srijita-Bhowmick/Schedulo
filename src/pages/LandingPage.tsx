import React, { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Role, getDepartments } from '../services/api'
import { BrandMark, Button, InlineArrow } from '../components/ui'
import { SpatialTimetable } from '../components/SpatialTimetable'
import { ArchitectureModal } from '../components/modals/ArchitectureModal'
import { navigate, PageTransition } from '../utils/navigation'

export function LandingPage() {
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
              A pure algorithmic constraint-satisfaction engine using Minimum Remaining Values (MRV) that guarantees
              zero room, teacher, or batch double-bookings — with a dedicated protected campus lunch break.
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

        <footer
          className="footer-strip"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px clamp(24px, 5vw, 80px)',
            maxWidth: 1600,
            margin: '0 auto',
            borderTop: '1px solid rgba(144, 194, 231, 0.12)',
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#C7E3F7',
          }}
        >
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
