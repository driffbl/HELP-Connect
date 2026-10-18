import { Service, computed, signal } from '@angular/core';
import { AppUser, UserRole } from '../models/session.model';

const STORAGE_KEY = 'hc.devTokens';

/** One signed-in person: their id, a label, and the token the API wants. */
export interface Identity {
  id: number;
  name: string;
  token: string;
}

type Identities = Partial<Record<UserRole, Identity>>;

/** Reads the User_id and Email out of a JWT, or null when it is malformed or expired. Not a security check: the server verifies tokens. */
export function readToken(token: string): Identity | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
    const claims = JSON.parse(json) as { User_id?: unknown; Email?: unknown; exp?: unknown };
    if (typeof claims.User_id !== 'number') return null;
    if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) return null;
    return {
      id: claims.User_id,
      name: typeof claims.Email === 'string' ? claims.Email : `User ${claims.User_id}`,
      token,
    };
  } catch {
    return null;
  }
}

function readStored(): Identities {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    const identities: Identities = {};
    for (const role of ['student', 'volunteer'] as const) {
      const token = stored[role];
      const identity = typeof token === 'string' ? readToken(token) : null;
      if (identity) identities[role] = identity;
    }
    return identities;
  } catch {
    return {};
  }
}

/**
 * The ONE place Use Case 3 reads "who is logged in" and "which mode they are acting in".
 *
 * Today the identities come from the two test tokens made by backend/scripts/dev-token.js.
 * When the real login is merged, change only the inside of this class: fill `identities` from the
 * logged-in user (one person for both modes) and keep `user`, `token`, `signedIn` and `setRole` as they are.
 */
@Service()
export class CurrentUser {
  private readonly identities = signal<Identities>(readStored());
  private readonly mode = signal<UserRole>('student');

  private readonly identity = computed<Identity | null>(() => {
    const all = this.identities();
    return all[this.mode()] ?? all.student ?? all.volunteer ?? null;
  });

  /** Who is acting. id is 0 when nobody is signed in. */
  readonly user = computed<AppUser>(() => ({
    id: this.identity()?.id ?? 0,
    name: this.identity()?.name ?? 'Not signed in',
    role: this.mode(),
  }));

  /** The token to send with every API call, or null. */
  readonly token = computed<string | null>(() => this.identity()?.token ?? null);

  readonly signedIn = computed(() => this.identity() !== null);

  setRole(role: UserRole): void {
    this.mode.set(role);
  }

  /** Development only: remembers the two test tokens so a page reload keeps you signed in. */
  useDevTokens(tokens: { student: string; volunteer: string }): boolean {
    const student = readToken(tokens.student);
    const volunteer = readToken(tokens.volunteer);
    if (!student || !volunteer) return false;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ student: tokens.student, volunteer: tokens.volunteer }),
      );
    } catch {
      /* storage unavailable: the tokens still work until the page is reloaded */
    }
    this.identities.set({ student, volunteer });
    this.mode.set('student');
    return true;
  }
}
