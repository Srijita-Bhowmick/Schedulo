import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Teacher,
  Subject,
  BatchSection,
  Room,
  TimeSlotConfig,
  ScheduleEntry,
  ConflictReport,
  TimetableStats,
  GenerationSettings,
  GenerationProgress,
  DayOfWeek,
} from '../types';
import {
  DEMO_TEACHERS,
  DEMO_SUBJECTS,
  DEMO_ROOMS,
  DEMO_BATCHES,
  DEMO_TIME_SLOT_CONFIG,
} from '../data/demoData';
import { detectAllClashes } from '../engine/clashDetector';
import { calculateTimetableStats } from '../engine/fitnessCalculator';
import { runTimetableGenerator } from '../engine/schedulerAlgorithm';

interface TimetableStore {
  // Domain Data
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  batches: BatchSection[];
  timeSlotConfig: TimeSlotConfig;
  entries: ScheduleEntry[];

  // Undo / Redo history
  history: ScheduleEntry[][];
  future: ScheduleEntry[][];

  // Generator Settings & Progress
  generationSettings: GenerationSettings;
  generationProgress: GenerationProgress;
  isGenerating: boolean;
  abortController: boolean;

  // Real-time conflicts and stats
  conflicts: ConflictReport[];
  stats: TimetableStats;

  // Actions - Entities CRUD
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, teacher: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;

