import { TestBed } from '@angular/core/testing';
import { Review, Session, UserRole } from '../models/session.model';
import { ApiError } from '../utils/api-error';
import { CurrentUser } from './current-user';
import { SessionApi } from './session-api';
import { SessionStore } from './session-store';

function fakeToken(userId: number): string {
  const part = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${part({ alg: 'HS256' })}.${part({ User_id: userId, Email: `u${userId}@x.y`, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
}

const review = (sessionId: number, rating: number): Review => ({
  id: sessionId * 10,
  sessionId,
  studentId: 11,
  volunteerId: 22,
  rating,
  comment: null,
  createdAt: '2020-06-01T00:00:00.000Z',
});

/** A session. Dates are far in the past or future so the tests do not depend on today's date. */
function make(id: number, overrides: Partial<Session> = {}): Session {
  return {
    id,
    studentId: 11,
    studentName: 'Sam',
    volunteerId: 22,
    volunteerName: 'Vera',
    title: `Session ${id}`,
    category: 'Academic Support',
    date: '2099-01-01',
    time: '10:00',
    mode: 'Virtual',
    status: 'Scheduled',
    proposedBy: null,
    createdAt: '2020-01-01T00:00:00.000Z',
    review: null,
    ...overrides,
  };
}

/** Stands in for SessionApi. The test decides what each call answers. */
class FakeApi {
  calls: string[] = [];
  byRole: Record<UserRole, Session[]> = { student: [], volunteer: [] };
  replies = new Map<string, Session>();
  failWith: ApiError | null = null;
  gate: Promise<void> | null = null;
  lastFeedback: { id: number; rating: number; comment: string | null } | null = null;

  async list(role: UserRole): Promise<Session[]> {
    this.calls.push(`list:${role}`);
    if (this.gate) await this.gate;
    this.maybeFail();
    return structuredClone(this.byRole[role]);
  }
  async get(id: number): Promise<Session> {
    this.calls.push(`get:${id}`);
    return this.answer(`get:${id}`, new ApiError(404, 'Session not found.'));
  }
  confirm(id: number) {
    return this.transition('confirm', id);
  }
  decline(id: number) {
    return this.transition('decline', id);
  }
  cancel(id: number) {
    return this.transition('cancel', id);
  }
  complete(id: number) {
    return this.transition('complete', id);
  }
  async addFeedback(id: number, rating: number, comment: string | null): Promise<Session> {
    this.lastFeedback = { id, rating, comment };
    return this.answer(
      `feedback:${id}`,
      new ApiError(409, 'You have already left feedback for this session.'),
    );
  }

  private async transition(action: string, id: number): Promise<Session> {
    this.calls.push(`${action}:${id}`);
    return this.answer(
      `${action}:${id}`,
      new ApiError(409, 'Only a pending request can be accepted.'),
    );
  }
  private answer(key: string, otherwise: ApiError): Session {
    this.maybeFail();
    const reply = this.replies.get(key);
    if (!reply) throw otherwise;
    return structuredClone(reply);
  }
  private maybeFail() {
    if (this.failWith) throw this.failWith;
  }
}

function setup(signedIn = true) {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: SessionApi, useClass: FakeApi }] });
  const me = TestBed.inject(CurrentUser);
  if (signedIn) {
    // One real account, who switches between Student and Volunteer mode.
    localStorage.setItem('token', fakeToken(11));
    me.refresh();
  }
  return {
    me,
    api: TestBed.inject(SessionApi) as unknown as FakeApi,
    store: TestBed.inject(SessionStore),
  };
}

