import { SchedulingEngine, RoomData, TeacherData, BatchData, SubjectData, TimeSlotConfigData } from './SchedulingEngine.js';

console.log('====================================================');
console.log(' RUNNING DETERMINISTIC CSP SOLVER UNIT TESTS ');
console.log('====================================================\n');

// Test Case 1: Standard CSE Curriculum (4 Theory Rooms, 4 Teachers, 2 Batches, 8 Subjects)
const rooms: RoomData[] = [
  { id: 'r1', roomNumber: 'Room 101', type: 'LECTURE_HALL', capacity: 70 },
  { id: 'r2', roomNumber: 'Room 102', type: 'LECTURE_HALL', capacity: 70 },
  { id: 'r3', roomNumber: 'Room 201', type: 'LECTURE_HALL', capacity: 65 },
  { id: 'r4', roomNumber: 'Room 202', type: 'LECTURE_HALL', capacity: 65 },
];

const teachers: TeacherData[] = [
  {
    id: 't1',
    name: 'Dr. Debabrata Roy',
    shortCode: 'DR',
    maxHoursPerDay: 4,
    maxHoursPerWeek: 16,
    unavailableSlots: [{ day: 'Monday', periodIndex: 0 }, { day: 'Friday', periodIndex: 5 }],
  },
  {
    id: 't2',
    name: 'Prof. Ananya Sen',
    shortCode: 'AS',
    maxHoursPerDay: 4,
    maxHoursPerWeek: 16,
    unavailableSlots: [{ day: 'Wednesday', periodIndex: 4 }, { day: 'Wednesday', periodIndex: 5 }],
  },
  {
    id: 't3',
    name: 'Dr. Subhashish Mukherjee',
    shortCode: 'SM',
    maxHoursPerDay: 4,
    maxHoursPerWeek: 16,
    unavailableSlots: [{ day: 'Tuesday', periodIndex: 0 }],
  },
  {
    id: 't4',
    name: 'Dr. Priya Banerjee',
    shortCode: 'PB',
    maxHoursPerDay: 4,
    maxHoursPerWeek: 16,
    unavailableSlots: [{ day: 'Thursday', periodIndex: 0 }],
  },
];

const batches: BatchData[] = [
  { id: 'b1', name: 'CSE-5A', department: 'CSE', semester: 5, studentCount: 60, subjectIds: ['s1', 's2', 's3', 's4'] },
  { id: 'b2', name: 'IT-5A', department: 'IT', semester: 5, studentCount: 55, subjectIds: ['s5', 's6', 's7', 's8'] },
];

const subjects: SubjectData[] = [
  // CSE-5A
  { id: 's1', code: 'CS501', name: 'Operating Systems', type: 'THEORY', weeklyHours: 4, durationSlots: 1, assignedTeacherId: 't1' },
  { id: 's2', code: 'CS502', name: 'Database Management Systems', type: 'THEORY', weeklyHours: 4, durationSlots: 1, assignedTeacherId: 't2' },
  { id: 's3', code: 'CS503', name: 'Computer Networks', type: 'THEORY', weeklyHours: 3, durationSlots: 1, assignedTeacherId: 't3' },
  { id: 's4', code: 'CS504', name: 'Software Engineering', type: 'THEORY', weeklyHours: 3, durationSlots: 1, assignedTeacherId: 't4' },
  // IT-5A
  { id: 's5', code: 'IT501', name: 'Web Technologies', type: 'THEORY', weeklyHours: 4, durationSlots: 1, assignedTeacherId: 't3' },
  { id: 's6', code: 'IT502', name: 'Cloud Computing', type: 'THEORY', weeklyHours: 4, durationSlots: 1, assignedTeacherId: 't4' },
  { id: 's7', code: 'IT503', name: 'Object Oriented Programming', type: 'THEORY', weeklyHours: 3, durationSlots: 1, assignedTeacherId: 't1' },
  { id: 's8', code: 'IT504', name: 'Information Security', type: 'THEORY', weeklyHours: 3, durationSlots: 1, assignedTeacherId: 't2' },
];

