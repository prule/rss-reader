// Offered once, on the first launch after the move to IndexedDB, when a library
// from the old localStorage build is still sitting there. It is not a migration:
// the payload is not loaded, it is handed over as a file and then dropped.
import { useStore } from '../store/store';
import { discardLegacyPayload, downloadLegacyPayload } from '../lib/rescue';

export function RescuePrompt() {
  const payload = useStore((s) => s.legacyPayload);
  const clear = useStore((s) => s.clearLegacyPayload);
  const say = useStore((s) => s.say);

  if (!payload) return null;

  const rescue = () => {
    downloadLegacyPayload(payload);
    clear();
    say('Saved your old library — use Import to restore it');
  };
  const discard = () => {
    discardLegacyPayload();
    clear();
  };

  return (
    <div className="backdrop">
      <div
        className="dialog blueprint"
        role="dialog"
        aria-modal="true"
        aria-label="Old library found"
      >
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <h4>Old library found</h4>
        <p className="rescue-detail">
          This version stores your library in a larger on-device database, and does not carry the
          old one over. Download it now and restore it with Import — this is the only time it is
          offered.
        </p>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={discard}>
            Discard
          </button>
          <button className="btn btn-primary" onClick={rescue}>
            Download backup
          </button>
        </div>
      </div>
    </div>
  );
}
