import { Component, computed, input, output } from '@angular/core';
import { UserRole } from '../../models/session.model';
import {
  DEFAULT_FILTERS,
  FeedbackFilter,
  ModeFilter,
  PastFilters,
  SortKey,
  StatusFilter,
  isFiltered,
} from '../../utils/session-filter';

/**
 * The search box, filters and sort for the Past Sessions page. It holds no state of its own: the page
 * passes the current choices in and gets every change back as an event.
 * A student also sees "Feedback" (rated or not); a volunteer sees "Minimum rating".
 */
@Component({
  selector: 'app-session-filter-bar',
  template: `
    <form class="bar" role="search" aria-label="Filter and sort past sessions" (submit)="$event.preventDefault()">
      <label class="field wide">
        <span>Search</span>
        <input
          type="search"
          data-testid="filter-search"
          placeholder="Description, category or name"
          [value]="filters().search"
          (input)="onSearch($event)"
        />
      </label>

      <label class="field">
        <span>Status</span>
        <select data-testid="filter-status" [value]="filters().status" (change)="onStatus($event)">
          <option value="all">All</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </label>

      <label class="field">
        <span>Category</span>
        <select data-testid="filter-category" (change)="onCategory($event)">
          <option value="" [selected]="filters().category === ''">All</option>
          @for (c of categories(); track c) {
            <option [value]="c" [selected]="c === filters().category">{{ c }}</option>
          }
        </select>
      </label>

      <label class="field">
        <span>Support mode</span>
        <select data-testid="filter-mode" [value]="filters().mode" (change)="onMode($event)">
          <option value="all">All</option>
          <option value="Virtual">Virtual</option>
          <option value="Face-to-Face">Face-to-Face</option>
        </select>
      </label>

      <label class="field">
        <span>From</span>
        <input
          type="date"
          data-testid="filter-from"
          [value]="filters().from"
          [attr.max]="filters().to || null"
          (change)="onFrom($event)"
        />
      </label>

      <label class="field">
        <span>To</span>
        <input
          type="date"
          data-testid="filter-to"
          [value]="filters().to"
          [attr.min]="filters().from || null"
          (change)="onTo($event)"
        />
      </label>

      @if (role() === 'student') {
        <label class="field">
          <span>Feedback</span>
          <select data-testid="filter-feedback" [value]="filters().feedback" (change)="onFeedback($event)">
            <option value="all">All</option>
            <option value="rated">Rated</option>
            <option value="unrated">Not rated yet</option>
          </select>
        </label>
      } @else {
        <label class="field">
          <span>Minimum rating</span>
          <select data-testid="filter-rating" [value]="filters().minRating" (change)="onMinRating($event)">
            <option value="0">Any</option>
            <option value="5">5 stars</option>
            <option value="4">4 stars and up</option>
            <option value="3">3 stars and up</option>
            <option value="2">2 stars and up</option>
            <option value="1">1 star and up</option>
          </select>
        </label>
      }

      <label class="field">
        <span>Sort by</span>
        <select data-testid="sort" [value]="sort()" (change)="onSort($event)">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="rating-high">Highest rating</option>
          <option value="rating-low">Lowest rating</option>
          <option value="category">Category A–Z</option>
        </select>
      </label>

      <button
        type="button"
        class="clear"
        data-testid="clear-filters"
        [disabled]="!active()"
        (click)="clear()"
      >
        Clear filters
      </button>
    </form>
  `,
  styles: [
    `
      .bar {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px 12px;
        align-items: end;
        margin-bottom: 14px;
        padding: 12px 14px;
        border: 1px solid #d9d9d9;
        border-radius: 8px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .field.wide {
        grid-column: 1 / -1;
      }
      .field span {
        color: var(--muted-ink, #6b6b6b);
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      input,
      select {
        width: 100%;
        box-sizing: border-box;
        padding: 7px 8px;
        border: 1px solid #c9c9c9;
        border-radius: 6px;
        background: #fff;
        font: inherit;
        font-size: 0.9rem;
      }
      input:focus-visible,
      select:focus-visible,
      .clear:focus-visible {
        outline: 3px solid #1f2a8a;
        outline-offset: 2px;
      }
      .clear {
        padding: 8px 12px;
        border: 1px solid var(--brand, #e63946);
        border-radius: 6px;
        background: #fff;
        color: var(--brand, #e63946);
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }
      .clear:hover:not(:disabled) {
        background: var(--brand, #e63946);
        color: #fff;
      }
      .clear:disabled {
        border-color: #d1d5db;
        color: #9ca3af;
        cursor: not-allowed;
      }
    `,
  ],
})
export class SessionFilterBar {
  readonly filters = input.required<PastFilters>();
  readonly sort = input.required<SortKey>();
  readonly role = input.required<UserRole>();
  /** The categories that exist in the person's past sessions. */
  readonly categories = input<string[]>([]);

  readonly filtersChange = output<PastFilters>();
  readonly sortChange = output<SortKey>();

  protected readonly active = computed(() => isFiltered(this.filters()));

  private value(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }

  private set<K extends keyof PastFilters>(key: K, value: PastFilters[K]): void {
    this.filtersChange.emit({ ...this.filters(), [key]: value });
  }

  protected onSearch(e: Event): void {
    this.set('search', this.value(e));
  }
  protected onStatus(e: Event): void {
    this.set('status', this.value(e) as StatusFilter);
  }
  protected onCategory(e: Event): void {
    this.set('category', this.value(e));
  }
  protected onMode(e: Event): void {
    this.set('mode', this.value(e) as ModeFilter);
  }
  protected onFrom(e: Event): void {
    this.set('from', this.value(e));
  }
  protected onTo(e: Event): void {
    this.set('to', this.value(e));
  }
  protected onFeedback(e: Event): void {
    this.set('feedback', this.value(e) as FeedbackFilter);
  }
  protected onMinRating(e: Event): void {
    this.set('minRating', Number(this.value(e)));
  }
  protected onSort(e: Event): void {
    this.sortChange.emit(this.value(e) as SortKey);
  }
  protected clear(): void {
    this.filtersChange.emit({ ...DEFAULT_FILTERS });
  }
}
