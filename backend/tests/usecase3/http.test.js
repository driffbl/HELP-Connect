const test = require('node:test');
const assert = require('node:assert/strict');
const { stubModules, fakeExpress, flatten } = require('./helpers/stubModules');
const { HttpError } = require('../../src/utils/httpError');

// The routes need express and the middleware needs jsonwebtoken, so both are faked for these tests.
const fakeJwt = {
  verify(token) {
    if (token === 'valid') return { User_id: 7, Email: 'sam@helplive.edu.my' };
    throw new Error('invalid');
  },
};
const restore = stubModules({ express: fakeExpress(), jsonwebtoken: fakeJwt });
test.after(restore);

const authMiddleware = require('../../src/middleware/authMiddleware');
const usecase3Routes = require('../../src/routes/usecase3Routes');
const { sessionService } = require('../../src/services/sessionService');
const { notificationService } = require('../../src/services/notificationService');
const sessionController = require('../../src/controllers/sessionController');
const feedbackController = require('../../src/controllers/feedbackController');
const notificationController = require('../../src/controllers/notificationController');

// ---------------------------------------------------------------- routes
test('every Use Case 3 route exists and requires login first', () => {
  const routes = flatten(usecase3Routes);
  const table = routes.map((r) => `${r.method} ${r.path}`);
  assert.deepEqual(table.sort(), [
    'GET /feedback/summary',
    'GET /notifications',
    'GET /sessions',
    'GET /sessions/:id',
    'PATCH /notifications/:id/read',
    'PATCH /notifications/read-all',
    'PATCH /sessions/:id/cancel',
    'PATCH /sessions/:id/complete',
    'PATCH /sessions/:id/confirm',
    'PATCH /sessions/:id/decline',
    'POST /sessions',
    'POST /sessions/:id/feedback',
  ].sort());
  for (const r of routes) {
    assert.equal(r.handlers.length, 2, `${r.method} ${r.path}`);
    assert.equal(r.handlers[0], authMiddleware, `${r.method} ${r.path} must start with authMiddleware`);
    assert.equal(typeof r.handlers[1], 'function');
  }
});

test('read-all is registered before :id/read', () => {
  const paths = flatten(usecase3Routes).filter((r) => r.path.startsWith('/notifications')).map((r) => r.path);
  assert.ok(paths.indexOf('/notifications/read-all') < paths.indexOf('/notifications/:id/read'));
});

// ---------------------------------------------------------------- the login middleware these routes rely on
function fakeRes() {
  return { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
}

test('authMiddleware rejects missing, malformed and bad tokens, and accepts a good one', () => {
  for (const headers of [{}, { authorization: 'Token abc' }, { authorization: 'Bearer bad' }]) {
    const res = fakeRes();
    let called = false;
    authMiddleware({ headers }, res, () => { called = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(called, false);
  }
  const req = { headers: { authorization: 'Bearer valid' } };
  let called = false;
  authMiddleware(req, fakeRes(), () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.user.User_id, 7);
});

// ---------------------------------------------------------------- controllers (service replaced by a spy)
function spy(target, name, impl) {
  const original = target[name];
  const calls = [];
  target[name] = async (...args) => { calls.push(args); return impl(...args); };
  return { calls, restore: () => { target[name] = original; } };
}
const reqOf = (o = {}) => ({ user: { User_id: 7 }, params: {}, query: {}, body: {}, ...o });
const quiet = () => { const o = console.error; console.error = () => {}; return () => { console.error = o; }; };

test('GET /sessions passes the user and role filter and answers 200', async () => {
  const s = spy(sessionService, 'listSessions', () => [{ id: 1 }]);
  const res = fakeRes();
  await sessionController.list(reqOf({ query: { role: 'student' } }), res);
  s.restore();
  assert.deepEqual(s.calls[0], [7, 'student']);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { sessions: [{ id: 1 }] });
});

test('an HttpError from the service becomes its status and message', async () => {
  const s = spy(sessionService, 'listSessions', () => { throw new HttpError(400, 'role must be "student" or "volunteer".'); });
  const res = fakeRes();
  await sessionController.list(reqOf({ query: { role: 'x' } }), res);
  s.restore();
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { message: 'role must be "student" or "volunteer".' });
});

test('an unexpected error becomes a plain 500 and does not leak details', async () => {
  const s = spy(sessionService, 'listSessions', () => { throw new Error('ECONNREFUSED 127.0.0.1:3306'); });
  const unquiet = quiet();
  const res = fakeRes();
  await sessionController.list(reqOf(), res);
  unquiet();
  s.restore();
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: 'Server error.' });
});

