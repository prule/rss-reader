// RSS Reader feed relay — a stateless Cloudflare Worker that fetches a feed
// document server-side and returns it with CORS headers, so the browser app can
// read feeds that do not send CORS headers themselves.
//
// It stores nothing and is hardened against abuse: it only fetches https
// public feed URLs (re-validating every redirect hop and rejecting encoded
// internal addresses), caps response size, rate-limits per client, restricts
// browser origins to an allowlist, and only relays feed-like content.

export interface Env {
  /** Comma-separated allowed browser origins. When empty, origin checks are skipped. */
  ALLOWED_ORIGINS?: string;
  /** Max upstream response bytes (string var). */
  MAX_BYTES?: string;
  /** Max redirect hops to follow (string var). */
  MAX_REDIRECTS?: string;
  /** Cloudflare rate-limiting binding (optional; skipped when absent). */
  RATE_LIMITER?: { limit: (opts: { key: string }) => Promise<{ success: boolean }> };
}

const DEFAULT_MAX_BYTES = 1_000_000;
const DEFAULT_MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  // Echo the specific allowed origin (never "*"). With no allowlist configured,
  // fall back to "*" so local/dev use still works.
  if (allowed.length === 0) headers['Access-Control-Allow-Origin'] = '*';
  else if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

/** Parse an int allowing decimal, 0x-hex, and 0-octal; null if not a pure integer. */
function parseIntAuto(s: string): number | null {
  if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16);
  if (/^0[0-7]+$/.test(s)) return parseInt(s, 8);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return null;
}

/** Resolve an IPv4 host in any inet_aton form (dotted, decimal, hex, octal) to octets. */
function toIPv4Octets(host: string): [number, number, number, number] | null {
  const parts = host.split('.');
  if (parts.length === 0 || parts.length > 4) return null;
  const nums = parts.map(parseIntAuto);
  if (nums.some((n) => n === null)) return null;
  const n = nums as number[];
  let value: number;
  if (n.length === 1) {
    value = n[0];
  } else {
    // First (length-1) parts are single octets; the last fills the remainder.
    for (let i = 0; i < n.length - 1; i++) if (n[i] > 255) return null;
    const last = n[n.length - 1];
    const remainingOctets = 4 - (n.length - 1);
    if (last >= 2 ** (8 * remainingOctets)) return null;
    value = last;
    for (let i = 0; i < n.length - 1; i++) {
      value += n[i] * 2 ** (8 * (3 - i));
    }
  }
  if (value < 0 || value > 0xffffffff) return null;
  return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
}

function isBlockedIPv4([a, b, c]: [number, number, number, number]): boolean {
  return (
    a === 0 || // 0.0.0.0/8 "this network"
    a === 127 || // loopback
    a === 10 || // private
    (a === 192 && b === 168) || // private
    (a === 169 && b === 254) || // link-local (incl. 169.254.169.254 metadata)
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    a >= 224 || // multicast / reserved / broadcast
    (a === 192 && b === 0 && c === 2) // TEST-NET-1 (documentation)
  );
}

/** Reject non-http(s) schemes and internal/private targets, including encoded forms. */
export function validateTarget(
  raw: string | null,
): { ok: true; url: URL } | { ok: false; reason: string } {
  if (!raw) return { ok: false, reason: 'Missing target url' };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'Malformed url' };
  }
  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'Only https is allowed' };
  }
  let host = url.hostname.toLowerCase();
  // Strip IPv6 brackets. We reject all IPv6 literals: feeds use hostnames or
  // IPv4, and this blanket-blocks ::1, fc00::/7 (ULA), fe80::/10, and
  // ::ffff:<private-v4> mapped forms without partial-parsing IPv6.
  if (host.startsWith('[') || host.includes(':')) {
    return { ok: false, reason: 'IPv6 literal targets are not allowed' };
  }
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return { ok: false, reason: 'Target address is not allowed' };
  }
  const octets = toIPv4Octets(host);
  if (octets && isBlockedIPv4(octets)) {
    return { ok: false, reason: 'Target address is not allowed' };
  }
  return { ok: true, url };
}

function maxBytes(env: Env): number {
  const n = Number(env.MAX_BYTES);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}
function maxRedirects(env: Env): number {
  const n = Number(env.MAX_REDIRECTS);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MAX_REDIRECTS;
}
function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/** A content type or sniffed body that looks like a feed. */
function isFeedLikeType(contentType: string): boolean {
  return /(xml|rss|atom|text\/|application\/json)/i.test(contentType);
}
function sniffsAsFeed(head: string): boolean {
  return /^\s*(<\?xml|<rss|<feed|<rdf)/i.test(head);
}

