import * as XLSX from 'xlsx';
import {
  ScheduleEntry,
  Teacher,
  Room,
  Subject,
  BatchSection,
  TimeSlotConfig,
} from '../types';
import { getPeriodTiming } from '../engine/timeUtils';
import { UNIVERSITY_INFO } from '../data/demoData';

export function exportTimetableToExcel(
  entries: ScheduleEntry[],
  teachers: Teacher[],
  rooms: Room[],
  subjects: Subject[],
  batches: BatchSection[],
  config: TimeSlotConfig
) {
  const wb = XLSX.utils.book_new();

  const teacherMap = new Map<string, Teacher>(teachers.map((t) => [t.id, t]));
  const roomMap = new Map<string, Room>(rooms.map((r) => [r.id, r]));
  const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));

  // 1. Generate a sheet for each batch
  batches.forEach((batch) => {
    const sheetData: any[][] = [];

    // Header Info
    sheetData.push([UNIVERSITY_INFO.name]);
    sheetData.push([`${UNIVERSITY_INFO.department} - Session: ${UNIVERSITY_INFO.session}`]);
    sheetData.push([`BATCH TIMETABLE: ${batch.name} (Sem ${batch.semester})`]);
    sheetData.push([`Student Strength: ${batch.studentCount} | Department: ${batch.department}`]);
    sheetData.push([]); // blank line

    // Table Header Row
    const headerRow = ['Day'];
    for (let p = 0; p < config.periodsPerDay; p++) {
      const timing = getPeriodTiming(p, config);
      headerRow.push(`P${p + 1} (${timing.label})`);
    }
    sheetData.push(headerRow);

    // Days rows
    config.workingDays.forEach((day) => {
      const row: string[] = [day];
      for (let p = 0; p < config.periodsPerDay; p++) {
        const entry = entries.find(
          (e) => e.batchId === batch.id && e.day === day && e.periodIndex === p
        );
        if (entry) {
          const sub = subjectMap.get(entry.subjectId);
          const tch = teacherMap.get(entry.teacherId);
          const rm = roomMap.get(entry.roomId);
          row.push(`${sub?.code || 'SUB'} - ${sub?.name || ''} [${tch?.shortCode || ''} | ${rm?.roomNumber || ''}]`);
        } else {
          row.push('');
        }
      }
      sheetData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    // Sanitize sheet name (max 31 chars)
    const sheetName = batch.name.replace(/[:\\/?*\[\]]/g, '').substring(0, 30);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // 2. Faculty Schedules Sheet
  const facultySheetData: any[][] = [];
  facultySheetData.push([UNIVERSITY_INFO.name]);
  facultySheetData.push(['FACULTY MASTER TIMETABLE SCHEDULE']);
  facultySheetData.push([]);

  teachers.forEach((teacher) => {
    facultySheetData.push([`Faculty: ${teacher.name} (${teacher.shortCode}) - Dept: ${teacher.department || ''}`]);
    const headerRow = ['Day'];
    for (let p = 0; p < config.periodsPerDay; p++) {
      const timing = getPeriodTiming(p, config);
      headerRow.push(`P${p + 1} (${timing.label})`);
    }
    facultySheetData.push(headerRow);

    config.workingDays.forEach((day) => {
      const row: string[] = [day];
      for (let p = 0; p < config.periodsPerDay; p++) {
        const entry = entries.find(
          (e) => e.teacherId === teacher.id && e.day === day && e.periodIndex === p
        );
        if (entry) {
          const sub = subjectMap.get(entry.subjectId);
          const bt = batches.find((b) => b.id === entry.batchId);
          const rm = roomMap.get(entry.roomId);
          row.push(`${sub?.code || 'SUB'} [${bt?.name || ''} @ ${rm?.roomNumber || ''}]`);
        } else {
          row.push('');
        }
      }
      facultySheetData.push(row);
    });
    facultySheetData.push([]); // blank line separator
  });

  const wsFaculty = XLSX.utils.aoa_to_sheet(facultySheetData);
  XLSX.utils.book_append_sheet(wb, wsFaculty, 'Faculty Master');

  // 3. Room Occupancy Sheet
  const roomSheetData: any[][] = [];
  roomSheetData.push([UNIVERSITY_INFO.name]);
  roomSheetData.push(['ROOM & LAB OCCUPANCY SCHEDULE']);
  roomSheetData.push([]);

  rooms.forEach((room) => {
    roomSheetData.push([`Room: ${room.roomNumber} (${room.type}) - Capacity: ${room.capacity} seats`]);
    const headerRow = ['Day'];
    for (let p = 0; p < config.periodsPerDay; p++) {
      const timing = getPeriodTiming(p, config);
      headerRow.push(`P${p + 1} (${timing.label})`);
    }
    roomSheetData.push(headerRow);

    config.workingDays.forEach((day) => {
      const row: string[] = [day];
      for (let p = 0; p < config.periodsPerDay; p++) {
        const entry = entries.find(
          (e) => e.roomId === room.id && e.day === day && e.periodIndex === p
        );
        if (entry) {
          const sub = subjectMap.get(entry.subjectId);
          const bt = batches.find((b) => b.id === entry.batchId);
          const tch = teacherMap.get(entry.teacherId);
          row.push(`${sub?.code || 'SUB'} [${bt?.name || ''} | ${tch?.shortCode || ''}]`);
        } else {
          row.push('');
        }
      }
      roomSheetData.push(row);
    });
    roomSheetData.push([]); // blank separator
  });

  const wsRoom = XLSX.utils.aoa_to_sheet(roomSheetData);
  XLSX.utils.book_append_sheet(wb, wsRoom, 'Room Master');

  // 4. Raw Master Entities Sheet
  const entityData: any[][] = [
    ['Entity Type', 'ID', 'Name / Code', 'Type / Dept', 'Capacity / Hours', 'Assigned Info'],
  ];

  teachers.forEach((t) => {
    entityData.push(['Teacher', t.id, t.name, t.department || '', `${t.maxHoursPerWeek} hrs/wk`, `Code: ${t.shortCode}`]);
  });
  subjects.forEach((s) => {
    const tch = teacherMap.get(s.assignedTeacherId);
    entityData.push(['Subject', s.id, `${s.code} - ${s.name}`, s.type, `${s.weeklyHours} hrs (${s.durationSlots} slot)`, `Teacher: ${tch?.name || s.assignedTeacherId}`]);
  });
  rooms.forEach((r) => {
    entityData.push(['Room', r.id, r.roomNumber, r.type, `${r.capacity} seats`, r.building || '']);
  });
  batches.forEach((b) => {
    entityData.push(['Batch', b.id, b.name, b.department, `${b.studentCount} students`, `Sem: ${b.semester}`]);
  });

  const wsEntities = XLSX.utils.aoa_to_sheet(entityData);
  XLSX.utils.book_append_sheet(wb, wsEntities, 'Database Master');

  // Export the file
  const filename = `University_Timetable_Workbook_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}
