import { describe, expect, it } from 'vitest';
import { timeAgo } from './timeAgo';

describe('timeAgo', () => {
  const now = 1_000_000_000_000;
  it('returns empty for null', () => {
    expect(timeAgo(null, now)).toBe('');
  });
  it('formats recent times', () => {
    expect(timeAgo(now - 30_000, now)).toBe('now');
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5m');
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe('3h');
    expect(timeAgo(now - 2 * 86_400_000, now)).toBe('2d');
    expect(timeAgo(now - 3 * 604_800_000, now)).toBe('3w');
  });
});
