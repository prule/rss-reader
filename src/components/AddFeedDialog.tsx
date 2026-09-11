import { useStore } from '../store/store';
import { ancestors } from '../store/selectors';
import { subscribeFeed } from '../lib/feeds';

export function AddFeedDialog() {
  const s = useStore();
  if (!s.showAddFeed) return null;

  const folderOptions = [{ value: '', label: 'Top level' }].concat(
    s.nodes
      .filter((n) => n.type === 'folder')
      .map((n) => ({
        value: n.id,
        label: ancestors(s.nodes, n.id)
          .map((a) => a.name)
          .concat([n.name])
          .join(' / '),
      })),
  );

  const submit = () => {
    const { url, name, parent } = s.form;
    if (!url.trim() && !name.trim()) {
      s.closeAddFeed();
      return;
    }
    void subscribeFeed({ url, name, parent: parent || null });
    s.closeAddFeed();
  };

  return (
    <div className="backdrop" onClick={s.closeAddFeed}>
      <div
        className="dialog blueprint"
        role="dialog"
        aria-label="Add a feed"
        onClick={(e) => e.stopPropagation()}
      >
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <h4>Add a feed</h4>
        <div className="form-grid">
          <label className="form-label">
            Feed URL
            <input
              autoFocus
              aria-label="Feed URL"
              value={s.form.url}
              placeholder="https://example.com/feed.xml"
              onChange={(e) => s.setForm({ url: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </label>
          <label className="form-label">
            Title
            <input
              aria-label="Title"
              value={s.form.name}
              placeholder="Auto-detected from the feed"
              onChange={(e) => s.setForm({ name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </label>
          <label className="form-label">
            Folder
            <select
              aria-label="Folder"
              value={s.form.parent}
              onChange={(e) => s.setForm({ parent: e.target.value })}
            >
              {folderOptions.map((o) => (
                <option key={o.value || 'root'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={s.closeAddFeed}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
}
