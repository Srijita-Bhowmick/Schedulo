import assert from 'node:assert';
import { authenticator } from 'otplib';

const BASE_URL = 'http://localhost:5000';
const DEFAULT_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

async function runE2ETest() {
  console.log('====================================================');
  console.log(' RUNNING COMPREHENSIVE BACKEND E2E SECURITY & LOGIC TESTS ');
  console.log('====================================================\n');

  // --- 1. Health & Server Status ---
  console.log('=== 1. Health & Server Status ===');
  const healthRes = await fetch(`${BASE_URL}/api/health`).then((r) => r.json() as any);
  assert.strictEqual(healthRes.status, 'healthy', 'Server health must report healthy');
  console.log('✓ PASS: Server is healthy on port 5000');

  // --- 2. Multi-Department Data Verification & Join Code Redaction ---
  console.log('\n=== 2. Multi-Department Data Verification ===');
  const deptsRes = await fetch(`${BASE_URL}/api/departments`).then((r) => r.json() as any);
  assert.ok(deptsRes.collegeName, 'College branding must be present');
  assert.ok(deptsRes.departments.length >= 2, 'At least 2 departments must exist (CSE, ECE)');

  // Verify that facultyJoinCode is NOT exposed on public endpoint
  for (const dept of deptsRes.departments) {
    assert.strictEqual(dept.facultyJoinCode, undefined, `Public endpoint must NOT leak facultyJoinCode for ${dept.code}`);
  }
  console.log('✓ PASS: Public GET /api/departments properly stripped facultyJoinCode for all departments');

  // --- 3. Smart Role Join & Mandatory/Optional 2FA Verification ---
  console.log('\n=== 3. Smart Role Join & Mandatory/Optional 2FA Verification ===');

  // 3A: Teacher registration requires valid Faculty Join Code
  const invalidTeacherSignup = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `fake.teacher.${Date.now()}@schedulo.edu`,
      password: 'Teacher@1234',
      role: 'TEACHER',
      name: 'Fake Teacher',
      facultyJoinCode: 'INVALID-CODE-999',
    }),
  }).then((r) => r.json() as any);
  assert.ok(invalidTeacherSignup.error, 'Teacher registration with invalid join code must be rejected');
  console.log('✓ PASS: Teacher signup with invalid join code rejected');

  // 3B: Student registration with optional 2FA turned off
  const studentOptionalSignup = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `student.opt.${Date.now()}@schedulo.edu`,
      password: 'Student@1234',
      role: 'STUDENT',
      name: 'Direct Student',
      enable2fa: false,
    }),
  }).then((r) => r.json() as any);
  assert.ok(studentOptionalSignup.token, 'Student opting out of 2FA must receive full token directly');
  assert.strictEqual(studentOptionalSignup.requires2fa, false, 'Student opting out of 2FA must not require 2FA');
  console.log('✓ PASS: Student signup without 2FA issued direct JWT token');

  // 3C: Admin / HOD Login with Mandatory 2FA & Dev-TOTP Route Deletion Check
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@schedulo.edu', password: 'Admin@1234' }),
  }).then((r) => r.json() as any);
  assert.strictEqual(loginRes.requires2fa, true, 'Admin login must require 2FA');
  assert.ok(loginRes.pre2faToken, 'Admin login must issue pre2faToken');

  // Verify that GET /api/auth/dev-totp is completely removed (HTTP 404)
  const devTotpCheck = await fetch(`${BASE_URL}/api/auth/dev-totp/JBSWY3DPEHPK3PXP`);
  assert.strictEqual(devTotpCheck.status, 404, 'Dev TOTP endpoint must be completely removed and return 404');
  console.log('✓ PASS: Verified GET /api/auth/dev-totp endpoint is completely eliminated (404 Not Found)');

  // Generate TOTP locally in test runner using RFC-6238 algorithm
  const adminTotp = authenticator.generate(DEFAULT_TOTP_SECRET);
  const authRes = await fetch(`${BASE_URL}/api/auth/verify-login-totp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pre2faToken: loginRes.pre2faToken, totpCode: adminTotp }),
  }).then((r) => r.json() as any);
  assert.ok(authRes.token, 'Full JWT token must be issued on successful 2FA');
  assert.strictEqual(authRes.user.role, 'ADMIN', 'Authenticated user role must be ADMIN');
  const adminCseToken = authRes.token;
  console.log('✓ PASS: Admin 2FA verified successfully; full JWT issued for:', authRes.user.name);

  // 3D: Authenticated HOD-only Join Code Retrieval
  const joinCodeRes = await fetch(`${BASE_URL}/api/admin/department/join-code?departmentId=dept-cse`, {
    headers: { Authorization: `Bearer ${adminCseToken}` },
  }).then((r) => r.json() as any);
  assert.ok(joinCodeRes.facultyJoinCode, 'HOD must be able to retrieve own department join code');
  assert.strictEqual(joinCodeRes.code, 'CSE', 'Join code must belong to CSE');
  console.log('✓ PASS: Authenticated HOD successfully retrieved department join code:', joinCodeRes.facultyJoinCode);

  // Cross-department join code retrieval attempt by CSE HOD for ECE must be blocked (403)
  const crossJoinCodeCheck = await fetch(`${BASE_URL}/api/admin/department/join-code?departmentId=dept-ece`, {
    headers: { Authorization: `Bearer ${adminCseToken}` },
  });
  assert.strictEqual(crossJoinCodeCheck.status, 403, 'HOD cannot access join code of another department');
  console.log('✓ PASS: Cross-department join code access blocked with 403 Forbidden');

  // --- 4. Cross-Department Tenant Isolation & Security IDOR Verification ---
  console.log('\n=== 4. Security & RBAC Tenant Isolation Verification ===');

  // Login ECE HOD
  const eceLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hod.ece@schedulo.edu', password: 'HODece@1234' }),
  }).then((r) => r.json() as any);
  const eceTotp = authenticator.generate(DEFAULT_TOTP_SECRET);
  const eceAuth = await fetch(`${BASE_URL}/api/auth/verify-login-totp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pre2faToken: eceLogin.pre2faToken, totpCode: eceTotp }),
  }).then((r) => r.json() as any);
  const hodEceToken = eceAuth.token;

  // ECE HOD attempting to generate CSE schedule must return 403 Forbidden
  const crossDeptGenerate = await fetch(`${BASE_URL}/api/admin/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hodEceToken}` },
    body: JSON.stringify({ departmentId: 'dept-cse' }),
  });
  assert.strictEqual(crossDeptGenerate.status, 403, 'Cross-department schedule generation must be blocked with 403');
  console.log('✓ PASS: ECE HOD blocked from generating CSE timetable (403 Forbidden)');

  // ECE HOD attempting to publish CSE schedule must return 403 Forbidden
  const crossDeptPublish = await fetch(`${BASE_URL}/api/admin/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hodEceToken}` },
    body: JSON.stringify({ departmentId: 'dept-cse' }),
  });
  assert.strictEqual(crossDeptPublish.status, 403, 'Cross-department timetable publishing must be blocked with 403');
  console.log('✓ PASS: ECE HOD blocked from publishing CSE timetable (403 Forbidden)');

  // ECE HOD attempting to modify CSE Room must return 403 Forbidden
  const crossDeptRoomEdit = await fetch(`${BASE_URL}/api/entities/rooms/r-101`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hodEceToken}` },
    body: JSON.stringify({ name: 'Hacked CSE Room' }),
  });
  assert.strictEqual(crossDeptRoomEdit.status, 403, 'Cross-department room modification must be blocked with 403');
  console.log('✓ PASS: ECE HOD blocked from modifying CSE room (403 Forbidden)');

  // Teacher A (Dr. Roy) Login
  const tLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dr.roy@schedulo.edu', password: 'Teacher@1234' }),
  }).then((r) => r.json() as any);
  const tTotp = authenticator.generate(DEFAULT_TOTP_SECRET);
  const tAuth = await fetch(`${BASE_URL}/api/auth/verify-login-totp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pre2faToken: tLogin.pre2faToken, totpCode: tTotp }),
  }).then((r) => r.json() as any);
  const teacherRoyToken = tAuth.token;

  // Teacher Dr. Roy attempting to edit Teacher B (Prof. Sen - t-2) availability must return 403 Forbidden
  const crossTeacherAvailability = await fetch(`${BASE_URL}/api/teacher/availability/t-2`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherRoyToken}` },
    body: JSON.stringify({ unavailableSlots: [{ day: 'Monday', periodIndex: 1 }] }),
  });
  assert.strictEqual(crossTeacherAvailability.status, 403, 'Teacher cannot edit another teacher\'s availability');
  console.log('✓ PASS: Teacher A blocked from modifying Teacher B availability (403 Forbidden)');

  // Teacher Dr. Roy attempting to reschedule a class belonging to Teacher B must return 403 Forbidden
  const crossTeacherReschedule = await fetch(`${BASE_URL}/api/teacher/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherRoyToken}` },
    body: JSON.stringify({
      teacherId: 't-2', // Prof Sen
      targetRoom: 'Room 101',
      targetBatch: 'CSE-5A',
      day: 'Tuesday',
      periodIndex: 1,
    }),
  });
  assert.strictEqual(crossTeacherReschedule.status, 403, 'Teacher cannot reschedule another teacher\'s class');
  console.log('✓ PASS: Teacher A blocked from rescheduling Teacher B class (403 Forbidden)');

  // --- 5. Deterministic Solver & College Publication Check ---
  console.log('\n=== 5. Deterministic Solver & College Publication Check ===');
  const solveRes = await fetch(`${BASE_URL}/api/admin/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminCseToken}` },
    body: JSON.stringify({ departmentId: 'dept-cse' }),
  }).then((r) => r.json() as any);
  assert.strictEqual(solveRes.success, true, 'CSE timetable generation must succeed');
  console.log('✓ PASS: CSE timetable generated in:', `${solveRes.executionTimeMs}ms`);

  const publishRes = await fetch(`${BASE_URL}/api/admin/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminCseToken}` },
    body: JSON.stringify({ departmentId: 'dept-cse' }),
  }).then((r) => r.json() as any);
  assert.strictEqual(publishRes.success, true, 'Timetable publication must succeed');
  assert.ok(publishRes.recipients > 0, 'Recipients notified must be greater than zero');
  console.log('✓ PASS: Timetable published and recipients notified:', publishRes.recipients);

  // --- 6. Teacher Live Reschedule ("This Week Only") & Overlay Math ---
  console.log('\n=== 6. Teacher Live Reschedule (This Week Only) with Minute-Interval Math ===');

  // Check lunch break rejection
  const lunchReschedule = await fetch(`${BASE_URL}/api/teacher/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherRoyToken}` },
    body: JSON.stringify({
      targetRoom: 'Room 201',
      targetBatch: 'CSE-5A',
      day: 'Wednesday',
      periodIndex: 4, // 13:00-14:00 lunch
      commit: false,
    }),
  }).then((r) => r.json() as any);
  assert.strictEqual(lunchReschedule.valid, false, 'Slot overlapping lunch break must be rejected');
  console.log('✓ PASS: Reschedule into college lunch recess properly prevented');

  // Find a provably open slot dynamically from current schedule for Dr. Roy & Room 302
  const currentSchedule = await fetch(`${BASE_URL}/api/schedule`).then((r) => r.json() as any);
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  let openDay = 'Friday';
  let openPeriod = 2;
  let targetRoom = 'Room 302';

  for (const d of weekdays) {
    for (let p = 0; p < 6; p++) {
      if (p === 4) continue; // skip lunch
      const isTaken = currentSchedule.entries.some(
        (e: any) => e.day === d && e.periodIndex === p && (e.roomId === 'r-302' || e.teacherId === 't-1')
      );
      if (!isTaken) {
        openDay = d;
        openPeriod = p;
        break;
      }
    }
  }

  // Commit valid "This Week Only" reschedule
  const validReschedule = await fetch(`${BASE_URL}/api/teacher/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherRoyToken}` },
    body: JSON.stringify({
      targetRoom: targetRoom,
      targetBatch: 'CSE-5A',
      day: openDay,
      periodIndex: openPeriod,
      isThisWeekOnly: true,
      commit: true,
    }),
  }).then((r) => r.json() as any);
  assert.strictEqual(validReschedule.valid, true, `Valid reschedule slot must be approved: ${validReschedule.message}`);
  assert.strictEqual(validReschedule.committed, true, 'Reschedule must be committed');
  assert.ok(validReschedule.validForWeek, 'Valid for week must be provided');
  console.log(`✓ PASS: Committed "This Week Only" reschedule to ${openDay} period ${openPeriod} (${targetRoom}) for week:`, validReschedule.validForWeek);

  // Query GET /api/schedule to verify live override reflection
  const scheduleRes = await fetch(`${BASE_URL}/api/schedule`).then((r) => r.json() as any);
  assert.ok(scheduleRes.entries.length > 0, 'Schedule entries must be returned');
  const rescheduledEntry = scheduleRes.entries.find(
    (e: any) => e.isRescheduled === true && e.day === openDay && e.periodIndex === openPeriod
  );
  assert.ok(rescheduledEntry, `Active weekly override must be reflected in GET /api/schedule for ${openDay} period ${openPeriod}`);
  assert.strictEqual(rescheduledEntry.day, openDay, 'Overridden day must match reschedule target');
  console.log('✓ PASS: Live reschedule override reflected in GET /api/schedule query');

  // Check alert dispatched
  const alertsRes = await fetch(`${BASE_URL}/api/alerts?batchId=batch-1`).then((r) => r.json() as any);
  assert.ok(alertsRes.alerts.length > 0, 'Live alert must be dispatched to students');
  console.log('✓ PASS: Real-time alerts verified in dispatch log:', alertsRes.alerts[0].message);

  console.log('\n======================================================');
  console.log(' ALL 18 BACKEND TESTS & SECURITY ASSERTIONS PASSED (100%)');
  console.log('======================================================\n');
}

runE2ETest().catch((err) => {
  console.error('\n✕ E2E TEST RUNNER FAILED WITH ASSERTION ERROR:\n', err);
  process.exit(1);
});
