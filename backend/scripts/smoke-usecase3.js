/**
 * End-to-end check of Use Case 3 against the REAL server and the REAL MySQL database.
 *
 *   1. Run database/schema.sql, usecase3_schema.sql and usecase3_seed.sql in MySQL.
 *   2. In one terminal:  cd backend && npm run dev
 *   3. In another:       cd backend && node scripts/smoke-usecase3.js
 *
 * It signs tokens for three seeded test users, walks a session through its whole life, checks every
 * rule, then deletes the sessions it created. It touches no other user's data.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('../src/config/db');

const BASE = `http://localhost:${process.env.PORT || 5000}`;
const EMAILS = {
  student: 'student.test@helplive.edu.my',
  volunteer: 'volunteer.test@helplive.edu.my',
  outsider: 'outsider.test@helplive.edu.my',
};

let passed = 0;
let failed = 0;
function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? `   (${detail})` : ''}`);
  }
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body: json };
}

const pad = (n) => String(n).padStart(2, '0');
const dayOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

async function main() {
  // ------------------------------------------------------------ preparation
  try {
    const health = await fetch(`${BASE}/api/health`);
    if (!health.ok) throw new Error(`status ${health.status}`);
  } catch (err) {
    console.error(`Cannot reach the backend at ${BASE}. Start it first with:  npm run dev   (${err.message})`);
    process.exit(2);
  }

  const [tables] = await db.query("SHOW TABLES LIKE 'Support_session'");
  if (tables.length === 0) {
    console.error('The Support_session table is missing. Run database/usecase3_schema.sql first.');
    process.exit(2);
  }

  const people = {};
  for (const [key, email] of Object.entries(EMAILS)) {
    const [rows] = await db.query('SELECT User_id, Email FROM User WHERE Email = ?', [email]);
    if (rows.length === 0) {
      console.error(`Test user ${email} is missing. Run database/usecase3_seed.sql first.`);
      process.exit(2);
    }
    people[key] = {
      id: rows[0].User_id,
      token: jwt.sign({ User_id: rows[0].User_id, Email: email }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '10m' }),
    };
  }
  const { student, volunteer, outsider } = people;

  // start from a clean slate for these test users only
  await db.query('DELETE FROM Support_session WHERE Student_user_id IN (?, ?, ?) AND Volunteer_user_id IN (?, ?, ?)',
    [student.id, volunteer.id, outsider.id, student.id, volunteer.id, outsider.id]);

  const created = [];
  const day = dayOffset(30);
  const make = async (time, token = student.token, extra = {}) => {
    const r = await api('POST', '/sessions', token, { volunteerId: volunteer.id, title: 'Smoke test session', category: 'Academic Support', date: day, time, mode: 'Virtual', ...extra });
    if (r.body && r.body.session) created.push(r.body.session.id);
    return r;
  };

  try {
    // ---------------------------------------------------------- 1. login and validation
    console.log('\n1. Login and validation');
    check('no token is refused (401)', (await api('GET', '/sessions')).status === 401);
    check('a bad token is refused (401)', (await api('GET', '/sessions', 'nonsense')).status === 401);
    check('a date in the past is refused (400)', (await make('10:00', student.token, { date: dayOffset(-1) })).status === 400);
    check('a missing title is refused (400)', (await make('10:00', student.token, { title: '' })).status === 400);
    check('requesting yourself is refused (400)', (await make('10:00', volunteer.token)).status === 400);

    // ---------------------------------------------------------- 2. creating and double booking
    console.log('\n2. Creating a request and double booking');
    const first = await make('10:00');
    check('a request is created (201)', first.status === 201, JSON.stringify(first.body));
    const id = first.body.session.id;
    check('it starts Pending, proposed by the student', first.body.session.status === 'Pending' && first.body.session.proposedBy === 'student');
    check('names come from the User table', first.body.session.studentName === 'Test Student' && first.body.session.volunteerName === 'Test Volunteer');
    check('date and time are plain strings', first.body.session.date === day && first.body.session.time === '10:00', `${first.body.session.date} ${first.body.session.time}`);
    check('the same slot cannot be booked twice (409)', (await make('10:00')).status === 409);
    check('a different time is fine (201)', (await make('11:00')).status === 201);
    check('the volunteer sees it in their list', (await api('GET', '/sessions?role=volunteer', volunteer.token)).body.sessions.some((s) => s.id === id));
    check('the student does not see it as a volunteer', !(await api('GET', '/sessions?role=volunteer', student.token)).body.sessions.some((s) => s.id === id));
    check('an outsider gets 404', (await api('GET', `/sessions/${id}`, outsider.token)).status === 404);
    check('an unknown role filter is refused (400)', (await api('GET', '/sessions?role=admin', student.token)).status === 400);

    // ---------------------------------------------------------- 3. accept, complete, rules
    console.log('\n3. Who may do what');
    check('the volunteer cannot cancel a Pending request (403)', (await api('PATCH', `/sessions/${id}/cancel`, volunteer.token)).status === 403);
    check('the student cannot accept their own request (403)', (await api('PATCH', `/sessions/${id}/confirm`, student.token)).status === 403);
    const accepted = await api('PATCH', `/sessions/${id}/confirm`, volunteer.token);
    check('the volunteer accepts: Scheduled', accepted.status === 200 && accepted.body.session.status === 'Scheduled' && accepted.body.session.proposedBy === null, JSON.stringify(accepted.body));
    check('accepting again is refused (409)', (await api('PATCH', `/sessions/${id}/confirm`, volunteer.token)).status === 409);
    check('completing before the start is refused (409)', (await api('PATCH', `/sessions/${id}/complete`, volunteer.token)).status === 409);
    check('the student cannot complete (403)', (await api('PATCH', `/sessions/${id}/complete`, student.token)).status === 403);
    check('feedback before completion is refused (409)', (await api('POST', `/sessions/${id}/feedback`, student.token, { rating: 5 })).status === 409);

    // pretend the session day has arrived: move it to yesterday
    await db.query('UPDATE Support_session SET Session_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE Session_id = ?', [id]);
    const done = await api('PATCH', `/sessions/${id}/complete`, volunteer.token);
    check('once started, the volunteer completes it', done.status === 200 && done.body.session.status === 'Completed', JSON.stringify(done.body));
    check('a Completed session cannot be cancelled (409)', (await api('PATCH', `/sessions/${id}/cancel`, student.token)).status === 409);

    // ---------------------------------------------------------- 4. feedback
    console.log('\n4. Feedback');
    check('feedback without a rating is refused (400)', (await api('POST', `/sessions/${id}/feedback`, student.token, { comment: 'hi' })).status === 400);
    check('a rating of 6 is refused (400)', (await api('POST', `/sessions/${id}/feedback`, student.token, { rating: 6 })).status === 400);
    check('the volunteer cannot review (403)', (await api('POST', `/sessions/${id}/feedback`, volunteer.token, { rating: 5 })).status === 403);
    const fb = await api('POST', `/sessions/${id}/feedback`, student.token, { rating: 5, comment: '  Great session  ' });
    check('the student leaves feedback (201)', fb.status === 201 && fb.body.session.review.rating === 5 && fb.body.session.review.comment === 'Great session', JSON.stringify(fb.body));
    check('a second review is refused (409)', (await api('POST', `/sessions/${id}/feedback`, student.token, { rating: 1 })).status === 409);
    const summary = await api('GET', '/feedback/summary', volunteer.token);
    check('the volunteer average is 5 from 1 review', summary.status === 200 && summary.body.summary.average === 5 && summary.body.summary.count === 1, JSON.stringify(summary.body));
    check('a student has no average', (await api('GET', '/feedback/summary', student.token)).body.summary.average === null);

    // ---------------------------------------------------------- 5. notifications
    console.log('\n5. Notifications');
    const studentNotes = await api('GET', '/notifications', student.token);
    const volunteerNotes = await api('GET', '/notifications', volunteer.token);
    const text = (r) => r.body.notifications.map((n) => n.message).join(' | ');
    check('the student heard about the acceptance and completion', /accepted/.test(text(studentNotes)) && /completed/.test(text(studentNotes)), text(studentNotes));
    check('the volunteer heard about the request and the review', /requested/.test(text(volunteerNotes)) && /5-star review/.test(text(volunteerNotes)), text(volunteerNotes));
    check('unread count is reported', studentNotes.body.unread >= 2, `unread=${studentNotes.body.unread}`);
    const firstNote = studentNotes.body.notifications[0];
    check('someone else cannot mark my notification read (404)', (await api('PATCH', `/notifications/${firstNote.id}/read`, volunteer.token)).status === 404);
    check('I can mark my own read', (await api('PATCH', `/notifications/${firstNote.id}/read`, student.token)).status === 200);
    const after = await api('GET', '/notifications', student.token);
    check('the unread count went down by one', after.body.unread === studentNotes.body.unread - 1);
    check('mark all read works', (await api('PATCH', '/notifications/read-all', student.token)).status === 200 && (await api('GET', '/notifications', student.token)).body.unread === 0);

    // ---------------------------------------------------------- 6. cancel, decline, slot freed
    console.log('\n6. Cancel, decline and freeing the slot');
    const second = await make('14:00');
    check('a second request is created', second.status === 201);
    const sid = second.body.session.id;
    const cancelled = await api('PATCH', `/sessions/${sid}/cancel`, student.token);
    check('the student cancels their Pending request', cancelled.status === 200 && cancelled.body.session.status === 'Cancelled');
    check('the volunteer is told it was withdrawn', /withdrew/.test((await api('GET', '/notifications', volunteer.token)).body.notifications.map((n) => n.message).join(' | ')));
    const again = await make('14:00');
    check('the freed slot can be booked again', again.status === 201, JSON.stringify(again.body));
    const declined = await api('PATCH', `/sessions/${again.body.session.id}/decline`, volunteer.token);
    check('the volunteer declines: Cancelled', declined.status === 200 && declined.body.session.status === 'Cancelled');
    check('the student is told it was declined', /declined/.test((await api('GET', '/notifications', student.token)).body.notifications.map((n) => n.message).join(' | ')));

    const third = await make('15:00');
    await api('PATCH', `/sessions/${third.body.session.id}/confirm`, volunteer.token);
    const cancelScheduled = await api('PATCH', `/sessions/${third.body.session.id}/cancel`, volunteer.token);
    check('the volunteer can cancel a Scheduled session', cancelScheduled.status === 200 && cancelScheduled.body.session.status === 'Cancelled');

    // ---------------------------------------------------------- 7. expiry
    console.log('\n7. An unanswered request expires');
    const stale = await make('16:00');
    await db.query('UPDATE Support_session SET Session_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE Session_id = ?', [stale.body.session.id]);
    const listed = await api('GET', '/sessions?role=student', student.token);
    const row = listed.body.sessions.find((s) => s.id === stale.body.session.id);
    check('it now shows as Cancelled', row && row.status === 'Cancelled', row ? row.status : 'missing');
    check('the student was told it expired', /expired/.test((await api('GET', '/notifications', student.token)).body.notifications.map((n) => n.message).join(' | ')));
    check('it cannot be accepted any more (409)', (await api('PATCH', `/sessions/${stale.body.session.id}/confirm`, volunteer.token)).status === 409);
  } finally {
    // ---------------------------------------------------------- cleanup
    if (created.length > 0) {
      await db.query('DELETE FROM Support_session WHERE Session_id IN (?)', [created]);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  return failed === 0 ? 0 : 1;
}

main()
  .then(async (code) => { await db.end(); process.exit(code); })
  .catch(async (err) => { console.error('\nThe smoke test crashed:', err); try { await db.end(); } catch { /* ignore */ } process.exit(1); });
