import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, untracked } from '@angular/core';
import { AuthNotice } from '../../components/auth-notice/auth-notice';
import { Panel } from '../../components/panel/panel';
import { SessionActions } from '../../components/session-actions/session-actions';
import { SessionCard } from '../../components/session-card/session-card';
import { StarRating } from '../../components/star-rating/star-rating';
import { CurrentUser } from '../../services/current-user';
import { SessionStore } from '../../services/session-store';
import { sessionDetails, sessionRef } from '../../utils/session-format';

/**
 * Past Sessions: completed sessions with the feedback attached.
 * Volunteers also see their average rating. Students see the feedback they submitted.
 */
@Component({
  imports: [DecimalPipe, AuthNotice, Panel, SessionActions, SessionCard, StarRating],
  selector: 'app-past-sessions',
  styleUrl: './past-sessions.css',
  templateUrl: './past-sessions.html',
})
export class PastSessions {
  private auth = inject(CurrentUser);
  private store = inject(SessionStore);

  protected readonly role = computed(() => this.auth.user().role);
  protected readonly signedIn = this.auth.signedIn;
  protected readonly status = this.store.status;
  protected readonly error = this.store.error;
  protected readonly average = this.store.averageRating;
  protected readonly reviewCount = this.store.reviewCount;

  protected readonly rows = computed(() => {
    const role = this.role();
    return this.store.pastSessions().map((r) => ({
      session: r.session,
      status: r.status,
      review: r.review,
      ref: sessionRef(r.session.id),
      details: sessionDetails(r.session, role),
    }));
  });

  constructor() {
    // Load whenever the person or the Student/Volunteer mode changes.
    effect(() => {
      this.auth.user();
      untracked(() => void this.store.refresh());
    });
  }

  protected retry(): void {
    void this.store.refresh();
  }
}
