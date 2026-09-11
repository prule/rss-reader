import { describe, expect, it } from 'vitest';
import { FeedParseError, parseFeed } from './parseFeed';

const RSS = `<?xml version="1.0"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Packet Loss Weekly</title>
    <item>
      <title>Anycast is not a load balancer</title>
      <link>https://plw.dev/anycast</link>
      <guid>plw-anycast-1</guid>
      <dc:creator>noc@plw</dc:creator>
      <pubDate>Wed, 10 Sep 2025 12:00:00 GMT</pubDate>
      <content:encoded><![CDATA[<p>Anycast routes to the nearest announcement.</p><script>bad()</script>]]></content:encoded>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Quanta Magazine</title>
  <entry>
    <title>A new proof tightens sphere packing</title>
    <link rel="alternate" href="https://quanta/sphere"/>
    <id>urn:quanta:sphere</id>
    <author><name>C. Oduya</name></author>
    <updated>2025-09-09T10:00:00Z</updated>
    <content type="html">&lt;p&gt;A small improvement.&lt;/p&gt;</content>
  </entry>
</feed>`;

describe('parseFeed', () => {
  it('parses RSS 2.0 with namespaced fields and sanitizes the body', () => {
    const feed = parseFeed(RSS);
    expect(feed.title).toBe('Packet Loss Weekly');
    expect(feed.items).toHaveLength(1);
    const item = feed.items[0];
    expect(item.title).toBe('Anycast is not a load balancer');
    expect(item.link).toBe('https://plw.dev/anycast');
    expect(item.sourceId).toBe('plw-anycast-1');
    expect(item.author).toBe('noc@plw');
    expect(item.publishedAt).toBe(Date.parse('Wed, 10 Sep 2025 12:00:00 GMT'));
    expect(item.body).toContain('<p>Anycast');
    expect(item.body).not.toContain('<script'); // sanitized
    expect(item.snippet).toContain('Anycast routes');
  });

  it('parses Atom 1.0', () => {
    const feed = parseFeed(ATOM);
    expect(feed.title).toBe('Quanta Magazine');
    const item = feed.items[0];
    expect(item.title).toContain('sphere packing');
    expect(item.link).toBe('https://quanta/sphere');
    expect(item.sourceId).toBe('urn:quanta:sphere');
    expect(item.author).toBe('C. Oduya');
    expect(item.publishedAt).toBe(Date.parse('2025-09-09T10:00:00Z'));
    expect(item.body).toContain('A small improvement');
  });

  it('falls back to link, then a content hash, for identity', () => {
    const noGuid = `<rss><channel><item><title>T</title><link>https://x/1</link></item></channel></rss>`;
    expect(parseFeed(noGuid).items[0].sourceId).toBe('https://x/1');
    const noLink = `<rss><channel><item><title>Only title</title></item></channel></rss>`;
    expect(parseFeed(noLink).items[0].sourceId).toBeTruthy();
  });

  it('throws on malformed XML', () => {
    expect(() => parseFeed('<not-closed')).toThrow(FeedParseError);
  });

  it('throws on a well-formed non-feed document', () => {
    expect(() => parseFeed('<html><body>hi</body></html>')).toThrow(FeedParseError);
  });
});
