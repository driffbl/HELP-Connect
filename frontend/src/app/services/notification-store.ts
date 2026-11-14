import { Service, inject, signal } from '@angular/core';
import { AppNotification } from '../models/notification.model';
import { toApiError } from '../utils/api-error';
import { NotificationApi } from './notification-api';

export type NotificationStatusState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * What the app knows about the signed-in person's notifications. The backend is the source of truth:
 * this keeps a copy for the bell, and reads are never blocked by a failed refresh (the old list stays).
 */
@Service()
export class NotificationStore {
  private api = inject(NotificationApi);

  readonly items = signal<AppNotification[]>([]);
  /** Unread notifications in total, as the server counts them (the list itself is capped). */
  readonly unread = signal(0);
  readonly status = signal<NotificationStatusState>('idle');
  readonly error = signal<string | null>(null);

  async refresh(): Promise<void> {
    if (this.status() === 'idle') this.status.set('loading');
    try {
      const result = await this.api.list();
      this.items.set(result.notifications);
      this.unread.set(result.unread);
      this.error.set(null);
      this.status.set('ready');
    } catch (err) {
      this.error.set(toApiError(err).message);
      this.status.set('error');
    }
  }

  /** Marks one notification read. The screen changes at once; if the server refuses, the list is reloaded. */
  async markRead(id: number): Promise<void> {
    const item = this.items().find((n) => n.id === id);
    if (!item || item.status === 'Read') return;
    this.items.update((list) => list.map((n) => (n.id === id ? { ...n, status: 'Read' } : n)));
    this.unread.update((n) => Math.max(0, n - 1));
    try {
      await this.api.markRead(id);
    } catch {
      await this.refresh();
    }
  }

  async markAllRead(): Promise<void> {
    if (this.unread() === 0) return;
    this.items.update((list) => list.map((n) => ({ ...n, status: 'Read' as const })));
    this.unread.set(0);
    try {
      await this.api.markAllRead();
    } catch {
      await this.refresh();
    }
  }

  /** Forget everything, for when someone signs out. */
  clear(): void {
    this.items.set([]);
    this.unread.set(0);
    this.error.set(null);
    this.status.set('idle');
  }
}
