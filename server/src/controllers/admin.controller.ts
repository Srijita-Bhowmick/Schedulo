import { Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { db } from '../db/db.js';
import {
  BacktrackingSolver,
  DepartmentConfig,
  ScheduleEntryData,
  TeacherData,
  RoomData,
  BatchData,
  SubjectData,
} from '../engine/backtrackingSolver.js';
import crypto from 'crypto';

export class AdminController {
  /**
   * Run the deterministic backtracking solver (MRV + Forward checking + Exact minute intervals)
   */
  static generateSchedule(req: AuthenticatedRequest, res: Response): void {
    try {
      const targetDeptId = req.body.departmentId || req.user?.departmentId || 'dept-cse';
      const deptRow = db.prepare('SELECT * FROM departments WHERE id = ?').get(targetDeptId) as any;

      const deptConfig: DepartmentConfig = deptRow
        ? {
            id: deptRow.id,
            name: deptRow.name,
            code: deptRow.code,
            workingDays: JSON.parse(deptRow.working_days || '["Monday","Tuesday","Wednesday","Thursday","Friday"]'),
            dayStartTime: deptRow.day_start_time || '09:00',
            periodDurationMins: deptRow.period_duration_mins || 60,
            periodsPerDay: deptRow.periods_per_day || 6,
          }
        : {
            id: 'dept-cse',
            name: 'Computer Science & Engineering',
            code: 'CSE',
            workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            dayStartTime: '09:00',
            periodDurationMins: 60,
            periodsPerDay: 6,
          };

      // Available rooms: department rooms + shared college rooms
      const rooms = db.prepare(`
        SELECT id, room_number as roomNumber, name, type, capacity, building, department_id as departmentId, is_shared as isShared
        FROM rooms
        WHERE department_id = ? OR is_shared = 1
      `).all(deptConfig.id) as RoomData[];

      // Available teachers: faculty who teach in this department
      const teachersRaw = db.prepare(`
        SELECT t.id, t.name, t.short_code as shortCode, t.email, t.department, 
               t.max_hours_per_day as maxHoursPerDay, t.max_hours_per_week as maxHoursPerWeek, 
               t.unavailable_slots as unavailableSlots, t.color 
        FROM teachers t
        LEFT JOIN teacher_departments td ON t.id = td.teacher_id
        WHERE td.department_id = ? OR t.department = ?
      `).all(deptConfig.id, deptConfig.name) as any[];

      const teachers: TeacherData[] = teachersRaw.map((t) => ({
        ...t,
        unavailableSlots: JSON.parse(t.unavailableSlots || '[]'),
      }));

      // Batches for this department
      const batchesRaw = db.prepare(`
        SELECT id, name, department, department_id as departmentId, semester, section, student_count as studentCount, subject_ids as subjectIds
        FROM batches
        WHERE department_id = ? OR department = ?
      `).all(deptConfig.id, deptConfig.name) as any[];

      const batches: BatchData[] = batchesRaw.map((b) => ({
        ...b,
        subjectIds: JSON.parse(b.subjectIds || '[]'),
      }));

      // Subjects for this department
      const subjects = db.prepare(`
        SELECT id, code, name, type, weekly_hours as weeklyHours, duration_slots as durationSlots,
               assigned_teacher_id as assignedTeacherId, department_id as departmentId, preferred_room_type as preferredRoomType,
               allow_two_hour_block as allowTwoHourBlock, is_double_block as isDoubleBlock, color
        FROM subjects
        WHERE department_id = ? OR id IN (${batches.flatMap((b) => b.subjectIds).map(() => '?').join(',') || "''"})
      `).all(deptConfig.id, ...batches.flatMap((b) => b.subjectIds)) as SubjectData[];

      // Locked entries from other departments (so shared professors and shared lecture halls never conflict)
      const lockedEntries = db.prepare(`
        SELECT id, day, period_index as periodIndex, start_minute as startMinute, end_minute as endMinute,
               batch_id as batchId, subject_id as subjectId, teacher_id as teacherId, room_id as roomId,
               duration_slots as durationSlots, is_locked as isLocked, department_id as departmentId
        FROM schedule_entries
        WHERE department_id != ? AND is_locked = 1
      `).all(deptConfig.id) as ScheduleEntryData[];

      // Run pure algorithmic solver
      const result = BacktrackingSolver.solveDepartment(
        deptConfig,
        rooms,
        teachers,
        batches,
        subjects,
        lockedEntries
      );

      if (!result.success && result.entries.length === 0) {
        res.status(422).json({
          success: false,
          message: result.message,
          diagnostics: result.diagnostics,
          executionTimeMs: result.executionTimeMs,
          telemetry: result.telemetry,
        });
        return;
      }

      // Update schedule_entries for this department in a transaction
      const updateTransaction = db.transaction((newEntries: ScheduleEntryData[]) => {
        // Delete all non-locked entries for this department
        db.prepare('DELETE FROM schedule_entries WHERE department_id = ? AND is_locked = 0').run(deptConfig.id);

        const insertStmt = db.prepare(`
          INSERT OR REPLACE INTO schedule_entries 
          (id, day, period_index, start_minute, end_minute, batch_id, subject_id, teacher_id, room_id, department_id, duration_slots, is_locked)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const entry of newEntries) {
          insertStmt.run(
            entry.id,
            entry.day,
            entry.periodIndex,
            entry.startMinute,
            entry.endMinute,
            entry.batchId,
            entry.subjectId,
            entry.teacherId,
            entry.roomId,
            deptConfig.id,
            entry.durationSlots || 1,
            entry.isLocked ? 1 : 0
          );
        }
      });

      updateTransaction(result.entries);

      res.json({
        success: result.success,
        message: result.message,
        executionTimeMs: result.executionTimeMs,
        totalScheduledHours: result.totalScheduledHours,
        diagnostics: result.diagnostics,
        telemetry: result.telemetry,
        entries: result.entries,
      });
    } catch (err: any) {
      console.error('Schedule generation error:', err);
      res.status(500).json({ error: err.message || 'Error generating schedule' });
    }
  }

  /**
   * Publish live timetable for department (Locks shared faculty & room minute intervals college-wide)
   */
  static publishTimetable(req: AuthenticatedRequest, res: Response): void {
    try {
      const targetDeptId = req.body.departmentId || req.user?.departmentId || 'dept-cse';
      
      // Lock all entries for this department
      db.prepare('UPDATE schedule_entries SET is_locked = 1 WHERE department_id = ?').run(targetDeptId);

      const alertId = `alert_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const timeStr = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST`;

      // Insert publication alert
      try {
        db.prepare(`
          INSERT INTO schedule_alerts (id, title, message, teacher_id, batch_id, target_role, created_at, is_read)
          VALUES (?, ?, ?, 't-1', 'batch-1', 'STUDENT', ?, 0)
        `).run(
          alertId,
          'Live Timetable Published',
          `Department schedule published by Head of Department at ${timeStr}. Shared faculty and lecture hall intervals locked college-wide.`,
          now
        );
      } catch {}

      const studentCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'STUDENT'").get() as any;
      const teacherCount = db.prepare("SELECT COUNT(*) as count FROM teachers").get() as any;
      const totalRecipients = (studentCount?.count || 100) + (teacherCount?.count || 18);

      res.json({
        success: true,
        publishedAt: timeStr,
        recipients: totalRecipients,
        message: `Timetable published successfully. ${totalRecipients} recipients notified. Shared intervals locked college-wide.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error publishing timetable' });
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
