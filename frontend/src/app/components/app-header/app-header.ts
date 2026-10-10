import { Component, computed, inject } from '@angular/core';
import { MockAuth } from '../../services/mock-auth';

/** Top bar from the wireframes. The Student/Volunteer pill drives the mock login for now. */
@Component({
  selector: 'app-header',
  template: `
    <header class="bar">
      <span class="brand" data-testid="brand">HELP Connect</span>
      <div class="right">
        <div class="toggle" role="group" aria-label="Switch role">
          <button
            type="button"
            data-testid="role-volunteer"
            [class.active]="role() === 'volunteer'"
            (click)="auth.setRole('volunteer')"
          >
            Volunteer
          </button>
          <button
            type="button"
            data-testid="role-student"
            [class.active]="role() === 'student'"
            (click)="auth.setRole('student')"
          >
            Student
          </button>
        </div>
        <button type="button" class="icon" aria-label="Notifications" data-testid="notifications">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        <button type="button" class="icon" aria-label="Profile" data-testid="profile">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="11" fill="#fff" />
            <circle cx="12" cy="9.5" r="3.5" fill="#ff5252" />
            <path d="M5.5 19c1.3-3.2 3.8-4.8 6.5-4.8s5.2 1.6 6.5 4.8z" fill="#ff5252" />
          </svg>
        </button>
      </div>
    </header>
  `,
  styles: [
    `
      .bar {
        position: sticky;
        top: 0;
        z-index: 100;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 clamp(16px, 4vw, 40px);
        background: var(--brand, #ff5252);
        color: #fff;
      }
      .brand {
        font-size: 1.5rem;
        font-weight: 800;
      }
      .right {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .toggle {
        display: flex;
        background: #fff;
        border-radius: 999px;
        padding: 3px;
      }
      .toggle button {
        border: 0;
        background: transparent;
        color: var(--brand, #ff5252);
        font-weight: 700;
        font-size: 0.85rem;
        padding: 6px 16px;
        border-radius: 999px;
        cursor: pointer;
      }
      .toggle button.active {
        background: var(--brand, #ff5252);
        color: #fff;
      }
      .icon {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
      }
      .icon svg {
        width: 30px;
        height: 30px;
      }
      button:focus-visible {
        outline: 3px solid #fff;
        outline-offset: 2px;
      }
    `,
  ],
})
export class AppHeader {
  readonly auth = inject(MockAuth);
  readonly role = computed(() => this.auth.currentUser().role);
}
