const test = require('node:test');
const assert = require('node:assert/strict');
const { createSessionService } = require('../../src/services/sessionService');
const { HttpError } = require('../../src/utils/httpError');
const { createFakeDb } = require('./helpers/fakeDb');

const STUDENT = 1;
const VOLUNTEER = 2;
const OTHER_STUDENT = 3;
const SUSPENDED = 4;
const OUTSIDER = 5;

/** A fresh world: clock at Tue 20 Oct 2026 09:00, five users. */
function setup() {
  const db = createFakeDb('2026-10-20T09:00:00');
  db.addUser(STUDENT, 'Sam Student');
  db.addUser(VOLUNTEER, 'Vera Volunteer');
  db.addUser(OTHER_STUDENT, 'Tom Student');
  db.addUser(SUSPENDED, 'Sue Suspended', 'Suspended');
  db.addUser(OUTSIDER, 'Olly Outsider');
  const svc = createSessionService({ sessions: db.sessions, notifications: db.notifications, tx: db.tx, now: db.now });
  return { db, svc };
}

const request = (o = {}) => ({ volunteerId: VOLUNTEER, title: 'Python Tutoring', category: 'Academic Support', date: '2026-10-22', time: '10:00', mode: 'Virtual', ...o });
const fails = (promise, status, re) =>
  assert.rejects(promise, (e) => e instanceof HttpError && e.status === status && (re ? re.test(e.message) : true));

/** A session already Scheduled for 22 Oct 10:00. */
async function scheduled(ctx) {
  const s = await ctx.svc.createSession(STUDENT, request());
  await ctx.svc.confirmSession(VOLUNTEER, s.id);
  return s.id;
}

/** A Scheduled session whose start time has passed (clock moved to 22 Oct 10:30). */
async function started(ctx) {
  const id = await scheduled(ctx);
  ctx.db.setNow('2026-10-22T10:30:00');
  return id;
}

/** A Completed session. */
async function completed(ctx) {
  const id = await started(ctx);
  await ctx.svc.completeSession(VOLUNTEER, id);
  return id;
}

// ---------------------------------------------------------------- creating
test('creating a request makes a Pending session proposed by the student and tells the volunteer', async () => {
  const { db, svc } = setup();
  const s = await svc.createSession(STUDENT, request());
  assert.equal(s.status, 'Pending');
  assert.equal(s.proposedBy, 'student');
  assert.equal(s.studentName, 'Sam Student');
  assert.equal(s.volunteerName, 'Vera Volunteer');
  assert.equal(s.review, null);
  assert.deepEqual(db.notesFor(VOLUNTEER), ['Sam Student requested "Python Tutoring" on 2026-10-22 at 10:00.']);
  assert.deepEqual(db.notesFor(STUDENT), []);
});

test('creating a request is refused for bad input, unknown, suspended or self volunteers', async () => {
  const { svc } = setup();
  await fails(svc.createSession(STUDENT, request({ date: '2026-10-19' })), 400, /future/);
  await fails(svc.createSession(STUDENT, request({ title: '' })), 400);
  await fails(svc.createSession(STUDENT, request({ volunteerId: STUDENT })), 400, /yourself/);
  await fails(svc.createSession(STUDENT, request({ volunteerId: 999 })), 400, /Volunteer not found/);
  await fails(svc.createSession(STUDENT, request({ volunteerId: SUSPENDED })), 400, /Volunteer not found/);
});

test('double booking: a volunteer cannot be booked twice for the same slot', async () => {
  const { svc } = setup();
  await svc.createSession(STUDENT, request());
  await fails(svc.createSession(OTHER_STUDENT, request()), 409, /already booked/);
  const other = await svc.createSession(OTHER_STUDENT, request({ time: '11:00' }));
  assert.equal(other.time, '11:00');
});

test('a Pending request holds the slot (it is booked for the student)', async () => {
  const { svc } = setup();
  await svc.createSession(STUDENT, request());
  await fails(svc.createSession(OTHER_STUDENT, request()), 409);
});

test('cancelling frees the slot for someone else', async () => {
  const { svc } = setup();
  const s = await svc.createSession(STUDENT, request());
  await svc.cancelSession(STUDENT, s.id);
  const again = await svc.createSession(OTHER_STUDENT, request());
  assert.equal(again.status, 'Pending');
});

