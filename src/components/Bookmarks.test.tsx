import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EntryList } from './EntryList';
import { useStore } from '../store/store';
import { entry, sampleTree } from '../test/fixtures';

beforeEach(() => {
  useStore.setState({
    nodes: sampleTree(),
    entries: [
      entry('e1', 's_ars', { title: 'Kernel scheduler', marked: false }),
      entry('e2', 's_pl', { title: 'Anycast routing', marked: true }),
      entry('e3', 's_lr', { title: 'The mapmakers', marked: true }),
    ],
    sel: { kind: 'bookmarks' },
    selEntry: null,
    query: '',
    activeTags: [],
  });
});

describe('Bookmarks view', () => {
  it('shows only bookmarked entries and a search box', () => {
    render(<EntryList />);
    expect(screen.getByLabelText('Search bookmarks')).toBeInTheDocument();
    expect(screen.getByText('Anycast routing')).toBeInTheDocument();
    expect(screen.getByText('The mapmakers')).toBeInTheDocument();
    expect(screen.queryByText('Kernel scheduler')).not.toBeInTheDocument();
  });

  it('offers only tags present on current bookmarks', () => {
    render(<EntryList />);
    // e2 (s_pl) contributes Technology/Infrastructure/Packet Loss Weekly; e3 (s_lr) Longreads.
    expect(screen.getByRole('button', { name: 'Technology' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Longreads' })).toBeInTheDocument();
    // Design is not a tag of any bookmark yet.
    expect(screen.queryByRole('button', { name: 'Design' })).not.toBeInTheDocument();
  });

  it('filters by keyword', () => {
    render(<EntryList />);
    fireEvent.change(screen.getByLabelText('Search bookmarks'), {
      target: { value: 'mapmakers' },
    });
    expect(screen.getByText('The mapmakers')).toBeInTheDocument();
    expect(screen.queryByText('Anycast routing')).not.toBeInTheDocument();
  });

  it('filters by tag chip (AND with keyword)', () => {
    render(<EntryList />);
    fireEvent.click(screen.getByRole('button', { name: 'Technology' }));
    expect(screen.getByText('Anycast routing')).toBeInTheDocument();
    expect(screen.queryByText('The mapmakers')).not.toBeInTheDocument();
  });

  it('shows the no-match empty state', () => {
    render(<EntryList />);
    fireEvent.change(screen.getByLabelText('Search bookmarks'), {
      target: { value: 'zzznothing' },
    });
    expect(screen.getByText('No bookmarks match these tags and keywords.')).toBeInTheDocument();
  });

  it('re-derives hierarchy tags when the feed moves', () => {
    render(<EntryList />);
    // Before: no "Design" chip. Move Longreads (s_lr) into the Design folder.
    act(() => useStore.getState().moveNode('s_lr', 'f_design'));
    // e3's bookmark now carries the Design tag.
    expect(screen.getByRole('button', { name: 'Design' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Design' }));
    expect(screen.getByText('The mapmakers')).toBeInTheDocument();
    expect(screen.queryByText('Anycast routing')).not.toBeInTheDocument();
  });
});
