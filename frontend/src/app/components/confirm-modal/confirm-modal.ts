import { Component, input, output } from '@angular/core';

/** Confirmation dialog. Set `showDismiss` to false to use it as a one-button alert. */
@Component({
  selector: 'app-confirm-modal',
  host: { '(document:keydown.escape)': 'dismissed.emit()' },
  template: `
    <div class="backdrop" data-testid="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h3 id="modal-title">{{ title() }}</h3>
        <p>{{ message() }}</p>
        <div class="buttons">
          @if (showDismiss()) {
            <button type="button" data-testid="modal-dismiss" (click)="dismissed.emit()">
              Go back
            </button>
          }
          <button
            type="button"
            class="confirm"
            data-testid="modal-confirm"
            (click)="confirmed.emit()"
          >
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal {
        background: #fff;
        border-radius: 8px;
        padding: 24px;
        max-width: 380px;
        width: 90%;
      }
      h3 {
        margin: 0 0 8px;
        font-size: 1.2rem;
      }
      .buttons {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
      button {
        padding: 6px 14px;
        border-radius: 6px;
        border: 1px solid #aaa;
        background: #f5f5f5;
        cursor: pointer;
      }
      .confirm {
        background: var(--brand, #ff5252);
        border-color: var(--brand, #ff5252);
        color: #fff;
        font-weight: 600;
      }
      button:focus-visible {
        outline: 3px solid #1f2a8a;
        outline-offset: 2px;
      }
    `,
  ],
})
export class ConfirmModal {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly showDismiss = input(true);
  readonly confirmed = output<void>();
  readonly dismissed = output<void>();
}
