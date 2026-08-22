import { ScheduleEntry, Teacher, Room, Subject, BatchSection, TimeSlotConfig, TimetableStats, ConflictReport } from '../types';
import { detectAllClashes } from './clashDetector';

export function calculateTimetableStats(
  entries: ScheduleEntry[],
  teachers: Teacher[],
  rooms: Room[],
  subjects: Subject[],
  batches: BatchSection[],
  config: TimeSlotConfig
): TimetableStats {
  const totalSlotsPerWeek = config.workingDays.length * config.periodsPerDay;
  const totalAvailableRoomSlots = rooms.length * totalSlotsPerWeek;

  const totalScheduledHours = entries.length;
  const roomUtilizationRate = totalAvailableRoomSlots > 0
    ? Math.min(100, Math.round((totalScheduledHours / totalAvailableRoomSlots) * 100 * 10) / 10)
    : 0;

  const totalFaculty = Math.max(1, teachers.length);
  const facultyAverageLoad = Math.round((totalScheduledHours / totalFaculty) * 10) / 10;

  const conflicts = detectAllClashes(entries, teachers, rooms, subjects, batches, config);
  const hardClashes = conflicts.filter((c) => c.severity === 'error').length;
  const warnings = conflicts.filter((c) => c.severity === 'warning').length;

  // Hard constraint score: 100% minus penalty for any hard clash
  const hardConstraintScore = Math.max(0, Math.round(100 - (hardClashes * 15)));

  // Soft constraint score evaluation
  let softPenalty = 0;

  // 1. Penalty for warnings (e.g. room type mismatch, unavailable slots)
  softPenalty += warnings * 2;

  // 2. Penalty for teacher idle gaps (e.g., teaching period 0 and period 4 with 3 empty periods in between)
  teachers.forEach((t) => {
    config.workingDays.forEach((day) => {
      const periods = entries
        .filter((e) => e.teacherId === t.id && e.day === day)
        .map((e) => e.periodIndex)
        .sort((a, b) => a - b);

      if (periods.length > 1) {
        for (let i = 0; i < periods.length - 1; i++) {
          const gap = periods[i + 1] - periods[i] - 1;
          if (gap > 0) {
            softPenalty += gap * 1.5;
          }
        }
      }
    });
  });

  // 3. Penalty for student batch idle gaps
  batches.forEach((b) => {
    config.workingDays.forEach((day) => {
      const periods = entries
        .filter((e) => e.batchId === b.id && e.day === day)
        .map((e) => e.periodIndex)
        .sort((a, b) => a - b);

      if (periods.length > 1) {
        for (let i = 0; i < periods.length - 1; i++) {
          const gap = periods[i + 1] - periods[i] - 1;
          if (gap > 0) {
            softPenalty += gap * 2;
          }
        }
      }
    });
  });

  // 4. Penalty for duplicate heavy theory of same subject on the same day for a batch
  batches.forEach((b) => {
    config.workingDays.forEach((day) => {
      const daySubjects = entries
        .filter((e) => e.batchId === b.id && e.day === day)
        .map((e) => e.subjectId);
      
      const counts = new Map<string, number>();
      daySubjects.forEach((sId) => {
        counts.set(sId, (counts.get(sId) || 0) + 1);
      });

      counts.forEach((cnt, sId) => {
        const sub = subjects.find((s) => s.id === sId);
        if (sub && sub.type === 'THEORY' && cnt > 1) {
          softPenalty += (cnt - 1) * 3; // spread subjects across days
        }
      });
    });
  });

  const softConstraintScore = Math.max(20, Math.min(100, Math.round(100 - softPenalty)));

  // Overall fitness: weighted 70% hard constraints, 30% soft constraints
  const fitnessScore = hardClashes > 0
    ? Math.max(0, Math.min(65, Math.round(hardConstraintScore * 0.7 + softConstraintScore * 0.3)))
    : Math.round(hardConstraintScore * 0.6 + softConstraintScore * 0.4);

  return {
    totalBatches: batches.length,
    totalSubjects: subjects.length,
    totalTeachers: teachers.length,
    totalRooms: rooms.length,
    totalScheduledHours,
    roomUtilizationRate,
    facultyAverageLoad,
    conflictsCount: conflicts.length,
    fitnessScore,
    hardConstraintScore,
    softConstraintScore,
  };
}