test('a bad session id is a 400 and never reaches the service', async () => {
  const s = spy(sessionService, 'getSession', () => ({}));
  for (const id of ['abc', '0', '-3', '1.5', '']) {
    const res = fakeRes();
    await sessionController.get(reqOf({ params: { id } }), res);
    assert.equal(res.statusCode, 400, `id=${id}`);
  }
  s.restore();
  assert.equal(s.calls.length, 0);
});

test('GET /sessions/:id and POST /sessions answer 200 and 201', async () => {
  const get = spy(sessionService, 'getSession', () => ({ id: 5 }));
  const create = spy(sessionService, 'createSession', (u, body) => ({ id: 9, ...body }));
  const r1 = fakeRes(); await sessionController.get(reqOf({ params: { id: '5' } }), r1);
  const r2 = fakeRes(); await sessionController.create(reqOf({ body: { title: 'T' } }), r2);
  get.restore(); create.restore();
  assert.deepEqual(get.calls[0], [7, 5]);
  assert.equal(r1.statusCode, 200);
  assert.deepEqual(create.calls[0], [7, { title: 'T' }]);
  assert.equal(r2.statusCode, 201);
  assert.equal(r2.body.session.id, 9);
});

test('confirm, decline, cancel and complete call the matching service method', async () => {
  const pairs = [['confirm', 'confirmSession', 'Session accepted.'], ['decline', 'declineSession', 'Request declined.'], ['cancel', 'cancelSession', 'Session cancelled.'], ['complete', 'completeSession', 'Session marked as completed.']];
  for (const [handler, method, message] of pairs) {
    const s = spy(sessionService, method, (u, id) => ({ id }));
    const res = fakeRes();
    await sessionController[handler](reqOf({ params: { id: '12' } }), res);
    s.restore();
    assert.deepEqual(s.calls[0], [7, 12], handler);
    assert.equal(res.statusCode, 200, handler);
    assert.equal(res.body.message, message, handler);
    assert.deepEqual(res.body.session, { id: 12 }, handler);
  }
});

test('a refused action shows the rule\'s status and reason', async () => {
  const s = spy(sessionService, 'cancelSession', () => { throw new HttpError(403, 'Only the person who made the request can cancel it. Decline it instead.'); });
  const res = fakeRes();
  await sessionController.cancel(reqOf({ params: { id: '3' } }), res);
  s.restore();
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /Decline it instead/);
});

test('POST /sessions/:id/feedback answers 201, GET /feedback/summary answers 200', async () => {
  const fb = spy(sessionService, 'addFeedback', (u, id, body) => ({ id, review: body }));
  const sum = spy(sessionService, 'ratingSummary', () => ({ average: 4.5, count: 2 }));
  const r1 = fakeRes(); await sessionController.addFeedback(reqOf({ params: { id: '4' }, body: { rating: 5 } }), r1);
  const r2 = fakeRes(); await feedbackController.summary(reqOf(), r2);
  fb.restore(); sum.restore();
  assert.deepEqual(fb.calls[0], [7, 4, { rating: 5 }]);
  assert.equal(r1.statusCode, 201);
  assert.equal(r2.statusCode, 200);
  assert.deepEqual(r2.body, { summary: { average: 4.5, count: 2 } });
});

test('notification endpoints', async () => {
  const list = spy(notificationService, 'list', () => ({ notifications: [], unread: 0 }));
  const read = spy(notificationService, 'markRead', (u, id) => ({ id, status: 'Read' }));
  const all = spy(notificationService, 'markAllRead', () => ({ updated: 3 }));
  const r1 = fakeRes(); await notificationController.list(reqOf(), r1);
  const r2 = fakeRes(); await notificationController.markRead(reqOf({ params: { id: '8' } }), r2);
  const r3 = fakeRes(); await notificationController.markRead(reqOf({ params: { id: 'x' } }), r3);
  const r4 = fakeRes(); await notificationController.markAllRead(reqOf(), r4);
  list.restore(); read.restore(); all.restore();
  assert.deepEqual(r1.body, { notifications: [], unread: 0 });
  assert.deepEqual(read.calls, [[7, 8]]);
  assert.equal(r2.statusCode, 200);
  assert.equal(r3.statusCode, 400);
  assert.deepEqual(r4.body, { message: 'All notifications marked as read.', updated: 3 });
});
