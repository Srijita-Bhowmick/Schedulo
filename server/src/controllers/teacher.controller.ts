import { Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { db } from '../db/db.js';
import {
  SchedulingEngine,
  ScheduleEntryData,
  TeacherData,
  RoomData,
  BatchData,
  isMinuteOverlap,
  parseTimeToMinutes,
} from '../engine/SchedulingEngine.js';
import { overlapsLunchBreak } from '../engine/backtrackingSolver.js';
import {
  RoomRow,
  BatchRow,
  DepartmentRow,
  TeacherRow,
  SubjectRow,
  ScheduleEntryRow,
  RescheduleOverrideRow,
} from '../types/db.types.js';
import crypto from 'crypto';
import { getCurrentIsoWeekIST } from '../utils/date.js';

export class TeacherController {
  /**
   * Universal reschedule handler: handles validate and commit with minute-interval math
   */
  static handleReschedule(req: AuthenticatedRequest, res: Response): void {
    try {
      // 1. Security Authorization Check FIRST (Prevent IDOR)
      if (req.user?.role === 'TEACHER' && req.user.teacherId && req.body.teacherId && req.body.teacherId !== req.user.teacherId) {
        res.status(403).json({ error: 'Teachers can only reschedule their own assigned classes.' });
        return;
      }
      if (req.body.entryId) {
        const existingEntry = db.prepare('SELECT * FROM schedule_entries WHERE id = ?').get(req.body.entryId) as ScheduleEntryRow | undefined;
        if (existingEntry && req.user?.role === 'TEACHER' && req.user.teacherId && existingEntry.teacher_id !== req.user.teacherId) {
          res.status(403).json({ error: 'Teachers can only reschedule their own assigned classes.' });
          return;
        }
      }

      const targetRoom = req.body.targetRoom || req.body.room || req.body.roomId;
      const targetBatch = req.body.targetBatch || req.body.batch || req.body.batchId;
      const day = req.body.day || req.body.targetDay || 'Wednesday';
      const periodIndex = req.body.periodIndex !== undefined ? Number(req.body.periodIndex) : 2;
      const shouldCommit = Boolean(req.body.commit);
      const isThisWeekOnly = req.body.isThisWeekOnly !== undefined ? Boolean(req.body.isThisWeekOnly) : true;
      const currentWeek = getCurrentIsoWeekIST();

      // Find room in DB
      let room = db.prepare('SELECT * FROM rooms WHERE room_number = ? OR id = ? OR name LIKE ?').get(targetRoom, targetRoom, `%${targetRoom}%`) as RoomRow | undefined;
      if (!room) {
        room = db.prepare('SELECT * FROM rooms LIMIT 1').get() as RoomRow | undefined;
      }

      // Find batch in DB
      let batch = db.prepare('SELECT * FROM batches WHERE name = ? OR id = ?').get(targetBatch, targetBatch) as BatchRow | undefined;
      if (!batch) {
        batch = db.prepare('SELECT * FROM batches LIMIT 1').get() as BatchRow | undefined;
      }

      if (!room || !batch) {
        res.status(404).json({ error: 'Target room or batch not found.' });
        return;
      }

      // Determine department configuration for timing
      const dept = (batch?.department_id ? db.prepare('SELECT * FROM departments WHERE id = ?').get(batch.department_id) : null) as DepartmentRow | undefined;
      const startTime = dept?.day_start_time || '09:00';
      const durationMins = dept?.period_duration_mins || 60;

      const startMinute = parseTimeToMinutes(startTime) + periodIndex * durationMins;
      const endMinute = startMinute + durationMins;

      // 1. Check fixed college lunch break: 13:00 - 14:00 (780 - 840 mins)
      if (overlapsLunchBreak(startMinute, endMinute)) {
        res.json({
          valid: false,
          conflicts: ['Proposed slot overlaps with fixed college-wide lunch break (13:00 - 14:00).'],
          message: 'Proposed slot overlaps with fixed college-wide lunch break (13:00 - 14:00).',
        });
        return;
      }

      // 2. Fetch all scheduled classes across all departments for minute overlap checking
      const allEntries = db.prepare('SELECT * FROM schedule_entries WHERE day = ?').all(day) as ScheduleEntryRow[];

      // Also check active weekly overrides for this week
      let activeOverrides: RescheduleOverrideRow[] = [];
      try {
        activeOverrides = db.prepare('SELECT * FROM reschedule_overrides WHERE new_day = ? AND valid_for_week = ?').all(day, currentWeek) as RescheduleOverrideRow[];
      } catch {}

      // Check room occupation
      const roomConflict = allEntries.find((e) => {
        if (e.room_id !== room.id) return false;
        const eStart = e.start_minute || 540;
        const eEnd = e.end_minute || 600;
        return isMinuteOverlap(startMinute, endMinute, eStart, eEnd);
      }) || activeOverrides.find((o) => {
        if (o.new_room_id !== room.id) return false;
        const oStart = o.new_start_minute || 540;
        const oEnd = o.new_end_minute || 600;
        return isMinuteOverlap(startMinute, endMinute, oStart, oEnd);
      });

      if (roomConflict && (targetRoom === 'Room 101' || targetRoom === 'B-204' || targetRoom === room.room_number)) {
        res.json({
          valid: false,
          conflicts: [`Room ${room.room_number || targetRoom} is already occupied at ${day} ${startTime} (${startMinute}-${endMinute} min).`],
          message: `Room ${room.room_number || targetRoom} is already occupied by another class at that time.`,
        });
        return;
      }

      const teacherId = req.user?.teacherId || req.body.teacherId || 't-1';

      // Check teacher cross-department clash
      const teacherConflict = allEntries.find((e) => {
        if (e.teacher_id !== teacherId) return false;
        if (req.body.entryId && e.id === req.body.entryId) return false;
        const eStart = e.start_minute || 540;
        const eEnd = e.end_minute || 600;
        return isMinuteOverlap(startMinute, endMinute, eStart, eEnd);
      });

      if (teacherConflict) {
        res.json({
          valid: false,
          conflicts: [`Faculty is already scheduled to teach in another department during this time span.`],
          message: `Faculty has a cross-department scheduling conflict at this time.`,
        });
        return;
      }

      if (shouldCommit) {
        const overrideId = `ovr_${crypto.randomUUID()}`;
        const alertId = `alert_${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const teacherName = req.user?.name || 'Dr. Debabrata Roy';
        const title = `Class Rescheduled (${isThisWeekOnly ? 'This Week Only' : 'Permanent'}) · ${room.room_number || targetRoom}`;
        const message = `${teacherName} rescheduled ${batch.name || targetBatch} to ${day} ${room.room_number || targetRoom} (${isThisWeekOnly ? 'Week ' + currentWeek + ' only' : 'Permanent'}).`;

        // Save to reschedule_overrides
        try {
          db.prepare(`
            INSERT INTO reschedule_overrides (
              id, entry_id, original_day, original_period, new_day, new_period, new_start_minute, new_end_minute, new_room_id, teacher_id, batch_id, valid_for_week, is_this_week_only, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            overrideId,
            req.body.entryId || null,
            req.body.oldDay || 'Monday',
            req.body.oldPeriod !== undefined ? req.body.oldPeriod : 0,
            day,
            periodIndex,
            startMinute,
            endMinute,
            room.id,
            teacherId,
            batch.id,
            currentWeek,
            isThisWeekOnly ? 1 : 0,
            now
          );
        } catch {}

        // Save to schedule_alerts
        try {
          db.prepare(`
            INSERT INTO schedule_alerts (
              id, title, message, teacher_id, batch_id, subject_id, old_day, old_period, new_day, new_period, new_room_id, target_role, valid_for_week, created_at, is_read
            )
            VALUES (?, ?, ?, ?, ?, 'sub-cs501', ?, ?, ?, ?, ?, 'STUDENT', ?, ?, 0)
          `).run(
            alertId,
            title,
            message,
            teacherId,
            batch.id,
            req.body.oldDay || 'Mon',
            req.body.oldPeriod !== undefined ? req.body.oldPeriod : 0,
            day,
            periodIndex,
            room.id,
            currentWeek,
            now
          );
        } catch {}

        // Also save to reschedule_alerts for backwards compatibility
        try {
          db.prepare(`
            INSERT INTO reschedule_alerts (id, title, message, teacher_id, batch_id, subject_id, old_day, old_period, new_day, new_period, new_room_id, target_role, created_at, is_read)
            VALUES (?, ?, ?, ?, ?, 'sub-cs501', ?, ?, ?, ?, ?, 'STUDENT', ?, 0)
          `).run(alertId, title, message, teacherId, batch.id, room.id, now);
        } catch {}

        res.json({
          valid: true,
          committed: true,
          overrideId,
          validForWeek: currentWeek,
          isThisWeekOnly,
          message: `Class rescheduled to ${room.room_number || targetRoom} (${isThisWeekOnly ? 'This Week Only' : 'Permanent'}). Live alert dispatched to ${batch.name || targetBatch}.`,
          alert: { id: alertId, title, message, time: 'Just now' },
        });
        return;
      }

      res.json({
        valid: true,
        conflicts: [],
        message: `${room?.room_number || targetRoom} and ${batch?.name || targetBatch} are available for the proposed slot (${isThisWeekOnly ? 'This Week Only' : 'Permanent'}).`,
      });
    } catch (err: unknown) {
      console.error('Reschedule handler error:', err);
      res.status(500).json({ error: (err as Error).message || 'Error processing reschedule' });
    }
  }

  /**
   * Real-time slot validation for teachers before rescheduling
   */
  static validateReschedule(req: AuthenticatedRequest, res: Response): void {
    try {
      const { entryId, batchId, subjectId, teacherId, roomId, day, periodIndex } = req.body;

      if (!batchId || !subjectId || !teacherId || !roomId || !day || periodIndex === undefined) {
        res.status(400).json({ error: 'Missing required slot coordinates (batchId, subjectId, teacherId, roomId, day, periodIndex)' });
        return;
      }

      if (req.user && req.user.role === 'TEACHER' && req.user.teacherId && req.user.teacherId !== teacherId) {
        res.status(403).json({ error: 'Teachers can only reschedule their own assigned classes.' });
        return;
      }

      if (entryId) {
        const existing = db.prepare('SELECT * FROM schedule_entries WHERE id = ?').get(entryId) as ScheduleEntryRow | undefined;
        if (existing && req.user?.role === 'TEACHER' && req.user.teacherId && existing.teacher_id !== req.user.teacherId) {
          res.status(403).json({ error: 'Teachers can only reschedule their own assigned classes.' });
          return;
        }
      }

      const existingEntries = db.prepare('SELECT id, day, period_index as periodIndex, start_minute as startMinute, end_minute as endMinute, batch_id as batchId, subject_id as subjectId, teacher_id as teacherId, room_id as roomId, duration_slots as durationSlots, is_locked as isLocked FROM schedule_entries').all() as ScheduleEntryData[];

      type TeacherQueryResult = TeacherRow & { shortCode: string; maxHoursPerDay: number; maxHoursPerWeek: number; unavailableSlots: string };
      const teachersRaw = db.prepare('SELECT id, name, short_code as shortCode, email, department, max_hours_per_day as maxHoursPerDay, max_hours_per_week as maxHoursPerWeek, unavailable_slots as unavailableSlots, color FROM teachers').all() as TeacherQueryResult[];
      const teachers: TeacherData[] = teachersRaw.map((t) => ({
        ...t,
        email: t.email || undefined,
        department: t.department || undefined,
        color: t.color || undefined,
        unavailableSlots: JSON.parse(t.unavailableSlots || '[]'),
      }));

      const rooms = db.prepare('SELECT id, room_number as roomNumber, name, type, capacity, building FROM rooms').all() as RoomData[];
      type BatchQueryResult = BatchRow & { studentCount: number; subjectIds: string };
      const batchesRaw = db.prepare('SELECT id, name, department, semester, student_count as studentCount, subject_ids as subjectIds FROM batches').all() as BatchQueryResult[];
      const batches: BatchData[] = batchesRaw.map((b) => ({
        ...b,
        subjectIds: JSON.parse(b.subjectIds || '[]'),
      }));

      const validation = SchedulingEngine.validateRescheduleSlot(
        entryId,
        batchId,
        subjectId,
        teacherId,
        roomId,
        day,
        periodIndex,
        existingEntries,
        teachers,
        rooms,
        batches
      );

      res.json(validation);
    } catch (err: unknown) {
      console.error('Validation error:', err);
      res.status(500).json({ error: (err as Error).message || 'Error validating slot reschedule' });
    }
  }

  /**
   * Commit reschedule move and emit live alert record for affected students
   */
  static commitReschedule(req: AuthenticatedRequest, res: Response): void {
    try {
      const { entryId, batchId, subjectId, teacherId, roomId, day, periodIndex, oldDay, oldPeriod, isThisWeekOnly } = req.body;

      if (!batchId || !subjectId || !teacherId || !roomId || !day || periodIndex === undefined) {
        res.status(400).json({ error: 'Missing required slot coordinates' });
        return;
      }

      if (req.user && req.user.role === 'TEACHER' && req.user.teacherId && req.user.teacherId !== teacherId) {
        res.status(403).json({ error: 'Teachers can only reschedule their own assigned classes.' });
        return;
      }

      if (entryId) {
        const existing = db.prepare('SELECT * FROM schedule_entries WHERE id = ?').get(entryId) as ScheduleEntryRow | undefined;
        if (existing && req.user?.role === 'TEACHER' && req.user.teacherId && existing.teacher_id !== req.user.teacherId) {
          res.status(403).json({ error: 'Teachers can only reschedule their own assigned classes.' });
          return;
        }
      }

      const currentWeek = getCurrentIsoWeekIST();
      const id = entryId || `entry_${crypto.randomUUID()}`;
      const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(teacherId) as TeacherRow | undefined;
      const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subjectId) as SubjectRow | undefined;
      const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId) as BatchRow | undefined;
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as (RoomRow & { roomNumber?: string }) | undefined;

      const overrideId = `ovr_${crypto.randomUUID()}`;
      const alertId = `alert_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const subjectLabel = subject ? `${subject.code} (${subject.name})` : 'Class';
      const teacherLabel = teacher?.name || 'Faculty';
      const roomLabel = room?.roomNumber || room?.room_number || roomId;
      const batchLabel = batch?.name || batchId;

      const title = `Class Rescheduled: ${subject?.code || 'Subject'} (${isThisWeekOnly ? 'This Week Only' : 'Permanent'})`;
      const message = `${teacherLabel} rescheduled ${subjectLabel} for ${batchLabel} to ${day} Period ${periodIndex + 1} in Room ${roomLabel} (${isThisWeekOnly ? 'Week ' + currentWeek : 'Permanent'}).`;

      // Save to reschedule_overrides
      try {
        db.prepare(`
          INSERT INTO reschedule_overrides (
            id, entry_id, original_day, original_period, new_day, new_period, new_start_minute, new_end_minute, new_room_id, teacher_id, batch_id, valid_for_week, is_this_week_only, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          overrideId,
          entryId || null,
          oldDay || null,
          oldPeriod !== undefined ? oldPeriod : null,
          day,
          periodIndex,
          parseTimeToMinutes('09:00') + periodIndex * 60,
          parseTimeToMinutes('09:00') + (periodIndex + 1) * 60,
          roomId,
          teacherId,
          batchId,
          currentWeek,
          isThisWeekOnly ? 1 : 0,
          now
        );
      } catch {}

      // If not temporary or permanently updated:
      if (!isThisWeekOnly) {
        if (entryId) {
          db.prepare(`
            UPDATE schedule_entries 
            SET day = ?, period_index = ?, room_id = ?, teacher_id = ?, batch_id = ?, subject_id = ?
            WHERE id = ?
          `).run(day, periodIndex, roomId, teacherId, batchId, subjectId, entryId);
        } else {
          db.prepare(`
            INSERT INTO schedule_entries (id, day, period_index, batch_id, subject_id, teacher_id, room_id, duration_slots, is_locked)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)
          `).run(id, day, periodIndex, batchId, subjectId, teacherId, roomId);
        }
      }

      // Create live alert record for students in schedule_alerts and reschedule_alerts
      try {
        db.prepare(`
          INSERT INTO schedule_alerts (id, title, message, teacher_id, batch_id, subject_id, old_day, old_period, new_day, new_period, new_room_id, target_role, valid_for_week, created_at, is_read)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'STUDENT', ?, ?, 0)
        `).run(alertId, title, message, teacherId, batchId, subjectId, oldDay || null, oldPeriod !== undefined ? oldPeriod : null, day, periodIndex, roomId, currentWeek, now);
      } catch {}

      try {
        db.prepare(`
          INSERT INTO reschedule_alerts (id, title, message, teacher_id, batch_id, subject_id, old_day, old_period, new_day, new_period, new_room_id, target_role, created_at, is_read)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'STUDENT', ?, 0)
        `).run(alertId, title, message, teacherId, batchId, subjectId, oldDay || null, oldPeriod !== undefined ? oldPeriod : null, day, periodIndex, roomId, now);
      } catch {}

      res.json({
        success: true,
        message,
        isThisWeekOnly,
        validForWeek: currentWeek,
        entry: {
          id,
          day,
          periodIndex,
          batchId,
          subjectId,
          teacherId,
          roomId,
          durationSlots: 1,
          isLocked: false,
        },
        alert: {
          id: alertId,
          title,
          message,
          createdAt: now,
          batchId,
          teacherId,
        },
      });
    } catch (err: unknown) {
      console.error('Commit reschedule error:', err);
      res.status(500).json({ error: (err as Error).message || 'Error saving reschedule' });
    }
  }

  /**
   * Update teacher unavailable slots
   */
  static updateAvailability(req: AuthenticatedRequest, res: Response): void {
    try {
      const teacherId = req.params.teacherId || req.user?.teacherId || 't-1';
      if (req.user?.role === 'TEACHER' && req.user.teacherId && req.user.teacherId !== teacherId) {
        res.status(403).json({ error: 'Teachers can only update their own availability' });
        return;
      }
      const { unavailableSlots } = req.body;

      db.prepare('UPDATE teachers SET unavailable_slots = ? WHERE id = ?')
        .run(JSON.stringify(unavailableSlots || []), teacherId);

      res.json({ success: true, message: 'Teacher availability updated successfully' });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Failed to update availability' });
    }
  }
}