test('a failed booking leaves no notification behind', async () => {
  const { db, svc } = setup();
  await svc.createSession(STUDENT, request());
  const before = db.state.notes.length;
  await fails(svc.createSession(OTHER_STUDENT, request()), 409);
  assert.equal(db.state.notes.length, before);
});

// ---------------------------------------------------------------- accept / decline / cancel
test('the volunteer accepts: Pending becomes Scheduled and the student is told', async () => {
  const { db, svc } = setup();
  const s = await svc.createSession(STUDENT, request());
  const done = await svc.confirmSession(VOLUNTEER, s.id);
  assert.equal(done.status, 'Scheduled');
  assert.equal(done.proposedBy, null);
  assert.deepEqual(db.notesFor(STUDENT), ['Vera Volunteer accepted "Python Tutoring". The session is scheduled for 2026-10-22 at 10:00.']);
});

test('the student cannot accept their own request', async () => {
  const { svc } = setup();
  const s = await svc.createSession(STUDENT, request());
  await fails(svc.confirmSession(STUDENT, s.id), 403, /you made yourself/);
});

test('accepting twice is refused the second time', async () => {
  const { svc } = setup();
  const s = await svc.createSession(STUDENT, request());
  await svc.confirmSession(VOLUNTEER, s.id);
  await fails(svc.confirmSession(VOLUNTEER, s.id), 409, /pending request can be accepted/);
});

test('the volunteer declines: the session is Cancelled and the student is told', async () => {
  const { db, svc } = setup();
  const s = await svc.createSession(STUDENT, request());
  const done = await svc.declineSession(VOLUNTEER, s.id);
  assert.equal(done.status, 'Cancelled');
  assert.deepEqual(db.notesFor(STUDENT), ['Vera Volunteer declined your request "Python Tutoring".']);
});

test('the student cancels their Pending request: the volunteer is told it was withdrawn', async () => {
  const { db, svc } = setup();
  const s = await svc.createSession(STUDENT, request());
  const done = await svc.cancelSession(STUDENT, s.id);
  assert.equal(done.status, 'Cancelled');
  assert.equal(db.notesFor(VOLUNTEER).at(-1), 'Sam Student withdrew the request "Python Tutoring".');
});

test('the volunteer cannot cancel a Pending request, they decline it', async () => {
  const { svc } = setup();
  const s = await svc.createSession(STUDENT, request());
  await fails(svc.cancelSession(VOLUNTEER, s.id), 403, /Decline it instead/);
});

test('either side can cancel a Scheduled session and the other side is told', async () => {
  const a = setup();
  const idA = await scheduled(a);
  await a.svc.cancelSession(STUDENT, idA);
  assert.equal(a.db.notesFor(VOLUNTEER).at(-1), 'Sam Student cancelled the session "Python Tutoring" (2026-10-22 at 10:00).');

  const b = setup();
  const idB = await scheduled(b);
  await b.svc.cancelSession(VOLUNTEER, idB);
  assert.equal(b.db.notesFor(STUDENT).at(-1), 'Vera Volunteer cancelled the session "Python Tutoring" (2026-10-22 at 10:00).');
});

test('Completed and Cancelled sessions cannot be cancelled again', async () => {
  const ctx = setup();
  const id = await completed(ctx);
  await fails(ctx.svc.cancelSession(STUDENT, id), 409, /no longer be cancelled/);
  await fails(ctx.svc.cancelSession(VOLUNTEER, id), 409);

  const other = setup();
  const s = await other.svc.createSession(STUDENT, request());
  await other.svc.cancelSession(STUDENT, s.id);
  await fails(other.svc.cancelSession(STUDENT, s.id), 409);
});

test('a lost race is reported and leaves no notification', async () => {
  const { db, svc } = setup();
  const s = await svc.createSession(STUDENT, request());
  const realSetStatus = db.sessions.setStatus;
  db.sessions.setStatus = async () => false; // someone else changed it between our read and our write
  const before = db.state.notes.length;
  await fails(svc.confirmSession(VOLUNTEER, s.id), 409, /just changed/);
  assert.equal(db.state.notes.length, before);
  db.sessions.setStatus = realSetStatus;
});

