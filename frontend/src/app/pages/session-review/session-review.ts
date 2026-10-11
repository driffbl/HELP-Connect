import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConfirmModal } from '../../components/confirm-modal/confirm-modal';
import { Panel } from '../../components/panel/panel';
import { StarRating } from '../../components/star-rating/star-rating';
import { CurrentUser } from '../../services/current-user';
import { SessionStore } from '../../services/session-store';
import { formatDay } from '../../utils/session-format';

@Component({
  imports: [RouterLink, ConfirmModal, Panel, StarRating],
  selector: 'app-session-review',
  styleUrl: './session-review.css',
  templateUrl: './session-review.html',
})
export class SessionReview {
  private route = inject(ActivatedRoute);
  private auth = inject(CurrentUser);
  private store = inject(SessionStore);

  protected readonly id = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly maxComment = 255;

  protected readonly session = computed(() => this.store.get(this.id));
  protected readonly rating = signal(0);
  protected readonly comment = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly submitted = signal(false);

  protected readonly sessionDate = computed(() => {
    const s = this.session();
    return s ? formatDay(s.date) : '';
  });

  /** Why the form can't be used right now, or null when it can. */
  protected readonly blockedReason = computed(() => {
    const s = this.session();
    if (!s) return null;
    if (this.auth.user().role !== 'student')
      return 'Only the student who took part can leave feedback.';
    if (s.status !== 'Completed')
      return 'Feedback opens once the volunteer marks the session as completed.';
    if (this.store.reviewFor(this.id)) return 'You have already reviewed this session.';
    return null;
  });

  protected onComment(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value);
  }

  protected submit(): void {
    if (this.rating() === 0) {
      this.error.set('Please select a star rating before submitting.');
      return;
    }
    const result = this.store.addReview(this.id, this.rating(), this.comment());
    if (result.ok) this.submitted.set(true);
    else this.error.set(result.error);
  }
}
