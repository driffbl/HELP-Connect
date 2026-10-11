import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Panel } from '../../components/panel/panel';
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
  imports: [DecimalPipe, RouterLink, Panel, SessionCard, StarRating],
  selector: 'app-past-sessions',
  styleUrl: './past-sessions.css',
  templateUrl: './past-sessions.html',
})
export class PastSessions {
  private auth = inject(CurrentUser);
  private store = inject(SessionStore);

  protected readonly role = computed(() => this.auth.user().role);
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
}