// ---------------------------------------------------------------- completing
test('the volunteer cannot complete before the session starts', async () => {
  const ctx = setup();
  const id = await scheduled(ctx);
  await fails(ctx.svc.completeSession(VOLUNTEER, id), 409, /before it starts/);
});

test('once started, the volunteer completes it and the student is told they can leave feedback', async () => {
  const ctx = setup();
  const id = await started(ctx);
  const done = await ctx.svc.completeSession(VOLUNTEER, id);
  assert.equal(done.status, 'Completed');
  assert.equal(ctx.db.notesFor(STUDENT).at(-1), 'Vera Volunteer marked "Python Tutoring" as completed. You can now leave feedback.');
});

test('the student cannot complete a session', async () => {
  const ctx = setup();
  const id = await started(ctx);
  await fails(ctx.svc.completeSession(STUDENT, id), 403, /Only the volunteer/);
});

test('only a Scheduled session can be completed', async () => {
  const ctx = setup();
  const s = await ctx.svc.createSession(STUDENT, request());
  ctx.db.setNow('2026-10-21T09:00:00');
  await fails(ctx.svc.completeSession(VOLUNTEER, s.id), 409, /scheduled session/);
});

// ---------------------------------------------------------------- privacy
test('people who are not part of a session cannot see or change it (404)', async () => {
  const { svc } = setup();
  const s = await svc.createSession(STUDENT, request());
  await fails(svc.getSession(OUTSIDER, s.id), 404);
  await fails(svc.confirmSession(OUTSIDER, s.id), 404);
  await fails(svc.cancelSession(OUTSIDER, s.id), 404);
  await fails(svc.addFeedback(OUTSIDER, s.id, { rating: 5 }), 404);
  await fails(svc.getSession(STUDENT, 9999), 404);
});

test('listing: filters by role, hides other people\'s sessions, newest first', async () => {
  const { db, svc } = setup();
  const first = await svc.createSession(STUDENT, request());
  db.setNow('2026-10-20T10:00:00');
  const second = await svc.createSession(STUDENT, request({ time: '11:00' }));
  await svc.createSession(OTHER_STUDENT, request({ time: '12:00' }));

  const mine = await svc.listSessions(STUDENT);
  assert.deepEqual(mine.map((s) => s.id), [second.id, first.id]);
  assert.equal((await svc.listSessions(STUDENT, 'student')).length, 2);
  assert.equal((await svc.listSessions(STUDENT, 'volunteer')).length, 0);
  assert.equal((await svc.listSessions(VOLUNTEER, 'volunteer')).length, 3);
  assert.equal((await svc.listSessions(OUTSIDER)).length, 0);
  await fails(svc.listSessions(STUDENT, 'admin'), 400, /role/);
});

// ---------------------------------------------------------------- expiry
test('an unanswered Pending session is Cancelled at its start time and both people are told once', async () => {
  const { db, svc } = setup();
  const s = await svc.createSession(STUDENT, request());
  db.setNow('2026-10-22T10:00:00');

  const list = await svc.listSessions(STUDENT);
  assert.equal(list[0].status, 'Cancelled');
  assert.equal(db.notesFor(STUDENT).length, 1);
  assert.match(db.notesFor(STUDENT)[0], /expired/);
  assert.equal(db.notesFor(VOLUNTEER).length, 2); // the new-request note + the expiry note

  await svc.listSessions(STUDENT);
  await svc.getSession(VOLUNTEER, s.id);
  assert.equal(db.notesFor(STUDENT).length, 1);
  assert.equal(db.notesFor(VOLUNTEER).length, 2);
});

test('an expired request can no longer be accepted', async () => {
  const { db, svc } = setup();
  const s = await svc.createSession(STUDENT, request());
  db.setNow('2026-10-22T10:00:00');
  await fails(svc.confirmSession(VOLUNTEER, s.id), 409);
  assert.equal((await svc.getSession(STUDENT, s.id)).status, 'Cancelled');
});

test('Scheduled sessions never expire', async () => {
  const ctx = setup();
  const id = await started(ctx);
  assert.equal((await ctx.svc.getSession(STUDENT, id)).status, 'Scheduled');
});

// ---------------------------------------------------------------- feedback
test('feedback is refused before the session is Completed', async () => {
  const ctx = setup();
  const id = await started(ctx);
  await fails(ctx.svc.addFeedback(STUDENT, id, { rating: 5 }), 409, /marks the session as completed/);
});

