import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppNotification {
  Notification_id: number;
  User_id: number;
  Session_id: number | null;
  Message: string;
  Notification_status: 'Unread' | 'Read';
  Created_at: string;
}

export interface NotificationResponse {
  notifications: AppNotification[];
  unread: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly apiUrl = 'http://localhost:5000/api/notifications';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getNotifications(): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(this.apiUrl, {
      headers: this.getAuthHeaders(),
    });
  }

  markRead(notificationId: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${notificationId}/read`,
      {},
      { headers: this.getAuthHeaders() },
    );
  }

  markAllRead(): Observable<any> {
    return this.http.patch(`${this.apiUrl}/read-all`, {}, { headers: this.getAuthHeaders() });
  }
}
