import { Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { db } from '../db/db.js';
import {
  SchedulingEngine,
  ScheduleEntryData,
  TeacherData,
  RoomData,
  BatchData,
  SubjectData,
  TimeSlotConfigData,
} from '../engine/SchedulingEngine.js';

export class AdminController {
  /**
   * Run the pure algorithmic backtracking solver (MRV + Forward checking)
   */
  static generateSchedule(req: AuthenticatedRequest, res: Response): void {
    try {
      const rooms = db.prepare('SELECT id, room_number as roomNumber, name, type, capacity, building FROM rooms').all() as RoomData[];
      
      const teachersRaw = db.prepare('SELECT id, name, short_code as shortCode, email, department, max_hours_per_day as maxHoursPerDay, max_hours_per_week as maxHoursPerWeek, unavailable_slots as unavailableSlots, color FROM teachers').all() as any[];
      const teachers: TeacherData[] = teachersRaw.map((t) => ({
        ...t,
        unavailableSlots: JSON.parse(t.unavailableSlots || '[]'),
      }));

      const batchesRaw = db.prepare('SELECT id, name, department, semester, student_count as studentCount, subject_ids as subjectIds FROM batches').all() as any[];
      const batches: BatchData[] = batchesRaw.map((b) => ({
        ...b,
        subjectIds: JSON.parse(b.subjectIds || '[]'),
      }));

      const subjects = db.prepare('SELECT id, code, name, type, weekly_hours as weeklyHours, duration_slots as durationSlots, assigned_teacher_id as assignedTeacherId, preferred_room_type as preferredRoomType, color FROM subjects').all() as SubjectData[];

      const configRaw = db.prepare('SELECT * FROM time_slot_config WHERE id = ?').get('default') as any;
      const config: TimeSlotConfigData = configRaw
        ? {
            workingDays: JSON.parse(configRaw.working_days),
            periodsPerDay: configRaw.periods_per_day,
            periodDurationMinutes: configRaw.period_duration_minutes,
            startTime: configRaw.start_time,
            breakSlots: JSON.parse(configRaw.break_slots || '[]'),
          }
        : {
            workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            periodsPerDay: 6,
            periodDurationMinutes: 50,
            startTime: '09:30',
            breakSlots: [],
          };

      const lockedEntries = db.prepare(`
        SELECT id, day, period_index as periodIndex, batch_id as batchId, subject_id as subjectId, teacher_id as teacherId, room_id as roomId, duration_slots as durationSlots, is_locked as isLocked 
        FROM schedule_entries WHERE is_locked = 1
      `).all() as ScheduleEntryData[];

      // Execute deterministic algorithmic backtracking solver
      const result = SchedulingEngine.solve(rooms, teachers, batches, subjects, config, lockedEntries);

      if (!result.success) {
        res.status(422).json({
          success: false,
          message: result.message,
          diagnostics: result.diagnostics,
          executionTimeMs: result.executionTimeMs,
        });
        return;
      }

      // In a transaction, update schedule_entries
      const updateTransaction = db.transaction((newEntries: ScheduleEntryData[]) => {
        // Delete all non-locked entries
        db.prepare('DELETE FROM schedule_entries WHERE is_locked = 0').run();

        // Insert new entries
        const insertStmt = db.prepare(`
          INSERT OR REPLACE INTO schedule_entries 
          (id, day, period_index, batch_id, subject_id, teacher_id, room_id, duration_slots, is_locked)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const entry of newEntries) {
          insertStmt.run(
            entry.id,
            entry.day,
            entry.periodIndex,
            entry.batchId,
            entry.subjectId,
            entry.teacherId,
            entry.roomId,
            entry.durationSlots || 1,
            entry.isLocked ? 1 : 0
          );
        }
      });

      updateTransaction(result.entries);

      res.json({
        success: true,
        message: result.message,
        executionTimeMs: result.executionTimeMs,
        totalScheduledHours: result.totalScheduledHours,
        entries: result.entries,
      });
    } catch (err: any) {
      console.error('Schedule generation error:', err);
      res.status(500).json({ error: err.message || 'Error generating schedule' });
    }
  }

  /**
   * Lock/Unlock entry
   */
  static toggleLock(req: AuthenticatedRequest, res: Response): void {
    try {
      const { entryId } = req.params;
      const entry = db.prepare('SELECT * FROM schedule_entries WHERE id = ?').get(entryId) as any;
      if (!entry) {
        res.status(404).json({ error: 'Entry not found' });
        return;
      }

      const nextLock = entry.is_locked ? 0 : 1;
      db.prepare('UPDATE schedule_entries SET is_locked = ? WHERE id = ?').run(nextLock, entryId);

      res.json({ success: true, isLocked: Boolean(nextLock) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error toggling lock' });
    }
  }

  /**
   * Clear all non-locked entries
   */
  static clearSchedule(req: AuthenticatedRequest, res: Response): void {
    try {
      db.prepare('DELETE FROM schedule_entries WHERE is_locked = 0').run();
      res.json({ success: true, message: 'All unlocked schedule slots cleared.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error clearing schedule' });
    }
  }
}
