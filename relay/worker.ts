// Ferrite feed relay — a stateless Cloudflare Worker that fetches a feed
// document server-side and returns it with permissive CORS headers, so the
// browser app can read feeds that do not send CORS headers themselves.
//
// It stores nothing: no feed URLs, no content, no user data. It only fetches
// http(s) feed URLs and refuses everything else, so it cannot be used as a
// general open proxy.

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/** Reject non-http(s) schemes and obvious internal targets (basic SSRF guard). */
export function validateTarget(raw: string | null): { ok: true; url: URL } | { ok: false; reason: string } {
  if (!raw) return { ok: false, reason: 'Missing target url' };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'Malformed url' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'Only http and https are allowed' };
  }
  const host = url.hostname.toLowerCase();
  const blocked =
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host.endsWith('.localhost') ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blocked) return { ok: false, reason: 'Target address is not allowed' };
  return { ok: true, url };
}

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const target = new URL(request.url).searchParams.get('url');
  const check = validateTarget(target);
  if (!check.ok) {
    return json(400, { error: check.reason });
  }

  let upstream: Response;
  try {
    upstream = await fetch(check.url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
      redirect: 'follow',
    });
  } catch {
    // Distinguishable from a parse failure by status + body.
    return json(502, { error: 'Could not reach the feed', kind: 'unreachable' });
  }

  if (!upstream.ok) {
    return json(502, {
      error: `Feed responded ${upstream.status}`,
      kind: 'upstream-error',
      status: upstream.status,
    });
  }

  const contentType =
    upstream.headers.get('content-type') ?? 'application/xml; charset=utf-8';
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': contentType, ...CORS_HEADERS },
  });
}

export default {
  fetch: handleRequest,
};
