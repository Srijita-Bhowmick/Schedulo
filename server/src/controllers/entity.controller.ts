import { Request, Response } from 'express';
import { db } from '../db/db.js';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import {
  DepartmentRow,
  RoomRow,
  TeacherRow,
  TeacherDepartmentRow,
  BatchRow,
  SubjectRow,
  CollegeConfigRow,
  TimeSlotConfigRow,
} from '../types/db.types.js';

export class EntityController {
  static getAll(req: Request, res: Response): void {
    try {
      const departments = db.prepare('SELECT * FROM departments').all() as DepartmentRow[];
      const rooms = db.prepare('SELECT id, room_number as roomNumber, name, type, capacity, building, department_id as departmentId, is_shared as isShared FROM rooms').all() as (RoomRow & { roomNumber: string; departmentId: string | null; isShared: number })[];
      
      type TeacherQueryResult = TeacherRow & { shortCode: string; maxHoursPerDay: number; maxHoursPerWeek: number; unavailableSlots: string };
      const teachersRaw = db.prepare('SELECT id, name, short_code as shortCode, email, department, max_hours_per_day as maxHoursPerDay, max_hours_per_week as maxHoursPerWeek, unavailable_slots as unavailableSlots, color FROM teachers').all() as TeacherQueryResult[];
      const teacherDepts = db.prepare('SELECT * FROM teacher_departments').all() as TeacherDepartmentRow[];

      const teachers = teachersRaw.map((t) => {
        const depts = teacherDepts.filter((td) => td.teacher_id === t.id).map((td) => td.department_id);
        return {
          ...t,
          unavailableSlots: JSON.parse(t.unavailableSlots || '[]'),
          departmentIds: depts,
          isShared: depts.length > 1,
        };
      });

      type BatchQueryResult = BatchRow & { departmentId: string; studentCount: number; subjectIds: string };
      const batchesRaw = db.prepare('SELECT id, name, department, department_id as departmentId, semester, section, student_count as studentCount, subject_ids as subjectIds FROM batches').all() as BatchQueryResult[];
      const batches = batchesRaw.map((b) => ({
        ...b,
        subjectIds: JSON.parse(b.subjectIds || '[]'),
      }));

      const subjects = db.prepare('SELECT id, code, name, type, weekly_hours as weeklyHours, duration_slots as durationSlots, assigned_teacher_id as assignedTeacherId, department_id as departmentId, preferred_room_type as preferredRoomType, allow_two_hour_block as allowTwoHourBlock, is_double_block as isDoubleBlock, color FROM subjects').all() as (SubjectRow & { weeklyHours: number; durationSlots: number; assignedTeacherId: string; departmentId: string | null; preferredRoomType: string | null; allowTwoHourBlock: number; isDoubleBlock: number })[];

      let collegeName = 'Apex Institute of Technology & Science';
      try {
        const col = db.prepare('SELECT college_name FROM college_config WHERE id = ?').get('default') as Pick<CollegeConfigRow, 'college_name'> | undefined;
        if (col?.college_name) collegeName = col.college_name;
      } catch {}

      const configRaw = db.prepare('SELECT * FROM time_slot_config WHERE id = ?').get('default') as TimeSlotConfigRow | undefined;
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
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error fetching entities' });
    }
  }

