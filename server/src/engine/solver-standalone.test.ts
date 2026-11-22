import assert from 'node:assert';
import {
  BacktrackingSolver,
  SchedulingEngine,
  RoomData,
  TeacherData,
  BatchData,
  SubjectData,
  TimeSlotConfigData,
  DepartmentConfig,
  isMinuteOverlap,
} from './SchedulingEngine.js';

console.log('====================================================');
console.log(' RUNNING DETERMINISTIC CSP SOLVER UNIT TESTS ');
console.log('====================================================\n');

// ----------------------------------------------------
// Test Case 1: Standard CSE Curriculum with Exact Minute Intervals
// ----------------------------------------------------
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
  startTime: '09:00',
  periodDurationMinutes: 60,
};

console.log('[Test 1] Running solver for CSE + IT standard curriculum with exact minute intervals...');
const result1 = SchedulingEngine.solve(rooms, teachers, batches, subjects, config, []);

console.log(`Success: ${result1.success}`);
console.log(`Execution Time: ${result1.executionTimeMs}ms`);
console.log(`Total Scheduled Hours: ${result1.totalScheduledHours} / 28`);

assert.strictEqual(result1.success, true, `Test 1 failed with message: ${result1.message}`);
assert.strictEqual(result1.totalScheduledHours, 28, 'Total scheduled hours must equal 28');

// Check constraint guarantees:
let clashesDetected = 0;
for (let i = 0; i < result1.entries.length; i++) {
  const a = result1.entries[i];
  for (let j = i + 1; j < result1.entries.length; j++) {
    const b = result1.entries[j];
    if (a.day !== b.day) continue;

    const overlap = isMinuteOverlap(a.startMinute, a.endMinute, b.startMinute, b.endMinute);
    if (overlap) {
      if (a.teacherId === b.teacherId) {
        console.error(`Teacher minute collision: Teacher ${a.teacherId} on ${a.day} [${a.startMinute}-${a.endMinute}] vs [${b.startMinute}-${b.endMinute}]`);
        clashesDetected++;
      }
      if (a.roomId === b.roomId) {
        console.error(`Room minute collision: Room ${a.roomId} on ${a.day} [${a.startMinute}-${a.endMinute}] vs [${b.startMinute}-${b.endMinute}]`);
        clashesDetected++;
      }
      if (a.batchId === b.batchId) {
        console.error(`Batch minute collision: Batch ${a.batchId} on ${a.day} [${a.startMinute}-${a.endMinute}] vs [${b.startMinute}-${b.endMinute}]`);
        clashesDetected++;
      }
    }
  }

  // Check teacher unavailable slot
  const teacher = teachers.find((t) => t.id === a.teacherId);
  const isUnavailable = teacher?.unavailableSlots.some((u) => u.day === a.day && u.periodIndex === a.periodIndex);
  if (isUnavailable) {
    console.error(`Unavailable slot violation: Teacher ${teacher?.name} on ${a.day} period ${a.periodIndex}`);
    clashesDetected++;
  }
}

assert.strictEqual(clashesDetected, 0, 'Zero clashes must be detected in standard curriculum');
console.log('✓ PASS: Zero teacher clashes, zero room clashes, zero batch clashes, zero unavailable violations.');

// ----------------------------------------------------
// Test Case 2: Impossible constraints (bottleneck diagnostic test)
// ----------------------------------------------------
console.log('\n[Test 2] Testing mathematical bottleneck diagnostics for impossible schedule...');
const impossibleResult = SchedulingEngine.solve(
  [{ id: 'r1', roomNumber: '101', type: 'LECTURE_HALL', capacity: 10 }],
  [{ id: 't1', name: 'Dr. Overworked', shortCode: 'DO', maxHoursPerDay: 1, maxHoursPerWeek: 4, unavailableSlots: [] }],
  [{ id: 'b1', name: 'HugeBatch', department: 'CS', semester: 1, studentCount: 100, subjectIds: ['s1'] }],
  [{ id: 's1', code: 'CS999', name: 'HeavyCourse', type: 'THEORY', weeklyHours: 25, durationSlots: 1, assignedTeacherId: 't1' }],
  { workingDays: ['Monday', 'Tuesday'], periodsPerDay: 4 },
  []
);

assert.strictEqual(impossibleResult.success, false, 'Solver must fail for impossible constraints');
assert.ok((impossibleResult.diagnostics?.length || 0) > 0, 'Diagnostics must be provided for impossible constraints');
console.log('✓ PASS: Accurately returned human-readable bottleneck diagnostics.');

// ----------------------------------------------------
// Test Case 3: Dynamic Multi-Department Cross-Schedule Collision Prevention
// CSE (09:00 start, 60m) vs ECE (09:30 start, 50m) with Shared Professor & Shared Hall
// ----------------------------------------------------
console.log('\n[Test 3] Testing dynamic multi-department collision math (CSE 09:00 vs ECE 09:30)...');

const cseDept: DepartmentConfig = {
  id: 'dept-cse',
  name: 'Computer Science & Engineering',
  code: 'CSE',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  dayStartTime: '09:00',
  periodDurationMins: 60,
  periodsPerDay: 6,
};

