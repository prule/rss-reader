import { useAppUpdate } from '../hooks/useAppUpdate';

export function UpdatePrompt() {
  const { updateReady, reload, dismiss } = useAppUpdate();
  if (!updateReady) return null;

  return (
    <div className="update-prompt" role="status" aria-live="polite">
      <span className="update-prompt-text">A new version of RSS Reader is available.</span>
      <button className="btn btn-primary" onClick={reload}>
        Reload
      </button>
      <button className="btn btn-secondary" onClick={dismiss}>
        Later
      </button>
    </div>
  );
}
