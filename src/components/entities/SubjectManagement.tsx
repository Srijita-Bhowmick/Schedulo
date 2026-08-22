import React, { useState } from 'react';
import { Plus, Edit2, Trash2, BookOpen, Clock, Upload, Search, Laptop, FlaskConical, GraduationCap } from 'lucide-react';
import { useTimetableStore } from '../../store/useTimetableStore';
import { useUiStore } from '../../store/useUiStore';
import { Subject, SubjectType, RoomType } from '../../types';

export const SubjectManagement: React.FC = () => {
  const { subjects, addSubject, updateSubject, deleteSubject, teachers } = useTimetableStore();
  const { openCsvModal, addToast } = useUiStore();

  const [search, setSearch] = useState('');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<SubjectType>('THEORY');
  const [weeklyHours, setWeeklyHours] = useState(4);
  const [durationSlots, setDurationSlots] = useState(1);
  const [assignedTeacherId, setAssignedTeacherId] = useState(teachers[0]?.id || '');
  const [preferredRoomType, setPreferredRoomType] = useState<RoomType>('LECTURE_HALL');
  const [color, setColor] = useState('#6366f1');

  const filteredSubjects = subjects.filter(
    (s) =>
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.type.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setCode('');
    setName('');
    setType('THEORY');
    setWeeklyHours(4);
    setDurationSlots(1);
    setAssignedTeacherId(teachers[0]?.id || '');
    setPreferredRoomType('LECTURE_HALL');
    setColor('#6366f1');
    setIsAdding(true);
    setEditingSubject(null);
  };

  const handleOpenEdit = (s: Subject) => {
    setEditingSubject(s);
    setCode(s.code);
    setName(s.name);
    setType(s.type);
    setWeeklyHours(s.weeklyHours);
    setDurationSlots(s.durationSlots || 1);
    setAssignedTeacherId(s.assignedTeacherId);
    setPreferredRoomType(s.preferredRoomType || 'LECTURE_HALL');
    setColor(s.color || '#6366f1');
    setIsAdding(false);
  };

  const handleTypeChange = (newType: SubjectType) => {
    setType(newType);
    if (newType === 'LAB') {
      setDurationSlots(3);
      setWeeklyHours(3);
      setPreferredRoomType('COMPUTER_LAB');
      setColor('#8b5cf6');
    } else {
      setDurationSlots(1);
      setWeeklyHours(4);
      setPreferredRoomType('LECTURE_HALL');
      setColor('#6366f1');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !assignedTeacherId) {
      alert('Please fill in Course Code, Name, and Assigned Faculty.');
      return;
    }

    if (editingSubject) {
      updateSubject(editingSubject.id, {
        code,
        name,
        type,
        weeklyHours,
        durationSlots,
        assignedTeacherId,
        preferredRoomType,
        color,
      });
      addToast({
        type: 'success',
        title: 'Subject Updated',
        description: `Updated course ${code} - ${name}.`,
      });
    } else {
      addSubject({
        code,
        name,
        type,
        weeklyHours,
        durationSlots,
        assignedTeacherId,
        preferredRoomType,
        color,
      });
      addToast({
        type: 'success',
        title: 'Subject Added',
        description: `Added ${code} to course registry.`,
      });
    }

    setIsAdding(false);
    setEditingSubject(null);
  };

  const handleDelete = (id: string, subjectName: string) => {
    if (window.confirm(`Delete course ${subjectName}? It will be removed from all timetables and batch mappings.`)) {
      deleteSubject(id);
      addToast({
        type: 'info',
        title: 'Subject Deleted',
        description: `Removed ${subjectName}.`,
      });
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search subject code, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => openCsvModal('subjects')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60 shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-3.5">Course Code & Name</th>
              <th className="p-3.5">Format & Continuous Slots</th>
              <th className="p-3.5">Weekly Hours</th>
              <th className="p-3.5">Assigned Instructor</th>
              <th className="p-3.5">Facility Type</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {filteredSubjects.map((subject) => {
              const teacher = teachers.find((t) => t.id === subject.assignedTeacherId);
              const isLab = subject.type === 'LAB';

              return (
                <tr key={subject.id} className="hover:bg-slate-900/40 transition-colors">
                  
                  {/* Code & Name */}
                  <td className="p-3.5">
                    <div className="flex items-center space-x-3">
                      <span
                        className="px-2 py-1 rounded-lg text-xs font-bold font-mono text-white shadow-xs"
                        style={{ backgroundColor: subject.color || '#6366f1' }}
                      >
                        {subject.code}
                      </span>
                      <div className="font-semibold text-slate-200">{subject.name}</div>
                    </div>
                  </td>

                  {/* Format & Slots */}
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        isLab
                          ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                          : subject.type === 'TUTORIAL'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {isLab ? <Laptop className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                      <span>
                        {subject.type} ({subject.durationSlots || 1} {subject.durationSlots === 1 ? 'Slot' : 'Continuous Slots'})
                      </span>
                    </span>
                  </td>

                  {/* Weekly Hours */}
                  <td className="p-3.5 text-slate-300 font-mono">
                    {subject.weeklyHours} hrs / week
                  </td>

                  {/* Assigned Teacher */}
                  <td className="p-3.5">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: teacher?.color || '#a855f7' }}
                      />
                      <span className="font-semibold text-slate-200">{teacher?.name || 'Unassigned'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({teacher?.shortCode})</span>
                    </div>
                  </td>

                  {/* Preferred Room Type */}
                  <td className="p-3.5 text-slate-400 text-[11px]">
                    {subject.preferredRoomType === 'COMPUTER_LAB'
                      ? '💻 Computer Lab'
                      : subject.preferredRoomType === 'SCIENCE_LAB'
                      ? '⚡ Hardware Lab'
                      : '🏛️ Lecture Hall'}
                  </td>

                  {/* Edit / Delete */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handleOpenEdit(subject)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Course"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(subject.id, subject.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title="Delete Course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Subject Modal */}
      {(isAdding || editingSubject) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
            <h3 className="text-base font-bold text-white tracking-tight pb-3 border-b border-slate-800">
              {isAdding ? 'Register New Course' : 'Edit Course Details'}
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PCC-CS501"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Course Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Operating Systems"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Course Type</label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as SubjectType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="THEORY">Theory Lecture</option>
                    <option value="LAB">Continuous Lab</option>
                    <option value="TUTORIAL">Tutorial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Badge Color</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded-xl px-1 py-1 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Continuous Duration
                  </label>
                  <select
                    value={durationSlots}
                    onChange={(e) => setDurationSlots(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  >
                    <option value={1}>1 Slot (Standard 50m)</option>
                    <option value={2}>2 Continuous Slots (1h 40m)</option>
                    <option value={3}>3 Continuous Slots (2h 30m)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Weekly Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Faculty</label>
                <select
                  value={assignedTeacherId}
                  onChange={(e) => setAssignedTeacherId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.shortCode}) - {t.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Preferred Facility Type</label>
                <select
                  value={preferredRoomType}
                  onChange={(e) => setPreferredRoomType(e.target.value as RoomType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LECTURE_HALL">Lecture Hall</option>
                  <option value="COMPUTER_LAB">Computer Lab</option>
                  <option value="SCIENCE_LAB">Science / Hardware Lab</option>
                  <option value="SEMINAR_HALL">Seminar Hall</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingSubject(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-colors"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
