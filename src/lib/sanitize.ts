// HTML sanitization for untrusted feed content. Feed bodies are HTML from
// arbitrary sources and are an XSS vector, so every body is sanitized before it
// is set as markup (both at normalize time and defensively at render).
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup', 'blockquote',
  'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code',
  'figure', 'figcaption', 'img', 'hr', 'span', 'table', 'thead', 'tbody',
  'tr', 'td', 'th',
];
const ALLOWED_ATTR = ['href', 'title', 'src', 'alt', 'colspan', 'rowspan'];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Drop javascript: and other dangerous URIs, and forbid inline event handlers.
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
    ALLOW_DATA_ATTR: false,
  });
}

/** Plain-text preview derived from HTML: tags stripped, whitespace collapsed. */
export function toSnippet(html: string, max = 220): string {
  const text = sanitizeHtml(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}
