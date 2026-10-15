import { Component, input } from '@angular/core';
import { SessionStatus } from '../../models/session.model';
import { StatusBadge } from '../status-badge/status-badge';

/**
 * The request card from the wireframes: red strip (id + category), title, small grey lines and a status.
 * Anything placed inside the tag shows under the title row. Content marked `aside` replaces the status on the right.
 */
@Component({
  selector: 'app-session-card',
  imports: [StatusBadge],
  template: `
    <article class="request-card">
      <div class="top">
        <span>{{ ref() }}</span
        ><span>#{{ category() }}</span>
      </div>
      <div class="body">
        <div class="info">
          <h2>{{ title() }}</h2>
          @for (line of details(); track line) {
            <small>{{ line }}</small>
          }
        </div>
        @if (status(); as st) {
          <app-status-badge [status]="st" />
        }
        <ng-content select="[aside]" />
      </div>
      <ng-content />
    </article>
  `,
  styles: [
    `
      .request-card {
        margin-bottom: 16px;
        overflow: hidden;
        background: #fff;
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
      }
      .top {
        display: flex;
        justify-content: space-between;
        padding: 3px 14px;
        background: var(--brand, #ff5252);
        color: #fff;
        font-size: 0.8rem;
        font-weight: 700;
      }
      .body {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 14px 26px;
      }
      h2 {
        margin: 0 0 4px;
        color: var(--title-ink, #1f2a8a);
        font-size: 1.5rem;
        font-weight: 600;
      }
      small {
        display: block;
        color: var(--muted-ink, #6b6b6b);
        font-size: 0.75rem;
        font-weight: 600;
      }
    `,
  ],
})
export class SessionCard {
  readonly ref = input.required<string>();
  readonly category = input.required<string>();
  readonly title = input.required<string>();
  readonly details = input<string[]>([]);
  readonly status = input<SessionStatus | null>(null);
}
