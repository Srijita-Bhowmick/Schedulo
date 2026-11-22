import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.resolve(__dirname, '../../data');
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
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      room_number TEXT NOT NULL,
      name TEXT,
      type TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      building TEXT
    );

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

    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      semester INTEGER NOT NULL,
      student_count INTEGER NOT NULL,
      subject_ids TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'THEORY',
      weekly_hours INTEGER NOT NULL DEFAULT 3,
      duration_slots INTEGER NOT NULL DEFAULT 1,
      assigned_teacher_id TEXT NOT NULL,
      preferred_room_type TEXT,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS time_slot_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      working_days TEXT NOT NULL,
      periods_per_day INTEGER NOT NULL DEFAULT 6,
      period_duration_minutes INTEGER NOT NULL DEFAULT 50,
      start_time TEXT NOT NULL DEFAULT '09:30',
      break_slots TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS schedule_entries (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL,
      period_index INTEGER NOT NULL,
      batch_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      duration_slots INTEGER NOT NULL DEFAULT 1,
      is_locked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reschedule_alerts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      old_day TEXT,
      old_period INTEGER,
      new_day TEXT NOT NULL,
      new_period INTEGER NOT NULL,
      new_room_id TEXT NOT NULL,
      target_role TEXT NOT NULL DEFAULT 'STUDENT',
      created_at TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0
    );
  `);

  try {
    db.exec("ALTER TABLE time_slot_config ADD COLUMN college_name TEXT DEFAULT 'Apex Institute of Technology & Science'");
  } catch {}
  try {
    db.exec("ALTER TABLE subjects ADD COLUMN is_double_block INTEGER DEFAULT 0");
  } catch {}
}
