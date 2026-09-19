import { useStore } from '../store/store';
import { ancestors } from '../store/selectors';
import { addFromInput, addSelectedFeeds, hostFrom, subscribeFeed } from '../lib/feeds';

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

  // Input phase: classify the URL — subscribe if it's a feed, else discover.
  const submit = async () => {
    const { url, name, parent } = s.form;
    if (!url.trim() && !name.trim()) {
      s.closeAddFeed();
      return;
    }
    s.setDiscovering(true);
    const result = await addFromInput({ url, name, parent: parent || null });
    switch (result.kind) {
      case 'discovered':
        s.showCandidates(result.candidates);
        break;
      case 'none-found':
        s.showNoneFound();
        break;
      case 'error':
        s.setDiscovering(false);
        s.say("Couldn't reach that site — check the URL or your connection");
        break;
      default: // 'subscribed' | 'empty'
        s.closeAddFeed();
    }
  };

  // Choosing phase: add the checked feeds into the selected folder.
  const addSelected = () => {
    const chosen = s.candidates.filter((c) => s.selectedUrls.includes(c.url));
    if (chosen.length === 0) return;
    void addSelectedFeeds(chosen, s.form.parent || null);
    s.closeAddFeed();
  };

  // None-found phase: subscribe to the entered URL as-is.
  const addAsIs = () => {
    void subscribeFeed({ url: s.form.url, name: s.form.name, parent: s.form.parent || null });
    s.closeAddFeed();
  };

  const folderSelect = (
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
  );

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

        {s.addPhase === 'choosing' ? (
          <>
            <h4>Feeds found</h4>
            <p className="discover-intro">
              Select the feeds to add from {hostFrom(s.form.url) || 'this site'}.
            </p>
            <div className="discover-list" role="group" aria-label="Discovered feeds">
              {s.candidates.map((c) => (
                <label className="discover-row" key={c.url}>
                  <input
                    type="checkbox"
                    aria-label={c.title || c.url}
                    checked={s.selectedUrls.includes(c.url)}
                    onChange={() => s.toggleCandidate(c.url)}
                  />
                  <span className="discover-name" title={c.url}>
                    {c.title || hostFrom(c.url)}
                  </span>
                  <span className="tag tag-outline discover-type">{c.type}</span>
                </label>
              ))}
            </div>
            <div className="form-grid" style={{ marginTop: 'var(--space-3)' }}>
              {folderSelect}
            </div>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={s.backToInput}>
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={addSelected}
                disabled={s.selectedUrls.length === 0}
              >
                Add selected ({s.selectedUrls.length})
              </button>
            </div>
          </>
        ) : s.addPhase === 'none' ? (
          <>
            <h4>No feeds found</h4>
            <p className="discover-intro">
              We couldn't find any feeds at {hostFrom(s.form.url) || 'that URL'}. You can add the
              URL as a feed anyway and refresh later.
            </p>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={s.backToInput}>
                Back
              </button>
              <button className="btn btn-primary" onClick={addAsIs}>
                Add URL anyway
              </button>
            </div>
          </>
        ) : (
          <>
            <h4>Add a feed</h4>
            <div className="form-grid">
              <label className="form-label">
                Feed or site URL
                <input
                  autoFocus
                  aria-label="Feed or site URL"
                  value={s.form.url}
                  placeholder="techcrunch.com or https://example.com/feed.xml"
                  onChange={(e) => s.setForm({ url: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && void submit()}
                />
              </label>
              <label className="form-label">
                Title
                <input
                  aria-label="Title"
                  value={s.form.name}
                  placeholder="Auto-detected from the feed"
                  onChange={(e) => s.setForm({ name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && void submit()}
                />
              </label>
              {folderSelect}
            </div>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={s.closeAddFeed} disabled={s.discovering}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => void submit()} disabled={s.discovering}>
                {s.discovering ? 'Checking…' : 'Subscribe'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
