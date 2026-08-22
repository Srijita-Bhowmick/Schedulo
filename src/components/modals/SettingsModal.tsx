import React, { useState } from 'react';
import {
  Clock,
  Sliders,
  Save,
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  Coffee,
} from 'lucide-react';
import { useTimetableStore } from '../../store/useTimetableStore';
import { useUiStore } from '../../store/useUiStore';
import { DayOfWeek, TimeSlotConfig, GenerationSettings } from '../../types';
import { ALL_DAYS } from '../../engine/timeUtils';

export const SettingsModal: React.FC = () => {
  const {
    timeSlotConfig,
    updateTimeSlotConfig,
    generationSettings,
    updateGenerationSettings,
    loadDemoData,
  } = useTimetableStore();
  const { addToast } = useUiStore();

  const [workingDays, setWorkingDays] = useState<DayOfWeek[]>(timeSlotConfig.workingDays);
  const [periodsPerDay, setPeriodsPerDay] = useState(timeSlotConfig.periodsPerDay);
  const [periodDurationMinutes, setPeriodDurationMinutes] = useState(timeSlotConfig.periodDurationMinutes);
  const [startTime, setStartTime] = useState(timeSlotConfig.startTime);
  const [breakSlots, setBreakSlots] = useState(timeSlotConfig.breakSlots);

  // Algorithm Settings
  const [genSettings, setGenSettings] = useState<GenerationSettings>(generationSettings);

  const toggleDay = (day: DayOfWeek) => {
    if (workingDays.includes(day)) {
      if (workingDays.length <= 1) return;
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleAddBreak = () => {
    setBreakSlots([
      ...breakSlots,
      { afterPeriod: 3, name: 'Short Break', durationMinutes: 15 },
    ]);
  };

  const handleRemoveBreak = (index: number) => {
    setBreakSlots(breakSlots.filter((_, i) => i !== index));
  };

  const handleUpdateBreak = (index: number, field: string, value: any) => {
    setBreakSlots(
      breakSlots.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    updateTimeSlotConfig({
      workingDays,
      periodsPerDay,
      periodDurationMinutes,
      startTime,
      breakSlots,
    });
    updateGenerationSettings(genSettings);
    addToast({
      type: 'success',
      title: 'Settings & Constraints Saved',
      description: 'Updated university schedule parameters and solver rules.',
    });
  };

  const handleExportJSON = () => {
    const data = localStorage.getItem('schedulo-timetable-storage');
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Schedulo_Backup_${Date.now()}.json`;
    link.click();
    addToast({
      type: 'info',
      title: 'Full Backup Exported',
      description: 'Saved your complete configuration and schedule to JSON.',
    });
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        JSON.parse(text);
        localStorage.setItem('schedulo-timetable-storage', text);
        window.location.reload();
      } catch (err: any) {
        alert('Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-6">
      
      {/* 1. Academic Time & Bell Schedule Settings */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800/80 bg-slate-900/50 space-y-5">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800/60">
          <Clock className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Academic Time & Slot Configuration
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Working days, period duration, and automated break management
            </p>
          </div>
        </div>

        {/* Working Days Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Campus Working Days ({workingDays.length} days active)
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => {
              const active = workingDays.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Period Timings & Counts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Start Time of Day
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Period Duration (Minutes)
            </label>
            <input
              type="number"
              min="30"
              max="120"
              value={periodDurationMinutes}
              onChange={(e) => setPeriodDurationMinutes(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Periods per Day
            </label>
            <input
              type="number"
              min="4"
              max="10"
              value={periodsPerDay}
              onChange={(e) => setPeriodsPerDay(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Break Slots Configuration */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Coffee className="w-3.5 h-3.5 text-amber-400" />
              <span>Intervals & Lunch Breaks</span>
            </label>
            <button
              type="button"
              onClick={handleAddBreak}
              className="flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Break</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {breakSlots.map((breakSlot, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center gap-3"
              >
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[10px] text-slate-400 mb-0.5">Break Title</label>
                  <input
                    type="text"
                    value={breakSlot.name}
                    onChange={(e) => handleUpdateBreak(idx, 'name', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="w-28">
                  <label className="block text-[10px] text-slate-400 mb-0.5">After Period</label>
                  <select
                    value={breakSlot.afterPeriod}
                    onChange={(e) =>
                      handleUpdateBreak(idx, 'afterPeriod', parseInt(e.target.value, 10))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    {Array.from({ length: periodsPerDay - 1 }).map((_, p) => (
                      <option key={p + 1} value={p + 1}>
                        Period {p + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-28">
                  <label className="block text-[10px] text-slate-400 mb-0.5">Duration (min)</label>
                  <input
                    type="number"
                    min="5"
                    max="90"
                    value={breakSlot.durationMinutes}
                    onChange={(e) =>
                      handleUpdateBreak(idx, 'durationMinutes', parseInt(e.target.value, 10))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveBreak(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 mt-3 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. AI Genetic Solver Hyperparameters */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800/80 bg-slate-900/50 space-y-5">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800/60">
          <Sliders className="w-5 h-5 text-violet-400" />
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              AI Solver Optimization Parameters
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Genetic algorithm population, mutation cooling, and soft heuristic weights
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Population Size ({genSettings.populationSize} chromosomes)
            </label>
            <input
              type="range"
              min="4"
              max="24"
              step="2"
              value={genSettings.populationSize}
              onChange={(e) =>
                setGenSettings({ ...genSettings, populationSize: parseInt(e.target.value, 10) })
              }
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Generation Iterations ({genSettings.generations} cycles)
            </label>
            <input
              type="range"
              min="10"
              max="80"
              step="5"
              value={genSettings.generations}
              onChange={(e) =>
                setGenSettings({ ...genSettings, generations: parseInt(e.target.value, 10) })
              }
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mutation Rate ({Math.round(genSettings.mutationRate * 100)}%)
            </label>
            <input
              type="range"
              min="0.05"
              max="0.4"
              step="0.05"
              value={genSettings.mutationRate}
              onChange={(e) =>
                setGenSettings({ ...genSettings, mutationRate: parseFloat(e.target.value) })
              }
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* Heuristic Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={genSettings.optimizeGaps}
              onChange={(e) =>
                setGenSettings({ ...genSettings, optimizeGaps: e.target.checked })
              }
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
            />
            <div>
              <div className="text-xs font-semibold text-white">Minimize Faculty Idle Windows</div>
              <div className="text-[11px] text-slate-400">Reduce gaps between teaching periods</div>
            </div>
          </label>

          <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={genSettings.balanceFacultyLoad}
              onChange={(e) =>
                setGenSettings({ ...genSettings, balanceFacultyLoad: e.target.checked })
              }
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
            />
            <div>
              <div className="text-xs font-semibold text-white">Balance Daily Teaching Load</div>
              <div className="text-[11px] text-slate-400">Distribute hours evenly across workdays</div>
            </div>
          </label>
        </div>
      </div>

      {/* 3. Backup & Restore JSON */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800/80 bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">
            Database Backup & Portability
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Export the entire state as a JSON file or restore from a previous snapshot.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Backup JSON</span>
          </button>

          <label className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Restore JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-end space-x-3">
        <button
          type="submit"
          className="flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Save All Settings</span>
        </button>
      </div>

    </form>
  );
};
