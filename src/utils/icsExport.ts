import {
  ScheduleEntry,
  Teacher,
  Room,
  Subject,
  BatchSection,
  TimeSlotConfig,
  PerspectiveType,
} from '../types';
import { getPeriodTiming } from '../engine/timeUtils';
import { UNIVERSITY_INFO } from '../data/demoData';

const DAY_MAP: Record<string, string> = {
  Monday: 'MO',
  Tuesday: 'TU',
  Wednesday: 'WE',
  Thursday: 'TH',
  Friday: 'FR',
  Saturday: 'SA',
};

export function exportTimetableToICS(
  perspective: PerspectiveType,
  targetId: string,
  entries: ScheduleEntry[],
  teachers: Teacher[],
  rooms: Room[],
  subjects: Subject[],
  batches: BatchSection[],
  config: TimeSlotConfig
) {
  const teacherMap = new Map<string, Teacher>(teachers.map((t) => [t.id, t]));
  const roomMap = new Map<string, Room>(rooms.map((r) => [r.id, r]));
  const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));
  const batchMap = new Map<string, BatchSection>(batches.map((b) => [b.id, b]));

  const filteredEntries = entries.filter((e) => {
    if (perspective === 'batch') return e.batchId === targetId;
    if (perspective === 'teacher') return e.teacherId === targetId;
    if (perspective === 'room') return e.roomId === targetId;
    return true;
  });

  // Base reference date (Upcoming Monday)
  const today = new Date();
  const nextMonday = new Date(today);
  const dayOffset = (1 + 7 - today.getDay()) % 7 || 7;
  nextMonday.setDate(today.getDate() + dayOffset);

  const dayDateMap: Record<string, Date> = {};
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  dayNames.forEach((d, i) => {
    const dDate = new Date(nextMonday);
    dDate.setDate(nextMonday.getDate() + i);
    dayDateMap[d] = dDate;
  });

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Schedulo//Timetable Scheduler Engine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${UNIVERSITY_INFO.shortName} Timetable - ${targetId}`,
    'X-WR-TIMEZONE:Asia/Kolkata',
  ];

  filteredEntries.forEach((entry) => {
    const sub = subjectMap.get(entry.subjectId);
    const tch = teacherMap.get(entry.teacherId);
    const rm = roomMap.get(entry.roomId);
    const bt = batchMap.get(entry.batchId);
    const timing = getPeriodTiming(entry.periodIndex, config);

    const baseDate = dayDateMap[entry.day] || nextMonday;
    const [startH, startM] = timing.start.split(':');
    const [endH, endM] = timing.end.split(':');

    const dtStart = new Date(baseDate);
    dtStart.setHours(parseInt(startH, 10), parseInt(startM, 10), 0);

    const dtEnd = new Date(baseDate);
    dtEnd.setHours(parseInt(endH, 10), parseInt(endM, 10), 0);

    const formatICSDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const summary = `${sub?.code || 'CLASS'}: ${sub?.name || 'Class'}`;
    const location = `${rm?.roomNumber || 'Room'} (${rm?.name || ''})`;
    const description = `Batch: ${bt?.name || ''}\\nFaculty: ${tch?.name || ''} (${tch?.shortCode || ''})\\nType: ${sub?.type || 'Class'}\\nCampus: ${UNIVERSITY_INFO.name}`;

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${entry.id}@schedulo.university`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(dtStart)}`,
      `DTEND:${formatICSDate(dtEnd)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${DAY_MAP[entry.day] || 'MO'};COUNT=16`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Timetable_${perspective}_${targetId}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
