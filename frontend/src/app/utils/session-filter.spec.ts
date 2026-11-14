import { Review, Session } from '../models/session.model';
import {
  DEFAULT_FILTERS,
  PastFilters,
  PastRow,
  categoriesOf,
  filterRows,
  isFiltered,
  sortRows,
  summarize,
} from './session-filter';

function row(id: number, over: Partial<Session> = {}, rating: number | null = null): PastRow {
  const session: Session = {
    id,
    studentId: 1,
    studentName: 'Alice',
    volunteerId: 2,
    volunteerName: 'Ben',
    title: 'Academic Support',
    description: 'Help with loops',
    category: 'Academic Support',
    date: '2026-10-10',
    time: '10:00',
    mode: 'Virtual',
    status: 'Completed',
    proposedBy: null,
    requestId: null,
    requestStatus: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    review: null,
    ...over,
  };
  const review: Review | null =
    rating === null
      ? null
      : { id: id, sessionId: id, studentId: 1, volunteerId: 2, rating, comment: null, createdAt: session.createdAt };
  return { session, status: session.status, review };
}

const withFilters = (over: Partial<PastFilters>): PastFilters => ({ ...DEFAULT_FILTERS, ...over });
const ids = (rows: PastRow[]) => rows.map((r) => r.session.id);

describe('session filter', () => {
  const cancelled = row(2, { status: 'Cancelled', category: 'Technology Support', mode: 'Face-to-Face', date: '2026-10-12' });
  const rated5 = row(1, { date: '2026-10-10' }, 5);
  const rated3 = row(3, { date: '2026-10-14', description: 'NullPointerException in Java' }, 3);
  const unrated = row(4, { date: '2026-10-16' });
  const all = [rated5, cancelled, rated3, unrated];

  describe('filterRows', () => {
    it('keeps everything with the default filters', () => {
      expect(ids(filterRows(all, DEFAULT_FILTERS, 'student'))).toEqual([1, 2, 3, 4]);
      expect(isFiltered(DEFAULT_FILTERS)).toBe(false);
    });

    it('filters by status, category and mode', () => {
      expect(ids(filterRows(all, withFilters({ status: 'Cancelled' }), 'student'))).toEqual([2]);
      expect(ids(filterRows(all, withFilters({ status: 'Completed' }), 'student'))).toEqual([1, 3, 4]);
      expect(ids(filterRows(all, withFilters({ category: 'Technology Support' }), 'student'))).toEqual([2]);
      expect(ids(filterRows(all, withFilters({ mode: 'Face-to-Face' }), 'student'))).toEqual([2]);
      expect(isFiltered(withFilters({ mode: 'Virtual' }))).toBe(true);
    });

    it('filters by an inclusive date range', () => {
      expect(ids(filterRows(all, withFilters({ from: '2026-10-12' }), 'student'))).toEqual([2, 3, 4]);
      expect(ids(filterRows(all, withFilters({ to: '2026-10-12' }), 'student'))).toEqual([1, 2]);
      expect(ids(filterRows(all, withFilters({ from: '2026-10-12', to: '2026-10-14' }), 'student'))).toEqual([2, 3]);
    });

    it('lets a student filter by rated or not yet rated (cancelled sessions are never "not rated")', () => {
      expect(ids(filterRows(all, withFilters({ feedback: 'rated' }), 'student'))).toEqual([1, 3]);
      expect(ids(filterRows(all, withFilters({ feedback: 'unrated' }), 'student'))).toEqual([4]);
    });

    it('lets a volunteer filter by a minimum star rating, hiding unrated sessions', () => {
      expect(ids(filterRows(all, withFilters({ minRating: 4 }), 'volunteer'))).toEqual([1]);
      expect(ids(filterRows(all, withFilters({ minRating: 3 }), 'volunteer'))).toEqual([1, 3]);
      expect(ids(filterRows(all, withFilters({ minRating: 0 }), 'volunteer'))).toEqual([1, 2, 3, 4]);
    });

    it('ignores the student-only filter for a volunteer and the volunteer-only filter for a student', () => {
      expect(ids(filterRows(all, withFilters({ feedback: 'rated' }), 'volunteer'))).toEqual([1, 2, 3, 4]);
      expect(ids(filterRows(all, withFilters({ minRating: 5 }), 'student'))).toEqual([1, 2, 3, 4]);
    });

    it('searches description, category and the other person, ignoring case and spaces at the ends', () => {
      expect(ids(filterRows(all, withFilters({ search: '  nullpointer ' }), 'student'))).toEqual([3]);
      expect(ids(filterRows(all, withFilters({ search: 'technology' }), 'student'))).toEqual([2]);
      expect(ids(filterRows(all, withFilters({ search: 'ben' }), 'student')).length).toBe(4);
      expect(ids(filterRows(all, withFilters({ search: 'ben' }), 'volunteer'))).toEqual([]);
      expect(ids(filterRows(all, withFilters({ search: 'alice' }), 'volunteer')).length).toBe(4);
    });

    it('combines filters', () => {
      expect(ids(filterRows(all, withFilters({ status: 'Completed', search: 'java', from: '2026-10-11' }), 'student'))).toEqual([3]);
      expect(filterRows(all, withFilters({ status: 'Cancelled', category: 'Academic Support' }), 'student')).toEqual([]);
    });
  });

  describe('sortRows', () => {
    it('sorts newest first by default and oldest first on request, without changing the input', () => {
      const input = [...all];
      expect(ids(sortRows(all, 'newest'))).toEqual([4, 3, 2, 1]);
      expect(ids(sortRows(all, 'oldest'))).toEqual([1, 2, 3, 4]);
      expect(all).toEqual(input);
    });

    it('breaks a tie on start time by the higher id first', () => {
      const a = row(10, { date: '2026-10-20' });
      const b = row(11, { date: '2026-10-20' });
      expect(ids(sortRows([a, b], 'newest'))).toEqual([11, 10]);
    });

    it('sorts by rating and always puts unrated sessions last', () => {
      expect(ids(sortRows(all, 'rating-high'))).toEqual([1, 3, 4, 2]);
      expect(ids(sortRows(all, 'rating-low'))).toEqual([3, 1, 4, 2]);
    });

    it('sorts by category A to Z, newest first inside a category', () => {
      expect(ids(sortRows(all, 'category'))).toEqual([4, 3, 1, 2]);
    });
  });

  describe('summarize', () => {
    it('counts sessions and averages the ratings', () => {
      expect(summarize(all)).toEqual({ total: 4, completed: 3, cancelled: 1, average: 4, ratingCount: 2 });
    });

    it('has no average when nothing is rated, and handles an empty list', () => {
      expect(summarize([unrated, cancelled]).average).toBeNull();
      expect(summarize([])).toEqual({ total: 0, completed: 0, cancelled: 0, average: null, ratingCount: 0 });
    });
  });

  it('lists each category once, A to Z', () => {
    expect(categoriesOf(all)).toEqual(['Academic Support', 'Technology Support']);
    expect(categoriesOf([])).toEqual([]);
  });
});
