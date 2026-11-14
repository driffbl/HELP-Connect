import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthNotice } from '../../components/auth-notice/auth-notice';
import { Panel } from '../../components/panel/panel';
import { SessionActions } from '../../components/session-actions/session-actions';
import { SessionCard } from '../../components/session-card/session-card';
import { SessionFilterBar } from '../../components/session-filter-bar/session-filter-bar';
import { StarRating } from '../../components/star-rating/star-rating';
import { CurrentUser } from '../../services/current-user';
import { SessionStore } from '../../services/session-store';
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  PastFilters,
  SortKey,
  categoriesOf,
  filterRows,
  isFiltered,
  sortRows,
  summarize,
} from '../../utils/session-filter';
import { sessionDetails, sessionRef } from '../../utils/session-format';

/** How many cards show at first, and how many more each "Show more" adds. */
const PAGE_SIZE = 5;

/**
 * Past Sessions: completed and cancelled sessions with the feedback attached.
 * A summary strip (totals and average rating) sits on top, then the filter bar and the cards.
 * Volunteers see the ratings they received; students see the feedback they gave.
 */
@Component({
  imports: [
    DecimalPipe,
    AuthNotice,
    Panel,
    SessionActions,
    SessionCard,
    SessionFilterBar,
    StarRating,
  ],
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

  protected readonly filters = signal<PastFilters>({ ...DEFAULT_FILTERS });
  protected readonly sort = signal<SortKey>(DEFAULT_SORT);
  private readonly visible = signal(PAGE_SIZE);

  /** Every past session of this person in this mode. The summary always counts all of them. */
  private readonly all = computed(() => this.store.pastSessions());
  protected readonly total = computed(() => this.all().length);
  protected readonly summary = computed(() => summarize(this.all()));
  protected readonly categories = computed(() => categoriesOf(this.all()));

  /** The sessions that match the filters, in the chosen order. */
  protected readonly matching = computed(() =>
    sortRows(filterRows(this.all(), this.filters(), this.role()), this.sort()),
  );
  protected readonly remaining = computed(() => Math.max(0, this.matching().length - this.visible()));
  protected readonly isFiltered = computed(() => isFiltered(this.filters()));

  protected readonly ratingLabel = computed(() =>
    this.role() === 'volunteer' ? 'Average rating' : 'Average rating given',
  );
  protected readonly ratingNoun = computed(() => {
    const n = this.summary().ratingCount;
    const noun = this.role() === 'volunteer' ? 'review' : 'rating';
    return `${n} ${noun}${n === 1 ? '' : 's'}`;
  });

  /** The cards on screen: the first `visible` of the matching sessions. */
  protected readonly rows = computed(() => {
    const role = this.role();
    return this.matching()
      .slice(0, this.visible())
      .map((r) => ({
        session: r.session,
        status: r.status,
        review: r.review,
        ref: sessionRef(r.session.id),
        details: sessionDetails(r.session, role),
      }));
  });

  constructor() {
    // Load whenever the person or the Student/Volunteer mode changes, and start from a clean view.
    effect(() => {
      this.auth.user();
      untracked(() => {
        this.resetView();
        void this.store.refresh();
      });
    });
  }

  protected setFilters(next: PastFilters): void {
    this.filters.set(next);
    this.visible.set(PAGE_SIZE);
  }

  protected setSort(next: SortKey): void {
    this.sort.set(next);
    this.visible.set(PAGE_SIZE);
  }

  protected clearFilters(): void {
    this.setFilters({ ...DEFAULT_FILTERS });
  }

  protected showMore(): void {
    this.visible.update((n) => n + PAGE_SIZE);
  }

  protected retry(): void {
    void this.store.refresh();
  }

  private resetView(): void {
    this.filters.set({ ...DEFAULT_FILTERS });
    this.sort.set(DEFAULT_SORT);
    this.visible.set(PAGE_SIZE);
  }
}
