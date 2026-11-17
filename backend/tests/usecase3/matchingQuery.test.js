const test = require('node:test');
const assert = require('node:assert/strict');
const { stubModules } = require('./helpers/stubModules');

/**
 * Law's volunteer search now returns each volunteer's real average rating, review count and completed
 * sessions. These tests cannot run SQL; they check the query is well formed and the rows are passed on.
 */
const calls = [];
let rows = [];
const fakeDb = {
  async query(sql, params) {
    calls.push({ sql, params });
    return [rows, []];
  },
};
const restore = stubModules({ '../config/db': fakeDb });
const controller = require('../../src/controllers/matchingController');
restore();

function fakeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test('the volunteer search asks for the real rating, review count and completed sessions', async () => {
  calls.length = 0;
  rows = [{ Volunteer_id: 1, User_name: 'Ben', Availability: 'Monday', Rating: '4.5000', Review_count: 2, Completed_sessions: 3 }];
  const res = fakeRes();
  await controller.findVolunteers({ query: { category: 'Academic Support', mode: 'Virtual' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, rows); // passed on untouched; the Angular service converts the numbers
  const { sql, params } = calls[0];
  assert.match(sql, /AVG\(f\.Rating\) AS Rating/);
  assert.match(sql, /COUNT\(f\.Feedback_id\) AS Review_count/);
  assert.match(sql, /Session_status = 'Completed'/);
  assert.match(sql, /COALESCE\(rt\.Review_count, 0\) AS Review_count/);
  assert.match(sql, /COALESCE\(cs\.Completed_sessions, 0\) AS Completed_sessions/);
  // MySQL needs every selected column in GROUP BY (ONLY_FULL_GROUP_BY).
  assert.match(sql, /GROUP BY [^`]*rt\.Rating, rt\.Review_count, cs\.Completed_sessions/);
  assert.equal((sql.match(/\?/g) || []).length, params.length);
});

test('a volunteer with no reviews comes back with a null rating', async () => {
  calls.length = 0;
  rows = [{ Volunteer_id: 2, User_name: 'Cara', Availability: 'Friday', Rating: null, Review_count: 0, Completed_sessions: 0 }];
  const res = fakeRes();
  await controller.findVolunteers({ query: { category: 'Academic Support', mode: 'Virtual' } }, res);
  assert.equal(res.body[0].Rating, null);
});

test('the search still needs a category and a mode', async () => {
  const res = fakeRes();
  await controller.findVolunteers({ query: { mode: 'Virtual' } }, res);
  assert.equal(res.statusCode, 400);
});
