import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar, Mail, Clock, Search, Upload } from 'lucide-react';
import { useTimetableStore } from '../../store/useTimetableStore';
import { useUiStore } from '../../store/useUiStore';
import { Teacher } from '../../types';

export const TeacherManagement: React.FC = () => {
  const { teachers, addTeacher, updateTeacher, deleteTeacher, entries } = useTimetableStore();
  const { setTeacherAvailabilityModalId, openCsvModal, addToast } = useUiStore();

  const [search, setSearch] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engg.');
  const [email, setEmail] = useState('');
  const [maxHoursPerDay, setMaxHoursPerDay] = useState(4);
  const [maxHoursPerWeek, setMaxHoursPerWeek] = useState(16);
  const [color, setColor] = useState('#6366f1');

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.shortCode.toLowerCase().includes(search.toLowerCase()) ||
      t.department?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setName('');
    setShortCode('');
    setDepartment('Computer Science & Engg.');
    setEmail('');
    setMaxHoursPerDay(4);
    setMaxHoursPerWeek(16);
    setColor('#6366f1');
    setIsAdding(true);
    setEditingTeacher(null);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setName(t.name);
    setShortCode(t.shortCode);
    setDepartment(t.department || 'Computer Science & Engg.');
    setEmail(t.email || '');
    setMaxHoursPerDay(t.maxHoursPerDay);
    setMaxHoursPerWeek(t.maxHoursPerWeek);
    setColor(t.color || '#6366f1');
    setIsAdding(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !shortCode) {
      alert('Please fill in Teacher Name and Short Code.');
      return;
    }

    if (editingTeacher) {
      updateTeacher(editingTeacher.id, {
        name,
        shortCode,
        department,
        email,
        maxHoursPerDay,
        maxHoursPerWeek,
        color,
      });
      addToast({
        type: 'success',
        title: 'Faculty Updated',
        description: `Updated profile for ${name}.`,
      });
    } else {
      addTeacher({
        name,
        shortCode,
        department,
        email,
        maxHoursPerDay,
        maxHoursPerWeek,
        unavailableSlots: [],
        color,
      });
      addToast({
        type: 'success',
        title: 'Faculty Added',
        description: `Added ${name} (${shortCode}) to directory.`,
      });
    }

    setIsAdding(false);
    setEditingTeacher(null);
  };

  const handleDelete = (id: string, teacherName: string) => {
    if (window.confirm(`Delete faculty member ${teacherName}? Associated class allocations will be unassigned.`)) {
      deleteTeacher(id);
      addToast({
        type: 'info',
        title: 'Faculty Deleted',
        description: `Removed ${teacherName} from directory.`,
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
            placeholder="Search faculty name, code, dept..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => openCsvModal('teachers')}
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
            <span>Add Faculty</span>
          </button>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60 shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-3.5">Faculty Member</th>
              <th className="p-3.5">Department</th>
              <th className="p-3.5">Teaching Load Limit</th>
              <th className="p-3.5">Assigned Hours</th>
              <th className="p-3.5 text-center">Weekly Availability</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {filteredTeachers.map((teacher) => {
              const currentHours = entries.filter((e) => e.teacherId === teacher.id).length;
              const unavailCount = teacher.unavailableSlots?.length || 0;

              return (
                <tr key={teacher.id} className="hover:bg-slate-900/40 transition-colors">
                  
                  {/* Name + Short code */}
                  <td className="p-3.5">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md flex-shrink-0"
                        style={{ backgroundColor: teacher.color || '#6366f1' }}
                      >
                        {teacher.shortCode}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">{teacher.name}</div>
                        <div className="text-[11px] text-slate-400">{teacher.email || 'No email registered'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="p-3.5 text-slate-300">
                    {teacher.department || 'Computer Science & Engg.'}
                  </td>

                  {/* Max Hours */}
                  <td className="p-3.5 text-slate-300">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{teacher.maxHoursPerDay}h/day • {teacher.maxHoursPerWeek}h/week max</span>
                    </div>
                  </td>

                  {/* Current Assigned Hours */}
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                        currentHours > teacher.maxHoursPerWeek
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {currentHours} / {teacher.maxHoursPerWeek} hrs
                    </span>
                  </td>

                  {/* Weekly Availability Matrix Button */}
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => setTeacherAvailabilityModalId(teacher.id)}
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        unavailCount > 0
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{unavailCount > 0 ? `${unavailCount} Busy Slots` : '100% Available'}</span>
                    </button>
                  </td>

                  {/* Edit / Delete */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handleOpenEdit(teacher)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Faculty"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id, teacher.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title="Delete Faculty"
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

      {/* Add / Edit Faculty Modal */}
      {(isAdding || editingTeacher) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
            <h3 className="text-base font-bold text-white tracking-tight pb-3 border-b border-slate-800">
              {isAdding ? 'Add Faculty Member' : 'Edit Faculty Member'}
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Debabrata Roy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Short Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DR"
                    value={shortCode}
                    onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Avatar Color</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded-xl px-1 py-1 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="name@makaut.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Hours / Day</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={maxHoursPerDay}
                    onChange={(e) => setMaxHoursPerDay(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Hours / Week</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={maxHoursPerWeek}
                    onChange={(e) => setMaxHoursPerWeek(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingTeacher(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-colors"
                >
                  Save Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