const eceDept: DepartmentConfig = {
  id: 'dept-ece',
  name: 'Electronics & Communication Engineering',
  code: 'ECE',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayStartTime: '09:30',
  periodDurationMins: 50,
  periodsPerDay: 6,
};

const sharedHall: RoomData = { id: 'r-shared-201', roomNumber: 'Room 201 Audi', type: 'LECTURE_HALL', capacity: 100, isShared: true };
const cseHall: RoomData = { id: 'r-cse-101', roomNumber: 'Room 101', type: 'LECTURE_HALL', capacity: 70, departmentId: 'dept-cse' };
const eceHall: RoomData = { id: 'r-ece-301', roomNumber: 'Room 301', type: 'LECTURE_HALL', capacity: 65, departmentId: 'dept-ece' };

const sharedProfessor: TeacherData = {
  id: 't-shared-roy',
  name: 'Dr. Debabrata Roy',
  shortCode: 'DR',
  maxHoursPerDay: 4,
  maxHoursPerWeek: 16,
  unavailableSlots: [],
};

const cseTeacher: TeacherData = {
  id: 't-cse-sen',
  name: 'Prof. Ananya Sen',
  shortCode: 'AS',
  maxHoursPerDay: 4,
  maxHoursPerWeek: 16,
  unavailableSlots: [],
};

const eceTeacher: TeacherData = {
  id: 't-ece-banerjee',
  name: 'Dr. Priya Banerjee',
  shortCode: 'PB',
  maxHoursPerDay: 4,
  maxHoursPerWeek: 16,
  unavailableSlots: [],
};

const cseBatch: BatchData = {
  id: 'b-cse-5a',
  name: 'CSE • Sem 5 • Sec A',
  department: 'CSE',
  departmentId: 'dept-cse',
  semester: 5,
  studentCount: 60,
  subjectIds: ['sub-cse-1', 'sub-cse-2'],
};

const eceBatch: BatchData = {
  id: 'b-ece-5a',
  name: 'ECE • Sem 5 • Sec A',
  department: 'ECE',
  departmentId: 'dept-ece',
  semester: 5,
  studentCount: 55,
  subjectIds: ['sub-ece-1', 'sub-ece-2'],
};

const cseSubjects: SubjectData[] = [
  { id: 'sub-cse-1', code: 'CS501', name: 'Operating Systems', type: 'THEORY', weeklyHours: 3, durationSlots: 1, assignedTeacherId: 't-shared-roy' },
  { id: 'sub-cse-2', code: 'CS502', name: 'DBMS', type: 'THEORY', weeklyHours: 3, durationSlots: 1, assignedTeacherId: 't-cse-sen' },
];

const eceSubjects: SubjectData[] = [
  { id: 'sub-ece-1', code: 'EC501', name: 'Digital Signal Processing', type: 'THEORY', weeklyHours: 3, durationSlots: 1, assignedTeacherId: 't-shared-roy' },
  { id: 'sub-ece-2', code: 'EC502', name: 'Microprocessors', type: 'THEORY', weeklyHours: 3, durationSlots: 1, assignedTeacherId: 't-ece-banerjee' },
];

// 1. Solve and publish CSE department first
const cseResult = BacktrackingSolver.solveDepartment(
  cseDept,
  [sharedHall, cseHall],
  [sharedProfessor, cseTeacher],
  [cseBatch],
  cseSubjects,
  []
);

assert.strictEqual(cseResult.success, true, 'CSE solve must succeed');

// Mark CSE entries as published/locked
const cseLockedEntries = cseResult.entries.map((e) => ({ ...e, isLocked: true }));

// 2. Solve ECE department while routing around CSE's locked shared professor and shared room intervals
const eceResult = BacktrackingSolver.solveDepartment(
  eceDept,
  [sharedHall, eceHall],
  [sharedProfessor, eceTeacher],
  [eceBatch],
  eceSubjects,
  cseLockedEntries
);

assert.strictEqual(eceResult.success, true, 'ECE solve must succeed around locked CSE entries');

// 3. Verify ZERO minute-overlap across departments for the shared professor and shared room
let crossDepartmentClashes = 0;
for (const cseEntry of cseLockedEntries) {
  for (const eceEntry of eceResult.entries) {
    if (cseEntry.day !== eceEntry.day) continue;

    const overlap = isMinuteOverlap(
      cseEntry.startMinute,
      cseEntry.endMinute,
      eceEntry.startMinute,
      eceEntry.endMinute
    );

    if (overlap) {
      if (cseEntry.teacherId === eceEntry.teacherId) {
        console.error(
          `✕ Cross-Department Shared Professor Overlap! Dr. Roy double-booked on ${cseEntry.day}: CSE [${cseEntry.startMinute}-${cseEntry.endMinute}] vs ECE [${eceEntry.startMinute}-${eceEntry.endMinute}]`
        );
        crossDepartmentClashes++;
      }
      if (cseEntry.roomId === eceEntry.roomId) {
        console.error(
          `✕ Cross-Department Shared Room Overlap! Room 201 double-booked on ${cseEntry.day}: CSE [${cseEntry.startMinute}-${cseEntry.endMinute}] vs ECE [${eceEntry.startMinute}-${eceEntry.endMinute}]`
        );
        crossDepartmentClashes++;
      }
    }
  }
}

