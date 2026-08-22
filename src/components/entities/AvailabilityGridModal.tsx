import React from 'react';
import { X, Check, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';
import { useTimetableStore } from '../../store/useTimetableStore';
import { DayOfWeek } from '../../types';
import { getPeriodTiming } from '../../engine/timeUtils';

export const AvailabilityGridModal: React.FC = () => {
  const { teacherAvailabilityModalId, setTeacherAvailabilityModalId, addToast } = useUiStore();
  const { teachers, timeSlotConfig, updateTeacher } = useTimetableStore();

  const teacher = teachers.find((t) => t.id === teacherAvailabilityModalId);
  if (!teacher) return null;

  const isSlotUnavailable = (day: DayOfWeek, periodIndex: number) => {
    return teacher.unavailableSlots?.some((s) => s.day === day && s.periodIndex === periodIndex);
  };

  const handleToggleSlot = (day: DayOfWeek, periodIndex: number) => {
    const current = teacher.unavailableSlots || [];
    const exists = current.some((s) => s.day === day && s.periodIndex === periodIndex);

    let nextSlots;
    if (exists) {
      nextSlots = current.filter((s) => !(s.day === day && s.periodIndex === periodIndex));
    } else {
      nextSlots = [...current, { day, periodIndex }];
    }

    updateTeacher(teacher.id, { unavailableSlots: nextSlots });
  };

  const handleMakeAllAvailable = () => {
    updateTeacher(teacher.id, { unavailableSlots: [] });
    addToast({
      type: 'success',
      title: 'Availability Reset',
      description: `${teacher.name} is now marked available for all teaching slots.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
              style={{ backgroundColor: teacher.color || '#6366f1' }}
            >
              {teacher.shortCode}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {teacher.name} — Weekly Availability Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any slot to toggle faculty availability (Green = Available, Red = Busy/Leave)
              </p>
            </div>
          </div>

          <button
            onClick={() => setTeacherAvailabilityModalId(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Matrix Grid */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-xs">
                <th className="p-2.5 text-left font-bold text-slate-400">Day</th>
                {Array.from({ length: timeSlotConfig.periodsPerDay }).map((_, p) => {
                  const timing = getPeriodTiming(p, timeSlotConfig);
                  return (
                    <th key={p} className="p-2 text-center font-bold text-slate-300 min-w-[70px]">
                      P{p + 1}
                      <div className="text-[9px] font-normal text-slate-400">{timing.start}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {timeSlotConfig.workingDays.map((day) => (
                <tr key={day}>
                  <td className="p-2.5 text-xs font-semibold text-slate-200">{day}</td>
                  {Array.from({ length: timeSlotConfig.periodsPerDay }).map((_, p) => {
                    const unavailable = isSlotUnavailable(day, p);
                    return (
                      <td key={p} className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSlot(day, p)}
                          className={`w-full py-2 rounded-lg text-[10px] font-bold transition-all ${
                            unavailable
                              ? 'bg-rose-950/60 border border-rose-500/60 text-rose-400 hover:bg-rose-900/60'
                              : 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
                          }`}
                        >
                          {unavailable ? 'BUSY' : 'FREE'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleMakeAllAvailable}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Mark 100% Available
          </button>

          <button
            type="button"
            onClick={() => setTeacherAvailabilityModalId(null)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>

      </div>
    </div>
  );
};
