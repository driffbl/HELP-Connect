import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConfirmModal } from '../../components/confirm-modal/confirm-modal';
import { Panel } from '../../components/panel/panel';
import { SessionCard } from '../../components/session-card/session-card';
import { StarRating } from '../../components/star-rating/star-rating';
import { Clock } from '../../services/clock';
import { CurrentUser } from '../../services/current-user';
import { SessionStore } from '../../services/session-store';
import { formatDay, sessionDetails, sessionRef } from '../../utils/session-format';
import * as rules from '../../utils/session-rules';

type PendingAction = 'cancel' | 'decline';

@Component({
  imports: [RouterLink, ConfirmModal, Panel, SessionCard, StarRating],
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

  protected readonly role = computed(() => this.auth.user().role);
  protected readonly session = computed(() => this.store.get(this.id));
  protected readonly review = computed(() => this.store.reviewFor(this.id));
  protected readonly notice = signal<string | null>(null);
  protected readonly pending = signal<PendingAction | null>(null);

  protected readonly view = computed(() => {
    const s = this.session();
    if (!s) return null;
    return {
      session: s,
      ref: sessionRef(s.id),
      status: rules.effectiveStatus(s, this.clock.now()),
      details: sessionDetails(s, this.role()),
      startsAt: `${formatDay(s.date)} at ${s.time}`,
    };
  });

  protected readonly canConfirm = computed(() => {
    const s = this.session();
    return !!s && rules.canConfirm(s, this.role(), this.clock.now());
  });
  protected readonly canCancel = computed(() => {
    const s = this.session();
    return !!s && rules.canCancel(s, this.role(), this.clock.now());
  });
  /** The Mark as Complete button is shown to the volunteer on Scheduled sessions... */
  protected readonly showComplete = computed(() => {
    const s = this.session();
    return !!s && this.role() === 'volunteer' && s.status === 'Scheduled';
  });
  /** ...but only enabled once the session has started. */
  protected readonly canComplete = computed(() => {
    const s = this.session();
    return !!s && rules.canComplete(s, this.role(), this.clock.now());
  });
  protected readonly canReview = computed(() => {
    const s = this.session();
    return !!s && rules.canGiveFeedback(s, this.role(), this.review() !== undefined);
  });

  protected readonly modalTitle = computed(() =>
    this.pending() === 'decline' ? 'Decline this request?' : 'Cancel this session?',
  );
  protected readonly modalMessage = computed(() =>
    this.pending() === 'decline'
      ? 'Declining will cancel the session. This cannot be undone.'
      : 'Cancelling ends this session for both of you. This cannot be undone.',
  );

  protected accept(): void {
    this.store.confirm(this.id);
    this.notice.set('Request accepted. The session is now scheduled.');
  }

  protected complete(): void {
    this.store.complete(this.id);
    this.notice.set('Session marked as completed. The student can now leave feedback.');
  }

  protected ask(action: PendingAction): void {
    this.pending.set(action);
  }

  protected onConfirm(): void {
    const action = this.pending();
    if (action === 'decline') {
      this.store.decline(this.id);
      this.notice.set('Request declined. The session has been cancelled.');
    } else if (action === 'cancel') {
      this.store.cancel(this.id);
      this.notice.set('Session cancelled.');
    }
    this.pending.set(null);
  }
}