test('the student submits feedback once and the volunteer is told', async () => {
  const ctx = setup();
  const id = await completed(ctx);
  const done = await ctx.svc.addFeedback(STUDENT, id, { rating: 4, comment: '  Very helpful  ' });
  assert.equal(done.review.rating, 4);
  assert.equal(done.review.comment, 'Very helpful');
  assert.equal(done.review.sessionId, id);
  assert.equal(ctx.db.notesFor(VOLUNTEER).at(-1), 'Sam Student left you a 4-star review for "Python Tutoring".');
  await fails(ctx.svc.addFeedback(STUDENT, id, { rating: 5 }), 409, /already left feedback/);
});

test('feedback needs a rating, the comment is optional', async () => {
  const ctx = setup();
  const id = await completed(ctx);
  await fails(ctx.svc.addFeedback(STUDENT, id, {}), 400, /star rating/);
  await fails(ctx.svc.addFeedback(STUDENT, id, { rating: 0 }), 400);
  await fails(ctx.svc.addFeedback(STUDENT, id, { rating: 6 }), 400);
  const done = await ctx.svc.addFeedback(STUDENT, id, { rating: 5 });
  assert.equal(done.review.comment, null);
});

test('the volunteer cannot review their own session', async () => {
  const ctx = setup();
  const id = await completed(ctx);
  await fails(ctx.svc.addFeedback(VOLUNTEER, id, { rating: 5 }), 403, /Only the student/);
});

test('a second review is also refused by the database when two arrive at once', async () => {
  const ctx = setup();
  const id = await completed(ctx);
  const realFindById = ctx.db.sessions.findById;
  // Both requests read the session before either has saved: simulate by hiding the existing review from the read.
  await ctx.svc.addFeedback(STUDENT, id, { rating: 5 });
  ctx.db.sessions.findById = async (c, i) => ({ ...(await realFindById(c, i)), review: null });
  await fails(ctx.svc.addFeedback(STUDENT, id, { rating: 1 }), 409, /already left feedback/);
  ctx.db.sessions.findById = realFindById;
});

test('rating summary averages the reviews a volunteer received', async () => {
  const ctx = setup();
  assert.deepEqual(await ctx.svc.ratingSummary(VOLUNTEER), { average: null, count: 0 });
  const id = await completed(ctx);
  await ctx.svc.addFeedback(STUDENT, id, { rating: 5 });

  ctx.db.setNow('2026-10-23T08:00:00');
  const second = await ctx.svc.createSession(OTHER_STUDENT, request({ date: '2026-10-24', time: '09:00' }));
  await ctx.svc.confirmSession(VOLUNTEER, second.id);
  ctx.db.setNow('2026-10-24T09:30:00');
  await ctx.svc.completeSession(VOLUNTEER, second.id);
  await ctx.svc.addFeedback(OTHER_STUDENT, second.id, { rating: 2 });

  assert.deepEqual(await ctx.svc.ratingSummary(VOLUNTEER), { average: 3.5, count: 2 });
  assert.deepEqual(await ctx.svc.ratingSummary(STUDENT), { average: null, count: 0 });
});

// ---------------------------------------------------------------- all-or-nothing
test('if telling the other person fails, the status change is rolled back', async () => {
  const { db, svc } = setup();
  const s = await svc.createSession(STUDENT, request());
  const realInsert = db.notifications.insert;
  db.notifications.insert = async () => { throw new Error('notification table is down'); };

  await assert.rejects(svc.confirmSession(VOLUNTEER, s.id), /notification table is down/);
  db.notifications.insert = realInsert;
  assert.equal((await svc.getSession(STUDENT, s.id)).status, 'Pending');
});

test('if the review notification fails, no review is saved', async () => {
  const ctx = setup();
  const id = await completed(ctx);
  const realInsert = ctx.db.notifications.insert;
  ctx.db.notifications.insert = async () => { throw new Error('boom'); };
  await assert.rejects(ctx.svc.addFeedback(STUDENT, id, { rating: 5 }), /boom/);
  ctx.db.notifications.insert = realInsert;
  assert.equal((await ctx.svc.getSession(STUDENT, id)).review, null);
});
