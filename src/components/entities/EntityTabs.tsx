import React, { useState } from 'react';
import { Users, BookOpen, Building, GraduationCap, Upload, FileSpreadsheet } from 'lucide-react';
import { TeacherManagement } from './TeacherManagement';
import { SubjectManagement } from './SubjectManagement';
import { RoomManagement } from './RoomManagement';
import { BatchManagement } from './BatchManagement';
import { AvailabilityGridModal } from './AvailabilityGridModal';
import { CsvImportExportModal } from './CsvImportExportModal';
import { useTimetableStore } from '../../store/useTimetableStore';

export const EntityTabs: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'teachers' | 'subjects' | 'rooms' | 'batches'>('teachers');
  const { teachers, subjects, rooms, batches } = useTimetableStore();

  return (
    <div className="space-y-6">
      
      {/* Top Entity Tabs Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center space-x-1">
          <button
            id="entity-subtab-teachers"
            onClick={() => setActiveSubTab('teachers')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'teachers'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Faculty Directory ({teachers.length})</span>
          </button>

          <button
            id="entity-subtab-subjects"
            onClick={() => setActiveSubTab('subjects')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'subjects'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Courses & Labs ({subjects.length})</span>
          </button>

          <button
            id="entity-subtab-rooms"
            onClick={() => setActiveSubTab('rooms')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'rooms'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Facilities & Labs ({rooms.length})</span>
          </button>

          <button
            id="entity-subtab-batches"
            onClick={() => setActiveSubTab('batches')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'batches'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Batches ({batches.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden lg:block px-3">
          Manage campus resources, time constraints, and curriculum allocations.
        </div>
      </div>

      {/* Sub-tab Content Panels */}
      {activeSubTab === 'teachers' && <TeacherManagement />}
      {activeSubTab === 'subjects' && <SubjectManagement />}
      {activeSubTab === 'rooms' && <RoomManagement />}
      {activeSubTab === 'batches' && <BatchManagement />}

      {/* Popups and sub-modals */}
      <AvailabilityGridModal />
      <CsvImportExportModal />

    </div>
  );
};
