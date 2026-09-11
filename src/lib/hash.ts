// Small deterministic string hash (djb2), used as a last-resort entry identity
// when a feed item has neither a guid nor a link.
export function hashString(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}
