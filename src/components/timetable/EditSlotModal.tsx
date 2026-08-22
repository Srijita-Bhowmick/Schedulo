import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';
import { useTimetableStore } from '../../store/useTimetableStore';
import { getPeriodTiming } from '../../engine/timeUtils';

export const EditSlotModal: React.FC = () => {
  const { editingSlot, setEditingSlot, perspective, selectedEntityId, addToast } = useUiStore();
  const {
    entries,
    teachers,
    rooms,
    subjects,
    batches,
    timeSlotConfig,
    addScheduleEntry,
    updateScheduleEntry,
    removeScheduleEntry,
  } = useTimetableStore();

  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [roomId, setRoomId] = useState('');

  const currentEntry = editingSlot?.entryId
    ? entries.find((e) => e.id === editingSlot.entryId)
    : undefined;

  useEffect(() => {
    if (currentEntry) {
      setBatchId(currentEntry.batchId);
      setSubjectId(currentEntry.subjectId);
      setTeacherId(currentEntry.teacherId);
      setRoomId(currentEntry.roomId);
    } else {
      // Default to selected entity if in batch perspective
      const defaultBatch = perspective === 'batch' ? selectedEntityId : batches[0]?.id || '';
      setBatchId(defaultBatch);
      const batchObj = batches.find((b) => b.id === defaultBatch);
      const defaultSubject = batchObj?.subjectIds[0] || subjects[0]?.id || '';
      setSubjectId(defaultSubject);
      const subObj = subjects.find((s) => s.id === defaultSubject);
      setTeacherId(subObj?.assignedTeacherId || teachers[0]?.id || '');
      setRoomId(rooms[0]?.id || '');
    }
  }, [editingSlot, currentEntry, batches, subjects, teachers, rooms, perspective, selectedEntityId]);

  if (!editingSlot) return null;

  const timing = getPeriodTiming(editingSlot.periodIndex, timeSlotConfig);

  const handleSubjectChange = (newSubId: string) => {
    setSubjectId(newSubId);
    const sub = subjects.find((s) => s.id === newSubId);
    if (sub) {
      setTeacherId(sub.assignedTeacherId);
      if (sub.preferredRoomType) {
        const matchingRoom = rooms.find((r) => r.type === sub.preferredRoomType);
        if (matchingRoom) setRoomId(matchingRoom.id);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!batchId || !subjectId || !teacherId || !roomId) {
      alert('Please select Batch, Subject, Teacher, and Room.');
      return;
    }

    const sub = subjects.find((s) => s.id === subjectId);

    if (currentEntry) {
      updateScheduleEntry(currentEntry.id, {
        batchId,
        subjectId,
        teacherId,
        roomId,
        durationSlots: sub?.durationSlots || 1,
      });
      addToast({
        type: 'success',
        title: 'Slot Updated',
        description: `Modified schedule for ${editingSlot.day} Period ${editingSlot.periodIndex + 1}.`,
      });
    } else {
      addScheduleEntry({
        day: editingSlot.day,
        periodIndex: editingSlot.periodIndex,
        batchId,
        subjectId,
        teacherId,
        roomId,
        durationSlots: sub?.durationSlots || 1,
        isLocked: false,
      });
      addToast({
        type: 'success',
        title: 'Slot Assigned',
        description: `Class assigned to ${editingSlot.day} Period ${editingSlot.periodIndex + 1}.`,
      });
    }

    setEditingSlot(null);
  };

  const handleDelete = () => {
    if (currentEntry) {
      removeScheduleEntry(currentEntry.id);
      addToast({
        type: 'info',
        title: 'Slot Cleared',
        description: `Removed class from ${editingSlot.day} Period ${editingSlot.periodIndex + 1}.`,
      });
    }
    setEditingSlot(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {currentEntry ? 'Edit Class Slot' : 'Assign New Class Slot'}
            </h3>
            <p className="text-xs text-indigo-400 mt-0.5 font-medium">
              {editingSlot.day} • Period {editingSlot.periodIndex + 1} ({timing.label})
            </p>
          </div>
          <button
            onClick={() => setEditingSlot(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          
          {/* Batch Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Student Batch / Section
            </label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.department})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Course / Subject
            </label>
            <select
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name} ({s.type})
                </option>
              ))}
            </select>
          </div>

          {/* Teacher Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Faculty / Instructor
            </label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.shortCode}) - {t.department}
                </option>
              ))}
            </select>
          </div>

          {/* Room Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Classroom / Laboratory
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} ({r.type}) - Cap: {r.capacity}
                </option>
              ))}
            </select>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            {currentEntry ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Slot</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Slot</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
