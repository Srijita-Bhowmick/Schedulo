import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = typeof __dirname !== 'undefined'
  ? path.resolve(__dirname, '../../data')
  : path.resolve(process.cwd(), 'data');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'schedulo.sqlite');
export const db = new Database(DB_PATH);

// Enable WAL mode and foreign keys for high performance and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- 1. College Global Configuration
    CREATE TABLE IF NOT EXISTS college_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      college_name TEXT NOT NULL DEFAULT 'Apex Institute of Technology & Science',
      updated_at TEXT NOT NULL
    );

    -- 2. Users (HOD, Teacher, Student) with TOTP 2FA
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'TEACHER', 'STUDENT')),
      name TEXT NOT NULL,
      totp_secret TEXT NOT NULL,
      is_totp_verified INTEGER NOT NULL DEFAULT 0,
      teacher_id TEXT,
      batch_id TEXT,
      department_id TEXT,
      created_at TEXT NOT NULL
    );

    -- 3. Departments with Dynamic Multi-Department Settings
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      hod_user_id TEXT,
      faculty_join_code TEXT NOT NULL UNIQUE,
      working_days TEXT NOT NULL DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]',
      day_start_time TEXT NOT NULL DEFAULT '09:00',
      period_duration_mins INTEGER NOT NULL DEFAULT 60,
      periods_per_day INTEGER NOT NULL DEFAULT 6
    );

    -- 4. Theory Rooms (Department-owned or Shared College Hall)
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      room_number TEXT NOT NULL,
      name TEXT,
      type TEXT NOT NULL DEFAULT 'LECTURE_HALL',
      capacity INTEGER NOT NULL,
      building TEXT,
      department_id TEXT,
      is_shared INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    -- 5. Faculty Members
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_code TEXT NOT NULL,
      email TEXT,
      department TEXT,
      max_hours_per_day INTEGER NOT NULL DEFAULT 4,
      max_hours_per_week INTEGER NOT NULL DEFAULT 16,
      unavailable_slots TEXT NOT NULL DEFAULT '[]',
      color TEXT
    );

    -- 6. Faculty Cross-Department Teaching Mapping
    CREATE TABLE IF NOT EXISTS teacher_departments (
      teacher_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (teacher_id, department_id),
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    );

    -- 7. Batches (Semester + Section per Department)
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      department_id TEXT,
      semester INTEGER NOT NULL,
      section TEXT NOT NULL DEFAULT 'A',
      student_count INTEGER NOT NULL,
      subject_ids TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    -- 8. Theory Subjects (with 2-Hour Continuous Theory Block toggle)
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'THEORY',
      weekly_hours INTEGER NOT NULL DEFAULT 3,
      duration_slots INTEGER NOT NULL DEFAULT 1,
      assigned_teacher_id TEXT NOT NULL,
      department_id TEXT,
      preferred_room_type TEXT DEFAULT 'LECTURE_HALL',
      allow_two_hour_block INTEGER NOT NULL DEFAULT 0,
      is_double_block INTEGER NOT NULL DEFAULT 0,
      color TEXT,
      FOREIGN KEY (assigned_teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    -- 9. Legacy Time Slot Config Compatibility
    CREATE TABLE IF NOT EXISTS time_slot_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      college_name TEXT DEFAULT 'Apex Institute of Technology & Science',
      working_days TEXT NOT NULL DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]',
      periods_per_day INTEGER NOT NULL DEFAULT 6,
      period_duration_minutes INTEGER NOT NULL DEFAULT 50,
      start_time TEXT NOT NULL DEFAULT '09:00',
      break_slots TEXT NOT NULL DEFAULT '[]'
    );

    -- 10. Schedule Entries with Exact Minute Intervals & Department Tag
    CREATE TABLE IF NOT EXISTS schedule_entries (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL,
      period_index INTEGER NOT NULL,
      start_minute INTEGER NOT NULL DEFAULT 540,
      end_minute INTEGER NOT NULL DEFAULT 600,
      batch_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      department_id TEXT,
      duration_slots INTEGER NOT NULL DEFAULT 1,
      is_locked INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    -- 11. Weekly Reschedule Overrides ("This Week Only" Temporary Substitution)
    CREATE TABLE IF NOT EXISTS reschedule_overrides (
      id TEXT PRIMARY KEY,
      entry_id TEXT,
      original_day TEXT,
      original_period INTEGER,
      new_day TEXT NOT NULL,
      new_period INTEGER NOT NULL,
      new_start_minute INTEGER,
      new_end_minute INTEGER,
      new_room_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      valid_for_week TEXT NOT NULL,
      is_this_week_only INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
    );

    -- 12. Schedule Alerts
    CREATE TABLE IF NOT EXISTS schedule_alerts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      subject_id TEXT,
      old_day TEXT,
      old_period INTEGER,
      new_day TEXT NOT NULL,
      new_period INTEGER NOT NULL,
      new_room_id TEXT NOT NULL,
      target_role TEXT NOT NULL DEFAULT 'STUDENT',
      valid_for_week TEXT,
      created_at TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
    );
  `);

  // Run non-destructive column additions for existing databases
  const alterStatements = [
    "ALTER TABLE departments ADD COLUMN hod_user_id TEXT",
    "ALTER TABLE departments ADD COLUMN faculty_join_code TEXT DEFAULT 'CSE-FAC-482'",
    "ALTER TABLE departments ADD COLUMN working_days TEXT DEFAULT '[\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\"]'",
    "ALTER TABLE departments ADD COLUMN day_start_time TEXT DEFAULT '09:00'",
    "ALTER TABLE departments ADD COLUMN period_duration_mins INTEGER DEFAULT 60",
    "ALTER TABLE departments ADD COLUMN periods_per_day INTEGER DEFAULT 6",
    "ALTER TABLE rooms ADD COLUMN department_id TEXT",
    "ALTER TABLE rooms ADD COLUMN is_shared INTEGER DEFAULT 0",
    "ALTER TABLE batches ADD COLUMN department_id TEXT",
    "ALTER TABLE batches ADD COLUMN section TEXT DEFAULT 'A'",
    "ALTER TABLE subjects ADD COLUMN department_id TEXT",
    "ALTER TABLE subjects ADD COLUMN allow_two_hour_block INTEGER DEFAULT 0",
    "ALTER TABLE subjects ADD COLUMN is_double_block INTEGER DEFAULT 0",
    "ALTER TABLE schedule_entries ADD COLUMN start_minute INTEGER DEFAULT 540",
    "ALTER TABLE schedule_entries ADD COLUMN end_minute INTEGER DEFAULT 600",
    "ALTER TABLE schedule_entries ADD COLUMN department_id TEXT",
    "ALTER TABLE users ADD COLUMN department_id TEXT",
    "ALTER TABLE time_slot_config ADD COLUMN college_name TEXT DEFAULT 'Apex Institute of Technology & Science'",
  ];

  for (const sql of alterStatements) {
    try {
      db.exec(sql);
    } catch {}
  }

  // Ensure default college_config row exists
  try {
    const existing = db.prepare('SELECT id FROM college_config WHERE id = ?').get('default');
    if (!existing) {
      db.prepare(`
        INSERT INTO college_config (id, college_name, updated_at)
        VALUES ('default', 'Apex Institute of Technology & Science', ?)
      `).run(new Date().toISOString());
    }
  } catch {}
}
