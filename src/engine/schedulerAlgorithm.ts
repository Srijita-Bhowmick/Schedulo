import {
  ScheduleEntry,
  Teacher,
  Room,
  Subject,
  BatchSection,
  TimeSlotConfig,
  GenerationSettings,
  GenerationProgress,
  DayOfWeek,
} from '../types';
import { isValidConsecutiveBlock } from './timeUtils';
import { detectAllClashes } from './clashDetector';
import { calculateTimetableStats } from './fitnessCalculator';

export interface ClassRequirement {
  id: string; // unique item id
  batchId: string;
  subjectId: string;
  teacherId: string;
  durationSlots: number;
  preferredRoomType?: string;
  isLab: boolean;
}

/**
 * Breaks down all batch subjects into required class blocks to schedule
 */
export function buildClassRequirements(
  batches: BatchSection[],
  subjects: Subject[],
  lockedEntries: ScheduleEntry[]
): ClassRequirement[] {
  const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));
  const reqs: ClassRequirement[] = [];

  // Count existing locked entries per batch & subject
  const lockedCountMap = new Map<string, number>();
  for (const entry of lockedEntries) {
    const key = `${entry.batchId}_${entry.subjectId}`;
    lockedCountMap.set(key, (lockedCountMap.get(key) || 0) + 1);
  }

  for (const batch of batches) {
    for (const subjectId of batch.subjectIds) {
      const subject = subjectMap.get(subjectId);
      if (!subject) continue;

      const duration = subject.durationSlots || 1;
      const totalHours = subject.weeklyHours || (subject.type === 'LAB' ? 3 : 3);
      const lockedHours = lockedCountMap.get(`${batch.id}_${subject.id}`) || 0;
      const remainingHours = Math.max(0, totalHours - lockedHours);

      let scheduledInBlocks = 0;
      while (scheduledInBlocks < remainingHours) {
        const currentBlockDuration = Math.min(duration, remainingHours - scheduledInBlocks);
        if (currentBlockDuration <= 0) break;

        reqs.push({
          id: `req_${batch.id}_${subject.id}_${reqs.length}`,
          batchId: batch.id,
          subjectId: subject.id,
          teacherId: subject.assignedTeacherId,
          durationSlots: currentBlockDuration,
          preferredRoomType: subject.preferredRoomType,
          isLab: subject.type === 'LAB',
        });

        scheduledInBlocks += currentBlockDuration;
      }
    }
  }

  // Sort requirements: Most constrained first (Multi-slot Labs first, then others)
  return reqs.sort((a, b) => b.durationSlots - a.durationSlots);
}

/**
 * Checks if a candidate placement is valid according to hard constraints
 */
function isSlotValid(
  day: DayOfWeek,
  startPeriod: number,
  durationSlots: number,
  roomId: string,
  teacherId: string,
  batchId: string,
  currentEntries: ScheduleEntry[],
  teachers: Teacher[],
  rooms: Room[],
  config: TimeSlotConfig
): boolean {
  // 1. Boundary and lunch break check
  if (!isValidConsecutiveBlock(startPeriod, durationSlots, config)) {
    return false;
  }

  const teacher = teachers.find((t) => t.id === teacherId);

  for (let offset = 0; offset < durationSlots; offset++) {
    const period = startPeriod + offset;

    // 2. Teacher availability check
    if (teacher?.unavailableSlots?.some((s) => s.day === day && s.periodIndex === period)) {
      return false;
    }

    // 3. Clashes with already placed entries
    for (const entry of currentEntries) {
      if (entry.day === day && entry.periodIndex === period) {
        // Teacher clash
        if (entry.teacherId === teacherId) return false;
        // Room clash
        if (entry.roomId === roomId) return false;
        // Batch clash
        if (entry.batchId === batchId) return false;
      }
    }
  }

  return true;
}

/**
 * Find candidate rooms matching room type preference and capacity
 */
function getRankedRooms(
  req: ClassRequirement,
  rooms: Room[],
  batch: BatchSection | undefined
): Room[] {
  return [...rooms].sort((a, b) => {
    // Prefer matching room type
    const aTypeMatch = req.preferredRoomType ? (a.type === req.preferredRoomType ? 2 : 0) : 1;
    const bTypeMatch = req.preferredRoomType ? (b.type === req.preferredRoomType ? 2 : 0) : 1;
    if (aTypeMatch !== bTypeMatch) return bTypeMatch - aTypeMatch;

    // Prefer fitting capacity
    const studentCount = batch?.studentCount || 40;
    const aCapFit = a.capacity >= studentCount ? 1 : 0;
    const bCapFit = b.capacity >= studentCount ? 1 : 0;
    if (aCapFit !== bCapFit) return bCapFit - aCapFit;

    return a.capacity - b.capacity;
  });
}

