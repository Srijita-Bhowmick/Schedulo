export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface UnavailableSlot {
  day: DayOfWeek;
  periodIndex?: number;
  startMinute?: number;
  endMinute?: number;
}

export interface TeacherData {
  id: string;
  name: string;
  shortCode: string;
  email?: string;
  department?: string;
  departmentIds?: string[];
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
  departmentId?: string;
  isShared?: boolean;
}

export interface SubjectData {
  id: string;
  code: string;
  name: string;
  type: string;
  weeklyHours: number;
  durationSlots: number;
  assignedTeacherId: string;
  departmentId?: string;
  preferredRoomType?: string;
  allowTwoHourBlock?: boolean;
  isDoubleBlock?: boolean;
  color?: string;
}

export interface BatchData {
  id: string;
  name: string;
  department: string;
  departmentId?: string;
  semester: number;
  section?: string;
  studentCount: number;
  subjectIds: string[];
}

export interface DepartmentConfig {
  id: string;
  name: string;
  code: string;
  workingDays: DayOfWeek[];
  dayStartTime: string; // e.g. "09:00" or "09:30"
  periodDurationMins: number; // e.g. 60 or 50
  periodsPerDay: number;
}

export interface ScheduleEntryData {
  id: string;
  day: DayOfWeek;
  periodIndex: number;
  startMinute: number;
  endMinute: number;
  batchId: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
  departmentId?: string;
  durationSlots?: number;
  isLocked?: boolean;
}

export interface SolverTelemetry {
  solveTimeMs: number;
  backtracksCount: number;
  constraintsChecked: number;
}

export interface SolverResult {
  success: boolean;
  entries: ScheduleEntryData[];
  unplacedSubjects: SubjectData[];
  executionTimeMs: number;
  totalScheduledHours: number;
  diagnostics?: string[];
  message: string;
  telemetry: SolverTelemetry;
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
  durationSlots: number;
  departmentId?: string;
}

interface DomainSlot {
  day: DayOfWeek;
  periodIndex: number;
  startMinute: number;
  endMinute: number;
  roomId: string;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [hours, mins] = timeStr.split(':').map((n) => parseInt(n, 10));
  return (hours || 0) * 60 + (mins || 0);
}

