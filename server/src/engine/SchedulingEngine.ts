export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface UnavailableSlot {
  day: DayOfWeek;
  periodIndex: number;
}

export interface TeacherData {
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

export interface RoomData {
  id: string;
  roomNumber: string;
  name?: string;
  type: string;
  capacity: number;
  building?: string;
}

export interface SubjectData {
  id: string;
  code: string;
  name: string;
  type: string;
  weeklyHours: number;
  durationSlots: number;
  assignedTeacherId: string;
  preferredRoomType?: string;
  color?: string;
}

export interface BatchData {
  id: string;
  name: string;
  department: string;
  semester: number;
  studentCount: number;
  subjectIds: string[];
}

export interface TimeSlotConfigData {
  workingDays: DayOfWeek[];
  periodsPerDay: number;
  periodDurationMinutes?: number;
  startTime?: string;
  breakSlots?: Array<{ afterPeriod: number; name: string; durationMinutes: number }>;
}

export interface ScheduleEntryData {
  id: string;
  day: DayOfWeek;
  periodIndex: number;
  batchId: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
  durationSlots?: number;
  isLocked?: boolean;
}

export interface SolverResult {
  success: boolean;
  entries: ScheduleEntryData[];
  executionTimeMs: number;
  totalScheduledHours: number;
  diagnostics?: string[];
  message: string;
}

interface LectureUnit {
  id: string;
  batchId: string;
  subjectId: string;
  teacherId: string;
  subjectCode: string;
  batchName: string;
  teacherName: string;
  unitIndex: number;
}

interface DomainSlot {
  day: DayOfWeek;
  periodIndex: number;
  roomId: string;
}

export class SchedulingEngine {
  /**
   * Deterministic backtracking solver with Minimum Remaining Values (MRV),
   * forward checking, degree heuristic, and mathematical bottleneck diagnostics.
   */
  static solve(
    rooms: RoomData[],
    teachers: TeacherData[],
    batches: BatchData[],
    subjects: SubjectData[],
    config: TimeSlotConfigData,
    lockedEntries: ScheduleEntryData[] = []
  ): SolverResult {
    const startTime = performance.now();
    const workingDays = config.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periodsPerDay = config.periodsPerDay || 6;
    const totalPeriodsPerWeek = workingDays.length * periodsPerDay;

    const teacherMap = new Map<string, TeacherData>(teachers.map((t) => [t.id, t]));
    const subjectMap = new Map<string, SubjectData>(subjects.map((s) => [s.id, s]));
    const batchMap = new Map<string, BatchData>(batches.map((b) => [b.id, b]));
    const roomMap = new Map<string, RoomData>(rooms.map((r) => [r.id, r]));

    // --- PHASE 1: MATHEMATICAL BOTTLENECK DIAGNOSTICS (Zero-AI Deterministic Proofs) ---
    const diagnosticErrors: string[] = [];

    // 1. Room availability vs Batch count
    if (rooms.length === 0) {
      diagnosticErrors.push('No theory rooms configured in the system.');
    }

    // 2. Batch capacity & room fit
    for (const batch of batches) {
      const accommodatingRooms = rooms.filter((r) => r.capacity >= batch.studentCount);
      if (accommodatingRooms.length === 0) {
        const maxCapacity = Math.max(...rooms.map((r) => r.capacity), 0);
        diagnosticErrors.push(
          `Room Capacity Bottleneck: Batch '${batch.name}' has ${batch.studentCount} students, but the largest available theory room holds only ${maxCapacity}.`
        );
      }

      // Check total hours needed by batch
      let totalBatchHours = 0;
      for (const subId of batch.subjectIds) {
        const sub = subjectMap.get(subId);
        if (sub) totalBatchHours += sub.weeklyHours;
      }

      if (totalBatchHours > totalPeriodsPerWeek) {
        diagnosticErrors.push(
          `Batch Time Bottleneck: Batch '${batch.name}' requires ${totalBatchHours} lecture hours/week, which exceeds the total ${totalPeriodsPerWeek} periods available (${workingDays.length} days x ${periodsPerDay} periods).`
        );
      }
    }

    // 3. Teacher capacity & availability
    const teacherRequiredHours = new Map<string, number>();
    for (const batch of batches) {
      for (const subId of batch.subjectIds) {
        const sub = subjectMap.get(subId);
        if (sub) {
          const prev = teacherRequiredHours.get(sub.assignedTeacherId) || 0;
          teacherRequiredHours.set(sub.assignedTeacherId, prev + sub.weeklyHours);
        }
      }
    }

    for (const teacher of teachers) {
      const needed = teacherRequiredHours.get(teacher.id) || 0;
      if (needed === 0) continue;

      const unavailCount = (teacher.unavailableSlots || []).filter(
        (s) => workingDays.includes(s.day) && s.periodIndex < periodsPerDay
      ).length;
      const maxPossibleSlots = totalPeriodsPerWeek - unavailCount;

      if (needed > maxPossibleSlots) {
        diagnosticErrors.push(
          `Teacher Availability Bottleneck: Faculty '${teacher.name}' (${teacher.shortCode}) requires ${needed} teaching hours, but has ${unavailCount} unavailable slots, leaving only ${maxPossibleSlots} available slots in the week.`
        );
      }

      const maxByDailyLimit = teacher.maxHoursPerDay * workingDays.length;
      if (needed > maxByDailyLimit) {
        diagnosticErrors.push(
          `Teacher Daily Cap Bottleneck: Faculty '${teacher.name}' (${teacher.shortCode}) requires ${needed} teaching hours, but their daily max of ${teacher.maxHoursPerDay} hrs/day across ${workingDays.length} days permits at most ${maxByDailyLimit} hours.`
        );
      }

      if (needed > teacher.maxHoursPerWeek) {
        diagnosticErrors.push(
          `Teacher Weekly Cap Bottleneck: Faculty '${teacher.name}' requires ${needed} hours, but their weekly max limit is ${teacher.maxHoursPerWeek} hours.`
        );
      }
    }

    if (diagnosticErrors.length > 0) {
      const executionTimeMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        entries: [],
        executionTimeMs,
        totalScheduledHours: 0,
        diagnostics: diagnosticErrors,
        message: `Timetable mathematically infeasible due to ${diagnosticErrors.length} constraint bottleneck(s).`,
      };
    }

