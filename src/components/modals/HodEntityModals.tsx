import React, { useState } from 'react'
import { Plus, Share2 } from 'lucide-react'
import { Button, Field, SelectField } from '../ui'
import { ModalDialog } from './ModalDialog'

export { ModalDialog }

export function AddRoomModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: { roomNumber: string; capacity: number; building: string; isShared: boolean }) => void
}) {
  const [newRoomNumber, setNewRoomNumber] = useState('')
  const [newRoomCapacity, setNewRoomCapacity] = useState('60')
  const [newRoomBuilding, setNewRoomBuilding] = useState('Academic Block 1')
  const [newRoomIsShared, setNewRoomIsShared] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomNumber) return
    onSubmit({
      roomNumber: newRoomNumber,
      capacity: Number(newRoomCapacity) || 60,
      building: newRoomBuilding || 'Academic Block',
      isShared: newRoomIsShared,
    })
  }

  return (
    <ModalDialog
      title="Add Theory Room"
      subtitle="Register a theory lecture hall (no lab constraints). Mark as shared if accessible college-wide."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          <input
            type="checkbox"
            checked={newRoomIsShared}
            onChange={(e) => setNewRoomIsShared(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--mist)' }}
          />
          <span>Shared College Lecture Hall (Open to all departments)</span>
        </label>
        <div className="modal-actions-row">
          <Button type="button" tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" tone="mist" icon={Plus}>
            Save Theory Room
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}

export function AddFacultyModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: { name: string; shortCode: string; email: string }) => void
}) {
  const [newFacultyName, setNewFacultyName] = useState('')
  const [newFacultyCode, setNewFacultyCode] = useState('')
  const [newFacultyEmail, setNewFacultyEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFacultyName) return
    onSubmit({
      name: newFacultyName,
      shortCode: newFacultyCode || newFacultyName.slice(0, 3).toUpperCase(),
      email: newFacultyEmail || `${newFacultyName.toLowerCase().replace(/\s+/g, '.')}@schedulo.edu`,
    })
  }

  return (
    <ModalDialog
      title="Register Faculty Member"
      subtitle="Add a faculty member to your department teaching roster."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          <Button type="button" tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" tone="mist" icon={Plus}>
            Register Faculty
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}

export function ShareFacultyModal({
  faculty,
  onClose,
  onSubmit,
}: {
  faculty: Array<{ id: string; name: string; shortCode: string }>
  onClose: () => void
  onSubmit: (teacherId: string, targetDeptId: string) => void
}) {
  const [shareTeacherId, setShareTeacherId] = useState(faculty[0]?.id || '')
  const [shareDeptId, setShareDeptId] = useState('dept-it')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const teacherId = shareTeacherId || faculty[0]?.id
    if (!teacherId) return
    onSubmit(teacherId, shareDeptId)
  }

  return (
    <ModalDialog
      title="Share Faculty Cross-Department"
      subtitle="Allow a professor to teach in another department without double-booking."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SelectField
          label="FACULTY MEMBER"
          value={shareTeacherId}
          onChange={(e) => setShareTeacherId(e.target.value)}
        >
          {faculty.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.shortCode})
            </option>
          ))}
        </SelectField>
        <SelectField
          label="TARGET DEPARTMENT TO SHARE WITH"
          value={shareDeptId}
          onChange={(e) => setShareDeptId(e.target.value)}
        >
          <option value="dept-ece">Electronics & Communication (ECE)</option>
          <option value="dept-it">Information Technology (IT)</option>
        </SelectField>
        <p style={{ fontSize: 11, color: '#C7E3F7', margin: 0 }}>
          The deterministic solver will synchronize minute-interval availability college-wide for this professor.
        </p>
        <div className="modal-actions-row">
          <Button type="button" tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" tone="mist" icon={Share2}>
            Share Faculty
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}

export function AddBatchModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: { name: string; semester: number; section: string; studentCount: number }) => void
}) {
  const [newBatchName, setNewBatchName] = useState('')
  const [newBatchSemester, setNewBatchSemester] = useState(5)
  const [newBatchSection, setNewBatchSection] = useState('B')
  const [newBatchStudents, setNewBatchStudents] = useState(60)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBatchName) return
    onSubmit({
      name: newBatchName,
      semester: Number(newBatchSemester) || 5,
      section: newBatchSection || 'A',
      studentCount: Number(newBatchStudents) || 60,
    })
  }

  return (
    <ModalDialog
      title="Add Student Batch"
      subtitle="Configure a student cohort for timetable allocation."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          <Button type="button" tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" tone="mist" icon={Plus}>
            Create Batch
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}

export function AddSubjectModal({
  faculty,
  onClose,
  onSubmit,
}: {
  faculty: Array<{ id: string; name: string; shortCode: string }>
  onClose: () => void
  onSubmit: (data: {
    code: string
    name: string
    weeklyHours: number
    assignedTeacherId: string
    allowTwoHourBlock: boolean
  }) => void
}) {
  const [newSubjectCode, setNewSubjectCode] = useState('')
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectHours, setNewSubjectHours] = useState(3)
  const [newSubjectTeacherId, setNewSubjectTeacherId] = useState(faculty[0]?.id || '')
  const [newSubjectDoubleBlock, setNewSubjectDoubleBlock] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubjectCode || !newSubjectName) return
    const teacherId = newSubjectTeacherId || faculty[0]?.id || 't-1'
    onSubmit({
      code: newSubjectCode.toUpperCase(),
      name: newSubjectName,
      weeklyHours: Number(newSubjectHours) || 3,
      assignedTeacherId: teacherId,
      allowTwoHourBlock: newSubjectDoubleBlock,
    })
  }

  return (
    <ModalDialog
      title="Add Theory Subject"
      subtitle="Configure weekly lecture hours and assigned faculty."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          <SelectField
            label="ASSIGNED PROFESSOR"
            value={newSubjectTeacherId}
            onChange={(e) => setNewSubjectTeacherId(e.target.value)}
          >
            {faculty.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.shortCode})
              </option>
            ))}
          </SelectField>
        </div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          <input
            type="checkbox"
            checked={newSubjectDoubleBlock}
            onChange={(e) => setNewSubjectDoubleBlock(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--mist)' }}
          />
          <span>Allow 2-Hour Continuous Theory Block</span>
        </label>
        <div className="modal-actions-row">
          <Button type="button" tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" tone="mist" icon={Plus}>
            Add Subject
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
