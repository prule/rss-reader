import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { entry, sampleTree } from './test/fixtures';
import { resetLibrary, seedLibrary, settle } from './test/db';
import { LEGACY_KEY } from './lib/rescue';
import * as open from './lib/db/open';

beforeEach(async () => {
  await resetLibrary();
  window.localStorage.clear();
});

afterEach(async () => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  await resetLibrary();
});

describe('App shell', () => {
  it('renders the brand and the three panes once the library is read', async () => {
    await seedLibrary({ nodes: sampleTree(), entries: [entry('e1', 's_ars')] });

    render(<App />);
    await settle();

    expect(screen.getByText('RSS Reader')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Library' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Entries' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Article' })).toBeInTheDocument();
  });
});

describe('asynchronous startup', () => {
  it('shows a loading state instead of an empty library before the first read', async () => {
    // Hold the open pending so the shell is caught mid-startup.
    let release: () => void = () => {};
    vi.spyOn(open, 'openLibrary').mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ status: 'ready' });
      }),
    );

    render(<App />);

    expect(screen.getByTestId('library-loading')).toBeInTheDocument();
    // No empty state is claimed for a library that has not been read.
    expect(screen.queryByText('Nothing here yet.')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Library' })).not.toBeInTheDocument();

    release();
    await settle();
  });

  it('reports an unopenable database and suggests a backup', async () => {
    vi.spyOn(open, 'openLibrary').mockResolvedValue({
      status: 'unavailable',
      reason: 'blocked',
      message: 'Local storage is unavailable — import a backup to restore your library',
    });

    render(<App />);
    await settle();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Storage unavailable')).toBeInTheDocument();
    expect(screen.getByText(/import a backup/i)).toBeInTheDocument();
    // Still responsive: it is not stuck on the loading state.
    expect(screen.queryByTestId('library-loading')).not.toBeInTheDocument();
  });

  it('reports a database written by a newer version without destroying it', async () => {
    vi.spyOn(open, 'openLibrary').mockResolvedValue({
      status: 'unavailable',
      reason: 'newer-version',
      message: 'This library was saved by a newer version of RSS Reader — update to open it',
    });

    render(<App />);
    await settle();

    expect(screen.getByText(/newer version/i)).toBeInTheDocument();
  });
});

describe('legacy rescue offer', () => {
  const LEGACY = JSON.stringify({
    version: 1,
    nodes: [{ id: 's1', type: 'feed', name: 'Old', parentId: null, collapsed: false, url: 'u' }],
    entries: [{ id: 'e1', feedId: 's1', title: 'Old entry', marked: true }],
  });

  it('offers the download and does not load the payload into the library', async () => {
    window.localStorage.setItem(LEGACY_KEY, LEGACY);
    await seedLibrary({ nodes: [], entries: [] });

    render(<App />);
    await settle();

    expect(screen.getByRole('dialog', { name: 'Old library found' })).toBeInTheDocument();
    // The library itself stays empty — this is a rescue, not a migration.
    expect(screen.queryByText('Old entry')).not.toBeInTheDocument();
  });

  it('does not offer anything when there is no legacy payload', async () => {
    await seedLibrary({ nodes: [], entries: [] });
    render(<App />);
    await settle();
    expect(screen.queryByRole('dialog', { name: 'Old library found' })).not.toBeInTheDocument();
  });
});
