import { useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EntryList } from './components/EntryList';
import { ArticlePane } from './components/ArticlePane';
import { StatusBar } from './components/StatusBar';
import { AddFeedDialog } from './components/AddFeedDialog';
import { UpdatePrompt } from './components/UpdatePrompt';
import { useStore } from './store/store';
import { useNodes } from './hooks/useLibrary';
import { openLibrary } from './lib/db/open';
import { readLegacyPayload } from './lib/rescue';
import { RescuePrompt } from './components/RescuePrompt';
import { useKeyboard } from './hooks/useKeyboard';
import { useRefresh } from './hooks/useRefresh';

export function App() {
  const dbStatus = useStore((s) => s.dbStatus);
  const storageNotice = useStore((s) => s.storageNotice);
  const setDbStatus = useStore((s) => s.setDbStatus);
  const noteStorage = useStore((s) => s.noteStorage);
  const offerLegacyPayload = useStore((s) => s.offerLegacyPayload);
  const nodes = useNodes();

  useEffect(() => {
    void (async () => {
      const outcome = await openLibrary();
      if (outcome.status === 'ready') {
        setDbStatus('ready');
        // A library left by the pre-database build is offered as a download and
        // then dropped; it is never loaded. See lib/rescue.ts.
        const legacy = readLegacyPayload();
        if (legacy) offerLegacyPayload(legacy);
      } else {
        noteStorage(outcome.message);
        setDbStatus('unavailable');
      }
    })();
  }, [setDbStatus, noteStorage, offerLegacyPayload]);

  useKeyboard(nodes ?? []);
  useRefresh();

  // The library is "read" once the database is open and the first nodes query has
  // resolved. Until then the panes show a loading state rather than the empty
  // states of a library nobody has looked at yet.
  const ready = dbStatus === 'ready' && nodes !== undefined;

  if (dbStatus === 'unavailable') {
    return (
      <div className="app">
        <div className="app-col">
          <Header />
          <div className="panes">
            <div className="db-state" role="alert">
              <p className="db-state-title">Storage unavailable</p>
              <p className="db-state-detail">{storageNotice}</p>
            </div>
          </div>
          <StatusBar />
        </div>
        <UpdatePrompt />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-col">
        <Header />
        <div className="panes">
          {ready ? (
            <>
              <Sidebar />
              <EntryList />
              <ArticlePane />
            </>
          ) : (
            <div className="db-state" data-testid="library-loading" role="status">
              <p className="db-state-detail">Loading your library…</p>
            </div>
          )}
        </div>
        <StatusBar />
      </div>
      <AddFeedDialog />
      <RescuePrompt />
      <UpdatePrompt />
    </div>
  );
}
