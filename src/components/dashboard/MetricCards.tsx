import React from 'react';
import {
  Users,
  BookOpen,
  Building,
  AlertTriangle,
  Award,
  Zap,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useTimetableStore } from '../../store/useTimetableStore';
import { useUiStore } from '../../store/useUiStore';

export const MetricCards: React.FC = () => {
  const { stats, conflicts } = useTimetableStore();
  const { setConflictModalOpen } = useUiStore();

  const errorCount = conflicts.filter((c) => c.severity === 'error').length;
  const warningCount = conflicts.filter((c) => c.severity === 'warning').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      
      {/* 1. Active Batches */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/50 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Batches</span>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-bold font-display text-white tracking-tight">
            {stats.totalBatches}
          </span>
          <span className="text-xs font-medium text-slate-400">
            {stats.totalScheduledHours} Hours Sched.
          </span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 flex items-center space-x-1">
          <span className="text-indigo-400 font-medium">CSE • IT • ECE</span>
          <span>cohorts mapped</span>
        </div>
      </div>

      {/* 2. Registered Faculty */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/50 relative overflow-hidden group hover:border-violet-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-all" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Faculty</span>
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-bold font-display text-white tracking-tight">
            {stats.totalTeachers}
          </span>
          <span className="text-xs font-medium text-slate-400 font-mono">
            ~{stats.facultyAverageLoad}h avg/wk
          </span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 flex items-center space-x-1">
          <span className="text-violet-400 font-medium">{stats.totalSubjects} Subjects</span>
          <span>covered</span>
        </div>
      </div>

      {/* 3. Room Utilization */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/50 relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Room Utilization</span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Building className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-bold font-display text-white tracking-tight">
            {stats.roomUtilizationRate}%
          </span>
          <span className="text-xs font-medium text-slate-400">
            {stats.totalRooms} Facilities
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, stats.roomUtilizationRate)}%` }}
          />
        </div>
      </div>

      {/* 4. Conflict Score (0 Clashes highlighted in vibrant green) */}
      <div
        onClick={() => setConflictModalOpen(true)}
        className={`glass-card p-4 rounded-2xl border bg-slate-900/50 relative overflow-hidden cursor-pointer transition-all duration-300 ${
          errorCount > 0
            ? 'border-rose-500/50 hover:border-rose-500 bg-rose-950/30 shadow-lg shadow-rose-950/30'
            : warningCount > 0
            ? 'border-amber-500/50 hover:border-amber-500 bg-amber-950/20'
            : 'border-emerald-500/50 hover:border-emerald-400 bg-emerald-950/20 shadow-lg shadow-emerald-950/20'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conflict Score</span>
          <div
            className={`p-2 rounded-xl border ${
              errorCount > 0
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
                : warningCount > 0
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span
            className={`text-3xl font-bold font-display tracking-tight ${
              errorCount > 0 ? 'text-rose-400' : warningCount > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {errorCount > 0 ? `${errorCount} Clashes` : '0 Clashes'}
          </span>
          <span className="text-xs font-medium text-slate-400">
            {warningCount > 0 ? `${warningCount} warnings` : '✓ 100% Satisfied'}
          </span>
        </div>
        <div className="mt-2 text-[11px]">
          {errorCount === 0 ? (
            <span className="text-emerald-400 font-medium">✓ Zero double-booking detected</span>
          ) : (
            <span className="text-rose-400 font-medium">Click to inspect and resolve</span>
          )}
        </div>
      </div>

      {/* 5. Generation Fitness & Worker Speed */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/50 relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fitness Score</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-bold font-display text-white tracking-tight">
            {stats.fitnessScore}%
          </span>
          <span className="text-xs font-medium text-slate-400 font-mono">
            {stats.executionTimeMs ? `${stats.executionTimeMs}ms` : 'CSP solver'}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${stats.fitnessScore}%` }}
          />
        </div>
      </div>

    </div>
  );
};
