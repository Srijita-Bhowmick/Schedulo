import {
  DayOfWeek,
  UnavailableSlot,
  TeacherData,
  RoomData,
  SubjectData,
  BatchData,
  ScheduleEntryData,
  SolverResult,
  BacktrackingSolver,
  DepartmentConfig,
  isMinuteOverlap,
  parseTimeToMinutes,
  LUNCH_START_MINUTE,
  LUNCH_END_MINUTE,
} from './backtrackingSolver.js';

export {
  DayOfWeek,
  UnavailableSlot,
  TeacherData,
  RoomData,
  SubjectData,
  BatchData,
  ScheduleEntryData,
  SolverResult,
  BacktrackingSolver,
  DepartmentConfig,
  isMinuteOverlap,
  parseTimeToMinutes,
};

export interface TimeSlotConfigData {
  workingDays: DayOfWeek[];
  periodsPerDay: number;
  periodDurationMinutes?: number;
  startTime?: string;
  breakSlots?: Array<{ afterPeriod: number; name: string; durationMinutes: number }>;
}

export class SchedulingEngine {
  /**
   * Deterministic backtracking solver with Minimum Remaining Values (MRV),
   * forward checking, exact minute-interval math, and mathematical bottleneck diagnostics.
   */
  static solve(
    rooms: RoomData[],
    teachers: TeacherData[],
    batches: BatchData[],
    subjects: SubjectData[],
    config: TimeSlotConfigData,
    lockedEntries: ScheduleEntryData[] = []
  ): SolverResult {
    const deptConfig: DepartmentConfig = {
      id: 'default-dept',
      name: 'Default Department',
      code: 'DEFAULT',
      workingDays: config.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      dayStartTime: config.startTime || '09:00',
      periodDurationMins: config.periodDurationMinutes || 60,
      periodsPerDay: config.periodsPerDay || 6,
    };

    return BacktrackingSolver.solveDepartment(
      deptConfig,
      rooms,
      teachers,
      batches,
      subjects,
      lockedEntries
    );
  }

  /**
   * Real-time slot validation for teachers rescheduling with exact minute-interval collision math.
   */
  static validateRescheduleSlot(
    entryId: string,
    batchId: string,
    subjectId: string,
    teacherId: string,
    roomId: string,
    day: DayOfWeek,
    periodIndex: number,
    existingEntries: ScheduleEntryData[],
    teachers: TeacherData[],
    rooms: RoomData[],
    batches: BatchData[],
    startTime = '09:00',
    periodDurationMins = 60
  ): { valid: boolean; conflicts: string[]; message: string } {
    const conflicts: string[] = [];

    const startMinute = parseTimeToMinutes(startTime) + periodIndex * periodDurationMins;
    const endMinute = startMinute + periodDurationMins;

    // 1. Check fixed lunch break: 13:00–14:00 (780 to 840 mins)
    if (isMinuteOverlap(startMinute, endMinute, LUNCH_START_MINUTE, LUNCH_END_MINUTE)) {
      conflicts.push('Slot overlaps with fixed campus lunch break (13:00 - 14:00).');
    }

    // 2. Check room capacity
    const batch = batches.find((b) => b.id === batchId);
    const room = rooms.find((r) => r.id === roomId);
    if (batch && room && room.capacity < batch.studentCount) {
      conflicts.push(`Room ${room.roomNumber} (capacity: ${room.capacity}) cannot accommodate batch ${batch.name} (${batch.studentCount} students).`);
    }

    // 3. Check teacher unavailable slots
    const teacher = teachers.find((t) => t.id === teacherId);
    if (teacher && teacher.unavailableSlots) {
      const isUnavailable = teacher.unavailableSlots.some(
        (u) =>
          u.day === day &&
          (u.periodIndex === periodIndex ||
            (u.startMinute !== undefined && u.endMinute !== undefined && isMinuteOverlap(startMinute, endMinute, u.startMinute, u.endMinute)))
      );
      if (isUnavailable) {
        conflicts.push(`Faculty ${teacher.name} has marked ${day} period ${periodIndex + 1} as unavailable.`);
      }
    }

    // 4. Check collisions with other scheduled classes via exact minute intervals
    const otherEntries = existingEntries.filter((e) => e.id !== entryId);

    for (const other of otherEntries) {
      if (other.day !== day) continue;

      const otherStart = other.startMinute || (parseTimeToMinutes(startTime) + other.periodIndex * periodDurationMins);
      const otherEnd = other.endMinute || (otherStart + periodDurationMins);

      if (isMinuteOverlap(startMinute, endMinute, otherStart, otherEnd)) {
        if (other.roomId === roomId) {
          const occBatch = batches.find((b) => b.id === other.batchId);
          conflicts.push(`Room ${room?.roomNumber || roomId} is already booked for batch ${occBatch?.name || other.batchId}.`);
        }
        if (other.teacherId === teacherId) {
          conflicts.push(`Faculty ${teacher?.name || teacherId} is already teaching another batch at this time.`);
        }
        if (other.batchId === batchId) {
          conflicts.push(`Batch ${batch?.name || batchId} already has another class scheduled at this time.`);
        }
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
      message: conflicts.length === 0 ? 'Slot is 100% clash-free and available.' : conflicts.join(' '),
    };
  }
}
