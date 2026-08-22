import React from 'react';
import { Users, GraduationCap, Building, Search, Sparkles } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';
import { useTimetableStore } from '../../store/useTimetableStore';
import { PerspectiveType } from '../../types';

export const PerspectiveSwitcher: React.FC = () => {
  const { perspective, setPerspective, selectedEntityId, setSelectedEntityId } = useUiStore();
  const { batches, teachers, rooms, entries } = useTimetableStore();

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
      
      {/* 3-Way Perspective Toggle: Batch vs Faculty vs Room */}
      <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800/80">
        <button
          id="perspective-batch-btn"
          onClick={() => {
            setPerspective('batch');
            if (batches.length > 0 && !batches.some((b) => b.id === selectedEntityId)) {
              setSelectedEntityId(batches[0].id);
            }
          }}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            perspective === 'batch'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Student Batch View</span>
        </button>

        <button
          id="perspective-teacher-btn"
          onClick={() => {
            setPerspective('teacher');
            if (teachers.length > 0 && !teachers.some((t) => t.id === selectedEntityId)) {
              setSelectedEntityId(teachers[0].id);
            }
          }}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            perspective === 'teacher'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Faculty Schedule View</span>
        </button>

        <button
          id="perspective-room-btn"
          onClick={() => {
            setPerspective('room');
            if (rooms.length > 0 && !rooms.some((r) => r.id === selectedEntityId)) {
              setSelectedEntityId(rooms[0].id);
            }
          }}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            perspective === 'room'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Room / Lab Occupancy</span>
        </button>
      </div>

      {/* Entity Selector (Dropdown / Pills) */}
      <div className="flex items-center space-x-3 w-full md:w-auto">
        <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">
          {perspective === 'batch'
            ? 'Select Section:'
            : perspective === 'teacher'
            ? 'Select Faculty:'
            : 'Select Facility:'}
        </label>

        <select
          id="entity-selector-dropdown"
          value={selectedEntityId}
          onChange={(e) => setSelectedEntityId(e.target.value)}
          className="w-full md:w-64 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        >
          {perspective === 'batch' &&
            batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.department})
              </option>
            ))}

          {perspective === 'teacher' &&
            teachers.map((t) => {
              const hours = entries.filter((e) => e.teacherId === t.id).length;
              return (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.shortCode}) - {hours} hrs/wk
                </option>
              );
            })}

          {perspective === 'room' &&
            rooms.map((r) => {
              const hours = entries.filter((e) => e.roomId === r.id).length;
              return (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} ({r.type}) - {r.capacity} seats ({hours} hrs)
                </option>
              );
            })}
        </select>
      </div>

    </div>
  );
};
