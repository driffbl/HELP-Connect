import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Shown instead of a page's content when nobody is signed in. Points to Coel's login page. */
@Component({
  selector: 'app-auth-notice',
  imports: [RouterLink],
  template: `
    <div class="notice" role="alert" data-testid="auth-notice">
      <strong>You are not signed in.</strong>
      <p><a routerLink="/login">Log in</a> to see your sessions.</p>
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
