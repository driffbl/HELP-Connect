const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequestSyncService } = require('../../src/services/requestSyncService');
const { createSessionService } = require('../../src/services/sessionService');
const { HttpError } = require('../../src/utils/httpError');
const { createFakeDb } = require('./helpers/fakeDb');

const STUDENT = 1;
const BEN = 2; // volunteer User id
const CARA = 3; // a second volunteer's User id
const BEN_RECORD = 10; // Volunteer table ids, which is what Law's requests store
const CARA_RECORD = 11;

function setup(startAt = '2026-10-20T09:00:00') {
  const db = createFakeDb(startAt);
  db.addUser(STUDENT, 'Alice');
  db.addUser(BEN, 'Ben');
  db.addUser(CARA, 'Cara');
  db.addVolunteer(BEN_RECORD, BEN);
  db.addVolunteer(CARA_RECORD, CARA);
  const sync = createRequestSyncService({ requests: db.requests, sessions: db.sessions, notifications: db.notifications, tx: db.tx, now: db.now });
  const sessionService = createSessionService({ sessions: db.sessions, notifications: db.notifications, tx: db.tx, now: db.now });
  return { db, sync, sessionService };
}

const form = (over = {}) => ({
  userId: STUDENT, volunteerId: BEN_RECORD, categoryId: 1, categoryName: 'Academic Support',
  description: 'Help with loops', preferredDate: '2026-10-22', preferredTime: '10:00', supportMode: 'Virtual', ...over,
});

const rejects = (promise, status, text) =>
  assert.rejects(promise, (e) => e instanceof HttpError && e.status === status && (!text || text.test(e.message)));

test('a request with a volunteer creates a Pending session the volunteer can answer', async () => {
  const { db, sync, sessionService } = setup();
  const id = await sync.createRequest(form());
  const [s] = await sessionService.listSessions(BEN, 'volunteer');
  assert.equal(s.requestId, id);
  assert.equal(s.status, 'Pending');
  assert.equal(s.title, 'Academic Support');
  assert.equal(s.description, 'Help with loops');
  assert.equal(s.time, '10:00');
  assert.equal(s.studentId, STUDENT);
  assert.equal(s.volunteerId, BEN);
  assert.equal(s.proposedBy, 'student');
  assert.match(db.notesFor(BEN)[0], /Alice requested "Academic Support"/);
});

test('the form time can be written as 12-hour text', async () => {
  const { sync, sessionService } = setup();
  await sync.createRequest(form({ preferredTime: '2:30 PM' }));
  assert.equal((await sessionService.listSessions(BEN))[0].time, '14:30');
});

test('a request without a volunteer yet makes no session until one is assigned', async () => {
  const { sync, sessionService } = setup();
  const id = await sync.createRequest(form({ volunteerId: null }));
  assert.equal((await sessionService.listSessions(STUDENT)).length, 0);
  await sync.assignVolunteer(id, BEN_RECORD);
  const [s] = await sessionService.listSessions(STUDENT);
  assert.equal(s.volunteerId, BEN);
  assert.equal(s.status, 'Pending');
});

test('a request for a time that is already booked fails with 409 and saves nothing', async () => {
  const { db, sync } = setup();
  await sync.createRequest(form());
  await rejects(sync.createRequest(form({ description: 'second' })), 409, /already booked/);
  assert.equal(db.state.requests.length, 1);
  assert.equal(db.state.sessions.length, 1);
});

test('a request for a time in the past, a bad time, or yourself is refused and nothing is saved', async () => {
  const { db, sync } = setup();
  await rejects(sync.createRequest(form({ preferredDate: '2026-10-19' })), 400, /passed/);
  await rejects(sync.createRequest(form({ preferredTime: 'soon' })), 400, /valid time/);
  db.addVolunteer(12, STUDENT);
  await rejects(sync.createRequest(form({ volunteerId: 12 })), 400, /yourself/);
  assert.equal(db.state.requests.length, 0);
  assert.equal(db.state.sessions.length, 0);
});

test('the volunteer accepting in the inbox schedules the session and tells the student', async () => {
  const { db, sync, sessionService } = setup();
  const id = await sync.createRequest(form());
  await sync.setRequestStatus(id, 'Accepted');
  const [s] = await sessionService.listSessions(STUDENT);
  assert.equal(s.status, 'Scheduled');
  assert.equal(s.proposedBy, null);
  assert.equal(s.requestStatus, 'Accepted');
  assert.match(db.notesFor(STUDENT)[0], /Ben accepted/);
});

test('the volunteer rejecting in the inbox cancels the session and tells the student', async () => {
  const { db, sync, sessionService } = setup();
  const id = await sync.createRequest(form());
  await sync.setRequestStatus(id, 'Rejected');
  const [s] = await sessionService.listSessions(STUDENT);
  assert.equal(s.status, 'Cancelled');
  assert.equal(s.requestStatus, 'Rejected');
  assert.match(db.notesFor(STUDENT)[0], /declined/);
});

test('an answered request cannot be answered again', async () => {
  const { sync } = setup();
  const id = await sync.createRequest(form());
  await sync.setRequestStatus(id, 'Accepted');
  await rejects(sync.setRequestStatus(id, 'Rejected'), 409, /already accepted/);
  await rejects(sync.setRequestStatus(999, 'Accepted'), 404);
});