const config: TimeSlotConfigData = {
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  periodsPerDay: 6,
};

console.log('[Test 1] Running solver for CSE + IT standard curriculum...');
const result1 = SchedulingEngine.solve(rooms, teachers, batches, subjects, config, []);

console.log(`Success: ${result1.success}`);
console.log(`Execution Time: ${result1.executionTimeMs}ms`);
console.log(`Total Scheduled Hours: ${result1.totalScheduledHours} / 28`);

if (!result1.success) {
  console.error('FAILED Test 1:', result1.message);
  process.exit(1);
}

// Check constraint guarantees:
const teacherSlotKeys = new Set<string>();
const roomSlotKeys = new Set<string>();
const batchSlotKeys = new Set<string>();
let clashesDetected = 0;

for (const entry of result1.entries) {
  const tKey = `${entry.teacherId}_${entry.day}_${entry.periodIndex}`;
  const rKey = `${entry.roomId}_${entry.day}_${entry.periodIndex}`;
  const bKey = `${entry.batchId}_${entry.day}_${entry.periodIndex}`;

  if (teacherSlotKeys.has(tKey)) {
    console.error(`Teacher clash detected: ${tKey}`);
    clashesDetected++;
  }
  if (roomSlotKeys.has(rKey)) {
    console.error(`Room clash detected: ${rKey}`);
    clashesDetected++;
  }
  if (batchSlotKeys.has(bKey)) {
    console.error(`Batch clash detected: ${bKey}`);
    clashesDetected++;
  }

  teacherSlotKeys.add(tKey);
  roomSlotKeys.add(rKey);
  batchSlotKeys.add(bKey);

  // Check teacher unavailable slot violation
  const teacher = teachers.find((t) => t.id === entry.teacherId);
  const isUnavailable = teacher?.unavailableSlots.some(
    (u) => u.day === entry.day && u.periodIndex === entry.periodIndex
  );
  if (isUnavailable) {
    console.error(`Violation: Teacher ${teacher?.name} scheduled in unavailable slot ${entry.day} period ${entry.periodIndex}`);
    clashesDetected++;
  }
}

if (clashesDetected === 0) {
  console.log('✓ PASS: Zero teacher clashes, zero room clashes, zero batch clashes, zero unavailable violations.');
} else {
  console.error(`✕ FAIL: ${clashesDetected} clashes detected!`);
  process.exit(1);
}

// Test Case 2: Impossible constraints (bottleneck diagnostic test)
console.log('\n[Test 2] Testing mathematical bottleneck diagnostics for impossible schedule...');
const impossibleResult = SchedulingEngine.solve(
  [{ id: 'r1', roomNumber: '101', type: 'LECTURE_HALL', capacity: 10 }],
  [{ id: 't1', name: 'Dr. Overworked', shortCode: 'DO', maxHoursPerDay: 1, maxHoursPerWeek: 4, unavailableSlots: [] }],
  [{ id: 'b1', name: 'HugeBatch', department: 'CS', semester: 1, studentCount: 100, subjectIds: ['s1'] }],
  [{ id: 's1', code: 'CS999', name: 'HeavyCourse', type: 'THEORY', weeklyHours: 25, durationSlots: 1, assignedTeacherId: 't1' }],
  { workingDays: ['Monday', 'Tuesday'], periodsPerDay: 4 },
  []
);

console.log(`Success (expected false): ${impossibleResult.success}`);
console.log('Diagnostic Bottleneck Messages:');
impossibleResult.diagnostics?.forEach((d) => console.log('  •', d));

if (!impossibleResult.success && (impossibleResult.diagnostics?.length || 0) > 0) {
  console.log('✓ PASS: Accurately returned human-readable bottleneck diagnostics.');
} else {
  console.error('✕ FAIL: Diagnostics not returned for mathematically impossible constraints.');
  process.exit(1);
}

console.log('\n====================================================');
console.log(' ALL CSP SOLVER UNIT TESTS PASSED CLEANLY (100%) ');
console.log('====================================================\n');
