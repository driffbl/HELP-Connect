import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { Session, UserRole } from '../models/session.model';
import { toApiError } from '../utils/api-error';

/**
 * The HTTP calls for Use Case 3 and nothing else: no state, no rules. The login token is added by the app-wide authInterceptor. Every method returns the
 * session as the backend sees it, and throws an ApiError (with a message fit to show) on failure.
 */
@Service()
export class SessionApi {
  private http = inject(HttpClient);

  /** Sessions where the user is the student or the volunteer, newest first. */
  async list(role: UserRole): Promise<Session[]> {
    return (await this.call<{ sessions: Session[] }>('GET', `/sessions?role=${role}`)).sessions;
  }

  async get(id: number): Promise<Session> {
    return (await this.call<{ session: Session }>('GET', `/sessions/${id}`)).session;
  }

  confirm(id: number): Promise<Session> {
    return this.transition(id, 'confirm');
  }

  decline(id: number): Promise<Session> {
    return this.transition(id, 'decline');
  }

  cancel(id: number): Promise<Session> {
    return this.transition(id, 'cancel');
  }

  complete(id: number): Promise<Session> {
    return this.transition(id, 'complete');
  }

  async addFeedback(id: number, rating: number, comment: string | null): Promise<Session> {
    return (
      await this.call<{ session: Session }>('POST', `/sessions/${id}/feedback`, { rating, comment })
    ).session;
  }

  private async transition(
    id: number,
    action: 'confirm' | 'decline' | 'cancel' | 'complete',
  ): Promise<Session> {
    return (await this.call<{ session: Session }>('PATCH', `/sessions/${id}/${action}`, {}))
      .session;
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
