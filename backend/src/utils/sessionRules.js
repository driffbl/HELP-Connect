/**
 * Session rules for Use Case 3. This is the server-side twin of the Angular file
 * frontend/src/app/utils/session-rules.ts. If you change a rule, change both.
 *
 * A session object here has the same shape the API returns:
 * { id, studentId, volunteerId, date: 'YYYY-MM-DD', time: 'HH:mm', status, proposedBy, review, ... }
 */

const EXPIRED = 'This request expired because its start time has passed.';

function sessionStart(s) {
  return new Date(`${s.date}T${s.time}:00`);
}

/** Pending with no response by the start time counts as Cancelled. */
function isExpiredPending(s, now = new Date()) {
  return s.status === 'Pending' && now >= sessionStart(s);
}

function effectiveStatus(s, now = new Date()) {
  return isExpiredPending(s, now) ? 'Cancelled' : s.status;
}

/** The party who did NOT make the request confirms it. */
function canConfirm(s, role, now = new Date()) {
  return (
    s.status === 'Pending' &&
    !isExpiredPending(s, now) &&
    s.proposedBy !== null &&
    s.proposedBy !== role
  );
}

/** Declining a Pending request cancels it. */
function canDecline(s, role, now = new Date()) {
  return canConfirm(s, role, now);
}

/**
 * Scheduled: either side can cancel.
 * Pending: only the party who made the request can cancel it (the other side accepts or declines).
 */
function canCancel(s, role, now = new Date()) {
  if (s.status === 'Scheduled') return true;
  return s.status === 'Pending' && !isExpiredPending(s, now) && s.proposedBy === role;
}

/** Volunteer only, Scheduled only, never before the start time. */
function canComplete(s, role, now = new Date()) {
  return role === 'volunteer' && s.status === 'Scheduled' && now >= sessionStart(s);
}

/** Student only, Completed only, one review per session. */
function canGiveFeedback(s, role) {
  return role === 'student' && s.status === 'Completed' && !s.review;
}

/** Which side of the session the user is on, or null when they are not part of it. */
function roleOf(s, userId) {
  if (s.studentId === userId) return 'student';
  if (s.volunteerId === userId) return 'volunteer';
  return null;
}

const PAST_TENSE = { confirm: 'accepted', decline: 'declined' };
const VERB = { confirm: 'accept', decline: 'decline' };

/**
 * Why an action is refused: null when allowed, otherwise { status, message }.
 * 403 = wrong person, 409 = wrong state. Always agrees with the can* functions above.
 */
function denial(action, s, role, now = new Date()) {
  switch (action) {
    case 'confirm':
    case 'decline': {
      if (canConfirm(s, role, now)) return null;
      if (s.status !== 'Pending') {
        return { status: 409, message: `Only a pending request can be ${PAST_TENSE[action]}.` };
      }
      if (isExpiredPending(s, now)) return { status: 409, message: EXPIRED };
      return { status: 403, message: `You cannot ${VERB[action]} a request you made yourself.` };
    }
    case 'cancel': {
      if (canCancel(s, role, now)) return null;
      if (isExpiredPending(s, now)) return { status: 409, message: EXPIRED };
      if (s.status === 'Pending') {
        return { status: 403, message: 'Only the person who made the request can cancel it. Decline it instead.' };
      }
      return { status: 409, message: 'This session can no longer be cancelled.' };
    }
    case 'complete': {
      if (canComplete(s, role, now)) return null;
      if (role !== 'volunteer') return { status: 403, message: 'Only the volunteer can mark a session as completed.' };
      if (s.status !== 'Scheduled') return { status: 409, message: 'Only a scheduled session can be marked as completed.' };
      return { status: 409, message: 'A session cannot be completed before it starts.' };
    }
    case 'feedback': {
      if (canGiveFeedback(s, role)) return null;
      if (role !== 'student') return { status: 403, message: 'Only the student can leave feedback.' };
      if (s.status !== 'Completed') {
        return { status: 409, message: 'Feedback opens once the volunteer marks the session as completed.' };
      }
      return { status: 409, message: 'You have already left feedback for this session.' };
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

module.exports = {
  sessionStart,
  isExpiredPending,
  effectiveStatus,
  canConfirm,
  canDecline,
  canCancel,
  canComplete,
  canGiveFeedback,
  roleOf,
  denial,
};
