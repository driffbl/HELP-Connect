const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../../src/utils/sessionRules');

const make = (o = {}) => ({
  id: 1, studentId: 1, volunteerId: 2, date: '2026-10-12', time: '10:00',
  status: 'Scheduled', proposedBy: null, review: null, ...o,
});
const before = new Date('2026-10-12T09:59:00');
const atStart = new Date('2026-10-12T10:00:00');

test('confirm and decline: only the other party, only while live', () => {
  const pending = make({ status: 'Pending', proposedBy: 'student' });
  assert.equal(rules.canConfirm(pending, 'volunteer', before), true);
  assert.equal(rules.canDecline(pending, 'volunteer', before), true);
  assert.equal(rules.canConfirm(pending, 'student', before), false);
  assert.equal(rules.canConfirm(pending, 'volunteer', atStart), false);
  assert.equal(rules.canConfirm(make({ status: 'Scheduled', proposedBy: 'student' }), 'volunteer', before), false);
});

test('expiry: Pending counts as Cancelled from its start time', () => {
  const pending = make({ status: 'Pending', proposedBy: 'student' });
  assert.equal(rules.effectiveStatus(pending, before), 'Pending');
  assert.equal(rules.effectiveStatus(pending, atStart), 'Cancelled');
  assert.equal(rules.effectiveStatus(make(), atStart), 'Scheduled');
});

test('cancel: either side when Scheduled, only the requester when Pending', () => {
  const pending = make({ status: 'Pending', proposedBy: 'student' });
  assert.equal(rules.canCancel(make(), 'student', atStart), true);
  assert.equal(rules.canCancel(make(), 'volunteer', atStart), true);
  assert.equal(rules.canCancel(pending, 'student', before), true);
  assert.equal(rules.canCancel(pending, 'volunteer', before), false);
  assert.equal(rules.canCancel(pending, 'student', atStart), false);
  assert.equal(rules.canCancel(make({ status: 'Completed' }), 'student', atStart), false);
  assert.equal(rules.canCancel(make({ status: 'Cancelled' }), 'volunteer', atStart), false);
});

test('complete: volunteer only, Scheduled only, not before the start', () => {
  assert.equal(rules.canComplete(make(), 'volunteer', before), false);
  assert.equal(rules.canComplete(make(), 'volunteer', atStart), true);
  assert.equal(rules.canComplete(make(), 'student', atStart), false);
  assert.equal(rules.canComplete(make({ status: 'Cancelled' }), 'volunteer', atStart), false);
});

test('feedback: student only, Completed only, once', () => {
  const done = make({ status: 'Completed' });
  assert.equal(rules.canGiveFeedback(done, 'student'), true);
  assert.equal(rules.canGiveFeedback({ ...done, review: { rating: 5 } }, 'student'), false);
  assert.equal(rules.canGiveFeedback(make(), 'student'), false);
  assert.equal(rules.canGiveFeedback(done, 'volunteer'), false);
});

test('roleOf: tells which side a user is on', () => {
  assert.equal(rules.roleOf(make(), 1), 'student');
  assert.equal(rules.roleOf(make(), 2), 'volunteer');
  assert.equal(rules.roleOf(make(), 3), null);
});

test('a volunteer-made proposal can only be cancelled by the volunteer', () => {
  const p = make({ status: 'Pending', proposedBy: 'volunteer' });
  assert.equal(rules.canCancel(p, 'volunteer', before), true);
  assert.equal(rules.canCancel(p, 'student', before), false);
  assert.equal(rules.canConfirm(p, 'student', before), true);
});

// The "why was I refused" answers must never disagree with the yes/no rules.
test('denial() agrees with the can* rules for every combination', () => {
  const statuses = ['Pending', 'Scheduled', 'Completed', 'Cancelled'];
  const roles = ['student', 'volunteer'];
  const proposers = [null, 'student', 'volunteer'];
  const clocks = [before, atStart];
  const reviews = [null, { rating: 4 }];
  const checks = {
    confirm: (s, r, n) => rules.canConfirm(s, r, n),
    decline: (s, r, n) => rules.canDecline(s, r, n),
    cancel: (s, r, n) => rules.canCancel(s, r, n),
    complete: (s, r, n) => rules.canComplete(s, r, n),
    feedback: (s, r) => rules.canGiveFeedback(s, r),
  };
  let combos = 0;
  for (const status of statuses) for (const role of roles) for (const proposedBy of proposers)
    for (const now of clocks) for (const review of reviews) for (const [action, can] of Object.entries(checks)) {
      const s = make({ status, proposedBy, review });
      const d = rules.denial(action, s, role, now);
      const label = `${action} ${status} ${role} proposedBy=${proposedBy} review=${!!review} now=${now.toISOString()}`;
      assert.equal(d === null, can(s, role, now), label);
      if (d !== null) {
        assert.ok(d.status === 403 || d.status === 409, label);
        assert.equal(typeof d.message, 'string', label);
        assert.ok(d.message.length > 0, label);
      }
      combos++;
    }
  assert.equal(combos, 4 * 2 * 3 * 2 * 2 * 5);
});

test('denial() messages explain the real reason', () => {
  const pending = make({ status: 'Pending', proposedBy: 'student' });
  assert.match(rules.denial('cancel', pending, 'volunteer', before).message, /Decline it instead/);
  assert.equal(rules.denial('cancel', pending, 'volunteer', before).status, 403);
  assert.match(rules.denial('confirm', pending, 'student', before).message, /you made yourself/);
  assert.match(rules.denial('confirm', make(), 'volunteer', before).message, /accepted/);
  assert.match(rules.denial('decline', make(), 'volunteer', before).message, /declined/);
  assert.match(rules.denial('complete', make(), 'volunteer', before).message, /before it starts/);
  assert.equal(rules.denial('complete', make(), 'student', atStart).status, 403);
  assert.match(rules.denial('feedback', make(), 'student').message, /marks the session as completed/);
  assert.match(rules.denial('feedback', make({ status: 'Completed', review: {} }), 'student').message, /already/);
  assert.throws(() => rules.denial('nonsense', make(), 'student'), /Unknown action/);
});
