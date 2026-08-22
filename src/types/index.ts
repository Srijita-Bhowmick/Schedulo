export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export type SubjectType = 'THEORY' | 'LAB' | 'TUTORIAL';

export type RoomType = 'LECTURE_HALL' | 'COMPUTER_LAB' | 'SCIENCE_LAB' | 'SEMINAR_HALL';

export interface UnavailableSlot {
  day: DayOfWeek;
  periodIndex: number;
}

export interface Teacher {
  id: string;
  name: string;
  shortCode: string;
  email?: string;
  department?: string;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  unavailableSlots: UnavailableSlot[];
  color?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  type: SubjectType;
  weeklyHours: number;
  durationSlots: number; // 1 for theory, 2 or 3 for continuous Labs
  assignedTeacherId: string;
  preferredRoomType?: RoomType;
  color?: string;
}

export interface BatchSection {
  id: string;
  name: string; // e.g., "CSE-5A", "CSCS-5B", "IT-3A"
  department: string;
  semester: number;
  studentCount: number;
  subjectIds: string[];
}

export interface Room {
  id: string;
  roomNumber: string;
  name?: string;
  type: RoomType;
  capacity: number;
  building?: string;
}

export interface BreakSlot {
  afterPeriod: number; // 1-indexed: break occurs after period N
  name: string; // e.g., "Short Break" or "Lunch Break"
  durationMinutes: number;
}

export interface TimeSlotConfig {
  workingDays: DayOfWeek[];
  periodsPerDay: number;
  periodDurationMinutes: number;
  startTime: string; // "09:00"
  breakSlots: BreakSlot[];
}

export interface ScheduleEntry {
  id: string;
  day: DayOfWeek;
  periodIndex: number; // 0-indexed (0 to periodsPerDay-1)
  batchId: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
  durationSlots?: number; // 1, 2, or 3
  isLocked?: boolean; // pinned by admin, solver must not move it
}

export type ConflictType = 
  | 'TEACHER_CLASH' 
  | 'ROOM_CLASH' 
  | 'BATCH_CLASH' 
  | 'CAPACITY_OVERFLOW'
  | 'LAB_DISRUPTION' 
  | 'OVERLOAD'
  | 'ROOM_TYPE_MISMATCH'
  | 'CAPACITY_WARNING'
  | 'UNAVAILABLE_SLOT';

export interface ConflictReport {
  id: string;
  type: ConflictType;
  message: string;
  day: DayOfWeek;
  periodIndex: number;
  involvedEntryIds: string[];
  severity: 'error' | 'warning';
}

export interface TimetableStats {
  totalBatches: number;
  totalSubjects: number;
  totalTeachers: number;
  totalRooms: number;
  totalScheduledHours: number;
  roomUtilizationRate: number; // 0 - 100%
  facultyAverageLoad: number;
  conflictsCount: number;
  fitnessScore: number; // 0 - 100%
  hardConstraintScore: number; // 0 - 100%
  softConstraintScore: number; // 0 - 100%
  executionTimeMs?: number;
}

export interface GenerationSettings {
  populationSize: number;
  generations: number;
  mutationRate: number;
  optimizeGaps: boolean;
  balanceFacultyLoad: boolean;
  preferRoomTypes: boolean;
  respectTeacherAvailability: boolean;
}

export interface GenerationProgress {
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentGeneration: number;
  maxGenerations: number;
  fitness: number;
  clashesCount: number;
  message: string;
  executionTimeMs?: number;
  fitnessHistory: { gen: number; fitness: number; clashes: number }[];
}

export type PerspectiveType = 'batch' | 'teacher' | 'room';
