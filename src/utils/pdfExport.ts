import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

export function exportTimetableToPDF(
  perspective: PerspectiveType,
  targetId: string,
  entries: ScheduleEntry[],
  teachers: Teacher[],
  rooms: Room[],
  subjects: Subject[],
  batches: BatchSection[],
  config: TimeSlotConfig
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const teacherMap = new Map<string, Teacher>(teachers.map((t) => [t.id, t]));
  const roomMap = new Map<string, Room>(rooms.map((r) => [r.id, r]));
  const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));
  const batchMap = new Map<string, BatchSection>(batches.map((b) => [b.id, b]));

  // Determine Title based on perspective
  let subTitle = '';
  let entityDetails = '';

  if (perspective === 'batch') {
    const batch = batchMap.get(targetId);
    subTitle = `CLASS TIMETABLE - BATCH: ${batch?.name?.toUpperCase() || 'ALL BATCHES'}`;
    entityDetails = `Department: ${batch?.department || 'Engineering'} | Semester: ${batch?.semester || 'N/A'} | Strength: ${batch?.studentCount || '60'} Students`;
  } else if (perspective === 'teacher') {
    const teacher = teacherMap.get(targetId);
    subTitle = `FACULTY WORKLOAD SCHEDULE - ${teacher?.name?.toUpperCase() || 'FACULTY'}`;
    entityDetails = `Department: ${teacher?.department || 'Faculty'} | Code: ${teacher?.shortCode || ''} | Email: ${teacher?.email || ''}`;
  } else {
    const room = roomMap.get(targetId);
    subTitle = `FACILITY OCCUPANCY SCHEDULE - ROOM: ${room?.roomNumber || 'ROOM'}`;
    entityDetails = `Room Type: ${room?.type || 'Lecture Hall'} | Capacity: ${room?.capacity || '60'} Seats | Building: ${room?.building || 'Main Block'}`;
  }

  // Draw Header Banner
  doc.setFillColor(30, 27, 75); // Dark Indigo
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(UNIVERSITY_INFO.name.toUpperCase(), 148.5, 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  doc.text(`${UNIVERSITY_INFO.department} | Session: ${UNIVERSITY_INFO.session} (${UNIVERSITY_INFO.academicYear})`, 148.5, 15, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(199, 210, 254);
  doc.text(UNIVERSITY_INFO.address, 148.5, 20, { align: 'center' });

  // Subheader
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(subTitle, 14, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(entityDetails, 14, 38);

  const timestamp = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(8);
  doc.text(`Generated: ${timestamp}`, 283, 38, { align: 'right' });

  // Build Table Headers: Day, Period 1, Period 2, ...
  const tableHeaders: string[] = ['Day / Time'];

  for (let p = 0; p < config.periodsPerDay; p++) {
    const timing = getPeriodTiming(p, config);
    if (timing.isBreakBefore && timing.breakBeforeName) {
      tableHeaders.push(`${timing.breakBeforeName}\n(Break)`);
    }
    tableHeaders.push(`Period ${p + 1}\n${timing.label}`);
  }

  // Filter entries according to perspective
  const filteredEntries = entries.filter((e) => {
    if (perspective === 'batch') return e.batchId === targetId;
    if (perspective === 'teacher') return e.teacherId === targetId;
    if (perspective === 'room') return e.roomId === targetId;
    return true;
  });

  // Build Table Rows
  const tableRows: string[][] = [];

  for (const day of config.workingDays) {
    const row: string[] = [day];

    for (let p = 0; p < config.periodsPerDay; p++) {
      const timing = getPeriodTiming(p, config);
      if (timing.isBreakBefore) {
        row.push('☕ BREAK');
      }

      const slotEntry = filteredEntries.find((e) => e.day === day && e.periodIndex === p);
      if (slotEntry) {
        const sub = subjectMap.get(slotEntry.subjectId);
        const tch = teacherMap.get(slotEntry.teacherId);
        const rm = roomMap.get(slotEntry.roomId);
        const bt = batchMap.get(slotEntry.batchId);

        let cellContent = '';
        if (perspective === 'batch') {
          cellContent = `${sub?.code || 'SUB'}\n${sub?.name || ''}\n[${tch?.shortCode || ''} | ${rm?.roomNumber || ''}]`;
        } else if (perspective === 'teacher') {
          cellContent = `${sub?.code || 'SUB'}\n${bt?.name || ''}\n[Room: ${rm?.roomNumber || ''}]`;
        } else {
          cellContent = `${sub?.code || 'SUB'}\n${bt?.name || ''}\n[Faculty: ${tch?.shortCode || ''}]`;
        }

        if (sub?.type === 'LAB') {
          cellContent = `🔬 ${cellContent}`;
        }
        row.push(cellContent);
      } else {
        row.push('---');
      }
    }

    tableRows.push(row);
  }

  // Draw AutoTable
  autoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    startY: 42,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo 600
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      halign: 'center',
      valign: 'middle',
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: {
        fillColor: [241, 245, 249],
        fontStyle: 'bold',
        textColor: [30, 41, 59],
        cellWidth: 22,
      },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index > 0) {
        const text = data.cell.text.join(' ');
        if (text.includes('BREAK')) {
          data.cell.styles.fillColor = [254, 243, 199]; // Amber 100
          data.cell.styles.textColor = [146, 64, 14];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('🔬')) {
          data.cell.styles.fillColor = [224, 231, 255]; // Indigo 100
          data.cell.styles.textColor = [49, 46, 129];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === '---') {
          data.cell.styles.textColor = [148, 163, 184];
        }
      }
    },
  });

  // Footer: Signatures Block
  const finalY = (doc as any).lastAutoTable.finalY || 160;
  const sigY = Math.min(195, finalY + 18);

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');

  doc.line(20, sigY, 75, sigY);
  doc.text('Timetable Coordinator', 47.5, sigY + 5, { align: 'center' });

  doc.line(120, sigY, 175, sigY);
  doc.text('Head of Department (HOD)', 147.5, sigY + 5, { align: 'center' });

  doc.line(220, sigY, 275, sigY);
  doc.text('Principal / Dean (Academics)', 247.5, sigY + 5, { align: 'center' });

  // Save the PDF
  const filename = `Timetable_${perspective}_${targetId}_${Date.now()}.pdf`;
  doc.save(filename);
}
