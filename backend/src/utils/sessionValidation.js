const { HttpError } = require('./httpError');

const MODES = ['Virtual', 'Face-to-Face'];
const ROLES = ['student', 'volunteer'];

/** '12' -> 12. Anything that is not a positive whole number is a 400. */
function parseId(value, label = 'id') {
  if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value)) {
    throw new HttpError(400, `Invalid ${label}.`);
  }
  return Number(value);
}

/** The optional ?role= filter on the session list. */
function parseRole(value) {
  if (value === undefined) return undefined;
  if (!ROLES.includes(value)) throw new HttpError(400, 'role must be "student" or "volunteer".');
  return value;
}

function cleanText(value, label, max) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `${label} is required.`);
  }
  const text = value.trim();
  if (text.length > max) throw new HttpError(400, `${label} must be at most ${max} characters.`);
  return text;
}

function isRealDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Checks a "create session" request body and returns it cleaned. Throws HttpError(400). */
function validateCreate(input, userId, now = new Date()) {
  const body = input && typeof input === 'object' ? input : {};

  const { volunteerId } = body;
  if (!Number.isInteger(volunteerId) || volunteerId < 1) {
    throw new HttpError(400, 'volunteerId must be a positive whole number.');
  }
  if (volunteerId === userId) {
    throw new HttpError(400, 'You cannot request a session with yourself.');
  }

  const title = cleanText(body.title, 'Title', 100);
  const category = cleanText(body.category, 'Category', 50);

  if (!MODES.includes(body.mode)) {
    throw new HttpError(400, 'mode must be "Virtual" or "Face-to-Face".');
  }
  if (typeof body.date !== 'string' || !isRealDate(body.date)) {
    throw new HttpError(400, 'date must be a real date in the form YYYY-MM-DD.');
  }
  if (typeof body.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time)) {
    throw new HttpError(400, 'time must be in the form HH:mm (24-hour).');
  }
  if (new Date(`${body.date}T${body.time}:00`) <= now) {
    throw new HttpError(400, 'Choose a date and time in the future.');
  }

  return { volunteerId, title, category, mode: body.mode, date: body.date, time: body.time };
}

/** Checks a feedback request body. Comments are optional; a blank comment becomes null. */
function validateFeedback(input) {
  const body = input && typeof input === 'object' ? input : {};

  if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    throw new HttpError(400, 'Please select a star rating from 1 to 5.');
  }

  let comment = null;
  if (body.comment !== undefined && body.comment !== null) {
    if (typeof body.comment !== 'string') throw new HttpError(400, 'Comments must be text.');
    const text = body.comment.trim();
    if (text.length > 255) throw new HttpError(400, 'Comments must be at most 255 characters.');
    comment = text === '' ? null : text;
  }

  return { rating: body.rating, comment };
}

module.exports = { parseId, parseRole, validateCreate, validateFeedback };
