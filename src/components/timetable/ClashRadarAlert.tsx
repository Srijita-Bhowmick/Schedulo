import React from 'react';
import { AlertTriangle, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTimetableStore } from '../../store/useTimetableStore';
import { useUiStore } from '../../store/useUiStore';

export const ClashRadarAlert: React.FC = () => {
  const { conflicts } = useTimetableStore();
  const { setConflictModalOpen } = useUiStore();

  const errors = conflicts.filter((c) => c.severity === 'error');
  const warnings = conflicts.filter((c) => c.severity === 'warning');

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold">Live Clash Radar: Optimal Schedule</span>
          <span className="text-emerald-400/80 hidden sm:inline">— Zero teacher, room, or batch clashes across all active semesters.</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
          100% Conflict-Free
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border backdrop-blur-md transition-all gap-3 ${
        errors.length > 0
          ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
      }`}
    >
      <div className="flex items-start space-x-3">
        <div
          className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
            errors.length > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          {errors.length > 0 ? <AlertCircle className="w-4 h-4 animate-bounce" /> : <AlertTriangle className="w-4 h-4" />}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold tracking-wide">
              {errors.length > 0
                ? `Active Collisions Detected (${errors.length} Hard Clashes)`
                : `Optimization Warnings (${warnings.length} Notices)`}
            </h4>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
            {errors.length > 0 ? errors[0].message : warnings[0].message}
          </p>
        </div>
      </div>

      <button
        onClick={() => setConflictModalOpen(true)}
        className="flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700 shadow-sm transition-all self-end sm:self-auto"
      >
        <span>Inspect & Auto-Fix</span>
        <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
      </button>
    </div>
  );
};
