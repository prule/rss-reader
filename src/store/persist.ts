// Wires the store to durable storage: hydrate on start, persist on every
// change to the library. Kept out of the store so the store stays storage-free
// and unit-testable.
import { load, save } from '../lib/storage';
import { useStore } from './store';

let started = false;
let warned = false;

/** Hydrate from storage and begin persisting library changes. Idempotent. */
export function initPersistence(): void {
  if (started) return;
  started = true;

  const data = load();
  if (data) useStore.getState().hydrate(data);

  let prevNodes = useStore.getState().nodes;
  let prevEntries = useStore.getState().entries;

  useStore.subscribe((state) => {
    if (state.nodes === prevNodes && state.entries === prevEntries) return;
    prevNodes = state.nodes;
    prevEntries = state.entries;
    const res = save({ nodes: state.nodes, entries: state.entries });
    if (!res.ok && !warned) {
      warned = true;
      useStore.getState().say('Storage unavailable — export a backup to be safe');
    }
  });
}
