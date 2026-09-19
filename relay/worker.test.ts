import { afterEach, describe, expect, it, vi } from 'vitest';
import { discoverFeedLinks, handleRequest, validateTarget, type Env } from './worker';

const relay = (target?: string, origin?: string, method = 'GET') => {
  const url = target
    ? `https://relay/?url=${encodeURIComponent(target)}`
    : 'https://relay/';
  const headers: Record<string, string> = {};
  if (origin) headers.Origin = origin;
  return new Request(url, { method, headers });
};

const discover = (page: string) =>
  new Request(`https://relay/?discover=${encodeURIComponent(page)}`);

const PAGE = `<!doctype html><html><head>
  <title>TechCrunch</title>
  <link rel="alternate" type="application/rss+xml" title="TechCrunch &raquo; AI" href="/category/ai/feed/">
  <link rel="alternate" type="application/atom+xml" title="Atom" href="https://techcrunch.com/atom.xml">
  <link rel="alternate" type="application/rss+xml" href="/category/ai/feed/"><!-- dup -->
  <link rel="alternate" type="application/rss+xml" title="Insecure" href="http://techcrunch.com/http-feed">
  <link rel="alternate" type="application/rss+xml" title="Internal" href="https://127.0.0.1/feed">
  <link rel="stylesheet" href="/style.css">
  <link rel="alternate" type="text/html" href="/amp">
</head><body>hello</body></html>`;

afterEach(() => vi.restoreAllMocks());

describe('validateTarget', () => {
  it('rejects a missing url and non-https schemes (incl. plaintext http)', () => {
    expect(validateTarget(null).ok).toBe(false);
    expect(validateTarget('http://example.com/feed.xml').ok).toBe(false); // https-only
    expect(validateTarget('file:///etc/passwd').ok).toBe(false);
    expect(validateTarget('ftp://x/y').ok).toBe(false);
  });

  it('rejects private / internal dotted addresses (over https)', () => {
    for (const h of [
      'https://localhost/f',
      'https://127.0.0.1/f',
      'https://10.0.0.1/f',
      'https://192.168.0.1/f',
      'https://169.254.169.254/f', // cloud metadata
      'https://172.16.0.1/f',
      'https://0.0.0.0/f',
    ]) {
      expect(validateTarget(h).ok, h).toBe(false);
    }
  });

  it('rejects encoded forms of private addresses (over https)', () => {
    expect(validateTarget('https://2130706433/f').ok).toBe(false); // 127.0.0.1 decimal
    expect(validateTarget('https://0x7f000001/f').ok).toBe(false); // 127.0.0.1 hex
    expect(validateTarget('https://0177.0.0.1/f').ok).toBe(false); // octal first octet
    expect(validateTarget('https://[::1]/f').ok).toBe(false); // IPv6 loopback
    expect(validateTarget('https://[fd00::1]/f').ok).toBe(false); // IPv6 ULA
  });

  it('accepts a normal public https feed url', () => {
    expect(validateTarget('https://example.com/feed.xml').ok).toBe(true);
  });
});

describe('handleRequest — basics', () => {
  it('answers CORS preflight', async () => {
    const res = await handleRequest(relay(undefined, undefined, 'OPTIONS'));
    expect(res.status).toBe(204);
  });

  it('returns 400 for a missing/invalid/non-https target', async () => {
    expect((await handleRequest(relay())).status).toBe(400);
    expect((await handleRequest(relay('ftp://x'))).status).toBe(400);
    expect((await handleRequest(relay('http://example.com/feed.xml'))).status).toBe(400);
  });

  it('relays a feed body with the content type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('<rss></rss>', { status: 200, headers: { 'content-type': 'application/rss+xml' } }),
      ),
    );
    const res = await handleRequest(relay('https://example.com/feed.xml'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('rss');
    expect(await res.text()).toBe('<rss></rss>');
  });

  it('reports unreachable and upstream errors distinctly', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('net'); }));
    let res = await handleRequest(relay('https://example.com/feed.xml'));
    expect(res.status).toBe(502);
    expect((await res.json()).kind).toBe('unreachable');

    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));
    res = await handleRequest(relay('https://example.com/feed.xml'));
    expect(res.status).toBe(502);
    expect((await res.json()).kind).toBe('upstream-error');
  });
});

describe('handleRequest — redirects', () => {
  it('does not follow a redirect to a private address', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('', { status: 302, headers: { location: 'https://127.0.0.1/x' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const res = await handleRequest(relay('https://example.com/feed.xml'));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/disallowed/i);
    expect(fetchMock).toHaveBeenCalledTimes(1); // never fetched the private target
  });

  it('does not follow a redirect to a plaintext http location', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('', { status: 302, headers: { location: 'http://example.com/feed.xml' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const res = await handleRequest(relay('https://example.com/start'));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/disallowed/i);
    expect(fetchMock).toHaveBeenCalledTimes(1); // never followed the http hop
  });

  it('follows a redirect to an allowed target', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('final')
        ? new Response('<rss>ok</rss>', { status: 200, headers: { 'content-type': 'application/xml' } })
        : new Response('', { status: 302, headers: { location: 'https://example.com/final' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const res = await handleRequest(relay('https://example.com/start'));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('ok');
  });
});

describe('handleRequest — size cap', () => {
  it('rejects when content-length exceeds the limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<rss></rss>', { status: 200, headers: { 'content-type': 'application/xml' } })),
    );
    // MAX_BYTES=5, an 11-byte body → over limit.
    const res = await handleRequest(relay('https://example.com/feed.xml'), { MAX_BYTES: '5' });
    expect(res.status).toBe(413);
  });

  it('rejects an oversized streamed body with no content-length', async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(100).fill(120));
        c.close();
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(stream, { status: 200, headers: { 'content-type': 'application/xml' } })),
    );
    const res = await handleRequest(relay('https://example.com/feed.xml'), { MAX_BYTES: '5' });
    expect(res.status).toBe(413);
  });

  it('defaults the cap to 1 MB', async () => {
    // Just over 1 MB via content-length, no env override → rejected by default.
    // Use a stream body so our explicit content-length header is not overwritten.
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(10).fill(120));
        c.close();
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(stream, {
          status: 200,
          headers: { 'content-type': 'application/xml', 'content-length': '1000001' },
        }),
      ),
    );
    const over = await handleRequest(relay('https://example.com/feed.xml'));
    expect(over.status).toBe(413);
  });
});

