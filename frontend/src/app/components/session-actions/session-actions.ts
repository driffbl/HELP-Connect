import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Session, UserRole } from '../../models/session.model';
import { Clock } from '../../services/clock';
import { ActionResult, SessionStore } from '../../services/session-store';
import * as rules from '../../utils/session-rules';
import { ConfirmModal } from '../confirm-modal/confirm-modal';
import { StarRating } from '../star-rating/star-rating';

type PendingAction = 'cancel' | 'decline';

/**
 * The box on the right of a session card. What it shows depends on the status and on who is looking:
 *   Scheduled  volunteer: Mark as Complete (once started), Cancel, Reschedule
 *              student:   Rate volunteer (greyed out until completed), Cancel, Reschedule
 *   Completed  the feedback if there is some, else "Rate volunteer" (student) or "Awaiting feedback"
 *   Cancelled  a short note; if the volunteer declined, the student can choose another volunteer
 *   Pending    Accept / Decline for the other party, Cancel for whoever asked
 * It only decides which buttons to show. The server checks every action again.
 */
@Component({
  selector: 'app-session-actions',
  imports: [RouterLink, ConfirmModal, StarRating],
  template: `
    <div class="box" [attr.data-testid]="'actions-' + session().id">
      @if (error(); as e) {
        <p class="error" role="alert" data-testid="action-error">{{ e }}</p>
      }

      @switch (status()) {
        @case ('Scheduled') {
          <div class="buttons">
            @if (role() === 'volunteer') {
              <button
                type="button"
                class="action-btn"
                data-testid="complete"
                [disabled]="!canComplete() || busy()"
                (click)="complete()"
              >
                Mark as Complete
              </button>
              @if (!canComplete()) {
                <small class="hint" data-testid="complete-hint">
                  Available once the session starts.
                </small>
              }
            } @else {
              <button
                type="button"
                class="action-btn"
                data-testid="rate-volunteer-disabled"
                disabled
              >
                Rate volunteer
              </button>
              <small class="hint">Available once the session is completed.</small>
            }
            @if (canCancel()) {
              <button
                type="button"
                class="action-btn"
                data-testid="cancel"
                [disabled]="busy()"
                (click)="ask('cancel')"
              >
                Cancel
              </button>
            }
            <button
              type="button"
              class="action-btn soon"
              data-testid="reschedule"
              aria-disabled="true"
              title="Coming soon"
              (click)="comingSoon()"
            >
              Reschedule
            </button>
          </div>
        }
        @case ('Completed') {
          @if (session().review; as rv) {
            <section class="feedback" data-testid="feedback">
              <h3>{{ role() === 'student' ? 'Your feedback' : 'Student feedback' }}</h3>
              <app-star-rating [value]="rv.rating" [readonly]="true" />
              <p>{{ rv.comment ?? 'No comment left.' }}</p>
            </section>
          } @else if (canReview()) {
            <div class="buttons">
              <a
                class="action-btn"
                data-testid="rate-volunteer"
                [routerLink]="['/sessions', session().id, 'review']"
                >Rate volunteer</a
              >
            </div>
          } @else {
            <p class="note" data-testid="awaiting-feedback">Awaiting feedback</p>
          }
        }
        @case ('Cancelled') {
          @if (canChooseAnother()) {
            <div class="buttons">
              <p class="note" data-testid="declined-note">The volunteer declined this request.</p>
              <button
                type="button"
                class="action-btn"
                data-testid="choose-another"
                (click)="chooseAnother()"
              >
                Choose another volunteer
              </button>
            </div>
          } @else {
            <p class="note" data-testid="cancelled-note">This session was cancelled.</p>
          }
        }
        @default {
          <div class="buttons">
            @if (canConfirm()) {
              <button
                type="button"
                class="action-btn"
                data-testid="accept"
                [disabled]="busy()"
                (click)="accept()"
              >
                Accept
              </button>
              <button
                type="button"
                class="action-btn"
                data-testid="decline"
                [disabled]="busy()"
                (click)="ask('decline')"
              >
                Decline
              </button>
            }
            @if (canCancel()) {
              <button
                type="button"
                class="action-btn"
                data-testid="cancel"
                [disabled]="busy()"
                (click)="ask('cancel')"
              >
                Cancel
              </button>
            }
            @if (!canConfirm() && !canCancel()) {
              <p class="note">Waiting for a response.</p>
            }
          </div>
        }
      }
    </div>

    @if (pending()) {
      <app-confirm-modal
        [title]="modalTitle()"
        [message]="modalMessage()"
        confirmLabel="Yes, proceed"
        (confirmed)="onConfirm()"
        (dismissed)="pending.set(null)"
      />
    }
  `,
  styles: [
    `
      .box {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .action-btn {
        display: block;
        padding: 8px 12px;
        border: 1px solid var(--brand, #e63946);
        border-radius: 8px;
        background: #fff;
        color: var(--brand, #e63946);
        font: inherit;
        font-weight: 600;
        text-align: center;
        text-decoration: none;
        cursor: pointer;
      }
      .action-btn:hover:not(:disabled):not(.soon) {
        background: var(--brand, #e63946);
        color: #fff;
      }
      .action-btn:disabled,
      .action-btn.soon {
        border-color: #d1d5db;
        background: #f9fafb;
        color: #9ca3af;
      }
      .action-btn:disabled {
        cursor: not-allowed;
      }
      .action-btn:focus-visible {
        outline: 3px solid #1f2a8a;
        outline-offset: 2px;
      }
      .hint {
        color: #6b7280;
        font-size: 0.75rem;
      }
      .note {
        margin: 0;
        color: #6b7280;
        font-weight: 600;
        text-align: center;
      }
      .error {
        margin: 0;
        color: #dc2626;
        font-size: 0.85rem;
        font-weight: 600;
      }
      .feedback h3 {
        margin: 0 0 4px;
        font-size: 1rem;
        color: #111827;
      }
      .feedback p {
        margin: 4px 0 0;
        color: #374151;
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class SessionActions {
  private store = inject(SessionStore);
  private clock = inject(Clock);
  private router = inject(Router);

  readonly session = input.required<Session>();
  /** Which side of this session the person is looking from. */
  readonly role = input.required<UserRole>();
  /** The session as the server now has it, after an action worked. */
  readonly updated = output<Session>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pending = signal<PendingAction | null>(null);

  protected readonly status = computed(() =>
    rules.effectiveStatus(this.session(), this.clock.now()),
  );
  protected readonly canConfirm = computed(() =>
    rules.canConfirm(this.session(), this.role(), this.clock.now()),
  );
  protected readonly canCancel = computed(() =>
    rules.canCancel(this.session(), this.role(), this.clock.now()),
  );
  protected readonly canComplete = computed(() =>
    rules.canComplete(this.session(), this.role(), this.clock.now()),
  );
  protected readonly canChooseAnother = computed(() =>
    rules.canChooseAnotherVolunteer(this.session(), this.role(), this.clock.now()),
  );
  protected readonly canReview = computed(() =>
    rules.canGiveFeedback(this.session(), this.role(), this.session().review !== null),
  );

  protected readonly modalTitle = computed(() =>
    this.pending() === 'decline' ? 'Decline this request?' : 'Cancel this session?',
  );
  protected readonly modalMessage = computed(() =>
    this.pending() === 'decline'
      ? 'Declining will cancel the session. This cannot be undone.'
      : 'Cancelling ends this session for both of you. This cannot be undone.',
  );

  protected accept(): Promise<void> {
    return this.perform(() => this.store.confirm(this.session().id));
  }

  protected complete(): Promise<void> {
    return this.perform(() => this.store.complete(this.session().id));
  }

  protected ask(action: PendingAction): void {
    this.pending.set(action);
  }

  protected async onConfirm(): Promise<void> {
    const action = this.pending();
    this.pending.set(null);
    const id = this.session().id;
    if (action === 'decline') await this.perform(() => this.store.decline(id));
    else if (action === 'cancel') await this.perform(() => this.store.cancel(id));
  }

  /** Opens the volunteer search (Use Case 2) for this request, with the same category, mode, date and time. */
  protected chooseAnother(): void {
    const s = this.session();
    void this.router.navigate(['/matching-results'], {
      queryParams: {
        category: s.category,
        mode: s.mode,
        date: s.date,
        time: s.time,
        requestId: s.requestId,
      },
    });
  }

  /** Same message as the "coming soon" buttons on the home page. */
  protected comingSoon(): void {
    alert('This feature will be available in the next update.');
  }

  private async perform(run: () => Promise<ActionResult>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const result = await run();
    this.busy.set(false);
    if (result.ok) this.updated.emit(result.session);
    else this.error.set(result.error);
  }
}
