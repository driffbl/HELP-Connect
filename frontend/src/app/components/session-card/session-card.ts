import { Component, input } from '@angular/core';
import { SessionStatus } from '../../models/session.model';
import { Detail } from '../../utils/session-format';
import { StatusBadge } from '../status-badge/status-badge';

/**
 * The session card, laid out like the request card on the Student Requests page: a strip with the id on
 * the left, the category as the title in the middle and the status on the right. Below it, the details
 * sit on the left. Whatever is placed inside the tag goes in the box on the right, which changes with
 * the status (see SessionActions). It has no frame of its own.
 */
@Component({
  selector: 'app-session-card',
  imports: [StatusBadge],
  template: `
    <article class="request-card">
      <div class="strip">
        <span class="ref">#{{ ref() }}</span>
        <h2>{{ category() }}</h2>
        @if (status(); as st) {
          <app-status-badge class="state" [status]="st" />
        }
      </div>
      <div class="body">
        <dl class="rows">
          @for (d of details(); track d.label) {
            <div class="row">
              <dt>{{ d.label }}:</dt>
              <dd>{{ d.value }}</dd>
            </div>
          }
        </dl>
        <div class="side"><ng-content /></div>
      </div>
    </article>
  `,
  styles: [
    `
      .request-card {
        margin-bottom: 16px;
        overflow: hidden;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }
      .strip {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 12px;
        padding: 14px 24px;
        background: #f8fafc;
        border-bottom: 1px solid #e5e7eb;
      }
      .ref {
        color: #111827;
        font-size: 1.2rem;
        font-weight: 700;
      }
      h2 {
        margin: 0;
        color: #111827;
        font-size: 1.6rem;
        font-weight: 700;
        text-align: center;
      }
      .state {
        justify-self: end;
      }
      .body {
        display: grid;
        grid-template-columns: 1fr minmax(220px, 300px);
        gap: 24px;
        align-items: start;
        padding: 20px 24px;
      }
      .rows {
        margin: 0;
      }
      .row {
        display: grid;
        grid-template-columns: minmax(110px, 150px) 1fr;
        gap: 12px;
        margin-bottom: 10px;
      }
      dt {
        color: #374151;
        font-weight: 600;
      }
      dd {
        margin: 0;
        color: #4b5563;
        overflow-wrap: anywhere;
      }
      .side {
        align-self: center;
      }
      @media (max-width: 640px) {
        .strip {
          grid-template-columns: 1fr;
          justify-items: center;
        }
        .state {
          justify-self: center;
        }
        .body {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SessionCard {
  readonly ref = input.required<string>();
  readonly category = input.required<string>();
  readonly details = input<Detail[]>([]);
  readonly status = input<SessionStatus | null>(null);
}
