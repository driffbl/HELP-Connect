import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  template: `
    <div
      class="stars"
      data-testid="star-rating"
      [attr.role]="readonly() ? 'img' : 'group'"
      [attr.aria-label]="readonly() ? value() + ' out of 5 stars' : 'Star rating'"
    >
      @for (n of stars; track n) {
        @if (readonly()) {
          <span class="star" [class.on]="n <= filled()">★</span>
        } @else {
          <button
            type="button"
            class="star"
            [class.on]="n <= filled()"
            [attr.data-testid]="'star-' + n"
            [attr.aria-label]="n + (n === 1 ? ' star' : ' stars')"
            [attr.aria-pressed]="n === value()"
            (click)="rated.emit(n)"
          >
            ★
          </button>
        }
      }
    </div>
  `,
  styles: [
    `
      .stars {
        display: inline-flex;
        gap: 2px;
      }
      .star {
        font-size: 1.8rem;
        line-height: 1;
        padding: 0 2px;
        border: 0;
        background: none;
        color: #cfcfcf;
      }
      button.star {
        cursor: pointer;
      }
      button.star:focus-visible {
        outline: 3px solid var(--brand, #e63946);
        outline-offset: 2px;
        border-radius: 4px;
      }
      .on {
        color: #f5a623;
      }
    `,
  ],
})
export class StarRating {
  readonly value = input(0);
  readonly readonly = input(false);
  readonly rated = output<number>();

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly filled = computed(() => Math.round(this.value()));
}
