import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { AppNotification } from '../models/notification.model';
import { toApiError } from '../utils/api-error';

export interface NotificationList {
  notifications: AppNotification[];
  unread: number;
}

/** The HTTP calls for notifications and nothing else. The login token is added by the app-wide authInterceptor. */
@Service()
export class NotificationApi {
  private http = inject(HttpClient);

  /** The person's newest notifications, plus how many of all of them are unread. */
  list(): Promise<NotificationList> {
    return this.call<NotificationList>('GET', '/notifications');
  }

  async markRead(id: number): Promise<void> {
    await this.call('PATCH', `/notifications/${id}/read`, {});
  }

  async markAllRead(): Promise<void> {
    await this.call('PATCH', '/notifications/read-all', {});
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        this.http.request<T>(method, `${API_BASE_URL}${path}`, { body }),
      );
    } catch (err) {
      throw toApiError(err);
    }
  }
}
