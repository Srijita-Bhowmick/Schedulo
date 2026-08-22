import React, { useState } from 'react';
import { Lock, Unlock, Edit3, Trash2, AlertTriangle, Sparkles, Move } from 'lucide-react';
import { ScheduleEntry, Teacher, Room, Subject, BatchSection, DayOfWeek, ConflictReport } from '../../types';
import { useTimetableStore } from '../../store/useTimetableStore';
import { useUiStore } from '../../store/useUiStore';

interface TimetableCellProps {
  day: DayOfWeek;
  periodIndex: number;
  entry?: ScheduleEntry;
  teacher?: Teacher;
  room?: Room;
  subject?: Subject;
  batch?: BatchSection;
  conflicts: ConflictReport[];
  perspective: 'batch' | 'teacher' | 'room';
  isLabSpanContinuation?: boolean;
}

export const TimetableCell: React.FC<TimetableCellProps> = ({
  day,
  periodIndex,
  entry,
  teacher,
  room,
  subject,
  batch,
  conflicts,
  perspective,
  isLabSpanContinuation,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const { toggleLockEntry, removeScheduleEntry, moveScheduleEntry, swapScheduleEntries } = useTimetableStore();
  const { setEditingSlot } = useUiStore();

  const hasHardClash = conflicts.some(
    (c) => c.severity === 'error' && (entry ? c.involvedEntryIds.includes(entry.id) : c.day === day && c.periodIndex === periodIndex)
  );

  const hasWarning = conflicts.some(
    (c) => c.severity === 'warning' && (entry ? c.involvedEntryIds.includes(entry.id) : c.day === day && c.periodIndex === periodIndex)
  );

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (!entry || entry.isLocked) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        entryId: entry.id,
        sourceDay: day,
        sourcePeriod: periodIndex,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      if (data.entryId) {
        if (entry) {
          // Swap existing slot with source slot
          if (entry.id !== data.entryId) {
            swapScheduleEntries(data.entryId, entry.id);
          }
        } else {
          // Move entry to empty slot
          moveScheduleEntry(data.entryId, day, periodIndex);
        }
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  // If this is an empty cell
  if (!entry) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => setEditingSlot({ day, periodIndex })}
        className={`group relative h-28 p-2 rounded-xl border border-dashed transition-all flex flex-col items-center justify-center cursor-pointer ${
          isDragOver
            ? 'bg-indigo-500/20 border-indigo-400 scale-[1.02] shadow-lg shadow-indigo-500/20'
            : 'bg-slate-950/40 hover:bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
        }`}
      >
        <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
          + Assign
        </span>
      </div>
    );
  }

  // Active scheduled cell
  const isLab = subject?.type === 'LAB';
  const badgeColor = subject?.color || '#6366f1';

  return (
    <div
      draggable={!entry.isLocked}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative h-28 p-2.5 rounded-xl border transition-all flex flex-col justify-between select-none ${
        entry.isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      } ${
        hasHardClash
          ? 'bg-rose-950/60 border-rose-500/80 shadow-lg shadow-rose-950/40 animate-conflict'
          : hasWarning
          ? 'bg-amber-950/40 border-amber-500/60 shadow-md shadow-amber-950/20'
          : isDragOver
          ? 'bg-indigo-900/40 border-indigo-400 scale-[1.02]'
          : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/70 shadow-sm'
      }`}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: hasHardClash ? '#f43f5e' : badgeColor,
      }}
    >
      
      {/* Top Bar: Subject Code & Action Buttons */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center space-x-1.5 min-w-0">
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-tight text-white truncate shadow-xs"
            style={{ backgroundColor: badgeColor }}
          >
            {subject?.code || 'COURSE'}
          </span>
          {isLab && (
            <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              LAB ({entry.durationSlots || 2}h)
            </span>
          )}
        </div>

        {/* Hover / Lock Action Buttons */}
        <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {hasHardClash && (
            <span title="Hard Clash Detected!" className="text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLockEntry(entry.id);
            }}
            title={entry.isLocked ? 'Slot Locked (Pinned)' : 'Lock slot to prevent auto-regeneration'}
            className={`p-1 rounded transition-colors ${
              entry.isLocked
                ? 'text-amber-400 bg-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            {entry.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingSlot({ day, periodIndex, entryId: entry.id });
            }}
            title="Edit Slot Assignment"
            className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-700/50 transition-colors"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Middle: Subject Name */}
      <div className="my-1">
        <h4 className="text-[11px] font-semibold text-slate-200 line-clamp-1 group-hover:text-white transition-colors" title={subject?.name}>
          {subject?.name || 'Class Subject'}
        </h4>
      </div>

      {/* Bottom Footer: Dynamic Chips based on active perspective */}
      <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1 border-t border-slate-800/80">
        
        {/* Perspective Detail 1 */}
        {perspective === 'batch' && (
          <>
            <div className="flex items-center space-x-1 truncate max-w-[90px]" title={teacher?.name}>
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: teacher?.color || '#a855f7' }}
              />
              <span className="font-medium text-slate-300 truncate">{teacher?.shortCode || teacher?.name}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 font-mono font-medium border border-slate-700/50">
              {room?.roomNumber || 'Room'}
            </span>
          </>
        )}

        {perspective === 'teacher' && (
          <>
            <span className="font-semibold text-indigo-300 truncate max-w-[95px]" title={batch?.name}>
              {batch?.name || 'Batch'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 font-mono font-medium border border-slate-700/50">
              {room?.roomNumber || 'Room'}
            </span>
          </>
        )}

        {perspective === 'room' && (
          <>
            <span className="font-semibold text-indigo-300 truncate max-w-[95px]" title={batch?.name}>
              {batch?.name || 'Batch'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 font-mono font-medium border border-slate-700/50">
              {teacher?.shortCode || 'Faculty'}
            </span>
          </>
        )}
      </div>

    </div>
  );
};
