export type NotificationStatus = 'Unread' | 'Read';

/** One message the backend saved for the signed-in person (a session was requested, accepted, cancelled, ...). */
export interface AppNotification {
  id: number;
  sessionId: number | null;
  message: string;
  status: NotificationStatus;
  createdAt: string; // ISO timestamp
}
