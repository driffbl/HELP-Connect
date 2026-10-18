const test = require('node:test');
const assert = require('node:assert/strict');
const sessions = require('../../src/repositories/sessionRepository');
const notifications = require('../../src/repositories/notificationRepository');

/**
 * These tests cannot run SQL. They catch the mistakes that most often break a query before MySQL
 * even sees it: a different number of ? and values, an undefined value (mysql2 refuses those), or
 * values in the wrong order. scripts/smoke-usecase3.js is what proves the SQL itself.
 */
function recorder(...replies) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      return replies.length ? replies.shift() : [[], []];
    },
  };
}

function assertWellFormed(call) {
  const marks = (call.sql.match(/\?/g) || []).length;
  assert.equal(marks, call.params.length, `${marks} placeholders but ${call.params.length} values in: ${call.sql.replace(/\s+/g, ' ').trim()}`);
  call.params.forEach((p, i) => {
    assert.notEqual(p, undefined, `value ${i} is undefined`);
    assert.ok(!Number.isNaN(p), `value ${i} is NaN`);
  });
}

const row = {
  Session_id: 7, Student_user_id: 1, Student_name: 'Sam', Volunteer_user_id: 2, Volunteer_name: 'Vera',
  Title: 'Python Tutoring', Description: 'Help with loops and functions.', Category: 'Academic Support', Session_date: '2026-10-22', Session_time: '10:00',
  Support_mode: 'Virtual', Session_status: 'Pending', Proposed_by: 'student',
  Created_at: new Date('2026-10-20T01:00:00Z'), Feedback_id: null, Rating: null, Comments: null, Feedback_created_at: null,
};

test('toSession maps a row to the shape the Angular app uses', () => {
  assert.deepEqual(sessions.toSession(row), {
    id: 7, studentId: 1, studentName: 'Sam', volunteerId: 2, volunteerName: 'Vera',
    title: 'Python Tutoring', description: 'Help with loops and functions.', category: 'Academic Support', date: '2026-10-22', time: '10:00',
    mode: 'Virtual', status: 'Pending', proposedBy: 'student', requestId: null, requestStatus: null, createdAt: '2026-10-20T01:00:00.000Z', review: null,
  });
});

test('toSession gives a null description when the row has none', () => {
  assert.equal(sessions.toSession({ ...row, Description: null }).description, null);
  assert.equal(sessions.toSession({ ...row, Description: undefined }).description, null);
});

test('toSession includes the review when there is one, including a null comment', () => {
  const s = sessions.toSession({ ...row, Feedback_id: 3, Rating: 4, Comments: null, Feedback_created_at: new Date('2026-10-23T02:00:00Z') });
  assert.deepEqual(s.review, { id: 3, sessionId: 7, studentId: 1, volunteerId: 2, rating: 4, comment: null, createdAt: '2026-10-23T02:00:00.000Z' });
});

test('session queries are well formed', async () => {
  const conn = recorder([[row], []], [[row], []], [[row], []], [[row], []], [[row], []], [[], []]);
  assert.equal((await sessions.findById(conn, 7)).id, 7);
  assert.equal((await sessions.listForUser(conn, 1, 'student')).length, 1);
  await sessions.listForUser(conn, 1, 'volunteer');
  await sessions.listForUser(conn, 1, undefined);
  await sessions.findStalePending(conn, '2026-10-22 10:00:00');
  assert.equal(await sessions.findById(conn, 999), null);
  conn.calls.forEach(assertWellFormed);

  const byRole = conn.calls.slice(1, 4).map((c) => c.params.length);
  assert.deepEqual(byRole, [1, 1, 2]); // student, volunteer, either
  assert.match(conn.calls[1].sql, /s\.Student_user_id = \?/);
  assert.match(conn.calls[2].sql, /s\.Volunteer_user_id = \?/);
  assert.match(conn.calls[4].sql, /Session_status = 'Pending'/);
  assert.match(conn.calls[4].sql, /TIMESTAMP\(s\.Session_date, s\.Session_time\) <= \?/);
});

test('setStatus only changes a session that is still in the expected status', async () => {
  const conn = recorder([{ affectedRows: 1 }], [{ affectedRows: 0 }]);
  assert.equal(await sessions.setStatus(conn, 7, 'Pending', 'Scheduled', { clearProposer: true }), true);
  assert.equal(await sessions.setStatus(conn, 7, 'Pending', 'Cancelled'), false);
  conn.calls.forEach(assertWellFormed);
  assert.match(conn.calls[0].sql, /WHERE Session_id = \? AND Session_status = \?/);
  assert.deepEqual(conn.calls[0].params, ['Scheduled', 1, 7, 'Pending']);
  assert.deepEqual(conn.calls[1].params, ['Cancelled', 0, 7, 'Pending']);
});

test('inserts put the values in the column order', async () => {
  const conn = recorder([{ insertId: 11 }], [{ insertId: 12 }]);
  assert.equal(await sessions.insertSession(conn, { studentId: 1, volunteerId: 2, title: 'T', category: 'C', date: '2026-10-22', time: '10:00', mode: 'Virtual' }), 11);
  assert.equal(await sessions.insertFeedback(conn, { sessionId: 7, rating: 5, comment: null }), 12);
  conn.calls.forEach(assertWellFormed);
  assert.match(conn.calls[0].sql, /Student_user_id, Volunteer_user_id, Title, Category, Session_date, Session_time,\s+Support_mode/);
  assert.deepEqual(conn.calls[0].params, [1, 2, 'T', 'C', '2026-10-22', '10:00', 'Virtual']);
  assert.match(conn.calls[0].sql, /'Pending', 'student'/);
  assert.deepEqual(conn.calls[1].params, [7, 5, null]);
});

