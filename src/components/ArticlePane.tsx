import { useMemo } from 'react';
import { useStore } from '../store/store';
import { node, tagsFor } from '../store/selectors';
import { useEntry, useNodes } from '../hooks/useLibrary';
import * as actions from '../store/actions';
import { sanitizeHtml } from '../lib/sanitize';
import { timeAgo } from '../lib/timeAgo';
import { IconBookmark } from './icons';

export function ArticlePane() {
  const s = useStore();
  const nodes = useNodes() ?? [];
  const article = useEntry(s.selEntry);

  // Sanitize defensively at render as well as at normalize time.
  const safeBody = useMemo(() => (article ? sanitizeHtml(article.body) : ''), [article]);

  if (!article) {
    return (
      <section className="article-col" aria-label="Article">
        <div className="article-empty">Select an entry</div>
      </section>
    );
  }

  const feed = node(nodes, article.feedId);
  const tags = tagsFor(nodes, article.feedId);
  const ago = timeAgo(article.publishedAt);
  const byline = [article.author, ago && `${ago} ago`].filter(Boolean).join(' · ');

  return (
    <section className="article-col" aria-label="Article">
      <div className="article-scroll">
        <article className="article">
          <div className="article-kicker-row">
            <span className="article-kicker">{feed ? feed.name : 'Removed feed'}</span>
            <span className="article-rule" />
            <button
              className={`article-action${article.marked ? ' on' : ''}`}
              onClick={() => void actions.toggleMark(article.id)}
            >
              <IconBookmark size={13} fill={article.marked} />
              {article.marked ? 'Bookmarked' : 'Bookmark'}
            </button>
            <button className="article-action" onClick={() => void actions.toggleRead(article.id)}>
              {article.read ? 'Mark unread' : 'Mark read'}
            </button>
          </div>

          <h2>{article.title}</h2>
          {byline && <div className="article-byline">{byline}</div>}

          {tags.length > 0 && (
            <div className="article-tags">
              {tags.map((t) => (
                <span key={t} className="tag tag-outline" style={{ fontSize: 11 }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {article.link && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <a href={article.link} target="_blank" rel="noopener noreferrer">
                Open original ↗
              </a>
            </div>
          )}

          <div
            className="article-body"
            // Sanitized above; feeds provide HTML that must render as markup.
            dangerouslySetInnerHTML={{ __html: safeBody }}
          />
        </article>
      </div>
    </section>
  );
}
