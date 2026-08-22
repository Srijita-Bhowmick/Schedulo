import React from 'react';
import {
  Download,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  Printer,
  Sparkles,
  Lock,
  Layers,
} from 'lucide-react';
import { useTimetableStore } from '../../store/useTimetableStore';
import { useUiStore } from '../../store/useUiStore';
import { getPeriodTiming } from '../../engine/timeUtils';
import { TimetableCell } from './TimetableCell';
import { exportTimetableToPDF } from '../../utils/pdfExport';
import { exportTimetableToExcel } from '../../utils/excelExport';
import { exportTimetableToICS } from '../../utils/icsExport';

export const TimetableGrid: React.FC = () => {
  const { entries, teachers, rooms, subjects, batches, timeSlotConfig, conflicts } = useTimetableStore();
  const { perspective, selectedEntityId, addToast } = useUiStore();

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const batchMap = new Map(batches.map((b) => [b.id, b]));

  // Filter entries according to active perspective
  const filteredEntries = entries.filter((e) => {
    if (perspective === 'batch') return e.batchId === selectedEntityId;
    if (perspective === 'teacher') return e.teacherId === selectedEntityId;
    if (perspective === 'room') return e.roomId === selectedEntityId;
    return true;
  });

  const selectedEntityName =
    perspective === 'batch'
      ? batchMap.get(selectedEntityId)?.name || 'Selected Batch'
      : perspective === 'teacher'
      ? teacherMap.get(selectedEntityId)?.name || 'Selected Faculty'
      : roomMap.get(selectedEntityId)?.roomNumber || 'Selected Facility';

  const handleExportPDF = () => {
    exportTimetableToPDF(
      perspective,
      selectedEntityId,
      entries,
      teachers,
      rooms,
      subjects,
      batches,
      timeSlotConfig
    );
    addToast({
      type: 'success',
      title: 'PDF Timetable Exported',
      description: `Official A4 Landscape timetable generated for ${selectedEntityName}.`,
    });
  };

  const handleExportExcel = () => {
    exportTimetableToExcel(entries, teachers, rooms, subjects, batches, timeSlotConfig);
    addToast({
      type: 'success',
      title: 'Excel Workbook Exported',
      description: 'Multi-sheet workbook created with all batch and faculty schedules.',
    });
  };

  const handleExportICS = () => {
    exportTimetableToICS(
      perspective,
      selectedEntityId,
      entries,
      teachers,
      rooms,
      subjects,
      batches,
      timeSlotConfig
    );
    addToast({
      type: 'success',
      title: 'iCalendar (.ics) Feed Exported',
      description: 'Import this file directly into Google Calendar, Outlook, or Apple Calendar.',
    });
  };

  return (
    <div className="flex flex-col space-y-4">
      
      {/* Table Toolbar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold font-display text-white tracking-wide">
              {selectedEntityName}
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {filteredEntries.length} Scheduled Slots
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactive drag & drop timetable grid • Click any slot to edit or assign
          </p>
        </div>

        {/* Export action shortcuts */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Export as Official University PDF"
          >
            <Printer className="w-3.5 h-3.5 text-rose-400" />
            <span>PDF (A4)</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Export Department Excel Workbook"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportICS}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Export iCalendar (.ics) Feed"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>iCal (.ics)</span>
          </button>
        </div>
      </div>

      {/* Main Timetable Matrix Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60 shadow-2xl">
        <table className="w-full border-collapse min-w-[950px]">
          
          {/* Table Header: Days & Period Timings */}
          <thead>
            <tr className="bg-slate-900/90 border-b border-slate-800/80 text-left">
              <th className="sticky left-0 z-20 bg-slate-900 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 w-32 border-r border-slate-800">
                Day / Period
              </th>

              {Array.from({ length: timeSlotConfig.periodsPerDay }).map((_, p) => {
                const timing = getPeriodTiming(p, timeSlotConfig);
                return (
                  <React.Fragment key={`th_period_${p}`}>
                    {/* Break Column if applicable */}
                    {timing.isBreakBefore && (
                      <th className="px-2 py-3 text-center bg-amber-950/20 border-r border-slate-800 text-[10px] font-bold text-amber-400/90 w-16 uppercase tracking-wider">
                        {timing.breakBeforeName || 'Break'}
                      </th>
                    )}

                    <th className="px-3 py-3 text-center border-r border-slate-800 min-w-[130px]">
                      <div className="text-xs font-bold text-slate-200">
                        Period {p + 1}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {timing.label}
                      </div>
                    </th>
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>

          {/* Table Body: Monday to Friday */}
          <tbody className="divide-y divide-slate-800/60">
            {timeSlotConfig.workingDays.map((day) => (
              <tr key={day} className="hover:bg-slate-900/30 transition-colors">
                
                {/* Sticky Day Column */}
                <td className="sticky left-0 z-10 bg-slate-900/95 px-4 py-3 text-xs font-bold text-slate-200 border-r border-slate-800 shadow-md">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>{day}</span>
                  </div>
                </td>

                {/* Period Slot Columns */}
                {Array.from({ length: timeSlotConfig.periodsPerDay }).map((_, p) => {
                  const timing = getPeriodTiming(p, timeSlotConfig);
                  const entry = filteredEntries.find(
                    (e) => e.day === day && e.periodIndex === p
                  );

                  const teacher = entry ? teacherMap.get(entry.teacherId) : undefined;
                  const room = entry ? roomMap.get(entry.roomId) : undefined;
                  const subject = entry ? subjectMap.get(entry.subjectId) : undefined;
                  const batch = entry ? batchMap.get(entry.batchId) : undefined;

                  return (
                    <React.Fragment key={`${day}_period_${p}`}>
                      
                      {/* Break Slot Divider Cell */}
                      {timing.isBreakBefore && (
                        <td className="px-1 py-2 text-center bg-amber-950/10 border-r border-slate-800">
                          <div className="h-full flex flex-col items-center justify-center text-[10px] font-semibold text-amber-500/70 writing-vertical-lr select-none">
                            ☕ {timing.breakBeforeName}
                          </div>
                        </td>
                      )}

                      {/* Timetable Slot Cell */}
                      <td className="p-1.5 border-r border-slate-800 align-top">
                        <TimetableCell
                          day={day}
                          periodIndex={p}
                          entry={entry}
                          teacher={teacher}
                          room={room}
                          subject={subject}
                          batch={batch}
                          conflicts={conflicts}
                          perspective={perspective}
                        />
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grid Legend & Instructions */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-indigo-500" />
            <span>Theory Lecture</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-pink-500" />
            <span>Continuous Lab (2-3 Slots)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-amber-400" />
            <span>Pinned / Locked Slot</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-rose-500" />
            <span>Collision / Conflict</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          💡 Drag & drop any card to swap slots. Click the Lock icon to pin special guest lecture hours.
        </div>
      </div>

    </div>
  );
};