export function formatMinutesToTime(totalMins: number): string {
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Exact minute-interval overlap math:
 * Two time spans [startA, endA] and [startB, endB] overlap if and only if
 * startA < endB && startB < endA
 */
export function isMinuteOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

/**
 * Fixed College-Wide Lunch Recess: 13:00 (780 min) to 14:00 (840 min)
 */
export const LUNCH_START_MINUTE = 780; // 13:00
export const LUNCH_END_MINUTE = 840;   // 14:00

export function overlapsLunchBreak(startMinute: number, endMinute: number): boolean {
  return isMinuteOverlap(startMinute, endMinute, LUNCH_START_MINUTE, LUNCH_END_MINUTE);
}

export class BacktrackingSolver {
  /**
   * Deterministic Backtracking CSP Solver using:
   * - Minimum Remaining Values (MRV) heuristic
   * - Exact minute-interval collision checking (startA < endB && startB < endA)
   * - Cross-department shared resource locking & route-around
   * - Maximum 2 consecutive classes in a row per teacher
   * - Strictly once per day per subject per batch
   * - Locked 13:00–14:00 lunch break
   * - Hybrid partial solutions with bottleneck diagnostics for unsolvable constraints
   */
  static solveDepartment(
    department: DepartmentConfig,
    rooms: RoomData[],
    teachers: TeacherData[],
    batches: BatchData[],
    subjects: SubjectData[],
    lockedEntries: ScheduleEntryData[] = []
  ): SolverResult {
    const startTimestamp = performance.now();
    let backtracksCount = 0;
    let constraintsChecked = 0;

    const workingDays = department.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periodsPerDay = department.periodsPerDay || 6;
    const periodDurationMins = department.periodDurationMins || 60;
    const dayStartMinute = parseTimeToMinutes(department.dayStartTime || '09:00');

    const teacherMap = new Map<string, TeacherData>(teachers.map((t) => [t.id, t]));
    const subjectMap = new Map<string, SubjectData>(subjects.map((s) => [s.id, s]));
    const batchMap = new Map<string, BatchData>(batches.map((b) => [b.id, b]));
    const roomMap = new Map<string, RoomData>(rooms.map((r) => [r.id, r]));

    // --- PHASE 1: MATHEMATICAL BOTTLENECK DIAGNOSTICS ---
    const diagnosticErrors: string[] = [];

    if (rooms.length === 0) {
      diagnosticErrors.push(`No theory lecture halls available for department ${department.code}.`);
    }

    for (const batch of batches) {
      const accommodatingRooms = rooms.filter((r) => r.capacity >= batch.studentCount);
      if (accommodatingRooms.length === 0) {
        const maxCapacity = Math.max(...rooms.map((r) => r.capacity), 0);
        diagnosticErrors.push(
          `Room Capacity Bottleneck: Batch '${batch.name}' has ${batch.studentCount} students, but the largest available theory room holds only ${maxCapacity}.`
        );
      }

      let totalBatchHours = 0;
      for (const subId of batch.subjectIds) {
        const sub = subjectMap.get(subId);
        if (sub) totalBatchHours += sub.weeklyHours;
      }

      const totalPeriodsPerWeek = workingDays.length * periodsPerDay;
      if (totalBatchHours > totalPeriodsPerWeek) {
        diagnosticErrors.push(
          `Batch Time Bottleneck: Batch '${batch.name}' requires ${totalBatchHours} lecture hours/week, which exceeds the total ${totalPeriodsPerWeek} periods available (${workingDays.length} days x ${periodsPerDay} periods).`
        );
      }
    }

    // Teacher load & availability checks
    for (const teacher of teachers) {
      const teacherSubjects = subjects.filter((s) => s.assignedTeacherId === teacher.id);
      const totalTeachingHours = teacherSubjects.reduce((sum, s) => sum + s.weeklyHours, 0);

      const totalPossibleSlots = workingDays.length * periodsPerDay;
      const unavailableCount = teacher.unavailableSlots ? teacher.unavailableSlots.length : 0;
      const availableSlots = totalPossibleSlots - unavailableCount;

      if (totalTeachingHours > availableSlots) {
        diagnosticErrors.push(
          `Teacher Availability Bottleneck: Faculty '${teacher.name}' (${teacher.shortCode}) requires ${totalTeachingHours} teaching hours, but has ${unavailableCount} unavailable slots, leaving only ${availableSlots} available slots in the week.`
        );
      }

      if (totalTeachingHours > teacher.maxHoursPerWeek) {
        diagnosticErrors.push(
          `Teacher Weekly Cap Bottleneck: Faculty '${teacher.name}' requires ${totalTeachingHours} hours, but their weekly max limit is ${teacher.maxHoursPerWeek} hours.`
        );
      }

      const maxTheoreticalAcrossDays = workingDays.length * teacher.maxHoursPerDay;
      if (totalTeachingHours > maxTheoreticalAcrossDays) {
        diagnosticErrors.push(
          `Teacher Daily Cap Bottleneck: Faculty '${teacher.name}' (${teacher.shortCode}) requires ${totalTeachingHours} teaching hours, but their daily max of ${teacher.maxHoursPerDay} hrs/day across ${workingDays.length} days permits at most ${maxTheoreticalAcrossDays} hours.`
        );
      }
    }

    if (diagnosticErrors.length > 0) {
      const elapsed = Math.round(performance.now() - startTimestamp);
      return {
        success: false,
        entries: [],
        unplacedSubjects: subjects,
        executionTimeMs: elapsed,
        totalScheduledHours: 0,
        diagnostics: diagnosticErrors,
        message: `Solver halted: ${diagnosticErrors.length} mathematical constraint contradictions detected.`,
        telemetry: {
          solveTimeMs: elapsed,
          backtracksCount: 0,
          constraintsChecked: diagnosticErrors.length,
        },
      };
    }

    // --- PHASE 2: GENERATE VALID PERIOD SLOTS WITH EXACT MINUTE INTERVALS ---
    const allSlotCoordinates: Array<{
      day: DayOfWeek;
      periodIndex: number;
      startMinute: number;
      endMinute: number;
    }> = [];

    for (const day of workingDays) {
      let currentPeriodMinute = dayStartMinute;

      for (let p = 0; p < periodsPerDay; p++) {
        let periodStart = currentPeriodMinute;
        let periodEnd = periodStart + periodDurationMins;

        // If this period overlaps with the lunch break (13:00 - 14:00 / 780 - 840),
        // adjust period to resume strictly after lunch break at 14:00 (840)
        if (overlapsLunchBreak(periodStart, periodEnd)) {
          periodStart = Math.max(periodStart, LUNCH_END_MINUTE);
          periodEnd = periodStart + periodDurationMins;
        }

        allSlotCoordinates.push({
          day,
          periodIndex: p,
          startMinute: periodStart,
          endMinute: periodEnd,
        });

        currentPeriodMinute = periodEnd;
      }
    }

    // --- PHASE 3: EXPAND SUBJECTS INTO DISCRETE 1-HR / 2-HR LECTURE UNITS ---
    const lectureUnits: LectureUnit[] = [];

    for (const batch of batches) {
      for (const subId of batch.subjectIds) {
        const sub = subjectMap.get(subId);
        if (!sub) continue;

        let hoursLeft = sub.weeklyHours;
        let unitIdx = 0;

        // Check if 2-hour continuous block is enabled and hours allow
        const wantsDoubleBlock = Boolean(sub.allowTwoHourBlock || sub.isDoubleBlock);
        if (wantsDoubleBlock && hoursLeft >= 2) {
          lectureUnits.push({
            id: `unit_${batch.id}_${sub.id}_${unitIdx++}`,
            batchId: batch.id,
            subjectId: sub.id,
            teacherId: sub.assignedTeacherId,
            subjectCode: sub.code,
            batchName: batch.name,
            teacherName: teacherMap.get(sub.assignedTeacherId)?.name || 'Faculty',
            unitIndex: unitIdx,
            durationSlots: 2,
            departmentId: department.id,
          });
          hoursLeft -= 2;
        }

        while (hoursLeft > 0) {
          lectureUnits.push({
            id: `unit_${batch.id}_${sub.id}_${unitIdx++}`,
            batchId: batch.id,
            subjectId: sub.id,
            teacherId: sub.assignedTeacherId,
            subjectCode: sub.code,
            batchName: batch.name,
            teacherName: teacherMap.get(sub.assignedTeacherId)?.name || 'Faculty',
            unitIndex: unitIdx,
            durationSlots: 1,
            departmentId: department.id,
          });
          hoursLeft -= 1;
        }
      }
    }

    // --- PHASE 4: INITIALIZE OCCUPANCY TRACKERS FOR EXACT MINUTE INTERVALS ---
    // Key format: `${day}` -> Array of assigned intervals
    interface AssignedInterval {
      startMinute: number;
      endMinute: number;
      teacherId: string;
      roomId: string;
      batchId: string;
      subjectId: string;
      periodIndex: number;
      departmentId?: string;
      isLocked?: boolean;
    }

    const dayIntervalMap = new Map<DayOfWeek, AssignedInterval[]>();
    for (const day of workingDays) {
      dayIntervalMap.set(day, []);
    }

    // Populate with pre-existing locked entries from first-published departments
    for (const locked of lockedEntries) {
      const list = dayIntervalMap.get(locked.day) || [];
      list.push({
        startMinute: locked.startMinute,
        endMinute: locked.endMinute,
        teacherId: locked.teacherId,
        roomId: locked.roomId,
        batchId: locked.batchId,
        subjectId: locked.subjectId,
        periodIndex: locked.periodIndex,
        departmentId: locked.departmentId,
        isLocked: true,
      });
      dayIntervalMap.set(locked.day, list);
    }

    // Track daily counts per batch/subject and daily hours per teacher
    const teacherDailyHours = new Map<string, number>(); // `${teacherId}_${day}` -> hours
    const batchDailySubject = new Map<string, number>(); // `${batchId}_${subjectId}_${day}` -> count

    // Initialize from locked entries
    for (const locked of lockedEntries) {
      const tKey = `${locked.teacherId}_${locked.day}`;
      teacherDailyHours.set(tKey, (teacherDailyHours.get(tKey) || 0) + 1);

      const bsKey = `${locked.batchId}_${locked.subjectId}_${locked.day}`;
      batchDailySubject.set(bsKey, (batchDailySubject.get(bsKey) || 0) + 1);
    }

    // --- PHASE 5: MRV HEURISTIC DOMAIN COMPUTATION ---
    const computeDomainsForUnit = (unit: LectureUnit): DomainSlot[] => {
      const teacher = teacherMap.get(unit.teacherId);
      const batch = batchMap.get(unit.batchId);
      const validRooms = rooms.filter((r) => r.capacity >= (batch?.studentCount || 0));

      const domains: DomainSlot[] = [];

      for (const slot of allSlotCoordinates) {
        constraintsChecked++;

        // 1. Check fixed lunch break overlap
        if (overlapsLunchBreak(slot.startMinute, slot.endMinute)) {
          continue;
        }

        // 2. Check strictly once per day per subject per batch (even distribution)
        const bsKey = `${unit.batchId}_${unit.subjectId}_${slot.day}`;
        if ((batchDailySubject.get(bsKey) || 0) > 0) {
          continue;
        }

        // 3. Check teacher daily cap
        const tDayKey = `${unit.teacherId}_${slot.day}`;
        const currentTeacherDaily = teacherDailyHours.get(tDayKey) || 0;
        if (teacher && currentTeacherDaily + unit.durationSlots > teacher.maxHoursPerDay) {
          continue;
        }

        // 4. Check teacher unavailable slots
        if (teacher && teacher.unavailableSlots) {
          const isUnavailable = teacher.unavailableSlots.some((u) => {
            if (u.day !== slot.day) return false;
            if (u.periodIndex !== undefined && u.periodIndex === slot.periodIndex) return true;
            if (u.startMinute !== undefined && u.endMinute !== undefined) {
              return isMinuteOverlap(slot.startMinute, slot.endMinute, u.startMinute, u.endMinute);
            }
            return false;
          });
          if (isUnavailable) continue;
        }

        // 5. Check exact minute collision against currently scheduled day intervals
        const existingOnDay = dayIntervalMap.get(slot.day) || [];

        // Teacher overlap check: teacher cannot teach anywhere else at an overlapping minute
        const teacherOverlap = existingOnDay.some(
          (ex) =>
            ex.teacherId === unit.teacherId &&
            isMinuteOverlap(slot.startMinute, slot.endMinute, ex.startMinute, ex.endMinute)
        );
        if (teacherOverlap) continue;

        // Batch overlap check: batch cannot have two classes at an overlapping minute
        const batchOverlap = existingOnDay.some(
          (ex) =>
            ex.batchId === unit.batchId &&
            isMinuteOverlap(slot.startMinute, slot.endMinute, ex.startMinute, ex.endMinute)
        );
        if (batchOverlap) continue;

        // Max 2 consecutive classes in a row check for teacher:
        // Find if teacher already has classes in periodIndex - 1 and periodIndex - 2, or periodIndex + 1 and periodIndex + 2
        const teacherPeriodsOnDay = existingOnDay
          .filter((ex) => ex.teacherId === unit.teacherId)
          .map((ex) => ex.periodIndex);

        if (
          (teacherPeriodsOnDay.includes(slot.periodIndex - 1) &&
            teacherPeriodsOnDay.includes(slot.periodIndex - 2)) ||
          (teacherPeriodsOnDay.includes(slot.periodIndex + 1) &&
            teacherPeriodsOnDay.includes(slot.periodIndex + 2)) ||
          (teacherPeriodsOnDay.includes(slot.periodIndex - 1) &&
            teacherPeriodsOnDay.includes(slot.periodIndex + 1))
        ) {
          continue;
        }

        // 6. Check room availability
        for (const room of validRooms) {
          const roomOverlap = existingOnDay.some(
            (ex) =>
              ex.roomId === room.id &&
              isMinuteOverlap(slot.startMinute, slot.endMinute, ex.startMinute, ex.endMinute)
          );
          if (!roomOverlap) {
            domains.push({
              day: slot.day,
              periodIndex: slot.periodIndex,
              startMinute: slot.startMinute,
              endMinute: slot.endMinute,
              roomId: room.id,
            });
          }
        }
      }

      return domains;
    };

    // --- PHASE 6: DETERMINISTIC BACKTRACKING RECURSION ---
    const assignmentMap = new Map<string, DomainSlot>(); // unit.id -> DomainSlot

    const backtrack = (unassignedUnits: LectureUnit[]): boolean => {
      if (unassignedUnits.length === 0) {
        return true;
      }

      // Minimum Remaining Values (MRV): Sort units by domain size ascending
      const unitDomainPairs: Array<{ unit: LectureUnit; domains: DomainSlot[] }> = [];

      for (const unit of unassignedUnits) {
        const domains = computeDomainsForUnit(unit);
        if (domains.length === 0) {
          // Failure branch: forward-checking domain wipeout
          backtracksCount++;
          return false;
        }
        unitDomainPairs.push({ unit, domains });
      }

      // Select most-constrained unit (MRV)
      unitDomainPairs.sort((a, b) => a.domains.length - b.domains.length);
      const chosen = unitDomainPairs[0];

      // Value ordering: Spread evenly across working days
      chosen.domains.sort((a, b) => {
        const countA = dayIntervalMap.get(a.day)?.length || 0;
        const countB = dayIntervalMap.get(b.day)?.length || 0;
        return countA - countB;
      });

      for (const slot of chosen.domains) {
        // Assign
        assignmentMap.set(chosen.unit.id, slot);

        const dayList = dayIntervalMap.get(slot.day)!;
        const assignedInterval: AssignedInterval = {
          startMinute: slot.startMinute,
          endMinute: slot.endMinute,
          teacherId: chosen.unit.teacherId,
          roomId: slot.roomId,
          batchId: chosen.unit.batchId,
          subjectId: chosen.unit.subjectId,
          periodIndex: slot.periodIndex,
          departmentId: department.id,
          isLocked: false,
        };
        dayList.push(assignedInterval);

        const tDayKey = `${chosen.unit.teacherId}_${slot.day}`;
        teacherDailyHours.set(tDayKey, (teacherDailyHours.get(tDayKey) || 0) + chosen.unit.durationSlots);

        const bsKey = `${chosen.unit.batchId}_${chosen.unit.subjectId}_${slot.day}`;
        batchDailySubject.set(bsKey, (batchDailySubject.get(bsKey) || 0) + 1);

        const remaining = unassignedUnits.filter((u) => u.id !== chosen.unit.id);
        const success = backtrack(remaining);
        if (success) return true;

        // Undo assignment (Backtrack)
        backtracksCount++;
        assignmentMap.delete(chosen.unit.id);
        const idx = dayList.indexOf(assignedInterval);
        if (idx !== -1) dayList.splice(idx, 1);

        teacherDailyHours.set(tDayKey, (teacherDailyHours.get(tDayKey) || 0) - chosen.unit.durationSlots);
        batchDailySubject.set(bsKey, (batchDailySubject.get(bsKey) || 0) - 1);
      }

      return false;
    };

    const isComplete = backtrack([...lectureUnits]);
    const executionTimeMs = Math.round(performance.now() - startTimestamp);

    // Build schedule entries
    const generatedEntries: ScheduleEntryData[] = [];
    const unplacedSubjects: SubjectData[] = [];

    for (const unit of lectureUnits) {
      const slot = assignmentMap.get(unit.id);
      if (slot) {
        generatedEntries.push({
          id: `entry_${unit.batchId}_${unit.subjectId}_${slot.day}_${slot.periodIndex}`,
          day: slot.day,
          periodIndex: slot.periodIndex,
          startMinute: slot.startMinute,
          endMinute: slot.endMinute,
          batchId: unit.batchId,
          subjectId: unit.subjectId,
          teacherId: unit.teacherId,
          roomId: slot.roomId,
          departmentId: department.id,
          durationSlots: unit.durationSlots,
          isLocked: false,
        });
      } else {
        const sub = subjectMap.get(unit.subjectId);
        if (sub && !unplacedSubjects.includes(sub)) {
          unplacedSubjects.push(sub);
        }
      }
    }

    const telemetry: SolverTelemetry = {
      solveTimeMs: executionTimeMs,
      backtracksCount,
      constraintsChecked,
    };

    if (isComplete) {
      return {
        success: true,
        entries: generatedEntries,
        unplacedSubjects: [],
        executionTimeMs,
        totalScheduledHours: generatedEntries.length,
        message: `Deterministic conflict-free schedule generated in ${executionTimeMs}ms (${backtracksCount} backtracks). Zero minute-interval clashes.`,
        telemetry,
      };
    } else {
      // Hybrid partial solution: Keep all valid assignments, diagnose unplaced subjects
      const bottlenecks: string[] = [];
      for (const unplaced of unplacedSubjects) {
        const teacher = teacherMap.get(unplaced.assignedTeacherId);
        bottlenecks.push(
          `Unplaced subject ${unplaced.code} (${unplaced.name}): Teacher ${teacher?.name} or theory rooms exhausted under current working days & start time (${department.dayStartTime}).`
        );
      }

      return {
        success: false,
        entries: generatedEntries,
        unplacedSubjects,
        executionTimeMs,
        totalScheduledHours: generatedEntries.length,
        diagnostics: bottlenecks,
        message: `Partial schedule generated: ${generatedEntries.length} lecture hours placed, ${unplacedSubjects.length} subjects unplaced due to constraint saturation.`,
        telemetry,
      };
    }
  }
}
