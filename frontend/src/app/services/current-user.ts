import { Service, signal } from '@angular/core';
import { AppUser, UserRole } from '../models/session.model';

/**
 * The ONE place Use Case 3 reads "who is logged in" and "which mode they are acting in".
 *
 * Today this is a stub with two fake users. When the real login is merged, change only the
 * inside of this class (map the real logged-in user to an AppUser) and keep `user` and
 * `setRole` as they are. Nothing else in Use Case 3 should need to change.
 */
@Service()
export class CurrentUser {
  private users: AppUser[] = [
    { id: 1, name: 'Test Student', role: 'student' },
    { id: 2, name: 'Test Volunteer', role: 'volunteer' },
  ];
  private readonly current = signal<AppUser>(this.users[0]);

  readonly user = this.current.asReadonly();

  setRole(role: UserRole): void {
    const next = this.users.find((u) => u.role === role);
    if (next) this.current.set(next);
  }
}
