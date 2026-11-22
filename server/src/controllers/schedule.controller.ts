import { Request, Response } from 'express';
import { db } from '../db/db.js';
import { ScheduleEntryData } from '../engine/SchedulingEngine.js';

function getCurrentWeekId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

export class ScheduleController {
  static getSchedule(req: Request, res: Response): void {
    try {
      const rows = db.prepare(`
        SELECT 
          id, 
          day, 
          period_index as periodIndex, 
          start_minute as startMinute,
          end_minute as endMinute,
          batch_id as batchId, 
          subject_id as subjectId, 
          teacher_id as teacherId, 
          room_id as roomId, 
          department_id as departmentId,
          duration_slots as durationSlots, 
          is_locked as isLocked 
        FROM schedule_entries
      `).all() as any[];

      // Fetch active weekly overrides for this week to reflect live reschedules
      const currentWeek = getCurrentWeekId();
      let activeOverrides: any[] = [];
      try {
        activeOverrides = db.prepare('SELECT * FROM reschedule_overrides WHERE valid_for_week = ?').all(currentWeek) as any[];
      } catch {}

      const entryMap = new Map<string, any>();
      for (const r of rows) {
        entryMap.set(r.id, {
          ...r,
          isLocked: Boolean(r.isLocked),
          isRescheduled: false,
        });
      }

      for (const ovr of activeOverrides) {
        if (ovr.entry_id && entryMap.has(ovr.entry_id)) {
          const entry = entryMap.get(ovr.entry_id);
          entry.day = ovr.new_day;
          entry.periodIndex = ovr.new_period;
          entry.roomId = ovr.new_room_id;
          if (ovr.new_start_minute) entry.startMinute = ovr.new_start_minute;
          if (ovr.new_end_minute) entry.endMinute = ovr.new_end_minute;
          entry.isRescheduled = true;
          entry.isThisWeekOnly = Boolean(ovr.is_this_week_only);
        } else {
          // If entry_id not specified, find by coordinate match
          let matched = false;
          for (const [id, entry] of entryMap.entries()) {
            if (
              entry.day === ovr.original_day &&
              entry.periodIndex === ovr.original_period &&
              (entry.teacherId === ovr.teacher_id || entry.batchId === ovr.batch_id)
            ) {
              entry.day = ovr.new_day;
              entry.periodIndex = ovr.new_period;
              entry.roomId = ovr.new_room_id;
              if (ovr.new_start_minute) entry.startMinute = ovr.new_start_minute;
              if (ovr.new_end_minute) entry.endMinute = ovr.new_end_minute;
              entry.isRescheduled = true;
              entry.isThisWeekOnly = Boolean(ovr.is_this_week_only);
              matched = true;
              break;
            }
          }
          if (!matched) {
            entryMap.set(`ovr_${ovr.id}`, {
              id: `ovr_${ovr.id}`,
              day: ovr.new_day,
              periodIndex: ovr.new_period,
              startMinute: ovr.new_start_minute || 540,
              endMinute: ovr.new_end_minute || 600,
              batchId: ovr.batch_id,
              subjectId: 'sub-rescheduled',
              teacherId: ovr.teacher_id,
              roomId: ovr.new_room_id,
              durationSlots: 1,
              isLocked: false,
              isRescheduled: true,
              isThisWeekOnly: Boolean(ovr.is_this_week_only),
            });
          }
        }
      }

      res.json({
        validForWeek: currentWeek,
        entries: Array.from(entryMap.values()),
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
