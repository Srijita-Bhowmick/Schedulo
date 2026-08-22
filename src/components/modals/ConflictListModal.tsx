import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';
import { useTimetableStore } from '../../store/useTimetableStore';
import { ConflictType } from '../../types';

export const ConflictListModal: React.FC = () => {
  const { isConflictModalOpen, setConflictModalOpen, setPerspective, setSelectedEntityId, setActiveTab } = useUiStore();
  const { conflicts, generateSchedule, entries, isGenerating } = useTimetableStore();

  const [filterType, setFilterType] = useState<string>('ALL');

  if (!isConflictModalOpen) return null;

  const errors = conflicts.filter((c) => c.severity === 'error');
  const warnings = conflicts.filter((c) => c.severity === 'warning');

  const filteredConflicts = conflicts.filter((c) => {
    if (filterType === 'ERRORS') return c.severity === 'error';
    if (filterType === 'WARNINGS') return c.severity === 'warning';
    if (filterType !== 'ALL') return c.type === filterType;
    return true;
  });

  const handleJumpToSlot = (conflict: (typeof conflicts)[0]) => {
    const entry = entries.find((e) => conflict.involvedEntryIds.includes(e.id));
    if (entry) {
      setPerspective('batch');
      setSelectedEntityId(entry.batchId);
      setActiveTab('timetable');
      setConflictModalOpen(false);
    }
  };

  const handleAutoResolve = async () => {
    setConflictModalOpen(false);
    await generateSchedule();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
                errors.length > 0
                  ? 'bg-rose-600 shadow-rose-600/30'
                  : warnings.length > 0
                  ? 'bg-amber-600 shadow-amber-600/30'
                  : 'bg-emerald-600 shadow-emerald-600/30'
              }`}
            >
              {errors.length > 0 ? (
                <AlertCircle className="w-5 h-5" />
              ) : warnings.length > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Live Clash Radar & Conflict Inspector
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {errors.length} Hard Collision{errors.length === 1 ? '' : 's'} • {warnings.length} Soft Optimization Warning{warnings.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setConflictModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 py-3 border-b border-slate-800 flex-shrink-0">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Notices ({conflicts.length})
          </button>
          <button
            onClick={() => setFilterType('ERRORS')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'ERRORS' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-rose-400 hover:text-white'
            }`}
          >
            Hard Clashes ({errors.length})
          </button>
          <button
            onClick={() => setFilterType('WARNINGS')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'WARNINGS' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-amber-400 hover:text-white'
            }`}
          >
            Warnings ({warnings.length})
          </button>
        </div>

        {/* Conflicts List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          {conflicts.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Zero Clashes Detected</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Your campus schedule satisfies 100% of hard constraints. No double-bookings or unavailable slot violations exist.
              </p>
            </div>
          ) : (
            filteredConflicts.map((conflict) => (
              <div
                key={conflict.id}
                className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                  conflict.severity === 'error'
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {conflict.severity === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider font-mono">
                        {conflict.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 font-mono text-slate-300">
                        {conflict.day} Period {conflict.periodIndex + 1}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed">{conflict.message}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleJumpToSlot(conflict)}
                  className="flex-shrink-0 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 transition-colors"
                >
                  <span>Locate</span>
                  <ArrowRight className="w-3 h-3 text-indigo-400" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={handleAutoResolve}
            disabled={isGenerating || conflicts.length === 0}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-md shadow-indigo-600/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>AI Auto-Resolve All Clashes</span>
          </button>

          <button
            type="button"
            onClick={() => setConflictModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
