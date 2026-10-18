import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthNotice } from '../../components/auth-notice/auth-notice';
import { Panel } from '../../components/panel/panel';
import { SessionActions } from '../../components/session-actions/session-actions';
import { SessionCard } from '../../components/session-card/session-card';
import { Session, UserRole } from '../../models/session.model';
import { Clock } from '../../services/clock';
import { CurrentUser } from '../../services/current-user';
import { SessionStore } from '../../services/session-store';
import { sessionDetails, sessionRef } from '../../utils/session-format';
import * as rules from '../../utils/session-rules';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

/** One session in full. The buttons are the same SessionActions box the lists use. */
@Component({
  imports: [AuthNotice, Panel, SessionActions, SessionCard],
  selector: 'app-session-detail',
  styleUrl: './session-detail.css',
  templateUrl: './session-detail.html',
})
export class SessionDetail {
  private route = inject(ActivatedRoute);
  private auth = inject(CurrentUser);
  private store = inject(SessionStore);
  private clock = inject(Clock);

  private readonly id = Number(this.route.snapshot.paramMap.get('id'));
  /** Set per route in sessions.routes.ts, so Past Sessions can send the user back to itself. */
  protected readonly backLink =
    (this.route.snapshot.data['backLink'] as string | undefined) ?? '/sessions';
  private loadCount = 0;

  protected readonly signedIn = this.auth.signedIn;
  protected readonly session = signal<Session | null>(null);
  protected readonly loadState = signal<LoadState>('loading');
  protected readonly loadError = signal<string | null>(null);

  /** Which side of THIS session the signed-in person is on, worked out from who took part. */
  private readonly role = computed<UserRole | null>(() => {
    const s = this.session();
    const me = this.auth.user().id;
    if (!s) return null;
    return s.studentId === me ? 'student' : s.volunteerId === me ? 'volunteer' : null;
  });

  protected readonly view = computed(() => {
    const s = this.session();
    const role = this.role();
    if (!s || !role) return null;
    return {
      session: s,
      role,
      ref: sessionRef(s.id),
      status: rules.effectiveStatus(s, this.clock.now()),
      details: sessionDetails(s, role),
    };
  });

  constructor() {
    // Load again whenever the signed-in person changes (the Student/Volunteer switch).
    effect(() => {
      this.auth.user();
      untracked(() => {
        this.session.set(null);
        void this.load();
      });
    });
  }

  protected retry(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    if (!this.auth.signedIn()) return;
    const turn = ++this.loadCount;
    this.loadState.set('loading');
    this.loadError.set(null);
    const result = await this.store.fetch(this.id);
    if (turn !== this.loadCount) return; // someone switched person meanwhile; ignore this answer
    if (result.ok) {
      this.session.set(result.session);
      this.loadState.set('ready');
    } else if (result.status === 404) {
      this.loadState.set('missing');
    } else {
      this.loadError.set(result.error);
      this.loadState.set('error');
    }
  }
}
