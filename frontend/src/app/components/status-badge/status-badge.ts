import { Component, input } from '@angular/core';
import { SessionStatus } from '../../models/session.model';

@Component({
  selector: 'app-status-badge',
  template: `<span class="status" [class]="status().toLowerCase()" data-testid="status-badge">{{
    status()
  }}</span>`,
  styles: [
    `
      .status {
        font-weight: 700;
        font-size: 1.1rem;
        white-space: nowrap;
      }
      .pending {
        color: var(--status-pending, #b7791f);
      }
      .scheduled {
        color: var(--status-scheduled, #16a34a);
      }
      .completed {
        color: var(--status-completed, #2563eb);
      }
      .cancelled {
        color: var(--status-cancelled, #dc2626);
      }
    `,
  ],
})
export class StatusBadge {
  readonly status = input.required<SessionStatus>();
}
