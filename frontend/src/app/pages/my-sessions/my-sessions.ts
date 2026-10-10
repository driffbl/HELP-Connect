import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Panel } from '../../components/panel/panel';
import { SessionCard } from '../../components/session-card/session-card';
import { Clock } from '../../services/clock';
import { MockAuth } from '../../services/mock-auth';
import { SessionStore } from '../../services/session-store';
import { sessionDetails, sessionRef } from '../../utils/session-format';
import { effectiveStatus } from '../../utils/session-rules';

@Component({
  imports: [RouterLink, Panel, SessionCard],
  selector: 'app-my-sessions',
  styleUrl: './my-sessions.css',
  templateUrl: './my-sessions.html',
})
export class MySessions {
  private auth = inject(MockAuth);
  private store = inject(SessionStore);
  private clock = inject(Clock);

  protected readonly pageTitle = computed(() =>
    this.auth.currentUser().role === 'student' ? 'My Student Sessions' : 'My Volunteer Sessions',
  );

  protected readonly rows = computed(() => {
    const now = this.clock.now();
    const role = this.auth.currentUser().role;
    return this.store.mySessions().map((session) => ({
      session,
      ref: sessionRef(session.id),
      status: effectiveStatus(session, now),
      details: sessionDetails(session, role),
    }));
  });
}