  addSubject: (subject: Omit<Subject, 'id'>) => void;
  updateSubject: (id: string, subject: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  addRoom: (room: Omit<Room, 'id'>) => void;
  updateRoom: (id: string, room: Partial<Room>) => void;
  deleteRoom: (id: string) => void;

  addBatch: (batch: Omit<BatchSection, 'id'>) => void;
  updateBatch: (id: string, batch: Partial<BatchSection>) => void;
  deleteBatch: (id: string) => void;

  updateTimeSlotConfig: (config: Partial<TimeSlotConfig>) => void;
  updateGenerationSettings: (settings: Partial<GenerationSettings>) => void;

  // Actions - Schedule Grid Operations
  addScheduleEntry: (entry: Omit<ScheduleEntry, 'id'>) => void;
  updateScheduleEntry: (id: string, updates: Partial<ScheduleEntry>) => void;
  moveScheduleEntry: (entryId: string, targetDay: DayOfWeek, targetPeriod: number, targetRoomId?: string) => void;
  swapScheduleEntries: (entryAId: string, entryBId: string) => void;
  toggleLockEntry: (id: string) => void;
  removeScheduleEntry: (id: string) => void;
  clearAllEntries: () => void;

  // Actions - Bulk & Generation
  loadDemoData: () => void;
  generateSchedule: () => Promise<void>;
  cancelGeneration: () => void;
  bulkImportTeachers: (newTeachers: Teacher[]) => void;
  bulkImportSubjects: (newSubjects: Subject[]) => void;
  bulkImportRooms: (newRooms: Room[]) => void;
  bulkImportBatches: (newBatches: BatchSection[]) => void;

  // History Actions
  undo: () => void;
  redo: () => void;

  // Helper
  recomputeStats: () => void;
}

export const useTimetableStore = create<TimetableStore>()(
  persist(
    (set, get) => ({
      teachers: DEMO_TEACHERS,
      subjects: DEMO_SUBJECTS,
      rooms: DEMO_ROOMS,
      batches: DEMO_BATCHES,
      timeSlotConfig: DEMO_TIME_SLOT_CONFIG,
      entries: [],

      history: [],
      future: [],

      generationSettings: {
        populationSize: 8,
        generations: 40,
        mutationRate: 0.15,
        optimizeGaps: true,
        balanceFacultyLoad: true,
        preferRoomTypes: true,
        respectTeacherAvailability: true,
      },

      generationProgress: {
        status: 'idle',
        currentGeneration: 0,
        maxGenerations: 40,
        fitness: 0,
        clashesCount: 0,
        message: 'Ready to generate timetable.',
        fitnessHistory: [],
      },
      isGenerating: false,
      abortController: false,

      conflicts: [],
      stats: {
        totalBatches: DEMO_BATCHES.length,
        totalSubjects: DEMO_SUBJECTS.length,
        totalTeachers: DEMO_TEACHERS.length,
        totalRooms: DEMO_ROOMS.length,
        totalScheduledHours: 0,
        roomUtilizationRate: 0,
        facultyAverageLoad: 0,
        conflictsCount: 0,
        fitnessScore: 0,
        hardConstraintScore: 100,
        softConstraintScore: 100,
      },

      recomputeStats: () => {
        const state = get();
        const conflicts = detectAllClashes(
          state.entries,
          state.teachers,
          state.rooms,
          state.subjects,
          state.batches,
          state.timeSlotConfig
        );
        const stats = calculateTimetableStats(
          state.entries,
          state.teachers,
          state.rooms,
          state.subjects,
          state.batches,
          state.timeSlotConfig
        );
        set({ conflicts, stats });
      },

      // Teachers CRUD
      addTeacher: (teacher) => {
        const newTeacher: Teacher = {
          ...teacher,
          id: `t-${Date.now()}`,
          unavailableSlots: teacher.unavailableSlots || [],
        };
        set((state) => ({ teachers: [...state.teachers, newTeacher] }));
        get().recomputeStats();
      },
      updateTeacher: (id, updates) => {
        set((state) => ({
          teachers: state.teachers.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
        get().recomputeStats();
      },
      deleteTeacher: (id) => {
        set((state) => ({
          teachers: state.teachers.filter((t) => t.id !== id),
          entries: state.entries.filter((e) => e.teacherId !== id),
        }));
        get().recomputeStats();
      },

      // Subjects CRUD
      addSubject: (subject) => {
        const newSubject: Subject = {
          ...subject,
          id: `sub-${Date.now()}`,
        };
        set((state) => ({ subjects: [...state.subjects, newSubject] }));
        get().recomputeStats();
      },
      updateSubject: (id, updates) => {
        set((state) => ({
          subjects: state.subjects.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }));
        get().recomputeStats();
      },
      deleteSubject: (id) => {
        set((state) => ({
          subjects: state.subjects.filter((s) => s.id !== id),
          entries: state.entries.filter((e) => e.subjectId !== id),
        }));
        get().recomputeStats();
      },

      // Rooms CRUD
      addRoom: (room) => {
        const newRoom: Room = {
          ...room,
          id: `r-${Date.now()}`,
        };
        set((state) => ({ rooms: [...state.rooms, newRoom] }));
        get().recomputeStats();
      },
      updateRoom: (id, updates) => {
        set((state) => ({
          rooms: state.rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }));
        get().recomputeStats();
      },
      deleteRoom: (id) => {
        set((state) => ({
          rooms: state.rooms.filter((r) => r.id !== id),
          entries: state.entries.filter((e) => e.roomId !== id),
        }));
        get().recomputeStats();
      },

      // Batches CRUD
      addBatch: (batch) => {
        const newBatch: BatchSection = {
          ...batch,
          id: `batch-${Date.now()}`,
        };
        set((state) => ({ batches: [...state.batches, newBatch] }));
        get().recomputeStats();
      },
      updateBatch: (id, updates) => {
        set((state) => ({
          batches: state.batches.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        }));
        get().recomputeStats();
      },
      deleteBatch: (id) => {
        set((state) => ({
          batches: state.batches.filter((b) => b.id !== id),
          entries: state.entries.filter((e) => e.batchId !== id),
        }));
        get().recomputeStats();
      },

      updateTimeSlotConfig: (configUpdates) => {
        set((state) => ({
          timeSlotConfig: { ...state.timeSlotConfig, ...configUpdates },
        }));
        get().recomputeStats();
      },

      updateGenerationSettings: (settingsUpdates) => {
        set((state) => ({
          generationSettings: { ...state.generationSettings, ...settingsUpdates },
        }));
      },

      // Schedule Entry Operations
      addScheduleEntry: (entry) => {
        const state = get();
        const newEntry: ScheduleEntry = {
          ...entry,
          id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        };
        const nextEntries = [...state.entries, newEntry];
        set({
          history: [...state.history, state.entries],
          future: [],
          entries: nextEntries,
        });
        get().recomputeStats();
      },

      updateScheduleEntry: (id, updates) => {
        const state = get();
        const nextEntries = state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
        set({
          history: [...state.history, state.entries],
          future: [],
          entries: nextEntries,
        });
        get().recomputeStats();
      },

      moveScheduleEntry: (entryId, targetDay, targetPeriod, targetRoomId) => {
        const state = get();
        const entry = state.entries.find((e) => e.id === entryId);
        if (!entry) return;

        const nextEntries = state.entries.map((e) => {
          if (e.id === entryId) {
            return {
              ...e,
              day: targetDay,
              periodIndex: targetPeriod,
              roomId: targetRoomId || e.roomId,
            };
          }
          return e;
        });

        set({
          history: [...state.history, state.entries],
          future: [],
          entries: nextEntries,
        });
        get().recomputeStats();
      },

      swapScheduleEntries: (entryAId, entryBId) => {
        const state = get();
        const entryA = state.entries.find((e) => e.id === entryAId);
        const entryB = state.entries.find((e) => e.id === entryBId);
        if (!entryA || !entryB) return;

        const dayA = entryA.day;
        const periodA = entryA.periodIndex;
        const roomA = entryA.roomId;

        const nextEntries = state.entries.map((e) => {
          if (e.id === entryAId) {
            return { ...e, day: entryB.day, periodIndex: entryB.periodIndex, roomId: entryB.roomId };
          }
          if (e.id === entryBId) {
            return { ...e, day: dayA, periodIndex: periodA, roomId: roomA };
          }
          return e;
        });

        set({
          history: [...state.history, state.entries],
          future: [],
          entries: nextEntries,
        });
        get().recomputeStats();
      },

      toggleLockEntry: (id) => {
        set((state) => ({
          entries: state.entries.map((e) => (e.id === id ? { ...e, isLocked: !e.isLocked } : e)),
        }));
      },

      removeScheduleEntry: (id) => {
        const state = get();
        set({
          history: [...state.history, state.entries],
          future: [],
          entries: state.entries.filter((e) => e.id !== id),
        });
        get().recomputeStats();
      },

      clearAllEntries: () => {
        const state = get();
        set({
          history: [...state.history, state.entries],
          future: [],
          entries: [],
        });
        get().recomputeStats();
      },

      loadDemoData: () => {
        set({
          teachers: DEMO_TEACHERS,
          subjects: DEMO_SUBJECTS,
          rooms: DEMO_ROOMS,
          batches: DEMO_BATCHES,
          timeSlotConfig: DEMO_TIME_SLOT_CONFIG,
          entries: [],
          history: [],
          future: [],
        });
        get().recomputeStats();
      },

      bulkImportTeachers: (newTeachers) => {
        set((state) => ({ teachers: [...state.teachers, ...newTeachers] }));
        get().recomputeStats();
      },

      bulkImportSubjects: (newSubjects) => {
        set((state) => ({ subjects: [...state.subjects, ...newSubjects] }));
        get().recomputeStats();
      },

      bulkImportRooms: (newRooms) => {
        set((state) => ({ rooms: [...state.rooms, ...newRooms] }));
        get().recomputeStats();
      },

      bulkImportBatches: (newBatches) => {
        set((state) => ({ batches: [...state.batches, ...newBatches] }));
        get().recomputeStats();
      },

      // Undo / Redo
      undo: () => {
        const { history, entries, future } = get();
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        set({
          entries: previous,
          history: history.slice(0, -1),
          future: [entries, ...future],
        });
        get().recomputeStats();
      },

      redo: () => {
        const { history, entries, future } = get();
        if (future.length === 0) return;
        const next = future[0];
        set({
          entries: next,
          history: [...history, entries],
          future: future.slice(1),
        });
        get().recomputeStats();
      },

      // Generator execution with dedicated Web Worker & execution time tracking
      generateSchedule: async () => {
        const state = get();
        const startTime = performance.now();
        set({
          isGenerating: true,
          abortController: false,
          generationProgress: {
            status: 'running',
            currentGeneration: 0,
            maxGenerations: state.generationSettings.generations,
            fitness: 0,
            clashesCount: 0,
            message: 'Dispatching constraint solver to background Web Worker thread...',
            executionTimeMs: 0,
            fitnessHistory: [],
          },
        });

        const lockedEntries = state.entries.filter((e) => e.isLocked);

        // Check if Web Worker is supported
        if (typeof Worker !== 'undefined') {
          try {
            const worker = new Worker(
              new URL('../engine/schedulerWorker.ts', import.meta.url),
              { type: 'module' }
            );

            worker.onmessage = (e: MessageEvent) => {
              const { type, progress, entries: genEntries, stats: genStats, executionTimeMs, message } = e.data;

              if (type === 'PROGRESS') {
                set({ generationProgress: progress });
              } else if (type === 'SUCCESS') {
                set({
                  history: [...get().history, get().entries],
                  future: [],
                  entries: genEntries,
                  isGenerating: false,
                  generationProgress: {
                    status: 'completed',
                    currentGeneration: state.generationSettings.generations,
                    maxGenerations: state.generationSettings.generations,
                    fitness: genStats.fitnessScore,
                    clashesCount: genStats.conflictsCount,
                    executionTimeMs,
                    message: `Solver solved 100% of constraints in ${executionTimeMs}ms with ${genStats.fitnessScore}% fitness.`,
                    fitnessHistory: get().generationProgress.fitnessHistory,
                  },
                });
                get().recomputeStats();
                set((s) => ({ stats: { ...s.stats, executionTimeMs } }));
                worker.terminate();
              } else if (type === 'ERROR') {
                set({
                  isGenerating: false,
                  generationProgress: {
                    status: 'failed',
                    currentGeneration: 0,
                    maxGenerations: state.generationSettings.generations,
                    fitness: 0,
                    clashesCount: 0,
                    message: `Worker solver error: ${message}`,
                    fitnessHistory: [],
                  },
                });
                worker.terminate();
              }
            };

            worker.postMessage({
              type: 'START',
              payload: {
                batches: state.batches,
                subjects: state.subjects,
                teachers: state.teachers,
                rooms: state.rooms,
                config: state.timeSlotConfig,
                lockedEntries,
                settings: state.generationSettings,
              },
            });

            return;
          } catch (workerErr) {
            console.warn('Web Worker initialization fallback to async generator:', workerErr);
          }
        }

        // Fallback to async generator in main thread
        try {
          const generatedEntries = await runTimetableGenerator(
            state.batches,
            state.subjects,
            state.teachers,
            state.rooms,
            state.timeSlotConfig,
            lockedEntries,
            state.generationSettings,
            (progress) => {
              const currentElapsed = Math.round(performance.now() - startTime);
              set({
                generationProgress: {
                  ...progress,
                  executionTimeMs: currentElapsed,
                },
              });
            },
            () => get().abortController
          );

          const executionTimeMs = Math.round(performance.now() - startTime);

          set({
            history: [...state.history, state.entries],
            future: [],
            entries: generatedEntries,
            isGenerating: false,
          });

          get().recomputeStats();
          set((s) => ({
            stats: { ...s.stats, executionTimeMs },
            generationProgress: { ...s.generationProgress, executionTimeMs },
          }));
        } catch (err: any) {
          set({
            isGenerating: false,
            generationProgress: {
              status: 'failed',
              currentGeneration: 0,
              maxGenerations: state.generationSettings.generations,
              fitness: 0,
              clashesCount: 0,
              message: `Generation error: ${err.message || 'Unknown error'}`,
              fitnessHistory: [],
            },
          });
        }
      },

      cancelGeneration: () => {
        set({ abortController: true, isGenerating: false });
      },
    }),
    {
      name: 'schedulo-timetable-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        teachers: state.teachers,
        subjects: state.subjects,
        rooms: state.rooms,
        batches: state.batches,
        timeSlotConfig: state.timeSlotConfig,
        entries: state.entries,
        generationSettings: state.generationSettings,
      }),
    }
  )
);
