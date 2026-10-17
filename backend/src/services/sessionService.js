const rules = require('../utils/sessionRules');
const { HttpError } = require('../utils/httpError');
const { toSqlDateTime } = require('../utils/dateFormat');
const { validateCreate, validateFeedback, parseRole } = require('../utils/sessionValidation');

const MAX_MESSAGE = 255;
const truncate = (text) => (text.length > MAX_MESSAGE ? `${text.slice(0, MAX_MESSAGE - 1)}…` : text);

/** What each status-changing action does to the session. */
const TRANSITIONS = {
  confirm: { to: 'Scheduled', clearProposer: true },
  decline: { to: 'Cancelled' },
  cancel: { to: 'Cancelled' },
  complete: { to: 'Completed' },
};

/** The message the OTHER person receives. `s` is the session as it was before the change. */
function notificationFor(action, s, role) {
  const actor = role === 'student' ? s.studentName : s.volunteerName;
  const userId = role === 'student' ? s.volunteerId : s.studentId;
  const when = `${s.date} at ${s.time}`;
  switch (action) {
    case 'confirm':
      return { userId, message: `${actor} accepted "${s.title}". The session is scheduled for ${when}.` };
    case 'decline':
      return { userId, message: `${actor} declined your request "${s.title}".` };
    case 'cancel':
      return s.status === 'Pending'
        ? { userId, message: `${actor} withdrew the request "${s.title}".` }
        : { userId, message: `${actor} cancelled the session "${s.title}" (${when}).` };
    case 'complete':
      return { userId, message: `${actor} marked "${s.title}" as completed. You can now leave feedback.` };
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * The session use cases. Dependencies are passed in so tests can replace them:
 *  - sessions / notifications: the repositories
 *  - tx: runs a function inside one database transaction and passes it the connection
 *  - now: the clock
 */
function createSessionService({ sessions, notifications, tx, now = () => new Date() }) {
  async function notify(conn, userId, session, message) {
    await notifications.insert(conn, { userId, sessionId: session.id, message: truncate(message) });
  }

  /**
   * Pending sessions whose start time has passed become Cancelled, and both people are told.
   * Runs at the start of every request, so the database never keeps an expired Pending session.
   */
  async function expireStale(conn) {
    const stale = await sessions.findStalePending(conn, toSqlDateTime(now()));
    for (const s of stale) {
      const changed = await sessions.setStatus(conn, s.id, 'Pending', 'Cancelled');
      if (!changed) continue;
      await notify(conn, s.studentId, s, `Your request "${s.title}" expired because ${s.volunteerName} did not respond before the start time.`);
      await notify(conn, s.volunteerId, s, `The request "${s.title}" from ${s.studentName} expired because it was not answered before the start time.`);
    }
  }

  /** The session if the user takes part in it. Otherwise 404, so other people's sessions are not revealed. */
  async function loadMine(conn, userId, id) {
    const session = await sessions.findById(conn, id);
    const role = session ? rules.roleOf(session, userId) : null;
    if (!session || !role) throw new HttpError(404, 'Session not found.');
    return { session, role };
  }

  async function listSessions(userId, roleFilter) {
    const role = parseRole(roleFilter);
    return tx(async (conn) => {
      await expireStale(conn);
      return sessions.listForUser(conn, userId, role);
    });
  }

  async function getSession(userId, id) {
    return tx(async (conn) => {
      await expireStale(conn);
      return (await loadMine(conn, userId, id)).session;
    });
  }

  async function createSession(userId, input) {
    const data = validateCreate(input, userId, now());
    return tx(async (conn) => {
      await expireStale(conn);

      const volunteer = await sessions.findUser(conn, data.volunteerId);
      if (!volunteer || volunteer.status !== 'Active') {
        throw new HttpError(400, 'Volunteer not found.');
      }

      let id;
      try {
        id = await sessions.insertSession(conn, { ...data, studentId: userId });
      } catch (err) {
        // The database allows only one Pending or Scheduled session per volunteer per time slot.
        if (err && err.code === 'ER_DUP_ENTRY') {
          throw new HttpError(409, 'That time slot is already booked for this volunteer.');
        }
        throw err;
      }

      const created = await sessions.findById(conn, id);
      await notify(conn, created.volunteerId, created, `${created.studentName} requested "${created.title}" on ${created.date} at ${created.time}.`);
      return created;
    });
  }

  /** confirm, decline, cancel and complete all follow the same steps. */
  async function transition(action, userId, id) {
    const { to, clearProposer } = TRANSITIONS[action];
    return tx(async (conn) => {
      await expireStale(conn);
      const { session, role } = await loadMine(conn, userId, id);

      const refusal = rules.denial(action, session, role, now());
      if (refusal) throw new HttpError(refusal.status, refusal.message);

      const changed = await sessions.setStatus(conn, id, session.status, to, { clearProposer });
      if (!changed) {
        throw new HttpError(409, 'This session was just changed by someone else. Please refresh.');
      }

      const note = notificationFor(action, session, role);
      await notify(conn, note.userId, session, note.message);
      return sessions.findById(conn, id);
    });
  }

  async function addFeedback(userId, id, input) {
    const data = validateFeedback(input);
    return tx(async (conn) => {
      await expireStale(conn);
      const { session, role } = await loadMine(conn, userId, id);

      const refusal = rules.denial('feedback', session, role, now());
      if (refusal) throw new HttpError(refusal.status, refusal.message);

      try {
        await sessions.insertFeedback(conn, { sessionId: id, ...data });
      } catch (err) {
        // One review per session is also enforced by a UNIQUE key, which catches two requests at once.
        if (err && err.code === 'ER_DUP_ENTRY') {
          throw new HttpError(409, 'You have already left feedback for this session.');
        }
        throw err;
      }

      await notify(conn, session.volunteerId, session, `${session.studentName} left you a ${data.rating}-star review for "${session.title}".`);
      return sessions.findById(conn, id);
    });
  }

  async function ratingSummary(userId) {
    return tx((conn) => sessions.ratingSummary(conn, userId));
  }

  return {
    listSessions,
    getSession,
    createSession,
    confirmSession: (userId, id) => transition('confirm', userId, id),
    declineSession: (userId, id) => transition('decline', userId, id),
    cancelSession: (userId, id) => transition('cancel', userId, id),
    completeSession: (userId, id) => transition('complete', userId, id),
    addFeedback,
    ratingSummary,
  };
}

const sessionRepository = require('../repositories/sessionRepository');
const notificationRepository = require('../repositories/notificationRepository');
const withTransaction = require('../utils/withTransaction');

module.exports = {
  createSessionService,
  notificationFor,
  sessionService: createSessionService({
    sessions: sessionRepository,
    notifications: notificationRepository,
    tx: withTransaction,
  }),
};
