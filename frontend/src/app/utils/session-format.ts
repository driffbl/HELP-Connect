import { Session, UserRole } from '../models/session.model';

/** 7 -> 'R0007' */
export function sessionRef(id: number): string {
  return 'R' + String(id).padStart(4, '0');
}

/** One "Label: value" row on a session card. */
export interface Detail {
  label: string;
  value: string;
}

/** 'YYYY-MM-DD' or an ISO timestamp -> 'dd/MM/yyyy' */
export function formatDay(value: string): string {
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** 'HH:mm' (or 'HH:mm:ss') -> 'h:mm AM/PM'. Anything unreadable is returned as it came. */
export function formatTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** The rows shown on a session card: description, date, time, mode, then the other person. */
export function sessionDetails(s: Session, role: UserRole): Detail[] {
  return [
    { label: 'Description', value: s.description ?? 'No description provided.' },
    { label: 'Session Date', value: formatDay(s.date) },
    { label: 'Session Time', value: formatTime(s.time) },
    { label: 'Support Mode', value: s.mode },
    role === 'student'
      ? { label: 'Volunteer', value: s.volunteerName }
      : { label: 'Student', value: s.studentName },
  ];
}
