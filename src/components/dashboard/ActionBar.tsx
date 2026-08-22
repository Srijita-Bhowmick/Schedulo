import React from 'react';
import {
  Sparkles,
  RotateCcw,
  Database,
  Download,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  CalendarCheck,
  Settings2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTimetableStore } from '../../store/useTimetableStore';
import { useUiStore } from '../../store/useUiStore';

export const ActionBar: React.FC = () => {
  const { isGenerating, generateSchedule, clearAllEntries, loadDemoData, entries, stats } = useTimetableStore();
  const { setGenerationModalOpen, setExportModalOpen, setEditingEntity, setActiveTab, addToast } = useUiStore();

  const handleGenerate = async () => {
    setGenerationModalOpen(true);
    await generateSchedule();
    if (stats.conflictsCount === 0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      addToast({
        type: 'success',
        title: 'Timetable Generated Successfully!',
        description: 'Zero hard clashes found. Schedule is ready for inspection.',
      });
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear all scheduled classes? Entity configurations will be preserved.')) {
      clearAllEntries();
      addToast({
        type: 'info',
        title: 'Schedule Cleared',
        description: 'All timetable entries have been reset to blank.',
      });
    }
  };

  const handleLoadDemo = () => {
    loadDemoData();
    addToast({
      type: 'success',
      title: 'MAKAUT University Demo Data Loaded',
      description: 'Loaded 4 semesters, 12 faculty members, 21 courses, and 8 rooms.',
    });
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl flex flex-wrap items-center justify-between gap-4">
      
      {/* Left Action Area: Auto Generator & Demo */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          id="action-btn-generate"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center space-x-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/25 active:scale-95 transition-all disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Solving CSP Engine...' : 'Generate Schedule'}</span>
        </button>

        {stats.executionTimeMs !== undefined && stats.executionTimeMs > 0 && (
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Worker: {stats.executionTimeMs}ms</span>
          </div>
        )}

        <button
          id="action-btn-demo"
          onClick={handleLoadDemo}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 active:scale-95 transition-all"
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>Load Demo University Data</span>
        </button>

        <button
          id="action-btn-reset"
          onClick={handleReset}
          className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl font-medium text-xs text-slate-400 hover:text-rose-300 bg-slate-800/40 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-800/50 active:scale-95 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Grid</span>
        </button>
      </div>

      {/* Right Action Area: Quick Shortcuts & Export */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => {
            setActiveTab('entities');
          }}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Manage Entities</span>
        </button>

        <button
          id="action-btn-export-all"
          onClick={() => setExportModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-indigo-100 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 shadow-sm active:scale-95 transition-all"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Export All (PDF / Excel / iCal)</span>
        </button>
      </div>

    </div>
  );
};