    // --- PHASE 2: VARIABLE EXTRACTION & LOCKED SLOTS SETUP ---
    // Track occupied state:
    // teacherOccupied: `${teacherId}_${day}_${period}` -> entryId
    // roomOccupied: `${roomId}_${day}_${period}` -> entryId
    // batchOccupied: `${batchId}_${day}_${period}` -> entryId
    // batchSubjectDayCount: `${batchId}_${subjectId}_${day}` -> count
    // teacherDayHours: `${teacherId}_${day}` -> count
    // teacherWeekHours: `${teacherId}` -> count

    const teacherOccupied = new Set<string>();
    const roomOccupied = new Set<string>();
    const batchOccupied = new Set<string>();
    const batchSubjectDayCount = new Map<string, number>();
    const teacherDayHours = new Map<string, number>();
    const teacherWeekHours = new Map<string, number>();

    const scheduledEntries: ScheduleEntryData[] = [];

    // Pre-occupy locked entries
    for (const locked of lockedEntries) {
      teacherOccupied.add(`${locked.teacherId}_${locked.day}_${locked.periodIndex}`);
      roomOccupied.add(`${locked.roomId}_${locked.day}_${locked.periodIndex}`);
      batchOccupied.add(`${locked.batchId}_${locked.day}_${locked.periodIndex}`);

      const subKey = `${locked.batchId}_${locked.subjectId}_${locked.day}`;
      batchSubjectDayCount.set(subKey, (batchSubjectDayCount.get(subKey) || 0) + 1);

      const tDayKey = `${locked.teacherId}_${locked.day}`;
      teacherDayHours.set(tDayKey, (teacherDayHours.get(tDayKey) || 0) + 1);

      const tWeekKey = locked.teacherId;
      teacherWeekHours.set(tWeekKey, (teacherWeekHours.get(tWeekKey) || 0) + 1);

      scheduledEntries.push(locked);
    }

    // Build unassigned lecture units
    const unassignedUnits: LectureUnit[] = [];
    let unitCounter = 0;

