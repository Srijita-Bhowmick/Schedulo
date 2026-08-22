import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, Calendar as CalendarIcon, Printer, FileText, CheckCircle2, Sparkles, Building, Users, GraduationCap } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';
import { useTimetableStore } from '../../store/useTimetableStore';
import { exportTimetableToPDF } from '../../utils/pdfExport';
import { exportTimetableToExcel } from '../../utils/excelExport';
import { exportTimetableToICS } from '../../utils/icsExport';
import { UNIVERSITY_INFO } from '../../data/demoData';

export const ExportHubModal: React.FC = () => {
  const { isExportModalOpen, setExportModalOpen, perspective, selectedEntityId, addToast } = useUiStore();
  const { entries, teachers, rooms, subjects, batches, timeSlotConfig } = useTimetableStore();

  const [exportPerspective, setExportPerspective] = useState(perspective);
  const [targetId, setTargetId] = useState(selectedEntityId);

  if (!isExportModalOpen) return null;

  const handleExportPDF = () => {
    exportTimetableToPDF(
      exportPerspective,
      targetId,
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
      description: 'Official A4 Landscape University Timetable generated with signatures.',
    });
  };

  const handleExportExcel = () => {
    exportTimetableToExcel(entries, teachers, rooms, subjects, batches, timeSlotConfig);
    addToast({
      type: 'success',
      title: 'Excel Workbook Exported',
      description: 'Multi-sheet workbook created with all batch, faculty, and room allocations.',
    });
  };

  const handleExportICS = () => {
    exportTimetableToICS(
      exportPerspective,
      targetId,
      entries,
      teachers,
      rooms,
      subjects,
      batches,
      timeSlotConfig
    );
    addToast({
      type: 'success',
      title: 'iCalendar (.ics) Downloaded',
      description: 'Ready to import into Google Calendar, Apple Calendar, or Outlook.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-xl p-6 rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Publish & Export Timetable Hub
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-format distribution for students, faculty, and administration
              </p>
            </div>
          </div>

          <button
            onClick={() => setExportModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope Selector */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Select Export Scope:</label>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => {
                  setExportPerspective('batch');
                  setTargetId(batches[0]?.id || '');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  exportPerspective === 'batch' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Batch
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportPerspective('teacher');
                  setTargetId(teachers[0]?.id || '');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  exportPerspective === 'teacher' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Faculty
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportPerspective('room');
                  setTargetId(rooms[0]?.id || '');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  exportPerspective === 'room' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Room
              </button>
            </div>
          </div>

          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {exportPerspective === 'batch' &&
              batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.department})
                </option>
              ))}
            {exportPerspective === 'teacher' &&
              teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.shortCode}) - {t.department}
                </option>
              ))}
            {exportPerspective === 'room' &&
              rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} ({r.type}) - Cap: {r.capacity}
                </option>
              ))}
          </select>
        </div>

        {/* 3 Major Export Options Cards */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* 1. PDF */}
          <div
            onClick={handleExportPDF}
            className="p-4 rounded-xl border border-slate-800 hover:border-indigo-500 bg-slate-950/50 hover:bg-slate-900/80 cursor-pointer transition-all flex flex-col justify-between group shadow-sm hover:shadow-indigo-500/10"
          >
            <div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 w-fit mb-3 group-hover:scale-110 transition-transform">
                <Printer className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                Official PDF Document
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                A4 Landscape layout with college logo, seal, and coordinator signatures.
              </p>
            </div>
            <button className="mt-3 text-[11px] font-semibold text-indigo-400 flex items-center space-x-1">
              <span>Download .pdf</span>
            </button>
          </div>

          {/* 2. Excel */}
          <div
            onClick={handleExportExcel}
            className="p-4 rounded-xl border border-slate-800 hover:border-emerald-500 bg-slate-950/50 hover:bg-slate-900/80 cursor-pointer transition-all flex flex-col justify-between group shadow-sm hover:shadow-emerald-500/10"
          >
            <div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit mb-3 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                Department Excel Sheet
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Multi-sheet workbook containing all batches, faculty master, and room matrix.
              </p>
            </div>
            <button className="mt-3 text-[11px] font-semibold text-emerald-400 flex items-center space-x-1">
              <span>Download .xlsx</span>
            </button>
          </div>

          {/* 3. iCal */}
          <div
            onClick={handleExportICS}
            className="p-4 rounded-xl border border-slate-800 hover:border-violet-500 bg-slate-950/50 hover:bg-slate-900/80 cursor-pointer transition-all flex flex-col justify-between group shadow-sm hover:shadow-violet-500/10"
          >
            <div>
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 w-fit mb-3 group-hover:scale-110 transition-transform">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-violet-400 transition-colors">
                iCalendar (.ics) Sync
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Universal calendar feed for Google Calendar, Outlook, and Apple Calendar.
              </p>
            </div>
            <button className="mt-3 text-[11px] font-semibold text-violet-400 flex items-center space-x-1">
              <span>Download .ics</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Institution: {UNIVERSITY_INFO.shortName} • {UNIVERSITY_INFO.academicYear}
          </span>
          <button
            type="button"
            onClick={() => setExportModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
