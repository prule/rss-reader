import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EntryList } from './EntryList';
import { useStore } from '../store/store';
import { entry, sampleTree } from '../test/fixtures';
import { resetLibrary, seedLibrary, settle } from '../test/db';
import * as actions from '../store/actions';

beforeEach(async () => {
  await resetLibrary();
  await seedLibrary({
    nodes: sampleTree(),
    entries: [
      entry('e1', 's_ars', { title: 'Kernel scheduler', marked: false }),
      entry('e2', 's_pl', { title: 'Anycast routing', marked: true }),
      entry('e3', 's_lr', { title: 'The mapmakers', marked: true }),
    ],
  });
  useStore.getState().selectBookmarks();
});

afterEach(resetLibrary);

describe('Bookmarks view', () => {
  it('shows only bookmarked entries and a search box', async () => {
    render(<EntryList />);
    await settle();
    expect(screen.getByLabelText('Search bookmarks')).toBeInTheDocument();
    expect(screen.getByText('Anycast routing')).toBeInTheDocument();
    expect(screen.getByText('The mapmakers')).toBeInTheDocument();
    expect(screen.queryByText('Kernel scheduler')).not.toBeInTheDocument();
  });

  it('offers only tags present on current bookmarks', async () => {
    render(<EntryList />);
    await settle();
    // e2 (s_pl) contributes Technology/Infrastructure/Packet Loss Weekly; e3 (s_lr) Longreads.
    expect(screen.getByRole('button', { name: 'Technology' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Longreads' })).toBeInTheDocument();
    // Design is not a tag of any bookmark yet.
    expect(screen.queryByRole('button', { name: 'Design' })).not.toBeInTheDocument();
  });

  it('filters by keyword', async () => {
    render(<EntryList />);
    await settle();
    fireEvent.change(screen.getByLabelText('Search bookmarks'), {
      target: { value: 'mapmakers' },
    });
    expect(screen.getByText('The mapmakers')).toBeInTheDocument();
    expect(screen.queryByText('Anycast routing')).not.toBeInTheDocument();
  });

  it('filters by tag chip (AND with keyword)', async () => {
    render(<EntryList />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Technology' }));
    expect(screen.getByText('Anycast routing')).toBeInTheDocument();
    expect(screen.queryByText('The mapmakers')).not.toBeInTheDocument();
  });

  it('shows the no-match empty state', async () => {
    render(<EntryList />);
    await settle();
    fireEvent.change(screen.getByLabelText('Search bookmarks'), {
      target: { value: 'zzznothing' },
    });
    expect(screen.getByText('No bookmarks match these tags and keywords.')).toBeInTheDocument();
  });

  it('re-derives hierarchy tags when the feed moves', async () => {
    render(<EntryList />);
    await settle();
    // Before: no "Design" chip. Move Longreads (s_lr) into the Design folder.
    await actions.moveNode(sampleTree(), 's_lr', 'f_design');
    await settle();
    // e3's bookmark now carries the Design tag — derived from the tree, never stored.
    expect(screen.getByRole('button', { name: 'Design' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Design' }));
    expect(screen.getByText('The mapmakers')).toBeInTheDocument();
    expect(screen.queryByText('Anycast routing')).not.toBeInTheDocument();
  });
});