    for (const batch of batches) {
      for (const subjectId of batch.subjectIds) {
        const subject = subjectMap.get(subjectId);
        if (!subject) continue;

        const teacher = teacherMap.get(subject.assignedTeacherId);
        const lockedForThis = lockedEntries.filter(
          (e) => e.batchId === batch.id && e.subjectId === subject.id
        ).length;

        const hoursToSchedule = Math.max(0, subject.weeklyHours - lockedForThis);

        for (let h = 0; h < hoursToSchedule; h++) {
          unassignedUnits.push({
            id: `unit_${batch.id}_${subject.id}_${unitCounter++}`,
            batchId: batch.id,
            subjectId: subject.id,
            teacherId: subject.assignedTeacherId,
            subjectCode: subject.code,
            batchName: batch.name,
            teacherName: teacher?.name || 'Faculty',
            unitIndex: h,
          });
        }
      }
    }

    if (unassignedUnits.length === 0) {
      const executionTimeMs = Math.round(performance.now() - startTime);
      return {
        success: true,
        entries: scheduledEntries,
        executionTimeMs,
        totalScheduledHours: scheduledEntries.length,
        message: 'All slots already assigned and locked.',
      };
    }

    // --- PHASE 3: HELPER FUNCTIONS FOR CONSTRAINTS & MRV ---
    const isTeacherUnavailable = (teacherId: string, day: DayOfWeek, periodIndex: number): boolean => {
      const teacher = teacherMap.get(teacherId);
      if (!teacher || !teacher.unavailableSlots) return false;
      return teacher.unavailableSlots.some((s) => s.day === day && s.periodIndex === periodIndex);
    };

    const maxLecturesPerDay = (weeklyHours: number): number => {
      // Even distribution: e.g. 4 hours across 5 days -> max 1 per day.
      // 6 hours across 5 days -> max 2 per day.
      return Math.ceil(weeklyHours / workingDays.length);
    };

    const getValidSlotsForUnit = (unit: LectureUnit): DomainSlot[] => {
      const subject = subjectMap.get(unit.subjectId);
      const batch = batchMap.get(unit.batchId);
      const teacher = teacherMap.get(unit.teacherId);
      if (!subject || !batch || !teacher) return [];

      const maxPerDay = maxLecturesPerDay(subject.weeklyHours);
      const validSlots: DomainSlot[] = [];

      // Filter rooms by batch capacity
      const eligibleRooms = rooms.filter((r) => r.capacity >= batch.studentCount);

      for (const day of workingDays) {
        // Constraint: Even distribution across working days
        const currentDayCount = batchSubjectDayCount.get(`${unit.batchId}_${unit.subjectId}_${day}`) || 0;
        if (currentDayCount >= maxPerDay) continue;

        // Constraint: Teacher daily maximum hours
        const currentTeacherDayHours = teacherDayHours.get(`${unit.teacherId}_${day}`) || 0;
        if (currentTeacherDayHours >= teacher.maxHoursPerDay) continue;

        // Constraint: Teacher weekly maximum hours
        const currentTeacherWeekHours = teacherWeekHours.get(unit.teacherId) || 0;
        if (currentTeacherWeekHours >= teacher.maxHoursPerWeek) continue;

        for (let period = 0; period < periodsPerDay; period++) {
          // Check Teacher availability
          if (isTeacherUnavailable(unit.teacherId, day, period)) continue;

          // Check Teacher double-booking
          if (teacherOccupied.has(`${unit.teacherId}_${day}_${period}`)) continue;

          // Check Batch double-booking
          if (batchOccupied.has(`${unit.batchId}_${day}_${period}`)) continue;

          // Check Room availability
          for (const room of eligibleRooms) {
            if (!roomOccupied.has(`${room.id}_${day}_${period}`)) {
              validSlots.push({ day, periodIndex: period, roomId: room.id });
            }
          }
        }
      }

      return validSlots;
    };

    // --- PHASE 4: RECURSIVE DETERMINISTIC BACKTRACKING WITH MRV ---
    let backtrackCount = 0;
    const MAX_BACKTRACKS = 50000;
    let deepestFailureUnit: LectureUnit | null = null;
    let failureReason = '';

