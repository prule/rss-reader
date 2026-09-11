import { describe, expect, it } from 'vitest';
import { sanitizeHtml, toSnippet } from './sanitize';

describe('sanitizeHtml', () => {
  it('strips scripts and inline event handlers', () => {
    const dirty = '<p>ok</p><script>alert(1)</script><img src=x onerror="alert(1)">';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<p>ok</p>');
    expect(clean).not.toContain('<script');
    expect(clean.toLowerCase()).not.toContain('onerror');
  });

  it('drops javascript: hrefs', () => {
    const clean = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(clean.toLowerCase()).not.toContain('javascript:');
  });

  it('keeps safe formatting', () => {
    const clean = sanitizeHtml('<p><strong>Bold</strong> and <a href="https://x.com">link</a></p>');
    expect(clean).toContain('<strong>Bold</strong>');
    expect(clean).toContain('href="https://x.com"');
  });

  it('toSnippet strips tags and truncates', () => {
    expect(toSnippet('<p>Hello <b>world</b></p>')).toBe('Hello world');
    const long = '<p>' + 'a'.repeat(500) + '</p>';
    expect(toSnippet(long).endsWith('…')).toBe(true);
    expect(toSnippet(long).length).toBeLessThanOrEqual(220);
  });
});
