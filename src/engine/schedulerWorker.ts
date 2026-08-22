import {
  ScheduleEntry,
  Teacher,
  Room,
  Subject,
  BatchSection,
  TimeSlotConfig,
  GenerationSettings,
  GenerationProgress,
} from '../types';
import { runTimetableGenerator } from './schedulerAlgorithm';
import { calculateTimetableStats } from './fitnessCalculator';

let isAborted = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'ABORT') {
    isAborted = true;
    return;
  }

  if (type === 'START') {
    isAborted = false;
    const { batches, subjects, teachers, rooms, config, lockedEntries, settings } = payload;
    const startTime = performance.now();

    try {
      const generatedEntries = await runTimetableGenerator(
        batches,
        subjects,
        teachers,
        rooms,
        config,
        lockedEntries,
        settings,
        (progress: GenerationProgress) => {
          const currentElapsed = Math.round(performance.now() - startTime);
          self.postMessage({
            type: 'PROGRESS',
            progress: {
              ...progress,
              executionTimeMs: currentElapsed,
            },
          });
        },
        () => isAborted
      );

      const endTime = performance.now();
      const executionTimeMs = Math.round(endTime - startTime);

      const stats = calculateTimetableStats(
        generatedEntries,
        teachers,
        rooms,
        subjects,
        batches,
        config
      );

      self.postMessage({
        type: 'SUCCESS',
        entries: generatedEntries,
        stats: {
          ...stats,
          executionTimeMs,
        },
        executionTimeMs,
      });
    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        message: err.message || 'Worker scheduler calculation error',
      });
    }
  }
};