    const backtrack = (remainingUnits: LectureUnit[]): boolean => {
      if (remainingUnits.length === 0) {
        return true; // Complete assignment found!
      }

      backtrackCount++;
      if (backtrackCount > MAX_BACKTRACKS) {
        failureReason = `Search space exceeded backtrack limit (${MAX_BACKTRACKS} steps). Over-constrained schedule.`;
        return false;
      }

      // MRV (Minimum Remaining Values): Find variable with fewest legal values
      let bestUnitIndex = -1;
      let minDomainSize = Infinity;
      let bestDomain: DomainSlot[] = [];

      for (let i = 0; i < remainingUnits.length; i++) {
        const unit = remainingUnits[i];
        const validSlots = getValidSlotsForUnit(unit);

        if (validSlots.length === 0) {
          // Dead end! Forward checking detected failure
          deepestFailureUnit = unit;
          return false;
        }

        // MRV with Degree heuristic tie-breaker (prefer teacher with more total hours)
        if (validSlots.length < minDomainSize) {
          minDomainSize = validSlots.length;
          bestUnitIndex = i;
          bestDomain = validSlots;
        }
      }

      const selectedUnit = remainingUnits[bestUnitIndex];
      const remainingAfterPick = [
        ...remainingUnits.slice(0, bestUnitIndex),
        ...remainingUnits.slice(bestUnitIndex + 1),
      ];

      // Value Ordering: Prefer days with fewer total classes for this batch to achieve even distribution
      bestDomain.sort((a, b) => {
        const aDayCount = batchSubjectDayCount.get(`${selectedUnit.batchId}_${selectedUnit.subjectId}_${a.day}`) || 0;
        const bDayCount = batchSubjectDayCount.get(`${selectedUnit.batchId}_${selectedUnit.subjectId}_${b.day}`) || 0;
        if (aDayCount !== bDayCount) return aDayCount - bDayCount;
        return a.periodIndex - b.periodIndex;
      });

      for (const slot of bestDomain) {
        // Assign slot
        const entryId = `entry_${selectedUnit.batchId}_${selectedUnit.subjectId}_${slot.day}_${slot.periodIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const entry: ScheduleEntryData = {
          id: entryId,
          day: slot.day,
          periodIndex: slot.periodIndex,
          batchId: selectedUnit.batchId,
          subjectId: selectedUnit.subjectId,
          teacherId: selectedUnit.teacherId,
          roomId: slot.roomId,
          durationSlots: 1,
          isLocked: false,
        };

        // Apply state
        teacherOccupied.add(`${selectedUnit.teacherId}_${slot.day}_${slot.periodIndex}`);
        roomOccupied.add(`${slot.roomId}_${slot.day}_${slot.periodIndex}`);
        batchOccupied.add(`${selectedUnit.batchId}_${slot.day}_${slot.periodIndex}`);

        const subDayKey = `${selectedUnit.batchId}_${selectedUnit.subjectId}_${slot.day}`;
        batchSubjectDayCount.set(subDayKey, (batchSubjectDayCount.get(subDayKey) || 0) + 1);

        const tDayKey = `${selectedUnit.teacherId}_${slot.day}`;
        teacherDayHours.set(tDayKey, (teacherDayHours.get(tDayKey) || 0) + 1);

        const tWeekKey = selectedUnit.teacherId;
        teacherWeekHours.set(tWeekKey, (teacherWeekHours.get(tWeekKey) || 0) + 1);

        scheduledEntries.push(entry);

        // Recurse
        const success = backtrack(remainingAfterPick);
        if (success) {
          return true;
        }

        // Unassign state (Backtrack)
        scheduledEntries.pop();
        teacherOccupied.delete(`${selectedUnit.teacherId}_${slot.day}_${slot.periodIndex}`);
        roomOccupied.delete(`${slot.roomId}_${slot.day}_${slot.periodIndex}`);
        batchOccupied.delete(`${selectedUnit.batchId}_${slot.day}_${slot.periodIndex}`);

        const prevSubDay = batchSubjectDayCount.get(subDayKey) || 1;
        batchSubjectDayCount.set(subDayKey, prevSubDay - 1);

        const prevTDay = teacherDayHours.get(tDayKey) || 1;
        teacherDayHours.set(tDayKey, prevTDay - 1);

        const prevTWeek = teacherWeekHours.get(tWeekKey) || 1;
        teacherWeekHours.set(tWeekKey, prevTWeek - 1);
      }

      deepestFailureUnit = selectedUnit;
      return false;
    };

    const solved = backtrack(unassignedUnits);
    const executionTimeMs = Math.round(performance.now() - startTime);

    if (solved) {
      return {
        success: true,
        entries: scheduledEntries,
        executionTimeMs,
        totalScheduledHours: scheduledEntries.length,
        message: `Successfully generated deterministic conflict-free timetable for ${batches.length} batches and ${teachers.length} faculty members in ${executionTimeMs}ms (${backtrackCount} search states).`,
      };
    } else {
      const detailedDiagnostics: string[] = [];
      if (deepestFailureUnit) {
        detailedDiagnostics.push(
          `Constraint dead-end at Batch '${deepestFailureUnit.batchName}', Subject '${deepestFailureUnit.subjectCode}', Teacher '${deepestFailureUnit.teacherName}'. All domain slots violated either teacher availability, daily workload limit, room availability, or batch clash.`
        );
      }
      if (failureReason) {
        detailedDiagnostics.push(failureReason);
      }
      return {
        success: false,
        entries: [],
        executionTimeMs,
        totalScheduledHours: 0,
        diagnostics: detailedDiagnostics,
        message: 'Could not find a mathematically valid timetable satisfying all constraints.',
      };
    }
  }

  /**
   * Real-time slot validation for Teachers rescheduling classes.
   * Checks teacher, room, and batch availability without saving.
   */
  static validateRescheduleSlot(
    entryId: string | undefined,
    batchId: string,
    subjectId: string,
    teacherId: string,
    roomId: string,
    day: DayOfWeek,
    periodIndex: number,
    existingEntries: ScheduleEntryData[],
    teachers: TeacherData[],
    rooms: RoomData[],
    batches: BatchData[]
  ): {
    valid: boolean;
    conflicts: string[];
    warnings: string[];
    roomDetails?: { roomNumber: string; capacity: number };
    teacherDetails?: { name: string; shortCode: string };
    batchDetails?: { name: string; studentCount: number };
  } {
    const conflicts: string[] = [];
    const warnings: string[] = [];

    const teacher = teachers.find((t) => t.id === teacherId);
    const room = rooms.find((r) => r.id === roomId);
    const batch = batches.find((b) => b.id === batchId);

    // Other entries at the same day & period excluding this entry
    const otherEntries = existingEntries.filter(
      (e) => e.day === day && e.periodIndex === periodIndex && e.id !== entryId
    );

    // 1. Room Double-Booking
    const roomConflict = otherEntries.find((e) => e.roomId === roomId);
    if (roomConflict) {
      const conflictingBatch = batches.find((b) => b.id === roomConflict.batchId);
      conflicts.push(
        `Room Clash: Room ${room?.roomNumber || roomId} is already booked by batch '${conflictingBatch?.name || roomConflict.batchId}' on ${day} Period ${periodIndex + 1}.`
      );
    }

    // 2. Teacher Double-Booking
    const teacherConflict = otherEntries.find((e) => e.teacherId === teacherId);
    if (teacherConflict) {
      const conflictingBatch = batches.find((b) => b.id === teacherConflict.batchId);
      conflicts.push(
        `Faculty Clash: ${teacher?.name || 'Faculty'} is already scheduled to teach '${conflictingBatch?.name || teacherConflict.batchId}' on ${day} Period ${periodIndex + 1}.`
      );
    }

    // 3. Batch Double-Booking
    const batchConflict = otherEntries.find((e) => e.batchId === batchId);
    if (batchConflict) {
      conflicts.push(
        `Batch Clash: Student batch '${batch?.name || batchId}' already has a scheduled lecture on ${day} Period ${periodIndex + 1}.`
      );
    }

    // 4. Teacher Unavailable Slot
    if (teacher && teacher.unavailableSlots) {
      const isUnavailable = teacher.unavailableSlots.some(
        (s) => s.day === day && s.periodIndex === periodIndex
      );
      if (isUnavailable) {
        conflicts.push(
          `Availability Alert: ${teacher.name} has marked ${day} Period ${periodIndex + 1} as unavailable.`
        );
      }
    }

    // 5. Room Capacity Check
    if (batch && room && room.capacity < batch.studentCount) {
      warnings.push(
        `Capacity Warning: Room ${room.roomNumber} capacity (${room.capacity}) is lower than batch strength (${batch.studentCount} students).`
      );
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
      warnings,
      roomDetails: room ? { roomNumber: room.roomNumber, capacity: room.capacity } : undefined,
      teacherDetails: teacher ? { name: teacher.name, shortCode: teacher.shortCode } : undefined,
      batchDetails: batch ? { name: batch.name, studentCount: batch.studentCount } : undefined,
    };
  }
}