test('findUser and ratingSummary read what they return', async () => {
  const conn = recorder(
    [[{ User_id: 2, User_name: 'Vera', Account_status: 'Active' }], []],
    [[], []],
    [[{ Average: '4.5000', Total: 2 }], []],
    [[{ Average: null, Total: 0 }], []]
  );
  assert.deepEqual(await sessions.findUser(conn, 2), { id: 2, name: 'Vera', status: 'Active' });
  assert.equal(await sessions.findUser(conn, 99), null);
  assert.deepEqual(await sessions.ratingSummary(conn, 2), { average: 4.5, count: 2 });
  assert.deepEqual(await sessions.ratingSummary(conn, 3), { average: null, count: 0 });
  conn.calls.forEach(assertWellFormed);
});

test('notification queries are well formed', async () => {
  const n = { Notification_id: 1, Session_id: 7, Message: 'Hi', Notification_status: 'Unread', Created_at: new Date('2026-10-20T01:00:00Z') };
  const conn = recorder([{ insertId: 4 }], [[n], []], [[n], []], [[n], []], [[{ Total: 3 }], []], [{ affectedRows: 0 }], [[{ Notification_id: 1 }], []], [{ affectedRows: 2 }], [{ affectedRows: 0 }], [[], []]);
  assert.equal(await notifications.insert(conn, { userId: 1, sessionId: 7, message: 'Hi' }), 4);
  assert.deepEqual((await notifications.listForUser(conn, 1))[0], { id: 1, sessionId: 7, message: 'Hi', status: 'Unread', createdAt: '2026-10-20T01:00:00.000Z' });
  await notifications.listForUser(conn, 1, 1000);   // clamped
  await notifications.listForUser(conn, 1, 'junk'); // falls back
  assert.equal(await notifications.countUnread(conn, 1), 3);
  assert.equal(await notifications.markRead(conn, 1, 1), true);
  assert.equal(await notifications.markAllRead(conn, 1), 2);
  conn.calls.forEach(assertWellFormed);
  assert.equal(conn.calls[1].params[1], 50);
  assert.equal(conn.calls[2].params[1], 100);
  assert.equal(conn.calls[3].params[1], 50);
});

test('markRead says false for a notification that is missing or belongs to someone else', async () => {
  const conn = recorder([{ affectedRows: 0 }], [[], []]);
  assert.equal(await notifications.markRead(conn, 1, 999), false);
  assert.match(conn.calls[0].sql, /Notification_id = \? AND User_id = \?/);
});

test('request-link queries are well formed and the session row carries the request', async () => {
  const withRequest = { ...row, Request_id: 5, Request_status: 'Rejected' };
  assert.equal(sessions.toSession(withRequest).requestId, 5);
  assert.equal(sessions.toSession(withRequest).requestStatus, 'Rejected');

  const data = { requestId: 5, studentId: 1, volunteerId: 2, title: 'T', description: 'D', category: 'Academic Support', date: '2026-10-22', time: '10:00', mode: 'Virtual' };
  const conn = recorder([[withRequest], []], [{ insertId: 9 }], [{ affectedRows: 1 }], [{ affectedRows: 0 }], [{ affectedRows: 1 }]);
  assert.equal((await sessions.findByRequestId(conn, 5)).id, 7);
  assert.equal(await sessions.insertFromRequest(conn, data), 9);
  assert.equal(await sessions.reopenFromRequest(conn, 7, data), true);
  assert.equal(await sessions.reopenFromRequest(conn, 7, data), false);
  assert.equal(await sessions.syncRequestStatus(conn, 5, 'Accepted'), true);
  assert.equal(await sessions.syncRequestStatus(conn, null, 'Accepted'), false); // no query for a session without a request
  conn.calls.forEach(assertWellFormed);
  assert.equal(conn.calls.length, 5);
  assert.match(conn.calls[0].sql, /s\.Request_id = \?/);
  assert.match(conn.calls[2].sql, /Session_status IN \('Pending', 'Cancelled'\)/);
});

test('request table queries are well formed', async () => {
  const requests = require('../../src/repositories/requestRepository');
  const r = { Request_id: 5, Student_user_id: 1, Student_name: 'Sam', Volunteer_id: 10, Volunteer_user_id: 2, Category_name: 'Academic Support', Description: 'D', Preferred_date: '2026-10-22', Preferred_time: '10:00', Support_mode: 'Virtual', Request_status: 'Pending' };
  const conn = recorder([[r], []], [{ insertId: 6 }], [{ affectedRows: 1 }], [{ affectedRows: 1 }], [{ affectedRows: 1 }], [[], []]);
  assert.deepEqual(await requests.findRequest(conn, 5), { id: 5, studentId: 1, studentName: 'Sam', volunteerRecordId: 10, volunteerUserId: 2, category: 'Academic Support', description: 'D', date: '2026-10-22', timeText: '10:00', mode: 'Virtual', status: 'Pending' });
  assert.equal(await requests.insertRequest(conn, { userId: 1, volunteerId: undefined, categoryId: 1, description: 'D', preferredDate: '2026-10-22', preferredTime: '10:00', supportMode: 'Virtual' }), 6);
  assert.equal(await requests.setVolunteer(conn, 5, 10, { refreshTimestamp: true }), true);
  assert.equal(await requests.setStatus(conn, 5, 'Accepted'), true);
  assert.equal(await requests.updateCriteria(conn, 5, { categoryId: 1, description: 'D', preferredDate: '2026-10-22', preferredTime: '10:00', supportMode: 'Virtual' }), true);
  assert.equal(await requests.findRequest(conn, 999), null);
  conn.calls.forEach(assertWellFormed);
});
