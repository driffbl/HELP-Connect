import { TestBed } from '@angular/core/testing';
import { CurrentUser } from './current-user';
import { SessionStore } from './session-store';

// Relies on the seed data in session-store.ts:
//  1 Pending (student-proposed, future)   2 Scheduled (tomorrow)    3 Scheduled (already started)
//  4 Completed + review 5 stars           5 Cancelled                6 Pending, already expired
//  7 Completed, no review                 8 Completed + review 4 stars
// Newest submitted first: 1, 6, 2, 3, 7, 4, 5, 8

describe('SessionStore', () => {
  let store: SessionStore;
  let me: CurrentUser;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(SessionStore);
    me = TestBed.inject(CurrentUser);
  });

  describe('session list', () => {
    it('shows the student their sessions, newest submitted first', () => {
      expect(store.mySessions().length).toBe(8);
      expect(store.mySessions()[0].id).toBe(1);
    });
    it('shows the volunteer the sessions assigned to them', () => {
      me.setRole('volunteer');
      expect(store.mySessions().length).toBe(8);
    });
    it('does not return a session the user is not part of', () => {
      expect(store.get(999)).toBe(undefined);
    });
  });

  describe('My Sessions list', () => {
    it('hides Completed sessions that already have feedback', () => {
      expect(store.activeSessions().map((s) => s.id)).toEqual([1, 6, 2, 3, 7, 5]);
    });
    it('shows the same list to the volunteer', () => {
      me.setRole('volunteer');
      expect(store.activeSessions().map((s) => s.id)).toEqual([1, 6, 2, 3, 7, 5]);
    });
    it('keeps a Completed session until feedback is given, then drops it', () => {
      expect(store.activeSessions().some((s) => s.id === 7)).toBe(true);
      store.addReview(7, 4, '');
      expect(store.activeSessions().some((s) => s.id === 7)).toBe(false);
    });
    it('keeps Cancelled sessions in the list', () => {
      expect(store.activeSessions().some((s) => s.id === 5)).toBe(true);
      expect(store.activeSessions().some((s) => s.id === 6)).toBe(true);
    });
  });

  describe('status changes', () => {
    it('lets the volunteer accept a student-proposed Pending session', () => {
      me.setRole('volunteer');
      store.confirm(1);
      expect(store.get(1)?.status).toBe('Scheduled');
      expect(store.get(1)?.proposedBy).toBe(null);
    });
    it('does not let the student accept their own proposal', () => {
      store.confirm(1);
      expect(store.get(1)?.status).toBe('Pending');
    });
    it('does not complete a session before it starts', () => {
      me.setRole('volunteer');
      store.complete(2);
      expect(store.get(2)?.status).toBe('Scheduled');
    });
    it('completes a session that has started', () => {
      me.setRole('volunteer');
      store.complete(3);
      expect(store.get(3)?.status).toBe('Completed');
    });
    it('does not let the student complete a session', () => {
      store.complete(3);
      expect(store.get(3)?.status).toBe('Scheduled');
    });
    it('lets either side cancel a Scheduled session', () => {
      store.cancel(2);
      expect(store.get(2)?.status).toBe('Cancelled');
    });
    it('lets the student cancel their own Pending request', () => {
      store.cancel(1);
      expect(store.get(1)?.status).toBe('Cancelled');
    });
    it('does not let the volunteer cancel a Pending request', () => {
      me.setRole('volunteer');
      store.cancel(1);
      expect(store.get(1)?.status).toBe('Pending');
    });
    it('lets the volunteer decline a Pending request, which cancels it', () => {
      me.setRole('volunteer');
      store.decline(1);
      expect(store.get(1)?.status).toBe('Cancelled');
    });
    it('does not cancel a Completed session', () => {
      store.cancel(4);
      expect(store.get(4)?.status).toBe('Completed');
    });
    it('does not decline an expired Pending session', () => {
      me.setRole('volunteer');
      store.decline(6);
      expect(store.get(6)?.status).toBe('Pending');
    });
  });

  describe('feedback', () => {
    it('is refused before the session is Completed', () => {
      expect(store.addReview(2, 5, '').ok).toBe(false);
    });
    it('is refused without a valid star rating', () => {
      expect(store.addReview(7, 0, '').ok).toBe(false);
      expect(store.addReview(7, 6, '').ok).toBe(false);
      expect(store.addReview(7, 3.5, '').ok).toBe(false);
    });
    it('is saved with the rating and a trimmed comment', () => {
      expect(store.addReview(7, 3, '  helpful  ').ok).toBe(true);
      expect(store.reviewFor(7)?.rating).toBe(3);
      expect(store.reviewFor(7)?.comment).toBe('helpful');
    });
    it('stores a blank comment as null because comments are optional', () => {
      store.addReview(7, 4, '   ');
      expect(store.reviewFor(7)?.comment).toBe(null);
    });
    it('can only be submitted once per session', () => {
      expect(store.addReview(4, 5, 'again').ok).toBe(false);
      store.addReview(7, 3, '');
      expect(store.addReview(7, 5, '').ok).toBe(false);
    });
    it('is refused for a volunteer', () => {
      me.setRole('volunteer');
      expect(store.addReview(7, 5, '').ok).toBe(false);
    });
  });

  describe('past sessions', () => {
    it('lists Completed and Cancelled sessions, most recent session first', () => {
      expect(store.pastSessions().map((r) => r.session.id)).toEqual([6, 7, 5, 4, 8]);
    });
    it('shows an expired Pending session as Cancelled', () => {
      expect(store.pastSessions()[0].status).toBe('Cancelled');
    });
    it('attaches the feedback the student submitted to Completed sessions', () => {
      const rows = store.pastSessions();
      expect(rows.find((r) => r.session.id === 4)?.review?.rating).toBe(5);
      expect(rows.find((r) => r.session.id === 7)?.review).toBe(null);
    });
    it('lists the same sessions for the volunteer', () => {
      me.setRole('volunteer');
      expect(store.pastSessions().map((r) => r.session.id)).toEqual([6, 7, 5, 4, 8]);
    });
    it('moves a session here when it is cancelled', () => {
      expect(store.pastSessions().some((r) => r.session.id === 2)).toBe(false);
      store.cancel(2);
      expect(store.pastSessions().some((r) => r.session.id === 2)).toBe(true);
    });
    it('does not list Pending or Scheduled sessions', () => {
      const ids = store.pastSessions().map((r) => r.session.id);
      expect(ids.includes(1)).toBe(false);
      expect(ids.includes(3)).toBe(false);
    });
    it('gives students no average rating', () => {
      expect(store.averageRating()).toBe(null);
      expect(store.reviewCount()).toBe(0);
    });
    it('gives a volunteer the average of the ratings received', () => {
      me.setRole('volunteer');
      expect(store.averageRating()).toBe(4.5);
      expect(store.reviewCount()).toBe(2);
    });
    it('updates the volunteer average when a new review arrives', () => {
      store.addReview(7, 3, '');
      me.setRole('volunteer');
      expect(store.averageRating()).toBe(4);
      expect(store.reviewCount()).toBe(3);
    });
  });
});
