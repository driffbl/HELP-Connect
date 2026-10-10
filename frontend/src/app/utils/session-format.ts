import { Session, UserRole } from '../models/session.model';

/** 7 -> 'R0007' */
export function sessionRef(id: number): string {
  return 'R' + String(id).padStart(4, '0');
}

/** 'YYYY-MM-DD' or an ISO timestamp -> 'd/M/yyyy' */
export function formatDay(value: string): string {
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** The small grey lines shown under a session title. */
export function sessionDetails(s: Session, role: UserRole): string[] {
  return [
    `Submitted on ${formatDay(s.createdAt)}`,
    `Session: ${formatDay(s.date)} at ${s.time}`,
    `Mode: ${s.mode}`,
    role === 'student' ? `Volunteer: ${s.volunteerName}` : `Student: ${s.studentName}`,
  ];
}
