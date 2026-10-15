import { Service, computed, inject, signal } from '@angular/core';
import { Review, Session, SessionStatus } from '../models/session.model';
import {
  canCancel,
  canComplete,
  canConfirm,
  canDecline,
  canGiveFeedback,
  effectiveStatus,
  isInMySessions,
  isPast,
  sessionStart,
} from '../utils/session-rules';
import { Clock } from './clock';
import { CurrentUser } from './current-user';

export type ReviewResult = { ok: true } | { ok: false; error: string };

/** A past (Completed or Cancelled) session, its status as it should be shown, and the review if any. */
export interface HistoryRow {
  session: Session;
  status: SessionStatus;
  review: Review | null;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function at(offsetMinutes: number): { date: string; time: string } {
  const d = new Date(Date.now() + offsetMinutes * MINUTE);
  const p = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

// Temporary seed data. Replace with HTTP calls to the backend later.
function seedSessions(): Session[] {
  const base = {
    studentId: 1,
    studentName: 'Test Student',
    volunteerId: 2,
    volunteerName: 'Test Volunteer',
  };
  return [
    {
      ...base,
      id: 1,
      title: 'Python Tutoring',
      category: 'Academic Support',
      createdAt: daysAgo(1),
      ...at(2 * 1440),
      mode: 'Virtual',
      status: 'Pending',
      proposedBy: 'student',
    },
    {
      ...base,
      id: 2,
      title: 'Laptop Setup Help',
      category: 'Technology Support',
      createdAt: daysAgo(3),
      ...at(1440),
      mode: 'Face-to-Face',
      status: 'Scheduled',
      proposedBy: null,
    },
    {
      ...base,
      id: 3,
      title: 'CV Review',
      category: 'Career Guidance',
      createdAt: daysAgo(4),
      ...at(-60),
      mode: 'Virtual',
      status: 'Scheduled',
      proposedBy: null,
    },
    {
      ...base,
      id: 4,
      title: 'Cloud Computing Tutoring',
      category: 'Academic Support',
      createdAt: daysAgo(8),
      ...at(-3 * 1440),
      mode: 'Virtual',
      status: 'Completed',
      proposedBy: null,
    },
    {
      ...base,
      id: 5,
      title: 'Stress Management Chat',
      category: 'Wellbeing',
      createdAt: daysAgo(9),
      ...at(-2 * 1440),
      mode: 'Virtual',
      status: 'Cancelled',
      proposedBy: null,
    },
    {
      ...base,
      id: 6,
      title: 'Wi-Fi Troubleshooting',
      category: 'Technology Support',
      createdAt: daysAgo(2),
      ...at(-60),
      mode: 'Virtual',
      status: 'Pending',
      proposedBy: 'student',
    }, // expired Pending
    {
      ...base,
      id: 7,
      title: 'Java Debugging',
      category: 'Academic Support',
      createdAt: daysAgo(5),
      ...at(-1440),
      mode: 'Virtual',
      status: 'Completed',
      proposedBy: null,
    }, // completed, no review yet
    {
      ...base,
      id: 8,
      title: 'Resume Workshop',
      category: 'Career Guidance',
      createdAt: daysAgo(12),
      ...at(-6 * 1440),
      mode: 'Face-to-Face',
      status: 'Completed',
      proposedBy: null,
    },
  ];
}

function seedReviews(): Review[] {
  return [
    {
      id: 1,
      sessionId: 4,
      studentId: 1,
      volunteerId: 2,
      rating: 5,
      comment: 'Very clear explanations.',
      createdAt: daysAgo(3),
    },
    {
      id: 2,
      sessionId: 8,
      studentId: 1,
      volunteerId: 2,
      rating: 4,
      comment: null,
      createdAt: daysAgo(6),
    },
  ];
}

@Service()
export class SessionStore {
  private auth = inject(CurrentUser);
  private clock = inject(Clock);
  private all = signal<Session[]>(seedSessions());
  private reviews = signal<Review[]>(seedReviews());

  /** Sessions belonging to the current user in their current role, newest first. */
  readonly mySessions = computed(() => {
    const u = this.auth.user();
    return this.all()
      .filter((s) => (u.role === 'student' ? s.studentId === u.id : s.volunteerId === u.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  /** My Sessions: everything except Completed sessions that already have feedback. */
  readonly activeSessions = computed(() => {
    const now = this.clock.now();
    return this.mySessions().filter((s) =>
      isInMySessions(s, this.reviewFor(s.id) !== undefined, now),
    );
  });

  /**
   * Past Sessions: Completed and Cancelled sessions of the current user (either role),
   * most recent first, each with the review the student left (or null).
   */
  readonly pastSessions = computed<HistoryRow[]>(() => {
    const now = this.clock.now();
    return this.mySessions()
      .filter((s) => isPast(s, now))
      .sort((a, b) => sessionStart(b).getTime() - sessionStart(a).getTime())
      .map((s) => ({
        session: s,
        status: effectiveStatus(s, now),
        review: this.reviewFor(s.id) ?? null,
      }));
  });

  /** Reviews the current volunteer has received. Always 0 for a student. */
  readonly reviewCount = computed(() =>
    this.role() === 'volunteer' ? this.pastSessions().filter((r) => r.review !== null).length : 0,
  );

  /** The current volunteer's average rating, or null when there are none (always null for a student). */
  readonly averageRating = computed<number | null>(() => {
    if (this.role() !== 'volunteer') return null;
    const ratings = this.pastSessions().flatMap((r) => (r.review ? [r.review.rating] : []));
    return ratings.length === 0 ? null : ratings.reduce((sum, n) => sum + n, 0) / ratings.length;
  });

  /** Only returns a session the current user takes part in. */
  get(id: number): Session | undefined {
    return this.mySessions().find((s) => s.id === id);
  }

  reviewFor(sessionId: number): Review | undefined {
    return this.reviews().find((r) => r.sessionId === sessionId);
  }

  confirm(id: number): void {
    const s = this.get(id);
    if (s && canConfirm(s, this.role())) this.patch(id, { status: 'Scheduled', proposedBy: null });
  }

  decline(id: number): void {
    const s = this.get(id);
    if (s && canDecline(s, this.role())) this.patch(id, { status: 'Cancelled' });
  }

  cancel(id: number): void {
    const s = this.get(id);
    if (s && canCancel(s, this.role())) this.patch(id, { status: 'Cancelled' });
  }

  complete(id: number): void {
    const s = this.get(id);
    if (s && canComplete(s, this.role())) this.patch(id, { status: 'Completed' });
  }

  addReview(sessionId: number, rating: number, comment: string): ReviewResult {
    const s = this.get(sessionId);
    if (!s) return { ok: false, error: 'Session not found.' };
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { ok: false, error: 'Please select a star rating before submitting.' };
    }
    if (!canGiveFeedback(s, this.role(), this.reviewFor(sessionId) !== undefined)) {
      return { ok: false, error: 'Feedback is not available for this session.' };
    }
    const text = comment.trim();
    this.reviews.update((list) => [
      ...list,
      {
        id: Math.max(0, ...list.map((r) => r.id)) + 1,
        sessionId,
        studentId: s.studentId,
        volunteerId: s.volunteerId,
        rating,
        comment: text === '' ? null : text.slice(0, 255),
        createdAt: new Date().toISOString(),
      },
    ]);
    return { ok: true };
  }

  private role() {
    return this.auth.user().role;
  }

  private patch(id: number, changes: Partial<Session>): void {
    this.all.update((list) => list.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  }
}
