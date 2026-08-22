import React, { useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { ToastContainer } from './components/common/ToastContainer';
import { MetricCards } from './components/dashboard/MetricCards';
import { ActionBar } from './components/dashboard/ActionBar';
import { QuickStatsOverview } from './components/dashboard/QuickStatsOverview';
import { PerspectiveSwitcher } from './components/timetable/PerspectiveSwitcher';
import { TimetableGrid } from './components/timetable/TimetableGrid';
import { ClashRadarAlert } from './components/timetable/ClashRadarAlert';
import { EditSlotModal } from './components/timetable/EditSlotModal';
import { EntityTabs } from './components/entities/EntityTabs';
import { SettingsModal } from './components/modals/SettingsModal';
import { GenerationProgressModal } from './components/modals/GenerationProgressModal';
import { ConflictListModal } from './components/modals/ConflictListModal';
import { ExportHubModal } from './components/modals/ExportHubModal';
import { useTimetableStore } from './store/useTimetableStore';
import { useUiStore } from './store/useUiStore';
import { Sparkles, Calendar, Layers, Users, Settings } from 'lucide-react';

export const App: React.FC = () => {
  const { activeTab, setActiveTab } = useUiStore();
  const { entries, generateSchedule, recomputeStats } = useTimetableStore();

  useEffect(() => {
    recomputeStats();
    // If first load and empty schedule, run initial solver
    if (entries.length === 0) {
      generateSchedule();
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Navigation Header */}
      <Navbar />

      {/* Main App Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Tab 1: Unified Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ActionBar />
            <MetricCards />
            <ClashRadarAlert />
            <QuickStatsOverview />

            {/* Quick Live Preview of Timetable Grid */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold font-display text-white tracking-wide">
                    Live Timetable Matrix Preview
                  </h3>
                  <p className="text-xs text-slate-400">
                    Switch between Batch, Faculty, and Room perspectives below
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('timetable')}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  Open Fullscreen Matrix →
                </button>
              </div>

              <div className="space-y-4">
                <PerspectiveSwitcher />
                <TimetableGrid />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Timetable Matrix View */}
        {activeTab === 'timetable' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <PerspectiveSwitcher />
            <ClashRadarAlert />
            <TimetableGrid />
          </div>
        )}

        {/* Tab 3: Entity Hub */}
        {activeTab === 'entities' && (
          <div className="animate-in fade-in duration-200">
            <EntityTabs />
          </div>
        )}

        {/* Tab 4: Settings & Algorithm Rules */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-200">
            <SettingsModal />
          </div>
        )}

      </main>

      {/* Global Application Modals */}
      <GenerationProgressModal />
      <ConflictListModal />
      <ExportHubModal />
      <EditSlotModal />
      <ToastContainer />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/80 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Schedulo • Deterministic Algorithmic Timetable Scheduling Architecture
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Zero AI/LLM Runtime Dependencies • Constraint Satisfaction & Genetic Solver Web Worker
          </span>
        </div>
      </footer>

    </div>
  );
};

export default App;