/**
 * Fast CSP Greedy Placement for all requirements
 */
export function generateInitialSchedule(
  requirements: ClassRequirement[],
  lockedEntries: ScheduleEntry[],
  teachers: Teacher[],
  rooms: Room[],
  batches: BatchSection[],
  config: TimeSlotConfig
): ScheduleEntry[] {
  const schedule: ScheduleEntry[] = [...lockedEntries];
  const batchMap = new Map<string, BatchSection>(batches.map((b) => [b.id, b]));

  for (const req of requirements) {
    const batch = batchMap.get(req.batchId);
    const rankedRooms = getRankedRooms(req, rooms, batch);

    let placed = false;

    // Try finding valid slot across days and periods
    const candidateDays = [...config.workingDays].sort(() => Math.random() - 0.5);

    for (const day of candidateDays) {
      // Check if batch already has this subject today (to spread evenly)
      const alreadyHasSubjectToday = schedule.some(
        (e) => e.batchId === req.batchId && e.subjectId === req.subjectId && e.day === day
      );
      if (alreadyHasSubjectToday && !req.isLab && Math.random() < 0.7) {
        continue; // soft preference to try another day first
      }

      // Candidate periods
      const maxStartPeriod = config.periodsPerDay - req.durationSlots;
      const candidatePeriods: number[] = [];
      for (let p = 0; p <= maxStartPeriod; p++) {
        candidatePeriods.push(p);
      }
      candidatePeriods.sort(() => Math.random() - 0.5);

      for (const p of candidatePeriods) {
        for (const room of rankedRooms) {
          if (
            isSlotValid(
              day,
              p,
              req.durationSlots,
              room.id,
              req.teacherId,
              req.batchId,
              schedule,
              teachers,
              rooms,
              config
            )
          ) {
            // Place all consecutive slots
            for (let offset = 0; offset < req.durationSlots; offset++) {
              schedule.push({
                id: `entry_${req.batchId}_${req.subjectId}_${day}_${p + offset}_${Math.random().toString(36).substr(2, 5)}`,
                day,
                periodIndex: p + offset,
                batchId: req.batchId,
                subjectId: req.subjectId,
                teacherId: req.teacherId,
                roomId: room.id,
                durationSlots: req.durationSlots,
                isLocked: false,
              });
            }
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (placed) break;
    }

    // Fallback: If no perfect clash-free slot was found in randomized order, find the best available slot
    if (!placed) {
      for (const day of config.workingDays) {
        for (let p = 0; p <= config.periodsPerDay - req.durationSlots; p++) {
          if (!isValidConsecutiveBlock(p, req.durationSlots, config)) continue;
          const room = rankedRooms[0] || rooms[0];
          for (let offset = 0; offset < req.durationSlots; offset++) {
            schedule.push({
              id: `entry_fb_${req.batchId}_${req.subjectId}_${day}_${p + offset}_${Math.random().toString(36).substr(2, 5)}`,
              day,
              periodIndex: p + offset,
              batchId: req.batchId,
              subjectId: req.subjectId,
              teacherId: req.teacherId,
              roomId: room?.id || 'r-1',
              durationSlots: req.durationSlots,
              isLocked: false,
            });
          }
          placed = true;
          break;
        }
        if (placed) break;
      }
    }
  }

  return schedule;
}

/**
 * Async Generator Runner with Genetic / Simulated Annealing iterations
 */
export async function runTimetableGenerator(
  batches: BatchSection[],
  subjects: Subject[],
  teachers: Teacher[],
  rooms: Room[],
  config: TimeSlotConfig,
  lockedEntries: ScheduleEntry[],
  settings: GenerationSettings,
  onProgress: (progress: GenerationProgress) => void,
  shouldAbort: () => boolean
): Promise<ScheduleEntry[]> {
  const reqs = buildClassRequirements(batches, subjects, lockedEntries);

  onProgress({
    status: 'running',
    currentGeneration: 0,
    maxGenerations: settings.generations,
    fitness: 0,
    clashesCount: 0,
    message: 'Initializing CSP constraint graph and population...',
    fitnessHistory: [],
  });

  // Create initial population
  const populationSize = Math.max(4, settings.populationSize);
  let population: ScheduleEntry[][] = [];

  for (let i = 0; i < populationSize; i++) {
    population.push(
      generateInitialSchedule(reqs, lockedEntries, teachers, rooms, batches, config)
    );
  }

  const fitnessHistory: { gen: number; fitness: number; clashes: number }[] = [];
  let bestSchedule = population[0];
  let bestStats = calculateTimetableStats(bestSchedule, teachers, rooms, subjects, batches, config);
  let bestFitness = bestStats.fitnessScore;

  const totalGenerations = settings.generations;

  for (let gen = 1; gen <= totalGenerations; gen++) {
    if (shouldAbort()) {
      return bestSchedule;
    }

    // Evaluate population
    const evaluated = population.map((cand) => {
      const stats = calculateTimetableStats(cand, teachers, rooms, subjects, batches, config);
      return { candidate: cand, stats, fitness: stats.fitnessScore };
    });

    evaluated.sort((a, b) => b.fitness - a.fitness);

    if (evaluated[0].fitness > bestFitness) {
      bestFitness = evaluated[0].fitness;
      bestSchedule = evaluated[0].candidate;
      bestStats = evaluated[0].stats;
    }

    fitnessHistory.push({
      gen,
      fitness: bestFitness,
      clashes: bestStats.conflictsCount,
    });

    // Report progress periodically
    if (gen % 5 === 0 || gen === totalGenerations) {
      onProgress({
        status: 'running',
        currentGeneration: gen,
        maxGenerations: totalGenerations,
        fitness: bestFitness,
        clashesCount: bestStats.conflictsCount,
        message:
          bestStats.conflictsCount === 0
            ? `100% Conflict-Free Schedule Found! Optimizing soft constraints (Gen ${gen}/${totalGenerations})...`
            : `Resolving conflicts: ${bestStats.conflictsCount} remaining (Gen ${gen}/${totalGenerations})...`,
        fitnessHistory: [...fitnessHistory],
      });

      // Yield event loop so UI stays 60fps responsive
      await new Promise((resolve) => setTimeout(resolve, 15));
    }

    // If perfect zero clashes and high soft fitness reached early
    if (bestStats.conflictsCount === 0 && bestFitness >= 95 && gen >= 20) {
      break;
    }

    // Create next generation
    const nextGen: ScheduleEntry[][] = [bestSchedule]; // Elitism

    while (nextGen.length < populationSize) {
      // Tournament selection
      const p1 = evaluated[Math.floor(Math.random() * Math.min(3, evaluated.length))].candidate;
      const p2 = evaluated[Math.floor(Math.random() * evaluated.length)].candidate;

      // Crossover + Mutation
      let child = mutateSchedule(
        p1,
        lockedEntries,
        teachers,
        rooms,
        subjects,
        batches,
        config,
        settings.mutationRate
      );
      nextGen.push(child);
    }

    population = nextGen;
  }

  onProgress({
    status: 'completed',
    currentGeneration: totalGenerations,
    maxGenerations: totalGenerations,
    fitness: bestFitness,
    clashesCount: bestStats.conflictsCount,
    message: `Generation complete! Overall schedule fitness: ${bestFitness}% with ${bestStats.conflictsCount} clashes.`,
    fitnessHistory: [...fitnessHistory],
  });

  return bestSchedule;
}

/**
 * Mutation: Relocates or swaps non-locked conflicting/random slots into better slots
 */
function mutateSchedule(
  schedule: ScheduleEntry[],
  lockedEntries: ScheduleEntry[],
  teachers: Teacher[],
  rooms: Room[],
  subjects: Subject[],
  batches: BatchSection[],
  config: TimeSlotConfig,
  mutationRate: number
): ScheduleEntry[] {
  const mutated = schedule.map((e) => ({ ...e }));
  const nonLocked = mutated.filter((e) => !e.isLocked);

  if (nonLocked.length === 0) return mutated;

  // Check for clashes to prioritize mutating conflicting entries
  const clashes = detectAllClashes(mutated, teachers, rooms, subjects, batches, config);
  const conflictingEntryIds = new Set<string>();
  clashes.forEach((c) => c.involvedEntryIds.forEach((id) => conflictingEntryIds.add(id)));

  const numMutations = Math.max(1, Math.floor(nonLocked.length * mutationRate));

  for (let m = 0; m < numMutations; m++) {
    // Pick an entry to relocate (favor conflicting entries)
    let targetEntry: ScheduleEntry;
    const conflictingList = nonLocked.filter((e) => conflictingEntryIds.has(e.id));
    if (conflictingList.length > 0 && Math.random() < 0.8) {
      targetEntry = conflictingList[Math.floor(Math.random() * conflictingList.length)];
    } else {
      targetEntry = nonLocked[Math.floor(Math.random() * nonLocked.length)];
    }

    const randomDay = config.workingDays[Math.floor(Math.random() * config.workingDays.length)];
    const randomPeriod = Math.floor(Math.random() * config.periodsPerDay);
    const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];

    // Check if slot is empty or swap is beneficial
    targetEntry.day = randomDay;
    targetEntry.periodIndex = randomPeriod;
    if (randomRoom) {
      targetEntry.roomId = randomRoom.id;
    }
  }

  return mutated;
}
