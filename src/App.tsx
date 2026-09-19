import { useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EntryList } from './components/EntryList';
import { ArticlePane } from './components/ArticlePane';
import { StatusBar } from './components/StatusBar';
import { AddFeedDialog } from './components/AddFeedDialog';
import { UpdatePrompt } from './components/UpdatePrompt';
import { initPersistence } from './store/persist';
import { useKeyboard } from './hooks/useKeyboard';
import { useRefresh } from './hooks/useRefresh';

export function App() {
  useEffect(() => {
    initPersistence();
  }, []);
  useKeyboard();
  useRefresh();

  return (
    <div className="app">
      <div className="app-col">
        <Header />
        <div className="panes">
          <Sidebar />
          <EntryList />
          <ArticlePane />
        </div>
        <StatusBar />
      </div>
      <AddFeedDialog />
      <UpdatePrompt />
    </div>
  );
}
