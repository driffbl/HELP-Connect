import { Service, computed, inject, signal } from '@angular/core';
import { Review, Session, SessionStatus } from '../models/session.model';
import { ApiError, toApiError } from '../utils/api-error';
import { effectiveStatus, isInMySessions, isPast, sessionStart } from '../utils/session-rules';
import { Clock } from './clock';
import { CurrentUser } from './current-user';
import { SessionApi } from './session-api';

export type ListStatus = 'idle' | 'loading' | 'ready' | 'error';

/** The result of something the user did. The error is a message fit to show. status 0 = server unreachable. */
export type ActionResult =
  { ok: true; session: Session } | { ok: false; status: number; error: string };

/** A past (Completed or Cancelled) session, its status as it should be shown, and the review if any. */
export interface HistoryRow {
  session: Session;
  status: SessionStatus;
  review: Review | null;
}

interface ListState {
  status: ListStatus;
  sessions: Session[];
  error: string | null;
}

const IDLE: ListState = { status: 'idle', sessions: [], error: null };

/**
 * What the app knows about the current user's sessions. The backend is the source of truth: this only
 * keeps a copy so the pages can show it and update when something changes. Lists are kept per
 * person and mode, so switching Student/Volunteer never shows the other side's data.
 */
@Service()
export class SessionStore {
  private api = inject(SessionApi);
  private auth = inject(CurrentUser);
  private clock = inject(Clock);

  private readonly lists = signal<Readonly<Record<string, ListState>>>({});
  private readonly key = computed(() => {
    const u = this.auth.user();
    return `${u.id}:${u.role}`;
  });
  private readonly current = computed(() => this.lists()[this.key()] ?? IDLE);

  readonly status = computed(() => this.current().status);
  readonly error = computed(() => this.current().error);

  /** Every session in the current list, newest first, as the server sent them. */
  readonly mySessions = computed(() => this.current().sessions);

  /** My Sessions: everything except a Completed session that already has feedback. */
  readonly activeSessions = computed(() => {
    const now = this.clock.now();
    return this.mySessions().filter((s) => isInMySessions(s, s.review !== null, now));
  });

  /** Past Sessions: Completed and Cancelled (including expired Pending), most recent first. */
  readonly pastSessions = computed<HistoryRow[]>(() => {
    const now = this.clock.now();
    return this.mySessions()
      .filter((s) => isPast(s, now))
      .sort((a, b) => sessionStart(b).getTime() - sessionStart(a).getTime())
      .map((s) => ({ session: s, status: effectiveStatus(s, now), review: s.review }));
  });

  /** Loads the current user's list for the current mode. Does nothing when nobody is signed in. */
  async refresh(): Promise<void> {
    if (!this.auth.signedIn()) return;
    const key = this.key();
    const role = this.auth.user().role;
    this.setList(key, { ...(this.lists()[key] ?? IDLE), status: 'loading', error: null });
    try {
      const sessions = await this.api.list(role);
      this.setList(key, { status: 'ready', sessions, error: null });
    } catch (err) {
      this.setList(key, {
        ...(this.lists()[key] ?? IDLE),
        status: 'error',
        error: toApiError(err).message,
      });
    }
  }

  /** One session straight from the server. Also refreshes its copy in any list that holds it. */
  fetch(id: number): Promise<ActionResult> {
    return this.run(() => this.api.get(id));
  }

  confirm(id: number): Promise<ActionResult> {
    return this.run(() => this.api.confirm(id));
  }

  decline(id: number): Promise<ActionResult> {
    return this.run(() => this.api.decline(id));
  }

  cancel(id: number): Promise<ActionResult> {
    return this.run(() => this.api.cancel(id));
  }

  complete(id: number): Promise<ActionResult> {
    return this.run(() => this.api.complete(id));
  }

  addReview(id: number, rating: number, comment: string): Promise<ActionResult> {
    return this.run(() =>
      this.api.addFeedback(id, rating, comment.trim() === '' ? null : comment.trim()),
    );
  }

  private async run(call: () => Promise<Session>): Promise<ActionResult> {
    try {
      const session = await call();
      this.applyUpdate(session);
      return { ok: true, session };
    } catch (err) {
      const e: ApiError = toApiError(err);
      return { ok: false, status: e.status, error: e.message };
    }
  }

  /** Replaces the session in every list that already holds it, so all pages agree. */
  private applyUpdate(session: Session): void {
    const next: Record<string, ListState> = {};
    for (const [key, state] of Object.entries(this.lists())) {
      next[key] = state.sessions.some((s) => s.id === session.id)
        ? { ...state, sessions: state.sessions.map((s) => (s.id === session.id ? session : s)) }
        : state;
    }
    this.lists.set(next);
  }

  private setList(key: string, state: ListState): void {
    this.lists.set({ ...this.lists(), [key]: state });
  }
}
