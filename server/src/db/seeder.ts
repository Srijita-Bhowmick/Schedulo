import bcrypt from 'bcryptjs';
import { db, initDatabase } from './db.js';
import { SchedulingEngine } from '../engine/SchedulingEngine.js';

export function seedDatabase() {
  initDatabase();

  // Check if already seeded
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    console.log('[Seeder] Database already populated. Skipping initial seed.');
    return;
  }

  console.log('[Seeder] Seeding initial database with sample departments, 4 theory rooms, 4 teachers, 2 batches, and subjects...');

  // 1. Departments
  const insertDept = db.prepare('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)');
  insertDept.run('dept-cse', 'Computer Science & Engineering', 'CSE');
  insertDept.run('dept-it', 'Information Technology', 'IT');

  // 2. 4 Theory Rooms (Zero labs)
  const insertRoom = db.prepare('INSERT INTO rooms (id, room_number, name, type, capacity, building) VALUES (?, ?, ?, ?, ?, ?)');
  insertRoom.run('r-101', 'Room 101', 'Theory Lecture Hall A', 'LECTURE_HALL', 70, 'Academic Block 1');
  insertRoom.run('r-102', 'Room 102', 'Theory Lecture Hall B', 'LECTURE_HALL', 70, 'Academic Block 1');
  insertRoom.run('r-201', 'Room 201', 'Theory Lecture Room C', 'LECTURE_HALL', 65, 'Academic Block 2');
  insertRoom.run('r-202', 'Room 202', 'Theory Lecture Room D', 'LECTURE_HALL', 65, 'Academic Block 2');

  // 3. 4 Teachers with realistic unavailable slots
  const insertTeacher = db.prepare(`
    INSERT INTO teachers (id, name, short_code, email, department, max_hours_per_day, max_hours_per_week, unavailable_slots, color)
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
    'Information Technology',
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
    'Information Technology',
    4,
    16,
    JSON.stringify([{ day: 'Thursday', periodIndex: 0 }]),
    '#8b5cf6' // Violet
  );

  // 4. Subjects
  const insertSubject = db.prepare(`
    INSERT INTO subjects (id, code, name, type, weekly_hours, duration_slots, assigned_teacher_id, preferred_room_type, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // For CSE-5A
  insertSubject.run('sub-cs501', 'CS501', 'Operating Systems', 'THEORY', 4, 1, 't-1', 'LECTURE_HALL', '#6366f1');
  insertSubject.run('sub-cs502', 'CS502', 'Database Management Systems', 'THEORY', 4, 1, 't-2', 'LECTURE_HALL', '#ec4899');
  insertSubject.run('sub-cs503', 'CS503', 'Computer Networks', 'THEORY', 3, 1, 't-3', 'LECTURE_HALL', '#10b981');
  insertSubject.run('sub-cs504', 'CS504', 'Software Engineering', 'THEORY', 3, 1, 't-4', 'LECTURE_HALL', '#8b5cf6');

  // For IT-5A
  insertSubject.run('sub-it501', 'IT501', 'Web Technologies', 'THEORY', 4, 1, 't-3', 'LECTURE_HALL', '#10b981');
  insertSubject.run('sub-it502', 'IT502', 'Cloud Computing', 'THEORY', 4, 1, 't-4', 'LECTURE_HALL', '#8b5cf6');
  insertSubject.run('sub-it503', 'IT503', 'Object Oriented Programming', 'THEORY', 3, 1, 't-1', 'LECTURE_HALL', '#6366f1');
  insertSubject.run('sub-it504', 'IT504', 'Information Security', 'THEORY', 3, 1, 't-2', 'LECTURE_HALL', '#ec4899');

  // 5. 2 Student Batches
  const insertBatch = db.prepare(`
    INSERT INTO batches (id, name, department, semester, student_count, subject_ids)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertBatch.run(
    'batch-1',
    'CSE-5A',
    'Computer Science & Engineering',
    5,
    60,
    JSON.stringify(['sub-cs501', 'sub-cs502', 'sub-cs503', 'sub-cs504'])
  );
  insertBatch.run(
    'batch-2',
    'IT-5A',
    'Information Technology',
    5,
    55,
    JSON.stringify(['sub-it501', 'sub-it502', 'sub-it503', 'sub-it504'])
  );

  // 6. Time Slot Configuration (5 working days, 6 periods)
  const insertConfig = db.prepare(`
    INSERT OR REPLACE INTO time_slot_config (id, working_days, periods_per_day, period_duration_minutes, start_time, break_slots)
    VALUES ('default', ?, ?, ?, ?, ?)
  `);
  insertConfig.run(
    JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
    6,
    50,
    '09:30',
    JSON.stringify([
      { afterPeriod: 2, name: 'Tea Break', durationMinutes: 15 },
      { afterPeriod: 4, name: 'Lunch Break', durationMinutes: 45 },
    ])
  );

  // 7. Seed Users with BCrypt & RFC-6238 Base32 TOTP secret ('JBSWY3DPEHPK3PXP')
  const defaultTotpSecret = 'JBSWY3DPEHPK3PXP'; // Standard known secret for easy testing
  const now = new Date().toISOString();
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, role, name, totp_secret, is_totp_verified, teacher_id, batch_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `);

  insertUser.run(
    'usr_admin',
    'admin@schedulo.edu',
    bcrypt.hashSync('Admin@1234', 10),
    'ADMIN',
    'Chief Academic Admin',
    defaultTotpSecret,
    null,
    null,
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
    now
  );

  insertUser.run(
    'usr_teacher_sen',
    'ananya.sen@schedulo.edu',
    bcrypt.hashSync('Teacher@1234', 10),
    'TEACHER',
    'Prof. Ananya Sen',
    defaultTotpSecret,
    't-2',
    null,
    now
  );

  insertUser.run(
    'usr_student_rahul',
    'student@schedulo.edu',
    bcrypt.hashSync('Student@1234', 10),
    'STUDENT',
    'Rahul Sharma',
    defaultTotpSecret,
    null,
    'batch-1',
    now
  );

  // 8. Run initial solver run to generate a valid, conflict-free timetable immediately!
  console.log('[Seeder] Running initial Backtracking Solver to pre-populate conflict-free schedule...');
  const rooms = db.prepare('SELECT id, room_number as roomNumber, name, type, capacity, building FROM rooms').all() as any[];
  const teachers = db.prepare('SELECT id, name, short_code as shortCode, email, department, max_hours_per_day as maxHoursPerDay, max_hours_per_week as maxHoursPerWeek, unavailable_slots as unavailableSlots, color FROM teachers').all().map((t: any) => ({
    ...t,
    unavailableSlots: JSON.parse(t.unavailableSlots),
  }));
  const batches = db.prepare('SELECT id, name, department, semester, student_count as studentCount, subject_ids as subjectIds FROM batches').all().map((b: any) => ({
    ...b,
    subjectIds: JSON.parse(b.subjectIds),
  }));
  const subjects = db.prepare('SELECT id, code, name, type, weekly_hours as weeklyHours, duration_slots as durationSlots, assigned_teacher_id as assignedTeacherId, preferred_room_type as preferredRoomType, color FROM subjects').all() as any[];

  const initialSolution = SchedulingEngine.solve(
    rooms,
    teachers,
    batches,
    subjects,
    {
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      periodsPerDay: 6,
    },
    []
  );

  if (initialSolution.success) {
    const insertEntry = db.prepare(`
      INSERT INTO schedule_entries (id, day, period_index, batch_id, subject_id, teacher_id, room_id, duration_slots, is_locked)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)
    `);
    for (const e of initialSolution.entries) {
      insertEntry.run(e.id, e.day, e.periodIndex, e.batchId, e.subjectId, e.teacherId, e.roomId);
    }
    console.log(`[Seeder] Initial schedule generated with ${initialSolution.entries.length} conflict-free slots in ${initialSolution.executionTimeMs}ms.`);
  } else {
    console.warn('[Seeder] Initial solver warning:', initialSolution.message);
  }

  console.log('[Seeder] Seed complete!');
}

if (process.argv[1] && import.meta.url.includes('seeder')) {
  seedDatabase();
}
