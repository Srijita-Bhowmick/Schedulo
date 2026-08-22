import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Building, Users, Upload, Search, Laptop, FlaskConical, LayoutGrid } from 'lucide-react';
import { useTimetableStore } from '../../store/useTimetableStore';
import { useUiStore } from '../../store/useUiStore';
import { Room, RoomType } from '../../types';

export const RoomManagement: React.FC = () => {
  const { rooms, addRoom, updateRoom, deleteRoom, entries, timeSlotConfig } = useTimetableStore();
  const { openCsvModal, addToast } = useUiStore();

  const [search, setSearch] = useState('');
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [roomNumber, setRoomNumber] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<RoomType>('LECTURE_HALL');
  const [capacity, setCapacity] = useState(70);
  const [building, setBuilding] = useState('Turing Block');

  const filteredRooms = rooms.filter(
    (r) =>
      r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.type.toLowerCase().includes(search.toLowerCase()) ||
      r.building?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setRoomNumber('');
    setName('');
    setType('LECTURE_HALL');
    setCapacity(70);
    setBuilding('Turing Block');
    setIsAdding(true);
    setEditingRoom(null);
  };

  const handleOpenEdit = (r: Room) => {
    setEditingRoom(r);
    setRoomNumber(r.roomNumber);
    setName(r.name || '');
    setType(r.type);
    setCapacity(r.capacity);
    setBuilding(r.building || 'Turing Block');
    setIsAdding(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber) {
      alert('Please fill in Room Number.');
      return;
    }

    if (editingRoom) {
      updateRoom(editingRoom.id, {
        roomNumber,
        name,
        type,
        capacity,
        building,
      });
      addToast({
        type: 'success',
        title: 'Facility Updated',
        description: `Updated room ${roomNumber}.`,
      });
    } else {
      addRoom({
        roomNumber,
        name,
        type,
        capacity,
        building,
      });
      addToast({
        type: 'success',
        title: 'Facility Added',
        description: `Added room ${roomNumber} (${type}) to infrastructure list.`,
      });
    }

    setIsAdding(false);
    setEditingRoom(null);
  };

  const handleDelete = (id: string, roomNum: string) => {
    if (window.confirm(`Delete room ${roomNum}? Any classes scheduled here will be cleared.`)) {
      deleteRoom(id);
      addToast({
        type: 'info',
        title: 'Facility Deleted',
        description: `Removed room ${roomNum}.`,
      });
    }
  };

  const totalSlotsPerWeek = timeSlotConfig.workingDays.length * timeSlotConfig.periodsPerDay;

  return (
    <div className="space-y-4">
      
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search room number, building, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => openCsvModal('rooms')}
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
            <span>Add Classroom/Lab</span>
          </button>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60 shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-3.5">Room ID & Name</th>
              <th className="p-3.5">Facility Type</th>
              <th className="p-3.5">Seating Capacity</th>
              <th className="p-3.5">Building Location</th>
              <th className="p-3.5">Weekly Utilization</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {filteredRooms.map((room) => {
              const occupiedHours = entries.filter((e) => e.roomId === room.id).length;
              const utilization = Math.min(100, Math.round((occupiedHours / totalSlotsPerWeek) * 100));

              return (
                <tr key={room.id} className="hover:bg-slate-900/40 transition-colors">
                  
                  {/* Room Number & Name */}
                  <td className="p-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold font-mono text-xs shadow-md">
                        {room.roomNumber.split('-')[1] || room.roomNumber}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">{room.roomNumber}</div>
                        <div className="text-[11px] text-slate-400">{room.name || 'Campus Hall'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Room Type */}
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        room.type === 'COMPUTER_LAB'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : room.type === 'SCIENCE_LAB'
                          ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                          : room.type === 'SEMINAR_HALL'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {room.type === 'COMPUTER_LAB' ? (
                        <Laptop className="w-3 h-3" />
                      ) : room.type === 'SCIENCE_LAB' ? (
                        <FlaskConical className="w-3 h-3" />
                      ) : (
                        <Building className="w-3 h-3" />
                      )}
                      <span>
                        {room.type === 'COMPUTER_LAB'
                          ? 'Computer Lab'
                          : room.type === 'SCIENCE_LAB'
                          ? 'Hardware / Science Lab'
                          : room.type === 'SEMINAR_HALL'
                          ? 'Seminar Hall'
                          : 'Lecture Hall'}
                      </span>
                    </span>
                  </td>

                  {/* Capacity */}
                  <td className="p-3.5 text-slate-200 font-mono">
                    <div className="flex items-center space-x-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{room.capacity} seats</span>
                    </div>
                  </td>

                  {/* Building */}
                  <td className="p-3.5 text-slate-300">
                    {room.building || 'Main Block'}
                  </td>

                  {/* Utilization bar */}
                  <td className="p-3.5">
                    <div className="w-32">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>{occupiedHours} hrs</span>
                        <span>{utilization}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-cyan-500 h-1.5 rounded-full"
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Edit / Delete */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handleOpenEdit(room)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Room"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(room.id, room.roomNumber)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title="Delete Room"
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

      {/* Add / Edit Room Modal */}
      {(isAdding || editingRoom) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
            <h3 className="text-base font-bold text-white tracking-tight pb-3 border-b border-slate-800">
              {isAdding ? 'Add Classroom or Lab' : 'Edit Facility Details'}
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Room Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LH-201"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Room / Lab Name</label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Systems & Cloud Lab"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Facility Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as RoomType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LECTURE_HALL">Lecture Hall / Classroom</option>
                  <option value="COMPUTER_LAB">Computer Laboratory</option>
                  <option value="SCIENCE_LAB">Hardware / Electronics / Science Lab</option>
                  <option value="SEMINAR_HALL">Department Seminar Hall</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Campus Building</label>
                <input
                  type="text"
                  placeholder="e.g. Turing Block"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingRoom(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-colors"
                >
                  Save Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
