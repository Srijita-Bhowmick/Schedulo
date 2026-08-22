import { create } from 'zustand';
import { PerspectiveType, DayOfWeek } from '../types';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface UiStore {
  activeTab: 'dashboard' | 'timetable' | 'entities' | 'settings';
  perspective: PerspectiveType;
  selectedEntityId: string;
  theme: 'dark' | 'light';

  // Modals
  isGenerationModalOpen: boolean;
  isConflictModalOpen: boolean;
  isExportModalOpen: boolean;
  isCsvModalOpen: boolean;
  csvModalType: 'teachers' | 'subjects' | 'rooms' | 'batches';
  
  editingSlot: { day: DayOfWeek; periodIndex: number; entryId?: string } | null;
  editingEntity: { type: 'teacher' | 'subject' | 'room' | 'batch'; id?: string } | null;
  teacherAvailabilityModalId: string | null;

  // Toasts
  toasts: ToastMessage[];

  // Actions
  setActiveTab: (tab: 'dashboard' | 'timetable' | 'entities' | 'settings') => void;
  setPerspective: (perspective: PerspectiveType) => void;
  setSelectedEntityId: (id: string) => void;
  toggleTheme: () => void;

  setGenerationModalOpen: (open: boolean) => void;
  setConflictModalOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  openCsvModal: (type: 'teachers' | 'subjects' | 'rooms' | 'batches') => void;
  closeCsvModal: () => void;

  setEditingSlot: (slot: { day: DayOfWeek; periodIndex: number; entryId?: string } | null) => void;
  setEditingEntity: (entity: { type: 'teacher' | 'subject' | 'room' | 'batch'; id?: string } | null) => void;
  setTeacherAvailabilityModalId: (teacherId: string | null) => void;

  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  activeTab: 'dashboard',
  perspective: 'batch',
  selectedEntityId: 'batch-2', // Default to CSE-5A
  theme: 'dark',

  isGenerationModalOpen: false,
  isConflictModalOpen: false,
  isExportModalOpen: false,
  isCsvModalOpen: false,
  csvModalType: 'teachers',

  editingSlot: null,
  editingEntity: null,
  teacherAvailabilityModalId: null,

  toasts: [],

  setActiveTab: (tab) => set({ activeTab: tab }),
  setPerspective: (perspective) => set({ perspective }),
  setSelectedEntityId: (selectedEntityId) => set({ selectedEntityId }),
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: nextTheme };
    }),

  setGenerationModalOpen: (isGenerationModalOpen) => set({ isGenerationModalOpen }),
  setConflictModalOpen: (isConflictModalOpen) => set({ isConflictModalOpen }),
  setExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),
  openCsvModal: (csvModalType) => set({ isCsvModalOpen: true, csvModalType }),
  closeCsvModal: () => set({ isCsvModalOpen: false }),

  setEditingSlot: (editingSlot) => set({ editingSlot }),
  setEditingEntity: (editingEntity) => set({ editingEntity }),
  setTeacherAvailabilityModalId: (teacherAvailabilityModalId) => set({ teacherAvailabilityModalId }),

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
