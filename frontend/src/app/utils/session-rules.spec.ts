import { Session } from '../models/session.model';
import {
  canCancel,
  canChooseAnotherVolunteer,
  canComplete,
  canConfirm,
  canDecline,
  canGiveFeedback,
  effectiveStatus,
  isExpiredPending,
  isInMySessions,
  isPast,
} from './session-rules';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    studentId: 1,
    studentName: 'Student',
    volunteerId: 2,
    volunteerName: 'Volunteer',
    title: 'Python Tutoring',
    category: 'Academic Support',
    date: '2026-10-12',
    time: '10:00',
    mode: 'Virtual',
    status: 'Scheduled',
    proposedBy: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    description: null,
    requestId: null,
    requestStatus: null,
    review: null,
    ...overrides,
  };
}

const beforeStart = new Date('2026-10-12T09:59:00');
const atStart = new Date('2026-10-12T10:00:00');

describe('session rules', () => {
  describe('confirming a Pending proposal', () => {
    const pending = makeSession({ status: 'Pending', proposedBy: 'student' });

    it('lets the other party confirm and decline', () => {
      expect(canConfirm(pending, 'volunteer', beforeStart)).toBe(true);
      expect(canDecline(pending, 'volunteer', beforeStart)).toBe(true);
    });
    it('does not let the proposer confirm their own proposal', () => {
      expect(canConfirm(pending, 'student', beforeStart)).toBe(false);
    });
    it('does not allow confirming once the start time has passed', () => {
      expect(canConfirm(pending, 'volunteer', atStart)).toBe(false);
    });
    it('does not allow confirming a session that is not Pending', () => {
      expect(
        canConfirm(
          makeSession({ status: 'Scheduled', proposedBy: 'student' }),
          'volunteer',
          beforeStart,
        ),
      ).toBe(false);
    });
  });

  describe('expiry', () => {
    it('treats an unanswered Pending session as Cancelled at its start time', () => {
      const pending = makeSession({ status: 'Pending', proposedBy: 'student' });
      expect(isExpiredPending(pending, beforeStart)).toBe(false);
      expect(isExpiredPending(pending, atStart)).toBe(true);
      expect(effectiveStatus(pending, atStart)).toBe('Cancelled');
      expect(effectiveStatus(pending, beforeStart)).toBe('Pending');
    });
    it('never expires a Scheduled session', () => {
      expect(effectiveStatus(makeSession(), atStart)).toBe('Scheduled');
    });
  });

  describe('cancelling', () => {
    const pending = makeSession({ status: 'Pending', proposedBy: 'student' });

    it('lets either side cancel a Scheduled session', () => {
      expect(canCancel(makeSession({ status: 'Scheduled' }), 'student', atStart)).toBe(true);
      expect(canCancel(makeSession({ status: 'Scheduled' }), 'volunteer', atStart)).toBe(true);
    });
    it('lets the student cancel their own Pending request', () => {
      expect(canCancel(pending, 'student', beforeStart)).toBe(true);
    });
    it('does not let the volunteer cancel a Pending request, they accept or decline it', () => {
      expect(canCancel(pending, 'volunteer', beforeStart)).toBe(false);
      expect(canDecline(pending, 'volunteer', beforeStart)).toBe(true);
    });
    it('lets only the proposer cancel a Pending proposal, whichever side proposed it', () => {
      const proposedByVolunteer = makeSession({ status: 'Pending', proposedBy: 'volunteer' });
      expect(canCancel(proposedByVolunteer, 'volunteer', beforeStart)).toBe(true);
      expect(canCancel(proposedByVolunteer, 'student', beforeStart)).toBe(false);
    });
    it('blocks expired Pending, Completed and Cancelled sessions for everyone', () => {
      expect(canCancel(pending, 'student', atStart)).toBe(false);
      expect(canCancel(makeSession({ status: 'Completed' }), 'student', atStart)).toBe(false);
      expect(canCancel(makeSession({ status: 'Completed' }), 'volunteer', atStart)).toBe(false);
      expect(canCancel(makeSession({ status: 'Cancelled' }), 'student', atStart)).toBe(false);
    });
  });

  describe('completing', () => {
    it('lets the volunteer complete a Scheduled session only from its start time', () => {
      expect(canComplete(makeSession(), 'volunteer', beforeStart)).toBe(false);
      expect(canComplete(makeSession(), 'volunteer', atStart)).toBe(true);
    });
    it('never lets the student complete a session', () => {
      expect(canComplete(makeSession(), 'student', atStart)).toBe(false);
    });
    it('does not allow completing a session that is not Scheduled', () => {
      expect(canComplete(makeSession({ status: 'Cancelled' }), 'volunteer', atStart)).toBe(false);
    });
  });

  describe('feedback', () => {
    const done = makeSession({ status: 'Completed' });

    it('lets the student review a Completed session once', () => {
      expect(canGiveFeedback(done, 'student', false)).toBe(true);
      expect(canGiveFeedback(done, 'student', true)).toBe(false);
    });
    it('blocks feedback before the session is Completed', () => {
      expect(canGiveFeedback(makeSession({ status: 'Scheduled' }), 'student', false)).toBe(false);
    });
    it('blocks the volunteer from reviewing', () => {
      expect(canGiveFeedback(done, 'volunteer', false)).toBe(false);
    });
  });
  describe('which list a session belongs to', () => {
    it('treats Completed and Cancelled as past', () => {
      expect(isPast(makeSession({ status: 'Completed' }), atStart)).toBe(true);
      expect(isPast(makeSession({ status: 'Cancelled' }), atStart)).toBe(true);
    });
    it('treats an expired Pending session as past because it shows as Cancelled', () => {
      const pending = makeSession({ status: 'Pending', proposedBy: 'student' });
      expect(isPast(pending, beforeStart)).toBe(false);
      expect(isPast(pending, atStart)).toBe(true);
    });
    it('does not treat Pending or Scheduled as past', () => {
      expect(isPast(makeSession({ status: 'Scheduled' }), atStart)).toBe(false);
    });
    it('keeps a Completed session in My Sessions only until feedback is given', () => {
      const done = makeSession({ status: 'Completed' });
      expect(isInMySessions(done, false, atStart)).toBe(true);
      expect(isInMySessions(done, true, atStart)).toBe(false);
    });
    it('keeps Cancelled, Pending and Scheduled sessions in My Sessions', () => {
      expect(isInMySessions(makeSession({ status: 'Cancelled' }), false, atStart)).toBe(true);
      expect(isInMySessions(makeSession({ status: 'Scheduled' }), false, atStart)).toBe(true);
      expect(
        isInMySessions(
          makeSession({ status: 'Pending', proposedBy: 'student' }),
          false,
          beforeStart,
        ),
      ).toBe(true);
    });
  });

  describe('canChooseAnotherVolunteer', () => {
    const declined = makeSession({ status: 'Cancelled', requestId: 4, requestStatus: 'Rejected' });
    it('lets the student pick someone else after a decline, before the requested time', () => {
      expect(canChooseAnotherVolunteer(declined, 'student', beforeStart)).toBe(true);
    });
    it('is false for the volunteer, at or after the start time, and without a rejected request', () => {
      expect(canChooseAnotherVolunteer(declined, 'volunteer', beforeStart)).toBe(false);
      expect(canChooseAnotherVolunteer(declined, 'student', atStart)).toBe(false);
      expect(
        canChooseAnotherVolunteer({ ...declined, requestStatus: 'Cancelled' }, 'student', beforeStart),
      ).toBe(false);
      expect(canChooseAnotherVolunteer({ ...declined, requestId: null }, 'student', beforeStart)).toBe(false);
      expect(canChooseAnotherVolunteer({ ...declined, status: 'Pending' }, 'student', beforeStart)).toBe(false);
    });
  });
});
