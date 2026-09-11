import { useEffect } from 'react';
import { useStore } from '../store/store';
import { visibleEntries } from '../store/selectors';

// Global keyboard shortcuts. Letter shortcuts are inert while a text field is
// focused; Escape always closes an open dialog or inline edit.
export function useKeyboard(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
      const s = useStore.getState();

      if (typing) {
        if (e.key === 'Escape') {
          (t as HTMLElement).blur();
          s.closeAddFeed();
          s.cancelRename();
        }
        return;
      }

      const list = visibleEntries(s.nodes, s.entries, s.sel, s.query, s.activeTags);
      const idx = list.findIndex((x) => x.id === s.selEntry);
      const open = (i: number) => {
        const it = list[i];
        if (it) s.openEntry(it.id);
      };

      switch (e.key) {
        case 'j':
          e.preventDefault();
          open(Math.min(list.length - 1, idx + 1));
          break;
        case 'k':
          e.preventDefault();
          open(Math.max(0, idx - 1));
          break;
        case 'b':
          if (s.selEntry) s.toggleMark(s.selEntry);
          break;
        case 'u':
          if (s.selEntry) s.toggleRead(s.selEntry);
          break;
        case 'n':
          e.preventDefault();
          s.openAddFeed();
          break;
        case '/':
          e.preventDefault();
          s.selectBookmarks();
          setTimeout(() => {
            const input = document.querySelector<HTMLInputElement>('[data-search]');
            input?.focus();
          }, 0);
          break;
        case 'Escape':
          s.closeAddFeed();
          s.cancelRename();
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
