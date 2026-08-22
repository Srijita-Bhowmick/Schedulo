import { ScheduleEntry, Teacher, Room, Subject, BatchSection, TimeSlotConfig, ConflictReport } from '../types';
import { isValidConsecutiveBlock } from './timeUtils';

export function detectAllClashes(
  entries: ScheduleEntry[],
  teachers: Teacher[],
  rooms: Room[],
  subjects: Subject[],
  batches: BatchSection[],
  config: TimeSlotConfig
): ConflictReport[] {
  const reports: ConflictReport[] = [];

  const teacherMap = new Map<string, Teacher>(teachers.map((t) => [t.id, t]));
  const roomMap = new Map<string, Room>(rooms.map((r) => [r.id, r]));
  const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));
  const batchMap = new Map<string, BatchSection>(batches.map((b) => [b.id, b]));

  // Key format: `${day}_${periodIndex}` -> list of entries
  const slotEntriesMap = new Map<string, ScheduleEntry[]>();

  for (const entry of entries) {
    const key = `${entry.day}_${entry.periodIndex}`;
    if (!slotEntriesMap.has(key)) {
      slotEntriesMap.set(key, []);
    }
    slotEntriesMap.get(key)!.push(entry);
  }

  // 1. Check Slot Overlaps (Teacher, Room, Batch clashes)
  slotEntriesMap.forEach((slotList, key) => {
    const [day, periodIndexStr] = key.split('_');
    const periodIndex = parseInt(periodIndexStr, 10);

    // Check Teacher Clashes
    const teacherUsage = new Map<string, ScheduleEntry[]>();
    // Check Room Clashes
    const roomUsage = new Map<string, ScheduleEntry[]>();
    // Check Batch Clashes
    const batchUsage = new Map<string, ScheduleEntry[]>();

    for (const entry of slotList) {
      // Teacher
      if (!teacherUsage.has(entry.teacherId)) {
        teacherUsage.set(entry.teacherId, []);
      }
      teacherUsage.get(entry.teacherId)!.push(entry);

      // Room
      if (!roomUsage.has(entry.roomId)) {
        roomUsage.set(entry.roomId, []);
      }
      roomUsage.get(entry.roomId)!.push(entry);

      // Batch
      if (!batchUsage.has(entry.batchId)) {
        batchUsage.set(entry.batchId, []);
      }
      batchUsage.get(entry.batchId)!.push(entry);
    }

    // Report Teacher clashes
    teacherUsage.forEach((teacherEntries, teacherId) => {
      if (teacherEntries.length > 1) {
        const teacher = teacherMap.get(teacherId);
        const batchNames = teacherEntries
          .map((e) => batchMap.get(e.batchId)?.name || e.batchId)
          .join(', ');
        reports.push({
          id: `t_clash_${key}_${teacherId}`,
          type: 'TEACHER_CLASH',
          severity: 'error',
          day: day as any,
          periodIndex,
          involvedEntryIds: teacherEntries.map((e) => e.id),
          message: `Faculty Clash: ${teacher?.name || 'Teacher'} (${teacher?.shortCode}) is double-booked across batches [${batchNames}] on ${day} Period ${periodIndex + 1}.`,
        });
      }
    });

    // Report Room clashes
    roomUsage.forEach((roomEntries, roomId) => {
      if (roomEntries.length > 1) {
        const room = roomMap.get(roomId);
        const batchNames = roomEntries
          .map((e) => batchMap.get(e.batchId)?.name || e.batchId)
          .join(', ');
        reports.push({
          id: `r_clash_${key}_${roomId}`,
          type: 'ROOM_CLASH',
          severity: 'error',
          day: day as any,
          periodIndex,
          involvedEntryIds: roomEntries.map((e) => e.id),
          message: `Room Collision: Room ${room?.roomNumber || roomId} is double-booked by [${batchNames}] on ${day} Period ${periodIndex + 1}.`,
        });
      }
    });

    // Report Batch clashes
    batchUsage.forEach((batchEntries, batchId) => {
      if (batchEntries.length > 1) {
        const batch = batchMap.get(batchId);
        const subjectNames = batchEntries
          .map((e) => subjectMap.get(e.subjectId)?.name || e.subjectId)
          .join(', ');
        reports.push({
          id: `b_clash_${key}_${batchId}`,
          type: 'BATCH_CLASH',
          severity: 'error',
          day: day as any,
          periodIndex,
          involvedEntryIds: batchEntries.map((e) => e.id),
          message: `Batch Conflict: Batch ${batch?.name || batchId} has overlapping classes [${subjectNames}] at the same time.`,
        });
      }
    });
  });

  // 2. Check Teacher Unavailability, Room Type Mismatches, Capacity Warnings, Lab Disruption
  for (const entry of entries) {
    const teacher = teacherMap.get(entry.teacherId);
    const room = roomMap.get(entry.roomId);
    const subject = subjectMap.get(entry.subjectId);
    const batch = batchMap.get(entry.batchId);

    // Teacher Unavailable slot check
    if (teacher && teacher.unavailableSlots) {
      const isUnavailable = teacher.unavailableSlots.some(
        (s) => s.day === entry.day && s.periodIndex === entry.periodIndex
      );
      if (isUnavailable) {
        reports.push({
          id: `unavail_${entry.id}`,
          type: 'UNAVAILABLE_SLOT',
          severity: 'warning',
          day: entry.day,
          periodIndex: entry.periodIndex,
          involvedEntryIds: [entry.id],
          message: `Availability Alert: ${teacher.name} has marked ${entry.day} Period ${entry.periodIndex + 1} as unavailable.`,
        });
      }
    }

    // Room Type Mismatch
    if (subject && room && subject.preferredRoomType && subject.preferredRoomType !== room.type) {
      reports.push({
        id: `room_type_${entry.id}`,
        type: 'ROOM_TYPE_MISMATCH',
        severity: 'warning',
        day: entry.day,
        periodIndex: entry.periodIndex,
        involvedEntryIds: [entry.id],
        message: `Facility Mismatch: ${subject.name} prefers a ${formatRoomTypeName(subject.preferredRoomType)} but is scheduled in ${room.roomNumber} (${formatRoomTypeName(room.type)}).`,
      });
    }

    // Capacity Warning
    if (batch && room && room.capacity < batch.studentCount) {
      reports.push({
        id: `cap_${entry.id}`,
        type: 'CAPACITY_WARNING',
        severity: 'warning',
        day: entry.day,
        periodIndex: entry.periodIndex,
        involvedEntryIds: [entry.id],
        message: `Capacity Warning: ${room.roomNumber} capacity (${room.capacity}) is lower than batch strength (${batch.studentCount} students) for ${batch.name}.`,
      });
    }
  }

  // 3. Faculty Overload Checks (Max hours per day & week)
  const teacherDailyHours = new Map<string, number>(); // `${teacherId}_${day}` -> count
  const teacherWeeklyHours = new Map<string, number>(); // `${teacherId}` -> count

  for (const entry of entries) {
    const dailyKey = `${entry.teacherId}_${entry.day}`;
    teacherDailyHours.set(dailyKey, (teacherDailyHours.get(dailyKey) || 0) + 1);
    teacherWeeklyHours.set(entry.teacherId, (teacherWeeklyHours.get(entry.teacherId) || 0) + 1);
  }

  teacherDailyHours.forEach((count, key) => {
    const [teacherId, day] = key.split('_');
    const teacher = teacherMap.get(teacherId);
    if (teacher && count > teacher.maxHoursPerDay) {
      reports.push({
        id: `overload_day_${key}`,
        type: 'OVERLOAD',
        severity: 'warning',
        day: day as any,
        periodIndex: 0,
        involvedEntryIds: entries.filter((e) => e.teacherId === teacherId && e.day === day).map((e) => e.id),
        message: `Daily Workload Warning: ${teacher.name} is scheduled for ${count} hours on ${day} (exceeds max limit of ${teacher.maxHoursPerDay} hrs).`,
      });
    }
  });

  return reports;
}

function formatRoomTypeName(type: string): string {
  switch (type) {
    case 'LECTURE_HALL':
      return 'Lecture Hall';
    case 'COMPUTER_LAB':
      return 'Computer Lab';
    case 'SCIENCE_LAB':
      return 'Science / Hardware Lab';
    case 'SEMINAR_HALL':
      return 'Seminar Hall';
    default:
      return type;
  }
}