/** Accept header for feed fetches (unchanged) and for discovery (HTML pages). */
const FEED_ACCEPT = 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*';
const DISCOVER_ACCEPT = 'text/html, application/xhtml+xml, */*';

/** Max feed candidates returned from a single discovery request. */
const MAX_DISCOVERED = 25;
/** Max characters kept from a discovered feed's title. */
const MAX_TITLE = 200;

export type FeedKind = 'rss' | 'atom' | 'json';

export interface DiscoveredFeed {
  url: string;
  type: FeedKind;
  title: string;
}

/** Map an autodiscovery link `type` attribute to a feed kind, or null. */
function feedTypeOf(type: string): FeedKind | null {
  const t = type.toLowerCase();
  if (t.includes('atom')) return 'atom';
  if (t.includes('rss')) return 'rss';
  if (t.includes('json')) return 'json';
  return null;
}

/** Parse the attributes of a single tag string into a lowercased-key map. */
function tagAttrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return out;
}

/** Decode the handful of HTML entities that commonly appear in feed titles. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&(amp|lt|gt|quot|apos|raquo|laquo|nbsp|mdash|ndash);/gi, (_, name) => {
      const map: Record<string, string> = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        raquo: '»',
        laquo: '«',
        nbsp: ' ',
        mdash: '—',
        ndash: '–',
      };
      return map[name.toLowerCase()] ?? _;
    });
}

/**
 * Find autodiscovery feed links in an HTML page. Returns only feeds whose URL,
 * resolved against `baseUrl`, is an allowed https target — never the page body.
 * Deduped by URL, titles decoded/truncated, and capped at MAX_DISCOVERED.
 */
export function discoverFeedLinks(html: string, baseUrl: string): DiscoveredFeed[] {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const seen = new Set<string>();
  const feeds: DiscoveredFeed[] = [];
  for (const tag of tags) {
    const a = tagAttrs(tag);
    const rel = (a.rel ?? '').toLowerCase().split(/\s+/);
    if (!rel.includes('alternate')) continue;
    const type = feedTypeOf(a.type ?? '');
    if (!type || !a.href) continue;
    let resolved: string;
    try {
      resolved = new URL(a.href, baseUrl).toString();
    } catch {
      continue;
    }
    const check = validateTarget(resolved);
    if (!check.ok) continue;
    const url = check.url.toString();
    if (seen.has(url)) continue;
    seen.add(url);
    const title = decodeEntities((a.title ?? '').trim()).slice(0, MAX_TITLE);
    feeds.push({ url, type, title });
    if (feeds.length >= MAX_DISCOVERED) break;
  }
  return feeds;
}

/**
 * Fetch a URL, following redirects manually and re-validating every hop so a
 * redirect cannot reach a disallowed scheme or private/internal address.
 * Returns the final upstream response and effective URL, or an error response.
 */
async function followAndFetch(
  startUrl: string,
  env: Env,
  cors: Record<string, string>,
  accept: string,
): Promise<{ ok: true; upstream: Response; finalUrl: string } | { ok: false; response: Response }> {
  let current = startUrl;
  const hopLimit = maxRedirects(env);
  for (let hop = 0; ; hop++) {
    let upstream: Response;
    try {
      upstream = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: { Accept: accept },
      });
    } catch {
      return {
        ok: false,
        response: json(502, { error: 'Could not reach the feed', kind: 'unreachable' }, cors),
      };
    }

    if (!REDIRECT_STATUSES.has(upstream.status)) return { ok: true, upstream, finalUrl: current };

    if (hop >= hopLimit) {
      return {
        ok: false,
        response: json(502, { error: 'Too many redirects', kind: 'upstream-error' }, cors),
      };
    }
    const location = upstream.headers.get('location');
    if (!location) {
      return {
        ok: false,
        response: json(502, { error: 'Redirect without a location', kind: 'upstream-error' }, cors),
      };
    }
    let resolved: string;
    try {
      resolved = new URL(location, current).toString();
    } catch {
      return {
        ok: false,
        response: json(502, { error: 'Invalid redirect location', kind: 'upstream-error' }, cors),
      };
    }
    const redirectCheck = validateTarget(resolved);
    if (!redirectCheck.ok) {
      return {
        ok: false,
        response: json(
          502,
          { error: 'Redirect to a disallowed address', kind: 'upstream-error' },
          cors,
        ),
      };
    }
    current = redirectCheck.url.toString();
  }
}

