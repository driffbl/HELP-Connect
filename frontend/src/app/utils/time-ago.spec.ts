import { timeAgo } from './time-ago';

describe('timeAgo', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it('says just now for under a minute, and for a time slightly in the future', () => {
    expect(timeAgo(ago(30_000), now)).toBe('just now');
    expect(timeAgo(ago(-5_000), now)).toBe('just now');
  });

  it('counts minutes, hours and days', () => {
    expect(timeAgo(ago(5 * MIN), now)).toBe('5 min ago');
    expect(timeAgo(ago(59 * MIN), now)).toBe('59 min ago');
    expect(timeAgo(ago(60 * MIN), now)).toBe('1 h ago');
    expect(timeAgo(ago(23 * HOUR), now)).toBe('23 h ago');
    expect(timeAgo(ago(DAY), now)).toBe('yesterday');
    expect(timeAgo(ago(4 * DAY), now)).toBe('4 d ago');
  });

  it('switches to a plain date after a week, and shows nothing for an unreadable time', () => {
    expect(timeAgo('2026-10-01T09:00:00', now)).toBe('01/10/2026');
    expect(timeAgo('not a date', now)).toBe('');
  });
});
