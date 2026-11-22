import bcrypt from 'bcryptjs';
import { db, initDatabase } from './db.js';
import { BacktrackingSolver, DepartmentConfig } from '../engine/backtrackingSolver.js';

export function seedDatabase(force = false) {
  initDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0 && !force) {
    console.log('[Seeder] Database already populated. Skipping initial seed.');
    return;
  }

  console.log('[Seeder] Seeding multi-department database (CSE 09:00 Mon-Fri, ECE 09:30 Mon-Sat, Shared Professors & Halls)...');

  // Clear existing records if force
  if (force) {
    db.exec(`
      DELETE FROM reschedule_overrides;
      DELETE FROM schedule_alerts;
      DELETE FROM schedule_entries;
      DELETE FROM teacher_departments;
      DELETE FROM subjects;
      DELETE FROM batches;
      DELETE FROM teachers;
      DELETE FROM rooms;
      DELETE FROM departments;
      DELETE FROM users;
      DELETE FROM college_config;
    `);
  }

  // 1. College Branding
  db.prepare(`
    INSERT OR REPLACE INTO college_config (id, college_name, updated_at)
    VALUES ('default', 'Apex Institute of Technology & Science', ?)
  `).run(new Date().toISOString());

  // 2. Multi-Department Setup (CSE starts 09:00 Mon-Fri, ECE starts 09:30 Mon-Sat)
  const insertDept = db.prepare(`
    INSERT OR REPLACE INTO departments (id, name, code, hod_user_id, faculty_join_code, working_days, day_start_time, period_duration_mins, periods_per_day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertDept.run(
    'dept-cse',
    'Computer Science & Engineering',
    'CSE',
    'usr_admin',
    'CSE-FAC-482',
    JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
    '09:00',
    60,
    6
  );

  insertDept.run(
    'dept-ece',
    'Electronics & Communication Engineering',
    'ECE',
    'usr_hod_ece',
    'ECE-FAC-719',
    JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
    '09:30',
    50,
    6
  );

  // 3. Theory Rooms (Department-owned Theory Rooms + Shared College Lecture Halls)
  const insertRoom = db.prepare(`
    INSERT OR REPLACE INTO rooms (id, room_number, name, type, capacity, building, department_id, is_shared)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // CSE Department Rooms
  insertRoom.run('r-101', 'Room 101', 'CSE Theory Hall A', 'LECTURE_HALL', 70, 'Academic Block 1', 'dept-cse', 0);
  insertRoom.run('r-102', 'Room 102', 'CSE Theory Hall B', 'LECTURE_HALL', 70, 'Academic Block 1', 'dept-cse', 0);

  // ECE Department Rooms
  insertRoom.run('r-301', 'Room 301', 'ECE Theory Hall A', 'LECTURE_HALL', 65, 'Academic Block 3', 'dept-ece', 0);
  insertRoom.run('r-302', 'Room 302', 'ECE Theory Hall B', 'LECTURE_HALL', 65, 'Academic Block 3', 'dept-ece', 0);

  // Shared College Lecture Halls
  insertRoom.run('r-201', 'Room 201', 'Central Auditorium Hall 1', 'LECTURE_HALL', 100, 'Central Complex', null, 1);
  insertRoom.run('r-202', 'Room 202', 'Central Auditorium Hall 2', 'LECTURE_HALL', 100, 'Central Complex', null, 1);

  // 4. Faculty Members (including Shared Professor Dr. Debabrata Roy)
  const insertTeacher = db.prepare(`
    INSERT OR REPLACE INTO teachers (id, name, short_code, email, department, max_hours_per_day, max_hours_per_week, unavailable_slots, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTeacher.run(
    't-1',
    'Dr. Debabrata Roy',
    'DR',
    'dr.roy@schedulo.edu',
    'Computer Science & Engineering',
    4,
    16,
    JSON.stringify([{ day: 'Monday', periodIndex: 0 }, { day: 'Friday', periodIndex: 5 }]),
    '#6366f1' // Indigo
  );

  insertTeacher.run(
    't-2',
    'Prof. Ananya Sen',
    'AS',
    'ananya.sen@schedulo.edu',
    'Computer Science & Engineering',
    4,
    16,
    JSON.stringify([{ day: 'Wednesday', periodIndex: 4 }, { day: 'Wednesday', periodIndex: 5 }]),
    '#ec4899' // Pink
  );

  insertTeacher.run(
    't-3',
    'Dr. Subhashish Mukherjee',
    'SM',
    's.mukherjee@schedulo.edu',
    'Computer Science & Engineering',
    4,
    16,
    JSON.stringify([{ day: 'Tuesday', periodIndex: 0 }]),
    '#10b981' // Emerald
  );

  insertTeacher.run(
    't-4',
    'Dr. Priya Banerjee',
    'PB',
    'priya.b@schedulo.edu',
    'Electronics & Communication Engineering',
    4,
    16,
    JSON.stringify([{ day: 'Thursday', periodIndex: 0 }]),
    '#8b5cf6' // Violet
  );

  insertTeacher.run(
    't-5',
    'Prof. Sourav Das',
    'SD',
    'sourav.das@schedulo.edu',
    'Electronics & Communication Engineering',
    4,
    16,
    JSON.stringify([{ day: 'Friday', periodIndex: 0 }]),
    '#f59e0b' // Amber
  );

  // 5. Cross-Department Faculty Mapping
  const insertTeacherDept = db.prepare(`
    INSERT OR REPLACE INTO teacher_departments (teacher_id, department_id, is_primary)
    VALUES (?, ?, ?)
  `);
  insertTeacherDept.run('t-1', 'dept-cse', 1); // Dr. Roy primary CSE
  insertTeacherDept.run('t-1', 'dept-ece', 0); // Dr. Roy also teaches ECE!
  insertTeacherDept.run('t-2', 'dept-cse', 1);
  insertTeacherDept.run('t-3', 'dept-cse', 1);
  insertTeacherDept.run('t-4', 'dept-ece', 1);
  insertTeacherDept.run('t-5', 'dept-ece', 1);

  // 6. Batches (Semester + Section format)
  const insertBatch = db.prepare(`
    INSERT OR REPLACE INTO batches (id, name, department, department_id, semester, section, student_count, subject_ids)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBatch.run(
    'batch-1',
    'CSE-5A',
    'Computer Science & Engineering',
    'dept-cse',
    5,
    'A',
    60,
    JSON.stringify(['sub-cs501', 'sub-cs502', 'sub-cs503', 'sub-cs504'])
  );

  insertBatch.run(
    'batch-2',
    'CSE-5B',
    'Computer Science & Engineering',
    'dept-cse',
    5,
    'B',
    58,
    JSON.stringify(['sub-cs501', 'sub-cs502', 'sub-cs503', 'sub-cs504'])
  );

  insertBatch.run(
    'batch-3',
    'ECE-5A',
    'Electronics & Communication Engineering',
    'dept-ece',
    5,
    'A',
    55,
    JSON.stringify(['sub-ec501', 'sub-ec502', 'sub-ec503', 'sub-ec504'])
  );

  // 7. Theory Subjects (with allow_two_hour_block toggle)
  const insertSubject = db.prepare(`
    INSERT OR REPLACE INTO subjects (id, code, name, type, weekly_hours, duration_slots, assigned_teacher_id, department_id, preferred_room_type, allow_two_hour_block, is_double_block, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // CSE Subjects
  insertSubject.run('sub-cs501', 'CS501', 'Operating Systems', 'THEORY', 4, 1, 't-1', 'dept-cse', 'LECTURE_HALL', 0, 0, '#6366f1');
  insertSubject.run('sub-cs502', 'CS502', 'Database Management Systems', 'THEORY', 4, 1, 't-2', 'dept-cse', 'LECTURE_HALL', 0, 0, '#ec4899');
  insertSubject.run('sub-cs503', 'CS503', 'Computer Networks', 'THEORY', 3, 1, 't-3', 'dept-cse', 'LECTURE_HALL', 1, 1, '#10b981');
  insertSubject.run('sub-cs504', 'CS504', 'Software Engineering', 'THEORY', 3, 1, 't-2', 'dept-cse', 'LECTURE_HALL', 0, 0, '#8b5cf6');

  // ECE Subjects (Dr. Roy teaches EC501!)
  insertSubject.run('sub-ec501', 'EC501', 'Digital Signal Processing', 'THEORY', 4, 1, 't-1', 'dept-ece', 'LECTURE_HALL', 0, 0, '#6366f1');
  insertSubject.run('sub-ec502', 'EC502', 'Microprocessors & Microcontrollers', 'THEORY', 4, 1, 't-4', 'dept-ece', 'LECTURE_HALL', 0, 0, '#ec4899');
  insertSubject.run('sub-ec503', 'EC503', 'Electromagnetic Waves', 'THEORY', 3, 1, 't-5', 'dept-ece', 'LECTURE_HALL', 1, 1, '#10b981');
  insertSubject.run('sub-ec504', 'EC504', 'Control Systems Engineering', 'THEORY', 3, 1, 't-4', 'dept-ece', 'LECTURE_HALL', 0, 0, '#8b5cf6');

  // 8. Seed Users with BCrypt & RFC-6238 Base32 TOTP secret ('JBSWY3DPEHPK3PXP')
  const defaultTotpSecret = 'JBSWY3DPEHPK3PXP';
  const now = new Date().toISOString();
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password_hash, role, name, totp_secret, is_totp_verified, teacher_id, batch_id, department_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
  `);

  insertUser.run(
    'usr_admin',
    'admin@schedulo.edu',
    bcrypt.hashSync('Admin@1234', 10),
    'ADMIN',
    'Chief Academic Admin & CSE HOD',
    defaultTotpSecret,
    null,
    null,
    'dept-cse',
    now
  );

  insertUser.run(
    'usr_hod_ece',
    'hod.ece@schedulo.edu',
    bcrypt.hashSync('HODece@1234', 10),
    'ADMIN',
    'ECE Department Head',
    defaultTotpSecret,
    null,
    null,
    'dept-ece',
    now
  );

  insertUser.run(
    'usr_teacher_roy',
    'dr.roy@schedulo.edu',
    bcrypt.hashSync('Teacher@1234', 10),
    'TEACHER',
    'Dr. Debabrata Roy',
    defaultTotpSecret,
    't-1',
    null,
    'dept-cse',
    now
  );

  insertUser.run(
    'usr_student',
    'student@schedulo.edu',
    bcrypt.hashSync('Student@1234', 10),
    'STUDENT',
    'Rahul Sharma',
    defaultTotpSecret,
    null,
    'batch-1',
    'dept-cse',
    now
  );

  // 9. Pre-generate and seed initial clash-free schedule entries using BacktrackingSolver
  const cseDeptConfig: DepartmentConfig = {
    id: 'dept-cse',
    name: 'Computer Science & Engineering',
    code: 'CSE',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    dayStartTime: '09:00',
    periodDurationMins: 60,
    periodsPerDay: 6,
  };

  const roomsData = db.prepare('SELECT id, room_number as roomNumber, name, type, capacity, building, department_id as departmentId, is_shared as isShared FROM rooms').all() as any[];
  const teachersData = (db.prepare('SELECT id, name, short_code as shortCode, email, department, max_hours_per_day as maxHoursPerDay, max_hours_per_week as maxHoursPerWeek, unavailable_slots as unavailableSlots, color FROM teachers').all() as any[]).map((t) => ({
    ...t,
    unavailableSlots: JSON.parse(t.unavailableSlots || '[]'),
  }));
  const batchesData = (db.prepare("SELECT id, name, department, department_id as departmentId, semester, section, student_count as studentCount, subject_ids as subjectIds FROM batches WHERE department_id = 'dept-cse'").all() as any[]).map((b) => ({
    ...b,
    subjectIds: JSON.parse(b.subjectIds || '[]'),
  }));
  const subjectsData = db.prepare("SELECT id, code, name, type, weekly_hours as weeklyHours, duration_slots as durationSlots, assigned_teacher_id as assignedTeacherId, department_id as departmentId, preferred_room_type as preferredRoomType, allow_two_hour_block as allowTwoHourBlock, is_double_block as isDoubleBlock, color FROM subjects WHERE department_id = 'dept-cse'").all() as any[];

  const cseResult = BacktrackingSolver.solveDepartment(
    cseDeptConfig,
    roomsData,
    teachersData,
    batchesData,
    subjectsData,
    []
  );

  if (cseResult.success && cseResult.entries.length > 0) {
    const insertEntry = db.prepare(`
      INSERT OR REPLACE INTO schedule_entries (id, day, period_index, start_minute, end_minute, batch_id, subject_id, teacher_id, room_id, department_id, duration_slots, is_locked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    for (const entry of cseResult.entries) {
      insertEntry.run(
        entry.id,
        entry.day,
        entry.periodIndex,
        entry.startMinute,
        entry.endMinute,
        entry.batchId,
        entry.subjectId,
        entry.teacherId,
        entry.roomId,
        entry.departmentId || 'dept-cse',
        entry.durationSlots || 1
      );
    }
  }

  // 10. Initial Schedule Alert
  db.prepare(`
    INSERT OR REPLACE INTO schedule_alerts (id, title, message, teacher_id, batch_id, subject_id, new_day, new_period, new_room_id, target_role, created_at, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    'alert-init-1',
    'Timetable Published · Zero Minute-Collision Guaranteed',
    'Deterministic Backtracking CSP (MRV) validated all theory lecture halls and cross-department teaching hours with locked 13:00–14:00 lunch break.',
    't-1',
    'batch-1',
    'sub-cs501',
    'Monday',
    0,
    'r-101',
    'STUDENT',
    now
  );

  console.log('[Seeder] Multi-department database seeded successfully!');
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('seeder.ts') || process.argv[1]?.endsWith('seeder.js')) {
  seedDatabase(true);
}
