import { Review, Session, SessionStatus, SupportMode, UserRole } from '../models/session.model';
import { sessionStart } from './session-rules';

/** A past session as the Past Sessions page holds it (same shape as the store's HistoryRow). */
export interface PastRow {
  session: Session;
  status: SessionStatus;
  review: Review | null;
}

export type StatusFilter = 'all' | 'Completed' | 'Cancelled';
export type ModeFilter = 'all' | SupportMode;
/** Student only: all, only sessions I rated, or completed sessions I have not rated yet. */
export type FeedbackFilter = 'all' | 'rated' | 'unrated';
export type SortKey = 'newest' | 'oldest' | 'rating-high' | 'rating-low' | 'category';

export interface PastFilters {
  status: StatusFilter;
  category: string; // '' = every category
  mode: ModeFilter;
  from: string; // 'YYYY-MM-DD' or '' (inclusive)
  to: string; // 'YYYY-MM-DD' or '' (inclusive)
  feedback: FeedbackFilter; // student
  minRating: number; // volunteer: 0 = any, otherwise the lowest star rating to show
  search: string;
}

export const DEFAULT_FILTERS: PastFilters = {
  status: 'all',
  category: '',
  mode: 'all',
  from: '',
  to: '',
  feedback: 'all',
  minRating: 0,
  search: '',
};

export const DEFAULT_SORT: SortKey = 'newest';

/** True when any filter differs from the default (used for "Clear filters" and the empty message). */
export function isFiltered(f: PastFilters): boolean {
  return (Object.keys(DEFAULT_FILTERS) as (keyof PastFilters)[]).some(
    (k) => f[k] !== DEFAULT_FILTERS[k],
  );
}

/** The person on the other side of the session. */
function otherName(s: Session, role: UserRole): string {
  return role === 'student' ? s.volunteerName : s.studentName;
}

/** Keeps the rows that match every filter. `role` decides which person the search looks at. */
export function filterRows(rows: PastRow[], f: PastFilters, role: UserRole): PastRow[] {
  const text = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    const s = r.session;
    if (f.status !== 'all' && r.status !== f.status) return false;
    if (f.category !== '' && s.category !== f.category) return false;
    if (f.mode !== 'all' && s.mode !== f.mode) return false;
    if (f.from !== '' && s.date < f.from) return false;
    if (f.to !== '' && s.date > f.to) return false;
    if (role === 'student') {
      if (f.feedback === 'rated' && r.review === null) return false;
      if (f.feedback === 'unrated' && !(r.status === 'Completed' && r.review === null)) return false;
    } else if (f.minRating > 0 && (r.review === null || r.review.rating < f.minRating)) {
      return false;
    }
    if (text !== '') {
      const haystack = [s.description ?? '', s.category, s.title, otherName(s, role)]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(text)) return false;
    }
    return true;
  });
}

const byNewest = (a: PastRow, b: PastRow) =>
  sessionStart(b.session).getTime() - sessionStart(a.session).getTime() || b.session.id - a.session.id;

/** A sorted copy. Rating sorts put sessions without a rating last, whichever direction is chosen. */
export function sortRows(rows: PastRow[], key: SortKey): PastRow[] {
  const copy = [...rows];
  switch (key) {
    case 'oldest':
      return copy.sort((a, b) => -byNewest(a, b));
    case 'category':
      return copy.sort((a, b) => a.session.category.localeCompare(b.session.category) || byNewest(a, b));
    case 'rating-high':
    case 'rating-low': {
      const sign = key === 'rating-high' ? -1 : 1;
      return copy.sort((a, b) => {
        if (a.review === null && b.review === null) return byNewest(a, b);
        if (a.review === null) return 1;
        if (b.review === null) return -1;
        return sign * (a.review.rating - b.review.rating) || byNewest(a, b);
      });
    }
    default:
      return copy.sort(byNewest);
  }
}

export interface PastSummary {
  total: number;
  completed: number;
  cancelled: number;
  /** Mean of the ratings in these rows (received by a volunteer, given by a student), or null if none. */
  average: number | null;
  ratingCount: number;
}

export function summarize(rows: PastRow[]): PastSummary {
  const ratings = rows.flatMap((r) => (r.review ? [r.review.rating] : []));
  return {
    total: rows.length,
    completed: rows.filter((r) => r.status === 'Completed').length,
    cancelled: rows.filter((r) => r.status === 'Cancelled').length,
    average: ratings.length === 0 ? null : ratings.reduce((sum, n) => sum + n, 0) / ratings.length,
    ratingCount: ratings.length,
  };
}

/** The categories that appear in these rows, A to Z, for the category dropdown. */
export function categoriesOf(rows: PastRow[]): string[] {
  return [...new Set(rows.map((r) => r.session.category))].sort((a, b) => a.localeCompare(b));
}
