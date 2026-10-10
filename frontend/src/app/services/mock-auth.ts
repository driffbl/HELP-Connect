import { Service, signal } from '@angular/core';
import { AppUser, UserRole } from '../models/session.model';

/** Temporary stand-in for the real login. Delete when the login flow is merged. */
@Service()
export class MockAuth {
  private users: AppUser[] = [
    { id: 1, name: 'Test Student', role: 'student' },
    { id: 2, name: 'Test Volunteer', role: 'volunteer' },
  ];
  readonly currentUser = signal<AppUser>(this.users[0]);

  setRole(role: UserRole): void {
    const next = this.users.find((u) => u.role === role);
    if (next) this.currentUser.set(next);
  }
}
