/**
 * Law's request form stores the preferred time as free text ('09:00', '9:30 AM', '14:05:00').
 * Sessions need a clean 'HH:mm'. Returns null when the text is not a time.
 */
function parseTimeText(text) {
  if (typeof text !== 'string') return null;
  const m = text.trim().match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)?$/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = m[2] === undefined ? 0 : parseInt(m[2], 10);
  const period = m[3] ? m[3].toLowerCase() : null;
  if (minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === 'pm' && hour < 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

module.exports = { parseTimeText };
