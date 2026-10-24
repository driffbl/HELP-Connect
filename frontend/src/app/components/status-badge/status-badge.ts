import { Component, input } from '@angular/core';
import { SessionStatus } from '../../models/session.model';

@Component({
  selector: 'app-status-badge',
  template: `<span class="status" [class]="status().toLowerCase()" data-testid="status-badge">{{
    status()
  }}</span>`,
  styles: [
    `
      .badge {
        font-size: 1.1rem;
        font-weight: 700;
      }
      .pending {
        color: #d97706;
      }
      .scheduled {
        color: #15803d;
      }
      .completed {
        color: #1d4ed8;
      }
      .cancelled {
        color: #b91c1c;
      }
    `,
  ],
})
export class StatusBadge {
  readonly status = input.required<SessionStatus>();
}
