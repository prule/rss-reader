import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EntryList } from './EntryList';
import { useStore } from '../store/store';
import { entry, sampleTree } from '../test/fixtures';

beforeEach(() => {
  useStore.setState({
    nodes: sampleTree(),
    entries: [
      entry('e1', 's_ars', { title: 'Alpha', read: false }),
      entry('e2', 's_pl', { title: 'Beta', read: false }),
    ],
    sel: { kind: 'all' },
    selEntry: null,
    query: '',
    activeTags: [],
  });
});

describe('EntryList', () => {
  it('lists entries with a count subtitle', () => {
    render(<EntryList />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('2 entries')).toBeInTheDocument();
  });

  it('marks an entry read when opened', () => {
    render(<EntryList />);
    fireEvent.click(screen.getByTestId('entry-e1'));
    expect(useStore.getState().entries.find((e) => e.id === 'e1')!.read).toBe(true);
    expect(useStore.getState().selEntry).toBe('e1');
  });

  it('mark all read marks the visible list', () => {
    render(<EntryList />);
    fireEvent.click(screen.getByText('Mark all read'));
    expect(useStore.getState().entries.every((e) => e.read)).toBe(true);
  });

  it('bookmark toggle from the list works without opening the entry', () => {
    render(<EntryList />);
    const row = screen.getByTestId('entry-e2');
    fireEvent.click(within(row).getByRole('button', { name: /Bookmark Beta/ }));
    expect(useStore.getState().entries.find((e) => e.id === 'e2')!.marked).toBe(true);
    expect(useStore.getState().selEntry).toBeNull(); // did not open
  });

  it('shows folder subtitle with feed count', () => {
    useStore.setState({ sel: { kind: 'node', id: 'f_tech' } });
    render(<EntryList />);
    expect(screen.getByText('2 feeds · 2 entries')).toBeInTheDocument();
  });
});