describe('SessionStore loading', () => {
  it('starts empty and idle', () => {
    const { store } = setup();
    expect(store.status()).toBe('idle');
    expect(store.mySessions()).toEqual([]);
    expect(store.error()).toBe(null);
  });

  it('loads the list for the current mode', async () => {
    const { store, api } = setup();
    api.byRole.student = [make(1), make(2)];
    await store.refresh();
    expect(store.status()).toBe('ready');
    expect(store.mySessions().map((s) => s.id)).toEqual([1, 2]);
    expect(api.calls).toEqual(['list:student']);
  });

  it('does not call the server when nobody is signed in', async () => {
    const { store, api } = setup(false);
    await store.refresh();
    expect(api.calls).toEqual([]);
    expect(store.status()).toBe('idle');
  });

  it("keeps each mode's list separate and does not mix them up", async () => {
    const { store, api, me } = setup();
    api.byRole.student = [make(1)];
    api.byRole.volunteer = [make(2), make(3)];
    await store.refresh();

    me.setRole('volunteer');
    expect(store.mySessions()).toEqual([]);
    expect(store.status()).toBe('idle');
    await store.refresh();
    expect(store.mySessions().map((s) => s.id)).toEqual([2, 3]);

    me.setRole('student');
    expect(store.mySessions().map((s) => s.id)).toEqual([1]);
    expect(api.calls).toEqual(['list:student', 'list:volunteer']);
  });

  it('keeps the Student and Volunteer lists apart even when it is the same person', async () => {
    const { store, api, me } = setup(true);
    api.byRole.student = [make(1)];
    api.byRole.volunteer = [make(2)];
    await store.refresh();

    me.setRole('volunteer');
    expect(me.user().id).toBe(11);
    expect(store.mySessions()).toEqual([]);
    await store.refresh();
    expect(store.mySessions().map((s) => s.id)).toEqual([2]);

    me.setRole('student');
    expect(store.mySessions().map((s) => s.id)).toEqual([1]);
  });

  it('puts a slow answer into the list it was asked for, not the one on screen now', async () => {
    const { store, api, me } = setup();
    api.byRole.student = [make(1)];
    let release = () => {};
    api.gate = new Promise<void>((resolve) => (release = resolve));
    const slow = store.refresh();
    me.setRole('volunteer');
    release();
    await slow;
    expect(store.mySessions()).toEqual([]);
    me.setRole('student');
    expect(store.mySessions().map((s) => s.id)).toEqual([1]);
  });

  it('reports a failed load, keeps what it had, and clears the error on the next success', async () => {
    const { store, api } = setup();
    api.byRole.student = [make(1)];
    await store.refresh();

    api.failWith = new ApiError(0, 'Cannot reach the server. Is the backend running?');
    await store.refresh();
    expect(store.status()).toBe('error');
    expect(store.error()).toBe('Cannot reach the server. Is the backend running?');
    expect(store.mySessions().map((s) => s.id)).toEqual([1]);

    api.failWith = null;
    await store.refresh();
    expect(store.status()).toBe('ready');
    expect(store.error()).toBe(null);
  });
});

describe('SessionStore lists', () => {
  // 1 Pending (future)  2 Scheduled (future)  3 Completed + review  4 Completed, no review
  // 5 Cancelled         6 Pending, start already passed (shows as Cancelled)
  const sample = () => [
    make(1, { status: 'Pending', proposedBy: 'student' }),
    make(2),
    make(3, { status: 'Completed', date: '2020-03-01', review: review(3, 5) }),
    make(4, { status: 'Completed', date: '2020-02-01' }),
    make(5, { status: 'Cancelled', date: '2020-04-01' }),
    make(6, { status: 'Pending', proposedBy: 'student', date: '2020-05-01' }),
  ];

  it('My Sessions hides only Completed sessions that already have feedback', async () => {
    const { store, api } = setup();
    api.byRole.student = sample();
    await store.refresh();
    expect(store.activeSessions().map((s) => s.id)).toEqual([1, 2, 4, 5, 6]);
  });

  it('Past Sessions lists Completed and Cancelled, most recent first, expired Pending as Cancelled', async () => {
    const { store, api } = setup();
    api.byRole.student = sample();
    await store.refresh();
    expect(store.pastSessions().map((r) => r.session.id)).toEqual([6, 5, 3, 4]);
    expect(store.pastSessions()[0].status).toBe('Cancelled');
    expect(store.pastSessions()[2].review?.rating).toBe(5);
    expect(store.pastSessions()[3].review).toBe(null);
  });

  it('gives students no average rating', async () => {
    const { store, api } = setup();
    api.byRole.student = sample();
    await store.refresh();
    expect(store.averageRating()).toBe(null);
    expect(store.reviewCount()).toBe(0);
  });

  it('gives a volunteer the average of the ratings received', async () => {
    const { store, api, me } = setup();
    me.setRole('volunteer');
    api.byRole.volunteer = [
      make(3, { status: 'Completed', date: '2020-03-01', review: review(3, 5) }),
      make(4, { status: 'Completed', date: '2020-02-01', review: review(4, 4) }),
      make(5, { status: 'Completed', date: '2020-01-01' }),
    ];
    await store.refresh();
    expect(store.averageRating()).toBe(4.5);
    expect(store.reviewCount()).toBe(2);
  });
});

