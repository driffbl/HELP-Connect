const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTimeText } = require('../../src/utils/requestTime');

test('parseTimeText reads 24-hour and 12-hour text from the request form', () => {
  assert.equal(parseTimeText('09:00'), '09:00');
  assert.equal(parseTimeText('9:30'), '09:30');
  assert.equal(parseTimeText('14:05:00'), '14:05');
  assert.equal(parseTimeText('9:30 AM'), '09:30');
  assert.equal(parseTimeText('09:00 PM'), '21:00');
  assert.equal(parseTimeText('12:15 AM'), '00:15');
  assert.equal(parseTimeText('12:15 PM'), '12:15');
  assert.equal(parseTimeText('3pm'), '15:00');
});

test('parseTimeText rejects anything that is not a time', () => {
  for (const bad of ['', 'soon', '25:00', '10:75', '13:00 PM', '0:30 AM', null, undefined, 42]) {
    assert.equal(parseTimeText(bad), null, String(bad));
  }
});
