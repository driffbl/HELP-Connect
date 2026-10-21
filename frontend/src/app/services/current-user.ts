import { Service, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AppUser, UserRole } from '../models/session.model';

/** One signed-in person: their id, a label, and the token the API wants. */
export interface Identity {
  id: number;
  name: string;
  token: string;
}

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

/** The signed-in person, as Coel's login left them in localStorage (`token` and `user`), or null. */
function readLogin(): Identity | null {
  try {
    const token = localStorage.getItem('token');
    const identity = token ? readToken(token) : null;
    if (!identity) return null;
    const stored = JSON.parse(localStorage.getItem('user') ?? 'null') as { User_name?: unknown } | null;
    const name = stored?.User_name;
    return typeof name === 'string' && name.trim() ? { ...identity, name } : identity;
  } catch {
    return null;
  }
}

/**
 * The ONE place Use Case 3 reads "who is logged in" and "which mode they are acting in".
 *
 * The person comes from the real login (localStorage `token` and `user`). One account acts as both
 * student and volunteer; `mode` only chooses which side of a session they are looking at.
 * Storage is re-read after every navigation, so logging in or out is picked up without a reload.
 */
@Service()
export class CurrentUser {
  private readonly identity = signal<Identity | null>(readLogin());
  private readonly mode = signal<UserRole>('student');

  constructor() {
    inject(Router).events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.refresh();
    });
  }

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

  /** Re-reads the login from storage. Changes nothing when it is the same person and token. */
  refresh(): void {
    const next = readLogin();
    const current = this.identity();
    if (next?.token === current?.token && next?.name === current?.name) return;
    this.identity.set(next);
  }
}
