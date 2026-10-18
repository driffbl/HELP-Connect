import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrentUser } from '../../services/current-user';

/**
 * DEVELOPMENT ONLY. Signs in as the two test users from a link made by backend/scripts/dev-token.js:
 * http://localhost:4200/dev-login#student=<token>&volunteer=<token>
 * Delete this page, its route and the script when the real login is merged.
 */
@Component({
  selector: 'app-dev-login',
  template: `
    <main class="dev">
      <h1>Development sign-in</h1>
      <p data-testid="dev-login-message">{{ message() }}</p>
    </main>
  `,
  styles: [
    `
      .dev {
        max-width: 560px;
        margin: 48px auto;
        padding: 0 16px;
      }
    `,
  ],
})
export class DevLogin {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(CurrentUser);

  protected readonly message = signal('Signing in…');

  constructor() {
    const params = new URLSearchParams(this.route.snapshot.fragment ?? '');
    const student = params.get('student');
    const volunteer = params.get('volunteer');
    if (student && volunteer && this.auth.useDevTokens({ student, volunteer })) {
      // replaceUrl keeps the tokens out of the browser history
      void this.router.navigateByUrl('/sessions', { replaceUrl: true });
    } else {
      this.message.set(
        'This link is missing its tokens or they have expired. Run node scripts/dev-token.js in the backend folder and open the new link.',
      );
    }
  }
}
