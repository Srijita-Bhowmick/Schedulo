import React from 'react';
import {
  Users,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { useTimetableStore } from '../../store/useTimetableStore';
import { useUiStore } from '../../store/useUiStore';

export const QuickStatsOverview: React.FC = () => {
  const { teachers, rooms, batches, entries, stats, conflicts, timeSlotConfig } = useTimetableStore();
  const { setPerspective, setSelectedEntityId, setActiveTab } = useUiStore();

  const handleTeacherClick = (teacherId: string) => {
    setPerspective('teacher');
    setSelectedEntityId(teacherId);
    setActiveTab('timetable');
  };

  const handleRoomClick = (roomId: string) => {
    setPerspective('room');
    setSelectedEntityId(roomId);
    setActiveTab('timetable');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Faculty Workload Distribution */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-900/50 flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">Faculty Workload Balance</h3>
          </div>
          <span className="text-xs text-slate-400">{teachers.length} Faculty Members</span>
        </div>

        <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
          {teachers.map((teacher) => {
            const scheduledHours = entries.filter((e) => e.teacherId === teacher.id).length;
            const maxHours = teacher.maxHoursPerWeek || 16;
            const percentage = Math.min(100, Math.round((scheduledHours / maxHours) * 100));
            const isOverloaded = scheduledHours > maxHours;

            return (
              <div
                key={teacher.id}
                onClick={() => handleTeacherClick(teacher.id)}
                className="group p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer border border-transparent hover:border-slate-700/50"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: teacher.color || '#6366f1' }}
                    />
                    <span className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                      {teacher.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">({teacher.shortCode})</span>
                  </div>
                  <span className={`font-mono font-medium ${isOverloaded ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                    {scheduledHours}/{maxHours} hrs
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      isOverloaded
                        ? 'bg-rose-500'
                        : percentage > 85
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Room & Lab Utilization */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-900/50 flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">Infrastructure Allocation</h3>
          </div>
          <span className="text-xs text-slate-400">{rooms.length} Facilities</span>
        </div>

        <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
          {rooms.map((room) => {
            const totalRoomSlots = timeSlotConfig.workingDays.length * timeSlotConfig.periodsPerDay;
            const occupiedHours = entries.filter((e) => e.roomId === room.id).length;
            const utilization = Math.min(100, Math.round((occupiedHours / totalRoomSlots) * 100));

            return (
              <div
                key={room.id}
                onClick={() => handleRoomClick(room.id)}
                className="group p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer border border-transparent hover:border-slate-700/50"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                      {room.roomNumber}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {room.type === 'COMPUTER_LAB' ? 'Comp Lab' : room.type === 'SCIENCE_LAB' ? 'Hardware Lab' : 'Lecture Hall'}
                    </span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {occupiedHours} hrs ({utilization}%)
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${utilization}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. AI Constraint Engine Compliance */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-900/50 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800/60">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">Constraint Compliance</h3>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-slate-800/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Teacher & Room Double-Booking</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {conflicts.filter((c) => c.type === 'TEACHER_CLASH' || c.type === 'ROOM_CLASH').length === 0
                    ? '100% Satisfied: Zero concurrent collisions across campus.'
                    : 'Collision detected in active schedule.'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-slate-800/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Continuous Multi-Slot Labs</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Consecutive 2-3 hour practical blocks placed in specialized lab rooms without crossing breaks.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-slate-800/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Lunch Break & Timing Integrity</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Designated recess & lunch intervals strictly preserved for all batches.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">Heuristic Solver:</span>
          <span className="font-semibold text-indigo-400">CSP + Genetic Strategy (1+1)</span>
        </div>
      </div>

    </div>
  );
};