  // Teacher CRUD
  static createTeacher(req: AuthenticatedRequest, res: Response): void {
    try {
      const { name, shortCode, email, department, departmentId, maxHoursPerDay, maxHoursPerWeek, unavailableSlots, color } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Faculty name is required and must be a non-empty string' });
        return;
      }
      const safeName = name.trim();
      const safeShortCode = (shortCode && typeof shortCode === 'string' && shortCode.trim())
        ? shortCode.trim().toUpperCase()
        : safeName.slice(0, 3).toUpperCase();
      const safeMaxHoursDay = Math.max(1, Math.min(parseInt(String(maxHoursPerDay), 10) || 4, 12));
      const safeMaxHoursWeek = Math.max(1, Math.min(parseInt(String(maxHoursPerWeek), 10) || 16, 40));

      const adminDeptId = req.user?.departmentId;
      const targetDeptId = departmentId || adminDeptId;
      if (req.user?.role === 'ADMIN' && adminDeptId && targetDeptId && adminDeptId !== targetDeptId) {
        res.status(403).json({ error: 'Cannot create teacher for another department' });
        return;
      }
      const id = `t-${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(`
        INSERT INTO teachers (id, name, short_code, email, department, max_hours_per_day, max_hours_per_week, unavailable_slots, color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        safeName,
        safeShortCode,
        (email && typeof email === 'string' && email.trim()) ? email.trim() : null,
        department || 'Computer Science & Engineering',
        safeMaxHoursDay,
        safeMaxHoursWeek,
        JSON.stringify(unavailableSlots || []),
        color || '#6366f1'
      );

      if (departmentId) {
        db.prepare('INSERT OR REPLACE INTO teacher_departments (teacher_id, department_id, is_primary) VALUES (?, ?, 1)').run(id, departmentId);
      }

      res.status(201).json({ id, name: safeName, shortCode: safeShortCode, email, department, maxHoursPerDay: safeMaxHoursDay, maxHoursPerWeek: safeMaxHoursWeek, unavailableSlots, color });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error creating teacher' });
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
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error sharing teacher' });
    }
  }

  static updateTeacher(req: AuthenticatedRequest, res: Response): void {
    try {
      const { id } = req.params;
      const adminDeptId = req.user?.departmentId;
      if (req.user?.role === 'ADMIN' && adminDeptId) {
        const teacherMap = db.prepare('SELECT * FROM teacher_departments WHERE teacher_id = ? AND department_id = ?').get(id, adminDeptId);
        const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id) as TeacherRow | undefined;
        if (!teacherMap && teacher && teacher.department && !teacher.department.toLowerCase().includes(adminDeptId.replace('dept-', ''))) {
          res.status(403).json({ error: 'Cannot update teacher of another department' });
          return;
        }
      }
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
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error updating teacher' });
    }
  }

  static deleteTeacher(req: AuthenticatedRequest, res: Response): void {
    try {
      const { id } = req.params;
      const adminDeptId = req.user?.departmentId;
      if (req.user?.role === 'ADMIN' && adminDeptId) {
        const teacherMap = db.prepare('SELECT * FROM teacher_departments WHERE teacher_id = ? AND department_id = ?').get(id, adminDeptId);
        const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id) as TeacherRow | undefined;
        if (!teacherMap && teacher && teacher.department && !teacher.department.toLowerCase().includes(adminDeptId.replace('dept-', ''))) {
          res.status(403).json({ error: 'Cannot delete teacher of another department' });
          return;
        }
      }
      db.prepare('DELETE FROM teacher_departments WHERE teacher_id = ?').run(id);
      db.prepare('DELETE FROM teachers WHERE id = ?').run(id);
      res.json({ success: true, message: 'Teacher deleted' });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error deleting teacher' });
    }
  }

  // Room CRUD
  static createRoom(req: AuthenticatedRequest, res: Response): void {
    try {
      const { roomNumber, name, type, capacity, building, departmentId, isShared } = req.body;
      if (!roomNumber || typeof roomNumber !== 'string' || !roomNumber.trim()) {
        res.status(400).json({ error: 'Room number is required and must be a non-empty string' });
        return;
      }
      const safeRoomNumber = roomNumber.trim();
      const safeCapacity = Math.max(1, Math.min(parseInt(String(capacity), 10) || 60, 500));

      const adminDeptId = req.user?.departmentId;
      if (req.user?.role === 'ADMIN' && adminDeptId && departmentId && adminDeptId !== departmentId) {
        res.status(403).json({ error: 'Cannot create room for another department' });
        return;
      }
      const id = `r-${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(`
        INSERT INTO rooms (id, room_number, name, type, capacity, building, department_id, is_shared)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        safeRoomNumber,
        (name && typeof name === 'string' && name.trim()) ? name.trim() : null,
        type || 'LECTURE_HALL',
        safeCapacity,
        building || 'Academic Block',
        departmentId || null,
        isShared ? 1 : 0
      );
      res.status(201).json({ id, roomNumber: safeRoomNumber, name, type, capacity: safeCapacity, building, departmentId, isShared });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error creating room' });
    }
  }

  static updateRoom(req: AuthenticatedRequest, res: Response): void {
    try {
      const { id } = req.params;
      const adminDeptId = req.user?.departmentId;
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as RoomRow | undefined;
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }
      if (req.user?.role === 'ADMIN' && adminDeptId && room.department_id && adminDeptId !== room.department_id) {
        res.status(403).json({ error: 'Cannot modify room belonging to another department' });
        return;
      }
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
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error updating room' });
    }
  }

  static deleteRoom(req: AuthenticatedRequest, res: Response): void {
    try {
      const { id } = req.params;
      const adminDeptId = req.user?.departmentId;
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as RoomRow | undefined;
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }
      if (req.user?.role === 'ADMIN' && adminDeptId && room.department_id && adminDeptId !== room.department_id) {
        res.status(403).json({ error: 'Cannot delete room belonging to another department' });
        return;
      }
      db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
      res.json({ success: true, message: 'Room deleted' });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error deleting room' });
    }
  }

  // Subject CRUD
  static createSubject(req: AuthenticatedRequest, res: Response): void {
    try {
      const { code, name, type, weeklyHours, durationSlots, assignedTeacherId, departmentId, preferredRoomType, allowTwoHourBlock, isDoubleBlock, color } = req.body;
      if (!code || typeof code !== 'string' || !code.trim() || !name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Subject code and name are required non-empty strings' });
        return;
      }
      const safeCode = code.trim().toUpperCase();
      const safeName = name.trim();
      const safeWeeklyHours = Math.max(1, Math.min(parseInt(String(weeklyHours), 10) || 3, 20));
      const safeDurationSlots = Math.max(1, Math.min(parseInt(String(durationSlots), 10) || 1, 4));

      const adminDeptId = req.user?.departmentId;
      if (req.user?.role === 'ADMIN' && adminDeptId && departmentId && adminDeptId !== departmentId) {
        res.status(403).json({ error: 'Cannot create subject for another department' });
        return;
      }
      const id = `sub-${crypto.randomUUID().slice(0, 8)}`;
      const hasDoubleBlock = allowTwoHourBlock || isDoubleBlock ? 1 : 0;
      db.prepare(`
        INSERT INTO subjects (id, code, name, type, weekly_hours, duration_slots, assigned_teacher_id, department_id, preferred_room_type, allow_two_hour_block, is_double_block, color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        safeCode,
        safeName,
        type || 'THEORY',
        safeWeeklyHours,
        safeDurationSlots,
        assignedTeacherId,
        departmentId || null,
        preferredRoomType || 'LECTURE_HALL',
        hasDoubleBlock,
        hasDoubleBlock,
        color || '#6366f1'
      );
      res.status(201).json({ id, code: safeCode, name: safeName, type, weeklyHours: safeWeeklyHours, durationSlots: safeDurationSlots, assignedTeacherId, departmentId, preferredRoomType, allowTwoHourBlock: Boolean(hasDoubleBlock), isDoubleBlock: Boolean(hasDoubleBlock), color });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error creating subject' });
    }
  }

  static updateSubject(req: AuthenticatedRequest, res: Response): void {
    try {
      const { id } = req.params;
      const adminDeptId = req.user?.departmentId;
      const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as SubjectRow | undefined;
      if (!subject) {
        res.status(404).json({ error: 'Subject not found' });
        return;
      }
      if (req.user?.role === 'ADMIN' && adminDeptId && subject.department_id && adminDeptId !== subject.department_id) {
        res.status(403).json({ error: 'Cannot modify subject belonging to another department' });
        return;
      }
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
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error updating subject' });
    }
  }

  static deleteSubject(req: AuthenticatedRequest, res: Response): void {
    try {
      const { id } = req.params;
      const adminDeptId = req.user?.departmentId;
      const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as SubjectRow | undefined;
      if (!subject) {
        res.status(404).json({ error: 'Subject not found' });
        return;
      }
      if (req.user?.role === 'ADMIN' && adminDeptId && subject.department_id && adminDeptId !== subject.department_id) {
        res.status(403).json({ error: 'Cannot delete subject belonging to another department' });
        return;
      }
      db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
      res.json({ success: true, message: 'Subject deleted' });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error deleting subject' });
    }
  }

  // Batch CRUD
  static createBatch(req: AuthenticatedRequest, res: Response): void {
    try {
      const { name, department, departmentId, semester, section, studentCount, subjectIds } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Batch name is required and must be a non-empty string' });
        return;
      }
      const safeName = name.trim();
      const safeSemester = Math.max(1, Math.min(parseInt(String(semester), 10) || 1, 12));
      const safeStudents = Math.max(1, Math.min(parseInt(String(studentCount), 10) || 60, 500));

      const adminDeptId = req.user?.departmentId;
      if (req.user?.role === 'ADMIN' && adminDeptId && departmentId && adminDeptId !== departmentId) {
        res.status(403).json({ error: 'Cannot create batch for another department' });
        return;
      }
      const id = `batch-${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(`
        INSERT INTO batches (id, name, department, department_id, semester, section, student_count, subject_ids)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        safeName,
        department || 'Computer Science & Engineering',
        departmentId || null,
        safeSemester,
        section || 'A',
        safeStudents,
        JSON.stringify(subjectIds || [])
      );
      res.status(201).json({ id, name: safeName, department, departmentId, semester: safeSemester, section: section || 'A', studentCount: safeStudents, subjectIds: subjectIds || [] });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error creating batch' });
    }
  }

  static updateBatch(req: AuthenticatedRequest, res: Response): void {
    try {
      const { id } = req.params;
      const adminDeptId = req.user?.departmentId;
      const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(id) as BatchRow | undefined;
      if (!batch) {
        res.status(404).json({ error: 'Batch not found' });
        return;
      }
      if (req.user?.role === 'ADMIN' && adminDeptId && batch.department_id && adminDeptId !== batch.department_id) {
        res.status(403).json({ error: 'Cannot modify batch belonging to another department' });
        return;
      }
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
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error updating batch' });
    }
  }

  static deleteBatch(req: AuthenticatedRequest, res: Response): void {
    try {
      const { id } = req.params;
      const adminDeptId = req.user?.departmentId;
      const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(id) as BatchRow | undefined;
      if (!batch) {
        res.status(404).json({ error: 'Batch not found' });
        return;
      }
      if (req.user?.role === 'ADMIN' && adminDeptId && batch.department_id && adminDeptId !== batch.department_id) {
        res.status(403).json({ error: 'Cannot delete batch belonging to another department' });
        return;
      }
      db.prepare('DELETE FROM batches WHERE id = ?').run(id);
      res.json({ success: true, message: 'Batch deleted' });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error deleting batch' });
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
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Error updating config' });
    }
  }
}
