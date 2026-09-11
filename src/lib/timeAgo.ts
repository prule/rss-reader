// Relative "time ago" computed from an absolute timestamp at display time,
// replacing the mock's frozen strings.
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 604_800_000;

export function timeAgo(publishedAt: number | null, now: number = Date.now()): string {
  if (publishedAt == null) return '';
  const diff = now - publishedAt;
  if (diff < MIN) return 'now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;
  return `${Math.floor(diff / WEEK)}w`;
}
