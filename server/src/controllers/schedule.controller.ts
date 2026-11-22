import { Request, Response } from 'express';
import { db } from '../db/db.js';
import { ScheduleEntryData } from '../engine/SchedulingEngine.js';

export class ScheduleController {
  static getSchedule(req: Request, res: Response): void {
    try {
      const rows = db.prepare(`
        SELECT 
          id, 
          day, 
          period_index as periodIndex, 
          batch_id as batchId, 
          subject_id as subjectId, 
          teacher_id as teacherId, 
          room_id as roomId, 
          duration_slots as durationSlots, 
          is_locked as isLocked 
        FROM schedule_entries
      `).all() as ScheduleEntryData[];

      res.json({
        entries: rows.map((r) => ({
          ...r,
          isLocked: Boolean(r.isLocked),
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching schedule' });
    }
  }

  static removeEntry(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM schedule_entries WHERE id = ?').run(id);
      res.json({ success: true, message: 'Schedule entry removed' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error deleting entry' });
    }
  }
}
