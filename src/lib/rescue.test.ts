import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LEGACY_KEY,
  discardLegacyPayload,
  downloadLegacyPayload,
  readLegacyPayload,
} from './rescue';
import { buildJSON } from './exporters';
import { fromJSON } from './importers';
import { entry, sampleTree } from '../test/fixtures';
import * as repo from './db/repository';
import { resetLibrary, seedLibrary } from '../test/db';

const LIBRARY = {
  nodes: sampleTree(),
  entries: [
    entry('e1', 's_ars', { title: 'Kept', read: true, marked: true }),
    entry('e2', 's_pl', { title: 'Also kept', read: false, marked: false }),
  ],
};

const legacyPayload = () => JSON.stringify({ version: 1, ...LIBRARY });

/** Capture what `download` would have handed the user. */
function captureDownload() {
  const files: { name: string; text: string }[] = [];
  const created: string[] = [];
  // jsdom implements neither, so they are installed rather than spied on.
  URL.createObjectURL = () => 'blob:stub';
  URL.revokeObjectURL = () => {};
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    created.push(this.download);
  });
  // Read the text back out of the Blob the download built.
  const realBlob = globalThis.Blob;
  vi.stubGlobal(
    'Blob',
    class extends realBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options);
        files.push({ name: '', text: String(parts[0]) });
      }
    },
  );
  return { files, created };
}

beforeEach(async () => {
  window.localStorage.clear();
  await resetLibrary();
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
  window.localStorage.clear();
  await resetLibrary();
});

describe('reading the legacy payload', () => {
  it('finds a library saved by the pre-database build', () => {
    window.localStorage.setItem(LEGACY_KEY, legacyPayload());
    expect(readLegacyPayload()).toBe(legacyPayload());
  });

  it('reports nothing when the key is absent', () => {
    expect(readLegacyPayload()).toBeNull();
  });

  it('ignores a corrupt payload — a broken string is not a backup', () => {
    window.localStorage.setItem(LEGACY_KEY, '{not json');
    expect(readLegacyPayload()).toBeNull();
  });

  it('ignores a payload that is not a library', () => {
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify({ hello: 'world' }));
    expect(readLegacyPayload()).toBeNull();
  });
});

describe('answering the offer', () => {
  it('removes the key after the download is taken', () => {
    window.localStorage.setItem(LEGACY_KEY, legacyPayload());
    captureDownload();

    downloadLegacyPayload(legacyPayload());

    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(readLegacyPayload()).toBeNull(); // not offered a second time
  });

  it('removes the key after the offer is declined', () => {
    window.localStorage.setItem(LEGACY_KEY, legacyPayload());
    discardLegacyPayload();
    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(readLegacyPayload()).toBeNull();
  });

  it('names the file so it is recognisably a rescued backup', () => {
    const { created } = captureDownload();
    downloadLegacyPayload(legacyPayload(), new Date('2026-09-20T10:00:00Z'));
    expect(created[0]).toBe('rss-reader-rescued-2026-09-20.json');
  });
});

describe('the rescued file is an ordinary export', () => {
  it('round-trips through the normal JSON import with state intact', () => {
    const { files } = captureDownload();
    downloadLegacyPayload(legacyPayload());

    const restored = fromJSON(files[0].text);

    expect(restored.nodes).toEqual(LIBRARY.nodes);
    expect(restored.entries).toEqual(LIBRARY.entries);
    // Read and bookmark state survives the rescue.
    expect(restored.entries.find((e) => e.id === 'e1')!.read).toBe(true);
    expect(restored.entries.find((e) => e.id === 'e1')!.marked).toBe(true);
  });

  it('is indistinguishable from a file buildJSON produced', () => {
    const { files } = captureDownload();
    const now = new Date('2026-09-20T10:00:00Z');
    downloadLegacyPayload(legacyPayload(), now);

    expect(files[0].text).toBe(buildJSON(LIBRARY, now));
  });
});

describe('the payload is never loaded into the library', () => {
  it('leaves the library empty even with a legacy payload present', async () => {
    window.localStorage.setItem(LEGACY_KEY, legacyPayload());
    await seedLibrary({ nodes: [], entries: [] });

    // Startup reads the key to offer it, and nothing else.
    expect(readLegacyPayload()).not.toBeNull();

    const library = await repo.readLibrary();
    expect(library.nodes).toEqual([]);
    expect(library.entries).toEqual([]);
    expect(await repo.countAll()).toBe(0);
  });
});
