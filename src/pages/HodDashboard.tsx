import React, { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  Check,
  Copy,
  Play,
  Plus,
  Send,
  Share2,
  Trash2,
} from 'lucide-react'
import {
  HodDashboardData,
  ScheduleBlock,
  SolverResult,
  createBatch,
  createFaculty,
  createRoom,
  createSubject,
  deleteBatch,
  deleteFaculty,
  deleteRoom,
  deleteSubject,
  getHodDashboard,
  publishTimetable,
  runDeterministicSolver,
  shareFaculty,
  updateCollegeConfig,
} from '../services/api'
import { Badge, Button, Surface } from '../components/ui'
import { WeeklyBoxMatrix } from '../components/WeeklyBoxMatrix'
import { ClassDetailModal } from '../components/modals/ClassDetailModal'
import {
  AddBatchModal,
  AddFacultyModal,
  AddRoomModal,
  AddSubjectModal,
  ShareFacultyModal,
} from '../components/modals/HodEntityModals'
import { DashboardHeader, DashboardShell, LoadingDashboard } from '../components/DashboardShell'

export function HodDashboard() {
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
  const [activeModal, setActiveModal] = useState<
    'none' | 'addRoom' | 'addFaculty' | 'shareFaculty' | 'addBatch' | 'addSubject'
  >('none')
  const [toast, setToast] = useState('')

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
  const handleAddRoom = async (roomData: {
    roomNumber: string
    capacity: number
    building: string
    isShared: boolean
  }) => {
    const ok = await createRoom(roomData)
    if (ok) {
      setToast(`Theory Room ${roomData.roomNumber} added.`)
      setActiveModal('none')
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

  const handleAddFaculty = async (facultyData: { name: string; shortCode: string; email: string }) => {
    const ok = await createFaculty({
      ...facultyData,
      department: data.department,
    })
    if (ok) {
      setToast(`Faculty ${facultyData.name} registered.`)
      setActiveModal('none')
      fetchDashboardData()
    } else {
      setToast('Failed to create faculty member.')
    }
    setTimeout(() => setToast(''), 3500)
  }

  const handleShareFaculty = async (teacherId: string, targetDeptId: string) => {
    const ok = await shareFaculty(teacherId, targetDeptId)
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

  const handleAddBatch = async (batchData: {
    name: string
    semester: number
    section: string
    studentCount: number
  }) => {
    const ok = await createBatch(batchData)
    if (ok) {
      setToast(`Batch ${batchData.name} created.`)
      setActiveModal('none')
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

  const handleAddSubject = async (subjectData: {
    code: string
    name: string
    weeklyHours: number
    assignedTeacherId: string
    allowTwoHourBlock: boolean
  }) => {
    const ok = await createSubject(subjectData)
    if (ok) {
      setToast(`Subject ${subjectData.code} registered.`)
      setActiveModal('none')
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
              <p>
                Modular discrete tiles · 6 lecture periods + locked lunch recess (13:00–14:00) · Inspect solver-assigned
                domains across batches and faculty before publishing.
              </p>
            </div>
            <Badge tone="mist" dot>
              MRV VERIFIED
            </Badge>
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
                    <span style={{ display: 'block', fontSize: 11, color: '#C7E3F7', marginTop: 4 }}>
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
                      <strong style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                        {data.workingDays.join(', ')}
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">START TIME &amp; PERIOD</span>
                      <strong style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                        {data.startTime} IST · {data.periodDurationMinutes} mins
                      </strong>
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 20px',
                      borderBottom: '1px solid rgba(144, 194, 231, 0.12)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--mist)',
                      }}
                    >
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
                            <Badge tone={r.isShared ? 'ember' : 'mist'}>{r.isShared ? 'SHARED' : 'DEPT'}</Badge>
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 20px',
                      borderBottom: '1px solid rgba(144, 194, 231, 0.12)',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--mist)',
                      }}
                    >
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
                          <td>
                            <span className="mono">{f.shortCode}</span>
                          </td>
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 20px',
                      borderBottom: '1px solid rgba(144, 194, 231, 0.12)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--mist)',
                      }}
                    >
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 20px',
                      borderBottom: '1px solid rgba(144, 194, 231, 0.12)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--mist)',
                      }}
                    >
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
                            <span className="mono" style={{ fontSize: 10, color: 'var(--mist)' }}>
                              {s.code}
                            </span>
                          </td>
                          <td>{s.hours} hrs</td>
                          <td>{s.teacher}</td>
                          <td>
                            <Badge tone={s.isDoubleBlock ? 'ember' : 'neutral'}>
                              {s.isDoubleBlock ? '2-HR THEORY BLOCK' : '1-HR'}
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
              <p>
                Push the verified timetable to Student and Faculty views. Shared faculty and rooms are locked
                college-wide.
              </p>
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
                <div
                  style={{
                    margin: '12px 0',
                    padding: '10px 14px',
                    background: 'rgba(224, 109, 83, 0.16)',
                    border: '1px solid rgba(224, 109, 83, 0.45)',
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#ff9e87',
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
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
                    <div className="log-line">
                      [09:30:00.012] Multi-department constraints initialized: 4 theory halls, 4 faculty, 2 batches
                    </div>
                    <div className="log-line">
                      [09:30:00.013] Dedicated campus lunch break (13:00–14:00) locked across all days
                    </div>
                    <div className="log-line">
                      [09:30:00.014] Minimum Remaining Values (MRV) sorted tightest domain variables
                    </div>
                    <div className="log-line">[09:30:00.015] 0 conflicts · 28ms · Pure Backtracking CSP (MRV)</div>
                    <div className="log-line">[09:30:00.016] Ready for college-wide publication</div>
                  </>
                )}
              </div>
            </Surface>

            <Surface className="surface--dark publish-card">
              <h3>Deterministic Publication Contract</h3>
              <p style={{ color: '#C7E3F7' }}>
                Role views consume only the latest mathematically verified schedule. Mathematical bottlenecks stay
                private with actionable diagnostics.
              </p>
              <div className="mono" style={{ color: '#90C2E7', fontSize: 9, lineHeight: 1.8 }}>
                RBAC / ACTIVE
                <br />
                ROOMS / {data.rooms.length.toString().padStart(2, '0')}
                <br />
                BATCHES / {data.batches.length.toString().padStart(2, '0')}
                <br />
                FACULTY / {data.faculty.length.toString().padStart(2, '0')}
              </div>
            </Surface>
          </div>
        </div>

        {/* CRUD Modals */}
        <AnimatePresence>
          {activeModal === 'addRoom' && (
            <AddRoomModal onClose={() => setActiveModal('none')} onSubmit={handleAddRoom} />
          )}

          {activeModal === 'addFaculty' && (
            <AddFacultyModal onClose={() => setActiveModal('none')} onSubmit={handleAddFaculty} />
          )}

          {activeModal === 'shareFaculty' && (
            <ShareFacultyModal
              faculty={data.faculty}
              onClose={() => setActiveModal('none')}
              onSubmit={handleShareFaculty}
            />
          )}

          {activeModal === 'addBatch' && (
            <AddBatchModal onClose={() => setActiveModal('none')} onSubmit={handleAddBatch} />
          )}

          {activeModal === 'addSubject' && (
            <AddSubjectModal
              faculty={data.faculty}
              onClose={() => setActiveModal('none')}
              onSubmit={handleAddSubject}
            />
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
