const test = require('node:test');
const assert = require('node:assert/strict');
const { HttpError } = require('../../src/utils/httpError');
const v = require('../../src/utils/sessionValidation');

const now = new Date('2026-10-20T09:00:00');
const good = { volunteerId: 2, title: ' Python Tutoring ', category: 'Academic Support', date: '2026-10-21', time: '10:30', mode: 'Virtual' };
const rejects = (fn, message) =>
  assert.throws(fn, (e) => e instanceof HttpError && e.status === 400 && (message ? message.test(e.message) : true));

test('parseId accepts positive whole numbers only', () => {
  assert.equal(v.parseId('12'), 12);
  for (const bad of ['0', '-1', '1.5', 'abc', '', '01', ' 3', undefined, null, 5, '99999999999']) {
    rejects(() => v.parseId(bad));
  }
});

test('parseRole accepts student, volunteer or nothing', () => {
  assert.equal(v.parseRole(undefined), undefined);
  assert.equal(v.parseRole('student'), 'student');
  assert.equal(v.parseRole('volunteer'), 'volunteer');
  rejects(() => v.parseRole('admin'), /role/);
  rejects(() => v.parseRole(''), /role/);
});

test('validateCreate returns a cleaned request', () => {
  assert.deepEqual(v.validateCreate(good, 1, now), {
    volunteerId: 2, title: 'Python Tutoring', category: 'Academic Support', mode: 'Virtual', date: '2026-10-21', time: '10:30',
  });
});

test('validateCreate refuses every bad input with a 400', () => {
  const bad = (patch, re) => rejects(() => v.validateCreate({ ...good, ...patch }, 1, now), re);
  bad({ volunteerId: '2' }, /volunteerId/);
  bad({ volunteerId: 0 }, /volunteerId/);
  bad({ volunteerId: 1.5 }, /volunteerId/);
  bad({ volunteerId: undefined }, /volunteerId/);
  bad({ volunteerId: 1 }, /yourself/);
  bad({ title: '' }, /Title/);
  bad({ title: '   ' }, /Title/);
  bad({ title: 'x'.repeat(101) }, /at most 100/);
  bad({ title: 42 }, /Title/);
  bad({ category: '' }, /Category/);
  bad({ category: 'x'.repeat(51) }, /at most 50/);
  bad({ mode: 'Phone' }, /mode/);
  bad({ mode: undefined }, /mode/);
  bad({ date: '2026-13-01' }, /date/);
  bad({ date: '2026-02-30' }, /date/);
  bad({ date: '21/10/2026' }, /date/);
  bad({ date: undefined }, /date/);
  bad({ time: '25:00' }, /time/);
  bad({ time: '9:30' }, /time/);
  bad({ time: '10:60' }, /time/);
  bad({ time: undefined }, /time/);
  bad({ date: '2026-10-19' }, /future/);
  bad({ date: '2026-10-20', time: '09:00' }, /future/);
  rejects(() => v.validateCreate(null, 1, now), /volunteerId/);
  rejects(() => v.validateCreate('nope', 1, now), /volunteerId/);
});

test('validateCreate accepts a request one minute in the future and a leap day', () => {
  assert.equal(v.validateCreate({ ...good, date: '2026-10-20', time: '09:01' }, 1, now).time, '09:01');
  assert.equal(v.validateCreate({ ...good, date: '2028-02-29', time: '10:00' }, 1, now).date, '2028-02-29');
});

test('validateFeedback: rating 1 to 5 required, comment optional', () => {
  assert.deepEqual(v.validateFeedback({ rating: 5 }), { rating: 5, comment: null });
  assert.deepEqual(v.validateFeedback({ rating: 3, comment: '  nice  ' }), { rating: 3, comment: 'nice' });
  assert.deepEqual(v.validateFeedback({ rating: 1, comment: '   ' }), { rating: 1, comment: null });
  assert.deepEqual(v.validateFeedback({ rating: 4, comment: null }), { rating: 4, comment: null });
  assert.equal(v.validateFeedback({ rating: 4, comment: 'x'.repeat(255) }).comment.length, 255);
  for (const rating of [0, 6, 3.5, '4', null, undefined, NaN]) {
    rejects(() => v.validateFeedback({ rating }), /star rating/);
  }
  rejects(() => v.validateFeedback({ rating: 4, comment: 'x'.repeat(256) }), /255/);
  rejects(() => v.validateFeedback({ rating: 4, comment: 123 }), /text/);
  rejects(() => v.validateFeedback(undefined), /star rating/);
});