describe('SessionStore actions', () => {
  it("replaces the session in the list with the server's answer", async () => {
    const { store, api } = setup();
    api.byRole.student = [make(1, { status: 'Pending', proposedBy: 'student' })];
    await store.refresh();
    api.replies.set('confirm:1', make(1, { status: 'Scheduled', proposedBy: null }));

    const result = await store.confirm(1);
    expect(result.ok).toBe(true);
    expect(store.mySessions()[0].status).toBe('Scheduled');
  });

  it('calls the matching API method for each action', async () => {
    const { store, api } = setup();
    for (const action of ['confirm', 'decline', 'cancel', 'complete'] as const) {
      api.replies.set(`${action}:7`, make(7));
      await store[action](7);
    }
    expect(api.calls).toEqual(['confirm:7', 'decline:7', 'cancel:7', 'complete:7']);
  });

  it("returns the server's reason when an action is refused, and changes nothing", async () => {
    const { store, api } = setup();
    api.byRole.student = [make(1, { status: 'Pending', proposedBy: 'student' })];
    await store.refresh();

    const result = await store.confirm(1);
    expect(result).toEqual({
      ok: false,
      status: 409,
      error: 'Only a pending request can be accepted.',
    });
    expect(store.mySessions()[0].status).toBe('Pending');
  });

  it('reports an unreachable server as status 0', async () => {
    const { store, api } = setup();
    api.failWith = new ApiError(0, 'Cannot reach the server. Is the backend running?');
    const result = await store.cancel(1);
    expect(result).toEqual({
      ok: false,
      status: 0,
      error: 'Cannot reach the server. Is the backend running?',
    });
  });

  it('feedback sends a trimmed comment, or null when blank, and the session leaves My Sessions', async () => {
    const { store, api } = setup();
    api.byRole.student = [make(4, { status: 'Completed', date: '2020-02-01' })];
    await store.refresh();
    expect(store.activeSessions().map((s) => s.id)).toEqual([4]);

    api.replies.set(
      'feedback:4',
      make(4, { status: 'Completed', date: '2020-02-01', review: review(4, 5) }),
    );
    await store.addReview(4, 5, '   ');
    expect(api.lastFeedback).toEqual({ id: 4, rating: 5, comment: null });
    await store.addReview(4, 5, '  Great  ');
    expect(api.lastFeedback).toEqual({ id: 4, rating: 5, comment: 'Great' });

    expect(store.activeSessions()).toEqual([]);
    expect(store.pastSessions()[0].review?.rating).toBe(5);
  });

  it('fetch returns one session and refreshes its copy in the list', async () => {
    const { store, api } = setup();
    api.byRole.student = [make(1, { status: 'Pending', proposedBy: 'student' })];
    await store.refresh();
    api.replies.set('get:1', make(1, { status: 'Cancelled' }));

    const result = await store.fetch(1);
    expect(result.ok).toBe(true);
    expect(store.mySessions()[0].status).toBe('Cancelled');
  });

  it('fetch reports a session that does not exist', async () => {
    const { store } = setup();
    expect(await store.fetch(99)).toEqual({ ok: false, status: 404, error: 'Session not found.' });
  });
});