test('an inbox answer after the start time expires the request instead', async () => {
  const { db, sync, sessionService } = setup();
  const id = await sync.createRequest(form());
  db.setNow('2026-10-22T10:00:00');
  await rejects(sync.setRequestStatus(id, 'Accepted'), 409, /expired/);
  const [s] = await sessionService.listSessions(STUDENT);
  assert.equal(s.status, 'Cancelled');
  assert.equal(s.requestStatus, 'Rejected');
});

test('declining in My Sessions rejects the request, then the student picks another volunteer and the same session reopens', async () => {
  const { db, sync, sessionService } = setup();
  const id = await sync.createRequest(form());
  const [first] = await sessionService.listSessions(BEN, 'volunteer');

  const declined = await sessionService.declineSession(BEN, first.id);
  assert.equal(declined.status, 'Cancelled');
  assert.equal(declined.requestStatus, 'Rejected');

  await sync.assignVolunteer(id, CARA_RECORD);
  const [again] = await sessionService.listSessions(STUDENT, 'student');
  assert.equal(again.id, first.id); // the same row, so UNIQUE(Request_id) holds
  assert.equal(again.status, 'Pending');
  assert.equal(again.volunteerId, CARA);
  assert.equal(again.requestStatus, 'Pending');
  assert.match(db.notesFor(CARA).at(-1), /requested "Academic Support"/);
});

test('picking another volunteer while the first is still pending withdraws it and tells the first volunteer', async () => {
  const { db, sync, sessionService } = setup();
  const id = await sync.createRequest(form());
  await sync.assignVolunteer(id, CARA_RECORD, { refreshTimestamp: true });
  assert.equal((await sessionService.listSessions(BEN, 'volunteer')).length, 0);
  assert.equal((await sessionService.listSessions(CARA, 'volunteer'))[0].status, 'Pending');
  assert.match(db.notesFor(BEN).at(-1), /chose another volunteer/);
});

test('the new volunteer must be free at that time', async () => {
  const { db, sync } = setup();
  const first = await sync.createRequest(form());
  await sync.createRequest(form({ volunteerId: CARA_RECORD, description: 'other' }));
  await rejects(sync.assignVolunteer(first, CARA_RECORD), 409, /already booked/);
  assert.equal(db.state.requests.find((r) => r.id === first).volunteerRecordId, BEN_RECORD); // rolled back
});

test('an accepted or completed request cannot get a different volunteer', async () => {
  const { sync } = setup();
  const id = await sync.createRequest(form());
  await sync.setRequestStatus(id, 'Accepted');
  await rejects(sync.assignVolunteer(id, CARA_RECORD), 409, /already accepted/);
  await rejects(sync.assignVolunteer(999, CARA_RECORD), 404);
});

test('cancelling a pending session in My Sessions writes Cancelled back to the request', async () => {
  const { sync, sessionService } = setup();
  await sync.createRequest(form());
  const [s] = await sessionService.listSessions(STUDENT, 'student');
  const cancelled = await sessionService.cancelSession(STUDENT, s.id);
  assert.equal(cancelled.status, 'Cancelled');
  assert.equal(cancelled.requestStatus, 'Cancelled');
});

test('accepting in My Sessions writes Accepted back, and completing writes Completed back', async () => {
  const { sync, sessionService, db } = setup();
  await sync.createRequest(form());
  const [s] = await sessionService.listSessions(BEN, 'volunteer');
  assert.equal((await sessionService.confirmSession(BEN, s.id)).requestStatus, 'Accepted');
  db.setNow('2026-10-22T10:05:00');
  assert.equal((await sessionService.completeSession(BEN, s.id)).requestStatus, 'Completed');
});

test('a pending session that expires unanswered rejects the request so the student can choose someone else', async () => {
  const { sync, sessionService, db } = setup();
  await sync.createRequest(form());
  db.setNow('2026-10-22T10:00:00');
  const [s] = await sessionService.listSessions(STUDENT, 'student');
  assert.equal(s.status, 'Cancelled');
  assert.equal(s.requestStatus, 'Rejected');
});

test('editing a request withdraws its session and tells the volunteer', async () => {
  const { db, sync, sessionService } = setup();
  const id = await sync.createRequest(form());
  await sync.updateCriteria(id, { categoryId: 1, description: 'new text', preferredDate: '2026-10-23', preferredTime: '11:00', supportMode: 'Virtual' });
  const [s] = await sessionService.listSessions(STUDENT);
  assert.equal(s.status, 'Cancelled');
  assert.match(db.notesFor(BEN).at(-1), /changed the request/);
  assert.equal(db.state.requests[0].volunteerRecordId, null);
  await rejects(sync.updateCriteria(999, {}), 404);
});

test('a session without a request is unaffected by the request sync', async () => {
  const { sessionService, db } = setup();
  const s = await sessionService.createSession(STUDENT, { volunteerId: BEN, title: 'Direct', category: 'Academic Support', date: '2026-10-22', time: '09:00', mode: 'Virtual' });
  assert.equal(s.requestId, null);
  const cancelled = await sessionService.cancelSession(STUDENT, s.id);
  assert.equal(cancelled.requestStatus, null);
  assert.equal(db.state.requests.length, 0);
});
