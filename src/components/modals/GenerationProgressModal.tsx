import React from 'react';
import { X, Sparkles, AlertCircle, CheckCircle2, Award, Zap, TrendingUp } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';
import { useTimetableStore } from '../../store/useTimetableStore';

export const GenerationProgressModal: React.FC = () => {
  const { isGenerationModalOpen, setGenerationModalOpen } = useUiStore();
  const { generationProgress, isGenerating, cancelGeneration } = useTimetableStore();

  if (!isGenerationModalOpen) return null;

  const percentage = generationProgress.maxGenerations > 0
    ? Math.min(100, Math.round((generationProgress.currentGeneration / generationProgress.maxGenerations) * 100))
    : 0;

  const isComplete = generationProgress.status === 'completed';
  const isFailed = generationProgress.status === 'failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-indigo-500/30 bg-slate-900/95 shadow-2xl relative overflow-hidden">
        
        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {isComplete
                  ? 'Timetable Generated!'
                  : isFailed
                  ? 'Generation Aborted'
                  : 'Genetic Algorithm Solver Active'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Constraint Satisfaction & Heuristic Optimization
              </p>
            </div>
          </div>

          {!isGenerating && (
            <button
              onClick={() => setGenerationModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar & Key Indicators */}
        <div className="mt-6 space-y-4 relative z-10">
          
          {/* Main Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-300">
                Generation {generationProgress.currentGeneration} of {generationProgress.maxGenerations}
              </span>
              <span className="text-indigo-400 font-mono">{percentage}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
              <div
                className="bg-gradient-to-r from-indigo-500 via-violet-500 to-teal-400 h-full rounded-full transition-all duration-300 shadow-sm shadow-indigo-500/50"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Overall Fitness
              </span>
              <div className="mt-1 text-2xl font-bold font-display text-emerald-400">
                {generationProgress.fitness}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Target: 95%+ optimal</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Hard Clashes
              </span>
              <div
                className={`mt-1 text-2xl font-bold font-display ${
                  generationProgress.clashesCount === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {generationProgress.clashesCount}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {generationProgress.clashesCount === 0 ? '✓ Zero collisions' : 'Resolving overlaps...'}
              </div>
            </div>
          </div>

          {/* Status Message */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-mono flex items-start space-x-2">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>{generationProgress.message}</span>
          </div>

          {/* Fitness Evolution Sparkline / History */}
          {generationProgress.fitnessHistory && generationProgress.fitnessHistory.length > 1 && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
                <span className="flex items-center space-x-1">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Fitness Convergence Curve</span>
                </span>
                <span className="font-mono text-emerald-400">
                  {generationProgress.fitnessHistory[generationProgress.fitnessHistory.length - 1].fitness}%
                </span>
              </div>
              
              <div className="h-16 flex items-end space-x-1 pt-2">
                {generationProgress.fitnessHistory.slice(-25).map((point, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-indigo-600 to-teal-400 rounded-t transition-all"
                    style={{ height: `${Math.max(10, point.fitness)}%` }}
                    title={`Gen ${point.gen}: ${point.fitness}% (${point.clashes} clashes)`}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end space-x-2 relative z-10">
          {isGenerating ? (
            <button
              type="button"
              onClick={cancelGeneration}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 transition-colors"
            >
              Stop Generator
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setGenerationModalOpen(false)}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Inspect Timetable</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
