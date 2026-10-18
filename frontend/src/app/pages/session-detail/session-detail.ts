import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthNotice } from '../../components/auth-notice/auth-notice';
import { ConfirmModal } from '../../components/confirm-modal/confirm-modal';
import { Panel } from '../../components/panel/panel';
import { SessionCard } from '../../components/session-card/session-card';
import { StarRating } from '../../components/star-rating/star-rating';
import { Session, UserRole } from '../../models/session.model';
import { Clock } from '../../services/clock';
import { CurrentUser } from '../../services/current-user';
import { ActionResult, SessionStore } from '../../services/session-store';
import { formatDay, sessionDetails, sessionRef } from '../../utils/session-format';
import * as rules from '../../utils/session-rules';

type PendingAction = 'cancel' | 'decline';
type LoadState = 'loading' | 'ready' | 'missing' | 'error';

@Component({
  imports: [RouterLink, AuthNotice, ConfirmModal, Panel, SessionCard, StarRating],
  selector: 'app-session-detail',
  styleUrl: './session-detail.css',
  templateUrl: './session-detail.html',
})
export class SessionDetail {
  private route = inject(ActivatedRoute);
  private auth = inject(CurrentUser);
  private store = inject(SessionStore);
  private clock = inject(Clock);

  private readonly id = Number(this.route.snapshot.paramMap.get('id'));
  /** Set per route in sessions.routes.ts, so Past Sessions can send the user back to itself. */
  protected readonly backLink =
    (this.route.snapshot.data['backLink'] as string | undefined) ?? '/sessions';
  private loadCount = 0;

  protected readonly signedIn = this.auth.signedIn;
  protected readonly session = signal<Session | null>(null);
  protected readonly loadState = signal<LoadState>('loading');
  protected readonly loadError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly pending = signal<PendingAction | null>(null);

  /** Which side of THIS session the signed-in person is on, worked out from who took part. */
  protected readonly role = computed<UserRole | null>(() => {
    const s = this.session();
    const me = this.auth.user().id;
    if (!s) return null;
    return s.studentId === me ? 'student' : s.volunteerId === me ? 'volunteer' : null;
  });

  protected readonly review = computed(() => this.session()?.review ?? null);

  protected readonly view = computed(() => {
    const s = this.session();
    const role = this.role();
    if (!s || !role) return null;
    return {
      session: s,
      ref: sessionRef(s.id),
      status: rules.effectiveStatus(s, this.clock.now()),
      details: sessionDetails(s, role),
      startsAt: `${formatDay(s.date)} at ${s.time}`,
    };
  });

  // These only decide which buttons to show. The server checks every action again.
  protected readonly canConfirm = computed(() => {
    const s = this.session();
    const role = this.role();
    return !!s && !!role && rules.canConfirm(s, role, this.clock.now());
  });
  protected readonly canCancel = computed(() => {
    const s = this.session();
    const role = this.role();
    return !!s && !!role && rules.canCancel(s, role, this.clock.now());
  });
  /** The Mark as Complete button is shown to the volunteer on Scheduled sessions... */
  protected readonly showComplete = computed(() => {
    const s = this.session();
    return !!s && this.role() === 'volunteer' && s.status === 'Scheduled';
  });
  /** ...but only enabled once the session has started. */
  protected readonly canComplete = computed(() => {
    const s = this.session();
    const role = this.role();
    return !!s && !!role && rules.canComplete(s, role, this.clock.now());
  });
  protected readonly canReview = computed(() => {
    const s = this.session();
    const role = this.role();
    return !!s && !!role && rules.canGiveFeedback(s, role, s.review !== null);
  });

  protected readonly modalTitle = computed(() =>
    this.pending() === 'decline' ? 'Decline this request?' : 'Cancel this session?',
  );
  protected readonly modalMessage = computed(() =>
    this.pending() === 'decline'
      ? 'Declining will cancel the session. This cannot be undone.'
      : 'Cancelling ends this session for both of you. This cannot be undone.',
  );

  constructor() {
    // Load again whenever the signed-in person changes (the Student/Volunteer switch).
    effect(() => {
      this.auth.user();
      untracked(() => {
        this.session.set(null);
        void this.load();
      });
    });
  }

  protected retry(): void {
    void this.load();
  }

  protected accept(): Promise<void> {
    return this.perform(
      () => this.store.confirm(this.id),
      'Request accepted. The session is now scheduled.',
    );
  }

  protected complete(): Promise<void> {
    return this.perform(
      () => this.store.complete(this.id),
      'Session marked as completed. The student can now leave feedback.',
    );
  }

  protected ask(action: PendingAction): void {
    this.pending.set(action);
  }

  protected async onConfirm(): Promise<void> {
    const action = this.pending();
    this.pending.set(null);
    if (action === 'decline') {
      await this.perform(
        () => this.store.decline(this.id),
        'Request declined. The session has been cancelled.',
      );
    } else if (action === 'cancel') {
      await this.perform(() => this.store.cancel(this.id), 'Session cancelled.');
    }
  }

  private async load(): Promise<void> {
    if (!this.auth.signedIn()) return;
    const turn = ++this.loadCount;
    this.loadState.set('loading');
    this.loadError.set(null);
    const result = await this.store.fetch(this.id);
    if (turn !== this.loadCount) return; // someone switched person meanwhile; ignore this answer
    if (result.ok) {
      this.session.set(result.session);
      this.loadState.set('ready');
    } else if (result.status === 404) {
      this.loadState.set('missing');
    } else {
      this.loadError.set(result.error);
      this.loadState.set('error');
    }
  }

  /** Runs one action. The server decides; its answer replaces what is on screen. */
  private async perform(run: () => Promise<ActionResult>, success: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.notice.set(null);
    const result = await run();
    this.busy.set(false);
    if (result.ok) {
      this.session.set(result.session);
      this.notice.set(success);
    } else {
      this.actionError.set(result.error);
    }
  }
}