/**
 * Discovery mode: fetch a page once (with all the same target/redirect/size
 * protections as a feed fetch) and return only the feeds advertised in it. The
 * page body never leaves the relay, and no candidate feed is fetched.
 */
async function handleDiscover(
  raw: string | null,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const check = validateTarget(raw);
  if (!check.ok) return json(400, { error: check.reason }, cors);

  const res = await followAndFetch(check.url.toString(), env, cors, DISCOVER_ACCEPT);
  if (!res.ok) return res.response;
  const { upstream, finalUrl } = res;

  if (!upstream.ok) {
    return json(
      502,
      {
        error: `Site responded ${upstream.status}`,
        kind: 'upstream-error',
        status: upstream.status,
      },
      cors,
    );
  }

  const declaredLength = Number(upstream.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes(env)) {
    return json(413, { error: 'Page response too large', kind: 'too-large' }, cors);
  }
  const read = await readCapped(upstream, maxBytes(env));
  if (!read.ok) {
    return json(413, { error: 'Page response too large', kind: 'too-large' }, cors);
  }

  const html = new TextDecoder().decode(read.bytes);
  return json(200, { feeds: discoverFeedLinks(html, finalUrl) }, cors);
}

/** Read a body stream, aborting once it exceeds `limit` bytes. */
async function readCapped(
  res: Response,
  limit: number,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false }> {
  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf.byteLength > limit ? { ok: false } : { ok: true, bytes: buf };
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        return { ok: false };
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return { ok: true, bytes };
}

export async function handleRequest(request: Request, env: Env = {}): Promise<Response> {
  const allowed = allowedOrigins(env);
  const origin = request.headers.get('Origin');
  const cors = corsHeaders(origin, allowed);

  // Origin allowlist (defense-in-depth): reject browser requests from origins
  // not on the allowlist. Requests without an Origin (non-browser) fall through
  // to the size/rate/target/content limits.
  if (allowed.length > 0 && origin && !allowed.includes(origin)) {
    return json(403, { error: 'Origin not allowed' }, cors);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'GET') {
    return json(405, { error: 'Method not allowed' }, cors);
  }

  // Rate limit per client IP when the binding is configured.
  if (env.RATE_LIMITER) {
    const key = request.headers.get('CF-Connecting-IP') ?? 'anonymous';
    const { success } = await env.RATE_LIMITER.limit({ key });
    if (!success) {
      return json(429, { error: 'Rate limit exceeded', kind: 'rate-limited' }, cors);
    }
  }

  const params = new URL(request.url).searchParams;

  // Discovery mode: given a page URL, return only the feeds found in it.
  const discoverRaw = params.get('discover');
  if (discoverRaw !== null) {
    return handleDiscover(discoverRaw, env, cors);
  }

  const check = validateTarget(params.get('url'));
  if (!check.ok) {
    return json(400, { error: check.reason }, cors);
  }

  // Fetch the feed, following/re-validating redirects.
  const fetched = await followAndFetch(check.url.toString(), env, cors, FEED_ACCEPT);
  if (!fetched.ok) return fetched.response;
  const upstream = fetched.upstream;

  if (!upstream.ok) {
    return json(
      502,
      {
        error: `Feed responded ${upstream.status}`,
        kind: 'upstream-error',
        status: upstream.status,
      },
      cors,
    );
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  const declaredLength = Number(upstream.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes(env)) {
    return json(413, { error: 'Feed response too large', kind: 'too-large' }, cors);
  }

  const read = await readCapped(upstream, maxBytes(env));
  if (!read.ok) {
    return json(413, { error: 'Feed response too large', kind: 'too-large' }, cors);
  }

  // Content-type gate: only relay feed-like responses. When the type is missing
  // or generic, sniff the first bytes for a feed root element.
  const head = new TextDecoder().decode(read.bytes.slice(0, 256));
  if (!isFeedLikeType(contentType) && !sniffsAsFeed(head)) {
    return json(415, { error: 'Not a feed response', kind: 'not-a-feed' }, cors);
  }

  return new Response(read.bytes, {
    status: 200,
    headers: {
      'Content-Type': contentType || 'application/xml; charset=utf-8',
      ...cors,
    },
  });
}

export default {
  fetch: (request: Request, env: Env) => handleRequest(request, env),
};
