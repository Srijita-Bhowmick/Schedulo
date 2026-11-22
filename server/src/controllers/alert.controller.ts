import { Request, Response } from 'express';
import { db } from '../db/db.js';

export class AlertController {
  static getAlerts(req: Request, res: Response): void {
    try {
      const { batchId, teacherId } = req.query;
      let query = 'SELECT * FROM reschedule_alerts ORDER BY created_at DESC LIMIT 50';
      let params: any[] = [];

      if (batchId) {
        query = 'SELECT * FROM reschedule_alerts WHERE batch_id = ? ORDER BY created_at DESC LIMIT 50';
        params = [batchId];
      } else if (teacherId) {
        query = 'SELECT * FROM reschedule_alerts WHERE teacher_id = ? ORDER BY created_at DESC LIMIT 50';
        params = [teacherId];
      }

      const rows = db.prepare(query).all(...params);
      res.json({ alerts: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching alerts' });
    }
  }

  static markRead(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      db.prepare('UPDATE reschedule_alerts SET is_read = 1 WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error marking alert as read' });
    }
  }

  static clearAll(req: Request, res: Response): void {
    try {
      db.prepare('DELETE FROM reschedule_alerts').run();
      res.json({ success: true, message: 'All alerts cleared' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error clearing alerts' });
    }
  }
}
