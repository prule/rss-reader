import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleRequest, validateTarget } from './worker';

const req = (url: string, method = 'GET') => new Request(url, { method });

afterEach(() => vi.restoreAllMocks());

describe('validateTarget', () => {
  it('rejects a missing url', () => {
    expect(validateTarget(null)).toEqual({ ok: false, reason: 'Missing target url' });
  });
  it('rejects non-http(s) schemes', () => {
    expect(validateTarget('file:///etc/passwd').ok).toBe(false);
    expect(validateTarget('ftp://x/y').ok).toBe(false);
  });
  it('rejects internal / private addresses', () => {
    expect(validateTarget('http://localhost/feed').ok).toBe(false);
    expect(validateTarget('http://127.0.0.1/feed').ok).toBe(false);
    expect(validateTarget('http://192.168.0.1/feed').ok).toBe(false);
    expect(validateTarget('http://169.254.1.1/feed').ok).toBe(false);
  });
  it('accepts a normal https feed url', () => {
    const r = validateTarget('https://example.com/feed.xml');
    expect(r.ok).toBe(true);
  });
});

describe('handleRequest', () => {
  it('answers CORS preflight', async () => {
    const res = await handleRequest(req('https://relay/?url=x', 'OPTIONS'));
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('returns 400 for a missing/invalid target', async () => {
    const res = await handleRequest(req('https://relay/'));
    expect(res.status).toBe(400);
    const res2 = await handleRequest(req('https://relay/?url=' + encodeURIComponent('ftp://x')));
    expect(res2.status).toBe(400);
  });

  it('relays a successful upstream body with CORS and content type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('<rss></rss>', {
          status: 200,
          headers: { 'content-type': 'application/rss+xml' },
        }),
      ),
    );
    const res = await handleRequest(
      req('https://relay/?url=' + encodeURIComponent('https://example.com/feed.xml')),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Content-Type')).toContain('rss');
    expect(await res.text()).toBe('<rss></rss>');
  });

  it('reports an unreachable upstream distinctly (502/unreachable)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network');
    }));
    const res = await handleRequest(
      req('https://relay/?url=' + encodeURIComponent('https://example.com/feed.xml')),
    );
    expect(res.status).toBe(502);
    expect((await res.json()).kind).toBe('unreachable');
  });

  it('reports an upstream error status distinctly (502/upstream-error)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));
    const res = await handleRequest(
      req('https://relay/?url=' + encodeURIComponent('https://example.com/feed.xml')),
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.kind).toBe('upstream-error');
    expect(body.status).toBe(404);
  });
});