describe('handleRequest — content-type gate', () => {
  it('rejects a non-feed content type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('PNGDATA', { status: 200, headers: { 'content-type': 'image/png' } })),
    );
    const res = await handleRequest(relay('https://example.com/logo.png'));
    expect(res.status).toBe(415);
  });

  it('allows a generic content type that sniffs as a feed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('<?xml version="1.0"?><rss></rss>', {
          status: 200,
          headers: { 'content-type': 'application/octet-stream' },
        }),
      ),
    );
    const res = await handleRequest(relay('https://example.com/feed'));
    expect(res.status).toBe(200);
  });
});

describe('handleRequest — origin allowlist', () => {
  const env: Env = { ALLOWED_ORIGINS: 'https://app.example,http://localhost:5173' };

  it('rejects a browser origin not on the allowlist', async () => {
    const res = await handleRequest(
      relay('https://example.com/feed.xml', 'https://evil.example'),
      env,
    );
    expect(res.status).toBe(403);
  });

  it('serves an allowed origin and echoes it (not *)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<rss></rss>', { status: 200, headers: { 'content-type': 'application/xml' } })),
    );
    const res = await handleRequest(
      relay('https://example.com/feed.xml', 'https://app.example'),
      env,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');
  });
});

describe('discoverFeedLinks', () => {
  it('extracts feed links, resolves relative hrefs, and drops non-feeds', () => {
    const feeds = discoverFeedLinks(PAGE, 'https://techcrunch.com/');
    // Keeps: the two safe feeds; drops dup, http, private, stylesheet, text/html.
    expect(feeds).toEqual([
      { url: 'https://techcrunch.com/category/ai/feed/', type: 'rss', title: 'TechCrunch » AI' },
      { url: 'https://techcrunch.com/atom.xml', type: 'atom', title: 'Atom' },
    ]);
  });

  it('returns an empty list for a page with no feeds', () => {
    expect(discoverFeedLinks('<html><head><title>none</title></head></html>', 'https://x.example/')).toEqual([]);
  });
});

describe('handleRequest — discovery mode', () => {
  it('fetches the page once and returns only the discovered feeds (never the page body)', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(PAGE, { status: 200, headers: { 'content-type': 'text/html' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const res = await handleRequest(discover('https://techcrunch.com'));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1); // one upstream fetch, no candidate probing
    const body = await res.json();
    expect(body.feeds).toHaveLength(2);
    expect(body.feeds[0]).toMatchObject({ url: 'https://techcrunch.com/category/ai/feed/', type: 'rss' });
    expect(JSON.stringify(body)).not.toContain('hello'); // page body did not leak
  });

  it('accepts a page in discovery mode; the feed path still gates non-feed content', async () => {
    // The feed content gate still rejects a genuinely non-feed response...
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('PNGDATA', { status: 200, headers: { 'content-type': 'image/png' } })),
    );
    expect((await handleRequest(relay('https://example.com/logo.png'))).status).toBe(415);

    // ...but discovery accepts an HTML page (which is not feed-like) and returns a list.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html><head></head><body>x</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })),
    );
    const asDiscover = await handleRequest(discover('https://example.com/'));
    expect(asDiscover.status).toBe(200);
    expect((await asDiscover.json()).feeds).toEqual([]);
  });

  it('rejects a missing or disallowed discovery target without fetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await handleRequest(discover(''))).status).toBe(400);
    expect((await handleRequest(discover('http://example.com/'))).status).toBe(400);
    expect((await handleRequest(discover('https://127.0.0.1/'))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not follow a discovery redirect to a private address', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('', { status: 302, headers: { location: 'https://169.254.169.254/' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const res = await handleRequest(discover('https://example.com/'));
    expect(res.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('handleRequest — rate limiting', () => {
  it('rejects when the rate limiter denies the request', async () => {
    const env: Env = { RATE_LIMITER: { limit: async () => ({ success: false }) } };
    const res = await handleRequest(relay('https://example.com/feed.xml'), env);
    expect(res.status).toBe(429);
    expect((await res.json()).kind).toBe('rate-limited');
  });

  it('proceeds when the rate limiter allows the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<rss></rss>', { status: 200, headers: { 'content-type': 'application/xml' } })),
    );
    const env: Env = { RATE_LIMITER: { limit: async () => ({ success: true }) } };
    const res = await handleRequest(relay('https://example.com/feed.xml'), env);
    expect(res.status).toBe(200);
  });
});
