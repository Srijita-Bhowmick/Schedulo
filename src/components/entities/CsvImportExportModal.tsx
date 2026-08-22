import React, { useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';
import { useTimetableStore } from '../../store/useTimetableStore';
import { downloadCSV, generateSampleCsv, parseCSV } from '../../utils/csvHelper';
import { Teacher, Subject, Room, BatchSection } from '../../types';

export const CsvImportExportModal: React.FC = () => {
  const { isCsvModalOpen, closeCsvModal, csvModalType, addToast } = useUiStore();
  const {
    bulkImportTeachers,
    bulkImportSubjects,
    bulkImportRooms,
    bulkImportBatches,
    teachers,
    subjects,
  } = useTimetableStore();

  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isCsvModalOpen) return null;

  const handleDownloadTemplate = () => {
    const csvContent = generateSampleCsv(csvModalType);
    downloadCSV(`Sample_${csvModalType}_Template.csv`, csvContent);
    addToast({
      type: 'info',
      title: 'Template Downloaded',
      description: `Sample template for ${csvModalType} saved to your computer.`,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length < 2) {
          setErrorMsg('CSV file is empty or missing data rows.');
          return;
        }
        setPreviewRows(parsed);
      } catch (err: any) {
        setErrorMsg(`Failed to parse CSV file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (previewRows.length < 2) return;

    try {
      const dataRows = previewRows.slice(1).filter((r) => r.length > 1 && r[0].trim() !== '');

      if (csvModalType === 'teachers') {
        const newTeachers: Teacher[] = dataRows.map((r, idx) => ({
          id: `t_csv_${Date.now()}_${idx}`,
          name: r[0] || 'Faculty Member',
          shortCode: r[1] || `T${idx + 1}`,
          department: r[2] || 'Engineering',
          email: r[3] || '',
          maxHoursPerDay: parseInt(r[4] || '4', 10),
          maxHoursPerWeek: parseInt(r[5] || '16', 10),
          unavailableSlots: [],
          color: '#6366f1',
        }));
        bulkImportTeachers(newTeachers);
      } else if (csvModalType === 'subjects') {
        const newSubjects: Subject[] = dataRows.map((r, idx) => {
          const teacherShortCode = r[5]?.trim();
          const matchedTeacher = teachers.find((t) => t.shortCode.toLowerCase() === teacherShortCode?.toLowerCase());
          return {
            id: `sub_csv_${Date.now()}_${idx}`,
            code: r[0] || `CS${idx + 101}`,
            name: r[1] || 'Course Name',
            type: (r[2]?.toUpperCase() === 'LAB' ? 'LAB' : r[2]?.toUpperCase() === 'TUTORIAL' ? 'TUTORIAL' : 'THEORY') as any,
            weeklyHours: parseInt(r[3] || '3', 10),
            durationSlots: parseInt(r[4] || '1', 10),
            assignedTeacherId: matchedTeacher?.id || teachers[0]?.id || 't-1',
            preferredRoomType: (r[6]?.toUpperCase() || 'LECTURE_HALL') as any,
            color: '#8b5cf6',
          };
        });
        bulkImportSubjects(newSubjects);
      } else if (csvModalType === 'rooms') {
        const newRooms: Room[] = dataRows.map((r, idx) => ({
          id: `r_csv_${Date.now()}_${idx}`,
          roomNumber: r[0] || `LH-${100 + idx}`,
          name: r[1] || 'Lecture Hall',
          type: (r[2]?.toUpperCase() || 'LECTURE_HALL') as any,
          capacity: parseInt(r[3] || '60', 10),
          building: r[4] || 'Campus Block',
        }));
        bulkImportRooms(newRooms);
      } else if (csvModalType === 'batches') {
        const newBatches: BatchSection[] = dataRows.map((r, idx) => {
          const subjectCodes = r[4]?.split('|').map((c) => c.trim()) || [];
          const matchedSubjectIds = subjects
            .filter((s) => subjectCodes.includes(s.code))
            .map((s) => s.id);

          return {
            id: `batch_csv_${Date.now()}_${idx}`,
            name: r[0] || `Batch ${idx + 1}`,
            department: r[1] || 'Engineering',
            semester: parseInt(r[2] || '3', 10),
            studentCount: parseInt(r[3] || '60', 10),
            subjectIds: matchedSubjectIds.length > 0 ? matchedSubjectIds : subjects.slice(0, 4).map((s) => s.id),
          };
        });
        bulkImportBatches(newBatches);
      }

      addToast({
        type: 'success',
        title: 'Bulk Import Successful',
        description: `Imported ${dataRows.length} ${csvModalType} records.`,
      });

      closeCsvModal();
    } catch (err: any) {
      setErrorMsg(`Import failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-xl p-6 rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight uppercase">
                Bulk CSV Upload — {csvModalType}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Download the official template, fill your data, and import directly.
              </p>
            </div>
          </div>

          <button
            onClick={closeCsvModal}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Download Step */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-4 h-4 text-indigo-400" />
            <div>
              <h4 className="text-xs font-semibold text-slate-200">Standard CSV Template</h4>
              <p className="text-[11px] text-slate-400">Pre-formatted columns with example data</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Template</span>
          </button>
        </div>

        {/* Upload Drop Area */}
        <div className="mt-4">
          <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/40 hover:bg-slate-900/60 cursor-pointer transition-all">
            <Upload className="w-8 h-8 text-indigo-400 mb-2" />
            <span className="text-xs font-semibold text-slate-200">
              Click to browse or drop your CSV file here
            </span>
            <span className="text-[11px] text-slate-400 mt-1">Accepts UTF-8 .csv files</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Preview Rows */}
        {previewRows.length > 1 && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">
              Preview ({previewRows.length - 1} records ready to import):
            </h4>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2 text-[11px] font-mono text-slate-300">
              {previewRows.slice(0, 5).map((row, i) => (
                <div key={i} className={`py-1 ${i === 0 ? 'font-bold text-indigo-400 border-b border-slate-800' : ''}`}>
                  {row.join(' | ')}
                </div>
              ))}
              {previewRows.length > 5 && (
                <div className="text-slate-500 py-1 italic">... and {previewRows.length - 5} more rows</div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={closeCsvModal}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={previewRows.length < 2}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-md shadow-indigo-600/30"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Import Records</span>
          </button>
        </div>

      </div>
    </div>
  );
};
