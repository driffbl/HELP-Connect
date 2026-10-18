import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthNotice } from '../../components/auth-notice/auth-notice';
import { ConfirmModal } from '../../components/confirm-modal/confirm-modal';
import { Panel } from '../../components/panel/panel';
import { StarRating } from '../../components/star-rating/star-rating';
import { Session, UserRole } from '../../models/session.model';
import { CurrentUser } from '../../services/current-user';
import { SessionStore } from '../../services/session-store';
import { formatDay } from '../../utils/session-format';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

@Component({
  imports: [RouterLink, AuthNotice, ConfirmModal, Panel, StarRating],
  selector: 'app-session-review',
  styleUrl: './session-review.css',
  templateUrl: './session-review.html',
})
export class SessionReview {
  private route = inject(ActivatedRoute);
  private auth = inject(CurrentUser);
  private store = inject(SessionStore);
  private loadCount = 0;

  protected readonly id = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly maxComment = 255;

  protected readonly signedIn = this.auth.signedIn;
  protected readonly session = signal<Session | null>(null);
  protected readonly loadState = signal<LoadState>('loading');
  protected readonly loadError = signal<string | null>(null);
  protected readonly rating = signal(0);
  protected readonly comment = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly submitted = signal(false);

  /** Which side of THIS session the signed-in person is on, worked out from who took part. */
  private readonly role = computed<UserRole | null>(() => {
    const s = this.session();
    const me = this.auth.user().id;
    if (!s) return null;
    return s.studentId === me ? 'student' : s.volunteerId === me ? 'volunteer' : null;
  });

  protected readonly sessionDate = computed(() => {
    const s = this.session();
    return s ? formatDay(s.date) : '';
  });

  /** Why the form can't be used right now, or null when it can. (The server checks again on submit.) */
  protected readonly blockedReason = computed(() => {
    const s = this.session();
    if (!s) return null;
    if (this.role() !== 'student') return 'Only the student who took part can leave feedback.';
    if (s.status !== 'Completed')
      return 'Feedback opens once the volunteer marks the session as completed.';
    if (s.review) return 'You have already reviewed this session.';
    return null;
  });

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

  protected onComment(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value);
  }

  protected async submit(): Promise<void> {
    if (this.busy()) return;
    if (this.rating() === 0) {
      this.error.set('Please select a star rating before submitting.');
      return;
    }
    this.busy.set(true);
    const result = await this.store.addReview(this.id, this.rating(), this.comment());
    this.busy.set(false);
    if (result.ok) {
      this.session.set(result.session);
      this.submitted.set(true);
    } else {
      this.error.set(result.error);
    }
  }

  private async load(): Promise<void> {
    if (!this.auth.signedIn()) return;
    const turn = ++this.loadCount;
    this.loadState.set('loading');
    this.loadError.set(null);
    const result = await this.store.fetch(this.id);
    if (turn !== this.loadCount) return;
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
}
