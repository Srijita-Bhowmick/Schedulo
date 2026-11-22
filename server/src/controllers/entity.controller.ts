import { Request, Response } from 'express';
import { db } from '../db/db.js';
import crypto from 'crypto';

export class EntityController {
  static getAll(req: Request, res: Response): void {
    try {
      const departments = db.prepare('SELECT * FROM departments').all();
      const rooms = db.prepare('SELECT id, room_number as roomNumber, name, type, capacity, building, department_id as departmentId, is_shared as isShared FROM rooms').all();
      
      const teachersRaw = db.prepare('SELECT id, name, short_code as shortCode, email, department, max_hours_per_day as maxHoursPerDay, max_hours_per_week as maxHoursPerWeek, unavailable_slots as unavailableSlots, color FROM teachers').all() as any[];
      const teacherDepts = db.prepare('SELECT * FROM teacher_departments').all() as any[];

      const teachers = teachersRaw.map((t) => {
        const depts = teacherDepts.filter((td) => td.teacher_id === t.id).map((td) => td.department_id);
        return {
          ...t,
          unavailableSlots: JSON.parse(t.unavailableSlots || '[]'),
          departmentIds: depts,
          isShared: depts.length > 1,
        };
      });

      const batchesRaw = db.prepare('SELECT id, name, department, department_id as departmentId, semester, section, student_count as studentCount, subject_ids as subjectIds FROM batches').all() as any[];
      const batches = batchesRaw.map((b) => ({
        ...b,
        subjectIds: JSON.parse(b.subjectIds || '[]'),
      }));

      const subjects = db.prepare('SELECT id, code, name, type, weekly_hours as weeklyHours, duration_slots as durationSlots, assigned_teacher_id as assignedTeacherId, department_id as departmentId, preferred_room_type as preferredRoomType, allow_two_hour_block as allowTwoHourBlock, is_double_block as isDoubleBlock, color FROM subjects').all();

      let collegeName = 'Apex Institute of Technology & Science';
      try {
        const col = db.prepare('SELECT college_name FROM college_config WHERE id = ?').get('default') as any;
        if (col?.college_name) collegeName = col.college_name;
      } catch {}

      const configRaw = db.prepare('SELECT * FROM time_slot_config WHERE id = ?').get('default') as any;
      const config = configRaw
        ? {
            collegeName,
            workingDays: JSON.parse(configRaw.working_days),
            periodsPerDay: configRaw.periods_per_day,
            periodDurationMinutes: configRaw.period_duration_minutes,
            startTime: configRaw.start_time,
            breakSlots: JSON.parse(configRaw.break_slots || '[]'),
          }
        : null;

      res.json({
        collegeName,
        departments,
        rooms,
        teachers,
        batches,
        subjects,
        config,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching entities' });
    }
  }

  // Teacher CRUD
  static createTeacher(req: Request, res: Response): void {
    try {
      const { name, shortCode, email, department, departmentId, maxHoursPerDay, maxHoursPerWeek, unavailableSlots, color } = req.body;
      const id = `t-${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(`
        INSERT INTO teachers (id, name, short_code, email, department, max_hours_per_day, max_hours_per_week, unavailable_slots, color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name,
        shortCode || name.slice(0, 3).toUpperCase(),
        email || null,
        department || 'Computer Science & Engineering',
        maxHoursPerDay || 4,
        maxHoursPerWeek || 16,
        JSON.stringify(unavailableSlots || []),
        color || '#6366f1'
      );

      if (departmentId) {
        db.prepare('INSERT OR REPLACE INTO teacher_departments (teacher_id, department_id, is_primary) VALUES (?, ?, 1)').run(id, departmentId);
      }

      res.status(201).json({ id, name, shortCode, email, department, maxHoursPerDay, maxHoursPerWeek, unavailableSlots, color });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error creating teacher' });
    }
  }

  static shareTeacher(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const { targetDepartmentId } = req.body;
      if (!targetDepartmentId) {
        res.status(400).json({ error: 'targetDepartmentId is required' });
        return;
      }
      db.prepare('INSERT OR REPLACE INTO teacher_departments (teacher_id, department_id, is_primary) VALUES (?, ?, 0)').run(id, targetDepartmentId);
      res.json({ success: true, message: `Faculty shared with department ${targetDepartmentId}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error sharing teacher' });
    }
  }

  static updateTeacher(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const { name, shortCode, email, department, maxHoursPerDay, maxHoursPerWeek, unavailableSlots, color } = req.body;
      db.prepare(`
        UPDATE teachers SET 
          name = COALESCE(?, name),
          short_code = COALESCE(?, short_code),
          email = COALESCE(?, email),
          department = COALESCE(?, department),
          max_hours_per_day = COALESCE(?, max_hours_per_day),
          max_hours_per_week = COALESCE(?, max_hours_per_week),
          unavailable_slots = COALESCE(?, unavailable_slots),
          color = COALESCE(?, color)
        WHERE id = ?
      `).run(
        name,
        shortCode,
        email,
        department,
        maxHoursPerDay,
        maxHoursPerWeek,
        unavailableSlots !== undefined ? JSON.stringify(unavailableSlots) : null,
        color,
        id
      );
      res.json({ success: true, message: 'Teacher updated' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error updating teacher' });
    }
  }

  static deleteTeacher(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM teacher_departments WHERE teacher_id = ?').run(id);
      db.prepare('DELETE FROM teachers WHERE id = ?').run(id);
      res.json({ success: true, message: 'Teacher deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error deleting teacher' });
    }
  }

  // Room CRUD
  static createRoom(req: Request, res: Response): void {
    try {
      const { roomNumber, name, type, capacity, building, departmentId, isShared } = req.body;
      const id = `r-${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(`
        INSERT INTO rooms (id, room_number, name, type, capacity, building, department_id, is_shared)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        roomNumber,
        name || null,
        type || 'LECTURE_HALL',
        capacity || 60,
        building || 'Academic Block',
        departmentId || null,
        isShared ? 1 : 0
      );
      res.status(201).json({ id, roomNumber, name, type, capacity, building, departmentId, isShared });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error creating room' });
    }
  }

  static updateRoom(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const { roomNumber, name, type, capacity, building, departmentId, isShared } = req.body;
      db.prepare(`
        UPDATE rooms SET
          room_number = COALESCE(?, room_number),
          name = COALESCE(?, name),
          type = COALESCE(?, type),
          capacity = COALESCE(?, capacity),
          building = COALESCE(?, building),
          department_id = COALESCE(?, department_id),
          is_shared = COALESCE(?, is_shared)
        WHERE id = ?
      `).run(roomNumber, name, type, capacity, building, departmentId, isShared !== undefined ? (isShared ? 1 : 0) : null, id);
      res.json({ success: true, message: 'Room updated' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error updating room' });
    }
  }

  static deleteRoom(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
      res.json({ success: true, message: 'Room deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error deleting room' });
    }
  }

  // Subject CRUD
  static createSubject(req: Request, res: Response): void {
    try {
      const { code, name, type, weeklyHours, durationSlots, assignedTeacherId, departmentId, preferredRoomType, allowTwoHourBlock, isDoubleBlock, color } = req.body;
      const id = `sub-${crypto.randomUUID().slice(0, 8)}`;
      const hasDoubleBlock = allowTwoHourBlock || isDoubleBlock ? 1 : 0;
      db.prepare(`
        INSERT INTO subjects (id, code, name, type, weekly_hours, duration_slots, assigned_teacher_id, department_id, preferred_room_type, allow_two_hour_block, is_double_block, color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        code,
        name,
        type || 'THEORY',
        weeklyHours || 3,
        durationSlots || 1,
        assignedTeacherId,
        departmentId || null,
        preferredRoomType || 'LECTURE_HALL',
        hasDoubleBlock,
        hasDoubleBlock,
        color || '#6366f1'
      );
      res.status(201).json({ id, code, name, type, weeklyHours, durationSlots, assignedTeacherId, departmentId, preferredRoomType, allowTwoHourBlock: Boolean(hasDoubleBlock), isDoubleBlock: Boolean(hasDoubleBlock), color });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error creating subject' });
    }
  }

  static updateSubject(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const { code, name, type, weeklyHours, durationSlots, assignedTeacherId, departmentId, preferredRoomType, allowTwoHourBlock, isDoubleBlock, color } = req.body;
      const hasDoubleBlock = allowTwoHourBlock !== undefined || isDoubleBlock !== undefined ? (allowTwoHourBlock || isDoubleBlock ? 1 : 0) : null;
      db.prepare(`
        UPDATE subjects SET
          code = COALESCE(?, code),
          name = COALESCE(?, name),
          type = COALESCE(?, type),
          weekly_hours = COALESCE(?, weekly_hours),
          duration_slots = COALESCE(?, duration_slots),
          assigned_teacher_id = COALESCE(?, assigned_teacher_id),
          department_id = COALESCE(?, department_id),
          preferred_room_type = COALESCE(?, preferred_room_type),
          allow_two_hour_block = COALESCE(?, allow_two_hour_block),
          is_double_block = COALESCE(?, is_double_block),
          color = COALESCE(?, color)
        WHERE id = ?
      `).run(code, name, type, weeklyHours, durationSlots, assignedTeacherId, departmentId, preferredRoomType, hasDoubleBlock, hasDoubleBlock, color, id);
      res.json({ success: true, message: 'Subject updated' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error updating subject' });
    }
  }

  static deleteSubject(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
      res.json({ success: true, message: 'Subject deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error deleting subject' });
    }
  }

  // Batch CRUD
  static createBatch(req: Request, res: Response): void {
    try {
      const { name, department, departmentId, semester, section, studentCount, subjectIds } = req.body;
      const id = `batch-${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(`
        INSERT INTO batches (id, name, department, department_id, semester, section, student_count, subject_ids)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name,
        department || 'Computer Science & Engineering',
        departmentId || null,
        semester || 1,
        section || 'A',
        studentCount || 60,
        JSON.stringify(subjectIds || [])
      );
      res.status(201).json({ id, name, department, departmentId, semester, section, studentCount, subjectIds });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error creating batch' });
    }
  }

  static updateBatch(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const { name, department, departmentId, semester, section, studentCount, subjectIds } = req.body;
      db.prepare(`
        UPDATE batches SET
          name = COALESCE(?, name),
          department = COALESCE(?, department),
          department_id = COALESCE(?, department_id),
          semester = COALESCE(?, semester),
          section = COALESCE(?, section),
          student_count = COALESCE(?, student_count),
          subject_ids = COALESCE(?, subject_ids)
        WHERE id = ?
      `).run(name, department, departmentId, semester, section, studentCount, subjectIds !== undefined ? JSON.stringify(subjectIds) : null, id);
      res.json({ success: true, message: 'Batch updated' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error updating batch' });
    }
  }

  static deleteBatch(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM batches WHERE id = ?').run(id);
      res.json({ success: true, message: 'Batch deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error deleting batch' });
    }
  }

  // Update Config
  static updateConfig(req: Request, res: Response): void {
    try {
      const { collegeName, workingDays, periodsPerDay, periodDurationMinutes, startTime, breakSlots } = req.body;
      if (collegeName) {
        db.prepare('UPDATE college_config SET college_name = ?, updated_at = ? WHERE id = ?').run(collegeName.trim(), new Date().toISOString(), 'default');
      }
      db.prepare(`
        INSERT OR REPLACE INTO time_slot_config (id, college_name, working_days, periods_per_day, period_duration_minutes, start_time, break_slots)
        VALUES ('default', ?, ?, ?, ?, ?, ?)
      `).run(
        collegeName || 'Apex Institute of Technology & Science',
        JSON.stringify(workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
        periodsPerDay || 6,
        periodDurationMinutes || 50,
        startTime || '09:00',
        JSON.stringify(breakSlots || [])
      );
      res.json({ success: true, message: 'Time slot configuration updated' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error updating config' });
    }
  }
}
