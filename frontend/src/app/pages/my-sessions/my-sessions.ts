import { Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthNotice } from '../../components/auth-notice/auth-notice';
import { Panel } from '../../components/panel/panel';
import { SessionCard } from '../../components/session-card/session-card';
import { Clock } from '../../services/clock';
import { CurrentUser } from '../../services/current-user';
import { SessionStore } from '../../services/session-store';
import { sessionDetails, sessionRef } from '../../utils/session-format';
import { effectiveStatus } from '../../utils/session-rules';

@Component({
  imports: [RouterLink, AuthNotice, Panel, SessionCard],
  selector: 'app-my-sessions',
  styleUrl: './my-sessions.css',
  templateUrl: './my-sessions.html',
})
export class MySessions {
  private auth = inject(CurrentUser);
  private store = inject(SessionStore);
  private clock = inject(Clock);

  protected readonly signedIn = this.auth.signedIn;
  protected readonly status = this.store.status;
  protected readonly error = this.store.error;

  protected readonly pageTitle = computed(() =>
    this.auth.user().role === 'student' ? 'My Student Sessions' : 'My Volunteer Sessions',
  );

  protected readonly rows = computed(() => {
    const now = this.clock.now();
    const role = this.auth.user().role;
    return this.store.activeSessions().map((session) => ({
      session,
      ref: sessionRef(session.id),
      status: effectiveStatus(session, now),
      details: sessionDetails(session, role),
    }));
  });

  constructor() {
    // Load whenever the person or the Student/Volunteer mode changes.
    effect(() => {
      this.auth.user();
      untracked(() => void this.store.refresh());
    });
  }

  protected retry(): void {
    void this.store.refresh();
  }
}
