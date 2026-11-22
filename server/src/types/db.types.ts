export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  name: string;
  totp_secret: string;
  is_totp_verified: number;
  teacher_id: string | null;
  batch_id: string | null;
  department_id: string | null;
  created_at: string;
}

export interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  hod_user_id: string | null;
  faculty_join_code: string;
  working_days: string;
  day_start_time: string;
  period_duration_mins: number;
  periods_per_day: number;
}

export interface RoomRow {
  id: string;
  room_number: string;
  name: string | null;
  type: string;
  capacity: number;
  building: string | null;
  department_id: string | null;
  is_shared: number;
}

export interface TeacherRow {
  id: string;
  name: string;
  short_code: string;
  email: string | null;
  department: string | null;
  max_hours_per_day: number;
  max_hours_per_week: number;
  unavailable_slots: string;
  color: string | null;
}

export interface TeacherDepartmentRow {
  teacher_id: string;
  department_id: string;
  is_primary: number;
}

export interface BatchRow {
  id: string;
  name: string;
  department: string;
  department_id: string | null;
  semester: number;
  section: string;
  student_count: number;
  subject_ids: string;
}

export interface SubjectRow {
  id: string;
  code: string;
  name: string;
  type: string;
  weekly_hours: number;
  duration_slots: number;
  assigned_teacher_id: string;
  department_id: string | null;
  preferred_room_type: string | null;
  allow_two_hour_block: number;
  is_double_block: number;
  color: string | null;
}

export interface ScheduleEntryRow {
  id: string;
  day: string;
  period_index: number;
  start_minute: number;
  end_minute: number;
  batch_id: string;
  subject_id: string;
  teacher_id: string;
  room_id: string;
  department_id: string | null;
  duration_slots: number;
  is_locked: number;
}

export interface RescheduleOverrideRow {
  id: string;
  entry_id: string | null;
  original_day: string | null;
  original_period: number | null;
  new_day: string;
  new_period: number;
  new_start_minute: number | null;
  new_end_minute: number | null;
  new_room_id: string;
  teacher_id: string;
  batch_id: string;
  valid_for_week: string;
  is_this_week_only: number;
  created_at: string;
}

export interface AlertRow {
  id: string;
  title: string;
  message: string;
  teacher_id: string;
  batch_id: string;
  subject_id: string | null;
  old_day: string | null;
  old_period: number | null;
  new_day: string;
  new_period: number;
  new_room_id: string;
  target_role: string;
  valid_for_week: string | null;
  created_at: string;
  is_read: number;
}

export interface CollegeConfigRow {
  id: string;
  college_name: string;
  updated_at: string;
}

export interface TimeSlotConfigRow {
  id: string;
  college_name: string | null;
  working_days: string;
  periods_per_day: number;
  period_duration_minutes: number;
  start_time: string;
  break_slots: string;
}

export interface CountResult {
  count: number;
}