assert.strictEqual(crossDepartmentClashes, 0, 'Cross-department minute clashes must be 0');
console.log('✓ PASS: Cross-department minute-overlap prevention guaranteed 100% (Dr. Roy & Room 201 clash-free).');

// ----------------------------------------------------
// Test Case 4: 2-Hour Continuous Theory Block Collision Prevention
// ----------------------------------------------------
console.log('\n[Test 4] Testing 2-hour continuous theory block collision math...');
const blockDept: DepartmentConfig = {
  id: 'dept-cse',
  name: 'Computer Science',
  code: 'CSE',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  dayStartTime: '09:00',
  periodDurationMins: 60,
  periodsPerDay: 6,
};

const blockBatch: BatchData = {
  id: 'b-block',
  name: 'CSE-Block-Batch',
  department: 'CSE',
  departmentId: 'dept-cse',
  semester: 5,
  studentCount: 40,
  subjectIds: ['sub-2hr-block', 'sub-1hr-single'],
};

const blockSubjects: SubjectData[] = [
  {
    id: 'sub-2hr-block',
    code: 'CS505',
    name: 'Advanced Systems (Double Block)',
    type: 'THEORY',
    weeklyHours: 3,
    durationSlots: 1,
    assignedTeacherId: 't-shared-roy',
    allowTwoHourBlock: true,
  },
  {
    id: 'sub-1hr-single',
    code: 'CS506',
    name: 'Single Slot Subject',
    type: 'THEORY',
    weeklyHours: 2,
    durationSlots: 1,
    assignedTeacherId: 't-cse-sen',
  },
];

const blockResult = BacktrackingSolver.solveDepartment(
  blockDept,
  [cseHall],
  [sharedProfessor, cseTeacher],
  [blockBatch],
  blockSubjects,
  []
);

assert.strictEqual(blockResult.success, true, 'Block solve must succeed');

// Verify that the 2-hour unit actually spans 120 minutes
const twoHourEntry = blockResult.entries.find((e) => e.subjectId === 'sub-2hr-block' && e.durationSlots === 2);
assert.ok(twoHourEntry, 'A 2-hour block entry must be scheduled');
assert.strictEqual(twoHourEntry.endMinute - twoHourEntry.startMinute, 120, '2-hour block must span exactly 120 minutes');

// Verify no entry on that day collides with the 2-hour block in hour 1 OR hour 2
for (const entry of blockResult.entries) {
  if (entry.id === twoHourEntry.id || entry.day !== twoHourEntry.day) continue;
  const collision = isMinuteOverlap(
    twoHourEntry.startMinute,
    twoHourEntry.endMinute,
    entry.startMinute,
    entry.endMinute
  );
  assert.strictEqual(collision, false, `No class should collide with 2-hour block interval [${twoHourEntry.startMinute}-${twoHourEntry.endMinute}]`);
}
console.log('✓ PASS: 2-Hour block spans 120 minutes and prevents collisions across its entire time span.');

// ----------------------------------------------------
// Test Case 5: Pigeonhole Principle Bottleneck Diagnostic
// ----------------------------------------------------
console.log('\n[Test 5] Testing Pigeonhole Principle diagnostic check (6 hrs across 5 days without 2-hr block)...');
const pigeonholeSubject: SubjectData = {
  id: 'sub-pigeon',
  code: 'CS-PIGEON',
  name: 'Impossible Single Hour Distribution',
  type: 'THEORY',
  weeklyHours: 6, // 6 hours across 5 days!
  durationSlots: 1,
  assignedTeacherId: 't-shared-roy',
  allowTwoHourBlock: false,
};

const pigeonholeResult = BacktrackingSolver.solveDepartment(
  blockDept, // 5 working days
  [cseHall],
  [sharedProfessor],
  [{ id: 'b-pigeon', name: 'Pigeon Batch', department: 'CSE', semester: 3, studentCount: 30, subjectIds: ['sub-pigeon'] }],
  [pigeonholeSubject],
  []
);

assert.strictEqual(pigeonholeResult.success, false, 'Solver must reject schedule violating pigeonhole principle');
const hasPigeonholeDiagnostic = (pigeonholeResult.diagnostics || []).some((d) => d.includes('Subject Pigeonhole Bottleneck'));
assert.strictEqual(hasPigeonholeDiagnostic, true, 'Diagnostic message must mention Subject Pigeonhole Bottleneck');
console.log('✓ PASS: Accurately caught Pigeonhole constraint violation and returned diagnostic.');

console.log('\n====================================================');
console.log(' ALL 5 CSP SOLVER UNIT TESTS PASSED WITH 100% STRICT ASSERTIONS ');
console.log('====================================================');
