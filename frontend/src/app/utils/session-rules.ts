import { Session, SessionStatus, UserRole } from '../models/session.model';

export function sessionStart(s: Session): Date {
  return new Date(`${s.date}T${s.time}:00`);
}

/** Pending with no response by the start time is treated as Cancelled. */
export function isExpiredPending(s: Session, now: Date = new Date()): boolean {
  return s.status === 'Pending' && now >= sessionStart(s);
}

/** Always display this, never the raw status. */
export function effectiveStatus(s: Session, now: Date = new Date()): SessionStatus {
  return isExpiredPending(s, now) ? 'Cancelled' : s.status;
}

/** The party who did NOT propose the change confirms it. */
export function canConfirm(s: Session, role: UserRole, now: Date = new Date()): boolean {
  return (
    s.status === 'Pending' &&
    !isExpiredPending(s, now) &&
    s.proposedBy !== null &&
    s.proposedBy !== role
  );
}

/** Declining a Pending proposal cancels the session. */
export function canDecline(s: Session, role: UserRole, now: Date = new Date()): boolean {
  return canConfirm(s, role, now);
}

/** Cancel anytime until the session is finished or already cancelled. */
export function canCancel(s: Session, now: Date = new Date()): boolean {
  return (s.status === 'Pending' && !isExpiredPending(s, now)) || s.status === 'Scheduled';
}

export function canReschedule(s: Session): boolean {
  return s.status === 'Scheduled';
}

/** Volunteer only, Scheduled only, never before the start time. */
export function canComplete(s: Session, role: UserRole, now: Date = new Date()): boolean {
  return role === 'volunteer' && s.status === 'Scheduled' && now >= sessionStart(s);
}

/** Student only, Completed only, one submission per session. */
export function canGiveFeedback(s: Session, role: UserRole, alreadyReviewed: boolean): boolean {
  return role === 'student' && s.status === 'Completed' && !alreadyReviewed;
}
