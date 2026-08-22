import React from 'react';
import {
  Calendar,
  Layers,
  Users,
  Settings,
  Sparkles,
  Sun,
  Moon,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Undo2,
  Redo2,
  GraduationCap,
} from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';
import { useTimetableStore } from '../../store/useTimetableStore';
import { UNIVERSITY_INFO } from '../../data/demoData';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, theme, toggleTheme, setConflictModalOpen, setExportModalOpen, setGenerationModalOpen } = useUiStore();
  const { conflicts, isGenerating, generateSchedule, history, future, undo, redo, stats } = useTimetableStore();

  const errorCount = conflicts.filter((c) => c.severity === 'error').length;
  const warningCount = conflicts.filter((c) => c.severity === 'warning').length;

  const handleGenerateClick = () => {
    setGenerationModalOpen(true);
    generateSchedule();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-all dark:border-slate-800/80 dark:bg-slate-950/80 light:bg-white/90 light:border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & University Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-bold text-lg text-white dark:text-white light:text-slate-900 tracking-tight">
                  Schedulo <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">CSP</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full font-mono">
                  {stats.executionTimeMs ? `${stats.executionTimeMs}ms` : 'v2.0'}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 truncate max-w-[220px] sm:max-w-xs">
                {UNIVERSITY_INFO.shortName} • Algorithmic Scheduler
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 p-1 bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 rounded-xl border border-slate-800/60 dark:border-slate-800/60 light:border-slate-200">
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 dark:hover:text-white light:text-slate-600'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-tab-timetable"
              onClick={() => setActiveTab('timetable')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'timetable'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 dark:hover:text-white light:text-slate-600'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Timetable Matrix</span>
            </button>

            <button
              id="nav-tab-entities"
              onClick={() => setActiveTab('entities')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'entities'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 dark:hover:text-white light:text-slate-600'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Entity Hub</span>
            </button>

            <button
              id="nav-tab-settings"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 dark:hover:text-white light:text-slate-600'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Time & Rules</span>
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-2">
            
            {/* Undo / Redo */}
            <div className="hidden sm:flex items-center space-x-1 border-r border-slate-800 dark:border-slate-800 light:border-slate-200 pr-2 mr-1">
              <button
                onClick={undo}
                disabled={history.length === 0}
                title="Undo (Ctrl+Z)"
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={future.length === 0}
                title="Redo (Ctrl+Y)"
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            {/* Clash Radar Button */}
            <button
              id="nav-clash-radar-btn"
              onClick={() => setConflictModalOpen(true)}
              className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                errorCount > 0
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                  : warningCount > 0
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {errorCount > 0 ? `${errorCount} Clashes` : warningCount > 0 ? `${warningCount} Warnings` : '0 Clashes'}
              </span>
              <span className={`w-2 h-2 rounded-full ${errorCount > 0 ? 'bg-rose-500' : warningCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            </button>

            {/* Export Hub Button */}
            <button
              id="nav-export-btn"
              onClick={() => setExportModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Publish</span>
            </button>

            {/* AI Generate Action Button */}
            <button
              id="nav-generate-btn"
              onClick={handleGenerateClick}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
              <span>{isGenerating ? 'Generating...' : 'Auto-Generate'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              id="nav-theme-toggle"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-slate-800/60 dark:hover:bg-slate-800/60 light:hover:bg-slate-100 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/60 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-1 px-2 rounded font-medium ${activeTab === 'dashboard' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('timetable')}
            className={`py-1 px-2 rounded font-medium ${activeTab === 'timetable' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
          >
            Matrix
          </button>
          <button
            onClick={() => setActiveTab('entities')}
            className={`py-1 px-2 rounded font-medium ${activeTab === 'entities' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
          >
            Entities
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-1 px-2 rounded font-medium ${activeTab === 'settings' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
          >
            Settings
          </button>
        </div>
      </div>
    </header>
  );
};
