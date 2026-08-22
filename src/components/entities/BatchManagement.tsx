import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Users, BookOpen, GraduationCap, Upload, Search, CheckSquare, Square } from 'lucide-react';
import { useTimetableStore } from '../../store/useTimetableStore';
import { useUiStore } from '../../store/useUiStore';
import { BatchSection } from '../../types';

export const BatchManagement: React.FC = () => {
  const { batches, addBatch, updateBatch, deleteBatch, subjects, entries } = useTimetableStore();
  const { openCsvModal, setPerspective, setSelectedEntityId, setActiveTab, addToast } = useUiStore();

  const [search, setSearch] = useState('');
  const [editingBatch, setEditingBatch] = useState<BatchSection | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engg.');
  const [semester, setSemester] = useState(5);
  const [studentCount, setStudentCount] = useState(60);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const filteredBatches = batches.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setName('');
    setDepartment('Computer Science & Engg.');
    setSemester(5);
    setStudentCount(60);
    setSelectedSubjectIds(subjects.slice(0, 4).map((s) => s.id));
    setIsAdding(true);
    setEditingBatch(null);
  };

  const handleOpenEdit = (b: BatchSection) => {
    setEditingBatch(b);
    setName(b.name);
    setDepartment(b.department);
    setSemester(b.semester);
    setStudentCount(b.studentCount);
    setSelectedSubjectIds(b.subjectIds || []);
    setIsAdding(false);
  };

  const toggleSubjectSelect = (subId: string) => {
    if (selectedSubjectIds.includes(subId)) {
      setSelectedSubjectIds(selectedSubjectIds.filter((id) => id !== subId));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, subId]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('Please fill in Batch Name.');
      return;
    }

    if (editingBatch) {
      updateBatch(editingBatch.id, {
        name,
        department,
        semester,
        studentCount,
        subjectIds: selectedSubjectIds,
      });
      addToast({
        type: 'success',
        title: 'Batch Updated',
        description: `Updated curriculum mapping for ${name}.`,
      });
    } else {
      addBatch({
        name,
        department,
        semester,
        studentCount,
        subjectIds: selectedSubjectIds,
      });
      addToast({
        type: 'success',
        title: 'Batch Added',
        description: `Added cohort ${name} to system.`,
      });
    }

    setIsAdding(false);
    setEditingBatch(null);
  };

  const handleDelete = (id: string, batchName: string) => {
    if (window.confirm(`Delete batch ${batchName}? All scheduled classes for this cohort will be removed.`)) {
      deleteBatch(id);
      addToast({
        type: 'info',
        title: 'Batch Deleted',
        description: `Removed cohort ${batchName}.`,
      });
    }
  };

  const handleViewSchedule = (batchId: string) => {
    setPerspective('batch');
    setSelectedEntityId(batchId);
    setActiveTab('timetable');
  };

  return (
    <div className="space-y-4">
      
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search batch name, semester, dept..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => openCsvModal('batches')}
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
            <span>Add Batch Section</span>
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60 shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-3.5">Batch / Section</th>
              <th className="p-3.5">Department & Semester</th>
              <th className="p-3.5">Class Strength</th>
              <th className="p-3.5">Curriculum Subjects Mapped</th>
              <th className="p-3.5">Active Schedule</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {filteredBatches.map((batch) => {
              const batchEntries = entries.filter((e) => e.batchId === batch.id);
              const mappedSubjects = subjects.filter((s) => batch.subjectIds.includes(s.id));
              const totalRequiredHours = mappedSubjects.reduce((acc, s) => acc + (s.weeklyHours || 3), 0);

              return (
                <tr key={batch.id} className="hover:bg-slate-900/40 transition-colors">
                  
                  {/* Batch Name */}
                  <td className="p-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shadow-md">
                        {batch.semester}
                      </div>
                      <div>
                        <div
                          onClick={() => handleViewSchedule(batch.id)}
                          className="font-semibold text-slate-200 hover:text-indigo-400 cursor-pointer transition-colors"
                        >
                          {batch.name}
                        </div>
                        <div className="text-[11px] text-slate-400">Semester {batch.semester}</div>
                      </div>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="p-3.5 text-slate-300">
                    {batch.department}
                  </td>

                  {/* Class Strength */}
                  <td className="p-3.5 text-slate-300 font-mono">
                    <div className="flex items-center space-x-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{batch.studentCount} Students</span>
                    </div>
                  </td>

                  {/* Subjects Mapped */}
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {mappedSubjects.map((s) => (
                        <span
                          key={s.id}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold text-white truncate max-w-[80px]"
                          style={{ backgroundColor: s.color || '#6366f1' }}
                          title={`${s.code}: ${s.name}`}
                        >
                          {s.code}
                        </span>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      {totalRequiredHours} required hrs / week
                    </div>
                  </td>

                  {/* Active Schedule Progress */}
                  <td className="p-3.5">
                    <button
                      onClick={() => handleViewSchedule(batch.id)}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{batchEntries.length} Slots Sched.</span>
                    </button>
                  </td>

                  {/* Edit / Delete */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handleOpenEdit(batch)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Batch"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(batch.id, batch.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title="Delete Batch"
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

      {/* Add / Edit Batch Modal */}
      {(isAdding || editingBatch) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
            <h3 className="text-base font-bold text-white tracking-tight pb-3 border-b border-slate-800">
              {isAdding ? 'Configure New Student Section' : 'Edit Batch Information'}
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Batch / Section Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE - 5th Sem (Sec A)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={semester}
                    onChange={(e) => setSemester(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Student Strength</label>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    value={studentCount}
                    onChange={(e) => setStudentCount(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Subject Multi-Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Curriculum Courses ({selectedSubjectIds.length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-2 space-y-1.5">
                  {subjects.map((sub) => {
                    const isChecked = selectedSubjectIds.includes(sub.id);
                    return (
                      <div
                        key={sub.id}
                        onClick={() => toggleSubjectSelect(sub.id)}
                        className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          isChecked ? 'bg-indigo-950/50 border border-indigo-500/40 text-white' : 'hover:bg-slate-900 text-slate-300'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        )}
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: sub.color || '#6366f1' }}
                        >
                          {sub.code}
                        </span>
                        <span className="text-xs font-medium truncate flex-1">{sub.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                          {sub.weeklyHours}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingBatch(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-colors"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
