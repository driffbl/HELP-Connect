import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { CurrentUser } from '../../services/current-user';
import { Header } from '../header/header';

/** The red-bordered page frame with "Go Back" and a centred title, as in the wireframes. */
@Component({
  selector: 'app-panel',
  imports: [Header],
  template: `
    <app-header />
    <div class="page">
    <main class="panel">
      <div class="head">
        <button type="button" class="back" data-testid="go-back" (click)="back()">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Go Back
        </button>
        <h1 data-testid="page-title">{{ title() }}</h1>
        @if (roleSwitch()) {
          <div class="mode" role="group" aria-label="Acting as">
            <button
              type="button"
              data-testid="mode-student"
              [class.on]="auth.user().role === 'student'"
              [attr.aria-pressed]="auth.user().role === 'student'"
              (click)="auth.setRole('student')"
            >
              Student
            </button>
            <button
              type="button"
              data-testid="mode-volunteer"
              [class.on]="auth.user().role === 'volunteer'"
              [attr.aria-pressed]="auth.user().role === 'volunteer'"
              (click)="auth.setRole('volunteer')"
            >
              Volunteer
            </button>
          </div>
        } @else {
          <span></span>
        }
      </div>
      <div class="scroll"><ng-content /></div>
    </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      /* The padding sits here, not on :host, so the header above stays full width. */
      .page {
        padding: 24px clamp(16px, 5vw, 56px);
      }
      .panel {
        display: flex;
        flex-direction: column;
        max-width: 960px;
        margin: 0 auto;
        max-height: calc(100vh - 56px - 48px);
        border: 2px solid var(--brand, #e63946);
        border-radius: 12px;
        padding: 16px 20px 20px 28px;
      }
      .head {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        margin-bottom: 14px;
        padding-right: 8px;
      }
      h1 {
        margin: 0;
        color: var(--brand, #e63946);
        font-size: 2rem;
        font-weight: 800;
        text-align: center;
      }
      .back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        justify-self: start;
        border: 0;
        background: transparent;
        color: var(--muted-ink, #6b6b6b);
        font-size: 0.85rem;
        cursor: pointer;
      }
      .back svg {
        width: 18px;
        height: 18px;
        color: var(--brand, #e63946);
      }
      .back:focus-visible {
        outline: 3px solid var(--brand, #e63946);
        outline-offset: 2px;
        border-radius: 4px;
      }
      .mode {
        display: inline-flex;
        justify-self: end;
        border: 1px solid var(--brand, #e63946);
        border-radius: 999px;
        overflow: hidden;
      }
      .mode button {
        border: 0;
        padding: 6px 14px;
        background: transparent;
        color: var(--brand, #e63946);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
      }
      .mode button.on {
        background: var(--brand, #e63946);
        color: #fff;
      }
      .mode button:focus-visible {
        outline: 3px solid var(--brand, #e63946);
        outline-offset: 2px;
      }
      .scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding-right: 14px;
        scrollbar-color: var(--brand, #e63946) transparent;
      }
    `,
  ],
})
export class Panel {
  private location = inject(Location);
  private router = inject(Router);
  protected readonly auth = inject(CurrentUser);

  readonly title = input.required<string>();
  /** Where "Go Back" goes. Leave empty to use browser history. */
  readonly backLink = input<string | null>(null);
  /** Shows the Student / Volunteer switch. Only the list pages turn it on. */
  readonly roleSwitch = input(false);

  protected back(): void {
    const link = this.backLink();
    if (link) this.router.navigateByUrl(link);
    else this.location.back();
  }
}
