const rules = require('../utils/sessionRules');
const { HttpError } = require('../utils/httpError');
const { parseTimeText } = require('../utils/requestTime');
const { notificationFor } = require('./sessionService');

const MAX_MESSAGE = 255;
const truncate = (text) => (text.length > MAX_MESSAGE ? `${text.slice(0, MAX_MESSAGE - 1)}…` : text);

/**
 * Connects Use Case 2 (support requests) with Use Case 3 (sessions), so one booking is never
 * half-saved: every function changes the request AND its session inside one transaction.
 *
 *   request created with a volunteer / volunteer picked  -> a Pending session for that volunteer
 *   volunteer declines, student picks another volunteer  -> the SAME session is reopened as Pending
 *   volunteer accepts / rejects in the inbox             -> session Scheduled / Cancelled
 *   student edits the request                            -> the session is cancelled
 *
 * Accept / Decline / Cancel done on the My Sessions page are written back to the request by
 * sessionService (syncRequestStatus), so both pages always show the same status.
 *
 * Dependencies are passed in so tests can replace them (same pattern as sessionService).
 */
function createRequestSyncService({ requests, sessions, notifications, tx, now = () => new Date() }) {
  async function notify(conn, userId, sessionId, message) {
    await notifications.insert(conn, { userId, sessionId, message: truncate(message) });
  }

  /** Creates the Pending session for a request that has a volunteer, or reopens the one it already has. */
  async function openSession(conn, req) {
    if (req.volunteerUserId === null) throw new HttpError(404, 'Volunteer not found.');
    if (req.volunteerUserId === req.studentId) throw new HttpError(400, 'You cannot request support from yourself.');

    const time = parseTimeText(req.timeText);
    if (!time) throw new HttpError(400, 'The preferred time is not a valid time.');
    if (new Date(`${req.date}T${time}:00`) <= now()) {
      throw new HttpError(400, 'The preferred date and time have already passed. Please choose a later time.');
    }

    const volunteer = await sessions.findUser(conn, req.volunteerUserId);
    if (!volunteer || volunteer.status !== 'Active') throw new HttpError(400, 'Volunteer not found.');

    const data = {
      requestId: req.id,
      studentId: req.studentId,
      volunteerId: req.volunteerUserId,
      title: req.category,
      description: req.description,
      category: req.category,
      date: req.date,
      time,
      mode: req.mode,
    };

    const existing = await sessions.findByRequestId(conn, req.id);
    let id;
    try {
      if (existing) {
        if (!(await sessions.reopenFromRequest(conn, existing.id, data))) {
          throw new HttpError(409, 'This request already has an accepted or completed session.');
        }
        id = existing.id;
      } else {
        id = await sessions.insertFromRequest(conn, data);
      }
    } catch (err) {
      // The database allows only one Pending or Scheduled session per volunteer per time slot.
      if (err && err.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'That time slot is already booked for this volunteer.');
      }
      throw err;
    }

    if (existing && existing.status === 'Pending' && existing.volunteerId !== req.volunteerUserId) {
      await notify(conn, existing.volunteerId, id, `${req.studentName} chose another volunteer for "${req.category}". The request was withdrawn.`);
    }
    const session = await sessions.findById(conn, id);
    await notify(conn, session.volunteerId, id, `${session.studentName} requested "${session.title}" on ${session.date} at ${session.time}.`);
    return session;
  }

  /** Law's createSupportRequest: saves the request and, if a volunteer is already chosen, its Pending session. */
  async function createRequest(input) {
    return tx(async (conn) => {
      const id = await requests.insertRequest(conn, input);
      if (input.volunteerId) await openSession(conn, await requests.findRequest(conn, id));
      return id;
    });
  }

  /** Law's assignVolunteerToRequest and reselectVolunteer: a (new) volunteer is picked for a request. */
  async function assignVolunteer(requestId, volunteerRecordId, { refreshTimestamp = false } = {}) {
    return tx(async (conn) => {
      const before = await requests.findRequest(conn, requestId);
      if (!before) throw new HttpError(404, 'Request not found.');
      if (before.status !== 'Pending' && before.status !== 'Rejected') {
        throw new HttpError(409, `This request is already ${before.status.toLowerCase()}, so its volunteer cannot be changed.`);
      }
      await requests.setVolunteer(conn, requestId, volunteerRecordId, { refreshTimestamp });
      await openSession(conn, await requests.findRequest(conn, requestId));
    });
  }

  /** Law's updateRequestStatus: the volunteer accepts or rejects in the inbox. */
  async function setRequestStatus(requestId, status) {
    const outcome = await tx(async (conn) => {
      const req = await requests.findRequest(conn, requestId);
      if (!req) throw new HttpError(404, 'Request not found');
      if (req.status !== 'Pending') {
        throw new HttpError(409, `This request is already ${req.status.toLowerCase()}.`);
      }

      const session = await sessions.findByRequestId(conn, requestId);
      if (!session) {
        // An older request that never got a session: just record the answer.
        await requests.setStatus(conn, requestId, status);
        return { expired: false };
      }

      if (rules.isExpiredPending(session, now())) {
        await sessions.setStatus(conn, session.id, 'Pending', 'Cancelled');
        await requests.setStatus(conn, requestId, 'Rejected');
        return { expired: true };
      }

      const action = status === 'Accepted' ? 'confirm' : 'decline';
      const refusal = rules.denial(action, session, 'volunteer', now());
      if (refusal) throw new HttpError(refusal.status, refusal.message);

      const changed = await sessions.setStatus(
        conn, session.id, 'Pending', status === 'Accepted' ? 'Scheduled' : 'Cancelled',
        { clearProposer: status === 'Accepted' }
      );
      if (!changed) throw new HttpError(409, 'This request was just changed by someone else. Please refresh.');
      await requests.setStatus(conn, requestId, status);

      const note = notificationFor(action, session, 'volunteer');
      await notify(conn, note.userId, session.id, note.message);
      return { expired: false };
    });
    if (outcome.expired) throw new HttpError(409, 'This request expired because its start time has passed.');
  }

  /** Law's updateSupportRequest: the student edits the request, so any session for it is withdrawn. */
  async function updateCriteria(requestId, data) {
    return tx(async (conn) => {
      const req = await requests.findRequest(conn, requestId);
      if (!req) throw new HttpError(404, 'Request not found');
      if (req.status === 'Completed') throw new HttpError(409, 'A completed request cannot be edited.');

      const session = await sessions.findByRequestId(conn, requestId);
      if (session && (session.status === 'Pending' || session.status === 'Scheduled')) {
        await sessions.setStatus(conn, session.id, session.status, 'Cancelled');
        await notify(conn, session.volunteerId, session.id, `${session.studentName} changed the request "${session.title}", so it was withdrawn.`);
      }
      await requests.updateCriteria(conn, requestId, data);
    });
  }

  return { createRequest, assignVolunteer, setRequestStatus, updateCriteria };
}

const requestRepository = require('../repositories/requestRepository');
const sessionRepository = require('../repositories/sessionRepository');
const notificationRepository = require('../repositories/notificationRepository');
const withTransaction = require('../utils/withTransaction');

module.exports = {
  createRequestSyncService,
  requestSync: createRequestSyncService({
    requests: requestRepository,
    sessions: sessionRepository,
    notifications: notificationRepository,
    tx: withTransaction,
  }),
};
