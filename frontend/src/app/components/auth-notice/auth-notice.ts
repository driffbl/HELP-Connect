import { Component } from '@angular/core';

/** Shown instead of a page's content when nobody is signed in. Delete with the dev-token script when the real login is merged. */
@Component({
  selector: 'app-auth-notice',
  template: `
    <div class="notice" role="alert" data-testid="auth-notice">
      <strong>You are not signed in.</strong>
      <p>
        In the backend folder run <code>node scripts/dev-token.js</code> and open the link it
        prints.
      </p>
    </div>
  `,
  styles: [
    `
      .notice {
        padding: 12px 16px;
        border: 1px solid var(--status-pending, #b7791f);
        border-radius: 6px;
        background: #fff8e6;
        color: #5c3d00;
      }
      p {
        margin: 4px 0 0;
      }
    `,
  ],
})
export class AuthNotice {}
