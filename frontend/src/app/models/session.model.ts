export type SessionStatus = 'Pending' | 'Scheduled' | 'Completed' | 'Cancelled';
export type SupportMode = 'Virtual' | 'Face-to-Face';
export type UserRole = 'student' | 'volunteer';

export interface Session {
  id: number;
  studentId: number;
  studentName: string;
  volunteerId: number;
  volunteerName: string;
  title: string;
  category: string;
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:mm'
  mode: SupportMode;
  status: SessionStatus;
  proposedBy: UserRole | null; // who created the current Pending proposal
  createdAt: string; // ISO timestamp
  review: Review | null; // the student's feedback, once given
}

export interface Review {
  id: number;
  sessionId: number;
  studentId: number;
  volunteerId: number;
  rating: number; // 1 to 5
  comment: string | null; // optional
  createdAt: string; // ISO timestamp
}

/** `role` is the mode the user is currently acting in. */
export interface AppUser {
  id: number;
  name: string;
  role: UserRole;
}
