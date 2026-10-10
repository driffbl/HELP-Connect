import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Panel } from '../../components/panel/panel';
import { SessionCard } from '../../components/session-card/session-card';
import { StarRating } from '../../components/star-rating/star-rating';
import { MockAuth } from '../../services/mock-auth';
import { SessionStore } from '../../services/session-store';
import { formatDay, sessionRef } from '../../utils/session-format';

@Component({
  imports: [DecimalPipe, Panel, SessionCard, StarRating],
  selector: 'app-volunteer-reviews',
  styleUrl: './volunteer-reviews.css',
  templateUrl: './volunteer-reviews.html',
})
export class VolunteerReviews {
  private auth = inject(MockAuth);
  private store = inject(SessionStore);

  protected readonly role = computed(() => this.auth.currentUser().role);
  protected readonly average = this.store.averageRating;
  protected readonly reviewCount = this.store.reviewCount;

  protected readonly rows = computed(() =>
    this.store.volunteerHistory().map((r) => ({
      session: r.session,
      review: r.review,
      ref: sessionRef(r.session.id),
      details: [`Completed: ${formatDay(r.session.date)}`, `Student: ${r.session.studentName}`],
    })),
  );
}
