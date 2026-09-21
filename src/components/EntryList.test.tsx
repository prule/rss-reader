import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EntryList } from './EntryList';
import { useStore } from '../store/store';
import { entry, sampleTree } from '../test/fixtures';
import { eventually, resetLibrary, seedLibrary, settle, storedEntry } from '../test/db';

beforeEach(async () => {
  await resetLibrary();
  await seedLibrary({
    nodes: sampleTree(),
    entries: [
      entry('e1', 's_ars', { title: 'Alpha', read: false, publishedAt: 200 }),
      entry('e2', 's_pl', { title: 'Beta', read: false, publishedAt: 100 }),
    ],
  });
});

afterEach(resetLibrary);

describe('EntryList', () => {
  it('lists entries with a count subtitle', async () => {
    render(<EntryList />);
    await settle();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('2 entries')).toBeInTheDocument();
  });

  it('marks an entry read when opened', async () => {
    render(<EntryList />);
    await settle();
    fireEvent.click(screen.getByTestId('entry-e1'));
    await settle();
    await eventually(async () => expect((await storedEntry('e1'))!.read).toBe(true));
    expect(useStore.getState().selEntry).toBe('e1');
  });

  it('mark all read marks the visible list', async () => {
    render(<EntryList />);
    await settle();
    fireEvent.click(screen.getByText('Mark all read'));
    await settle();
    await eventually(async () => expect((await storedEntry('e1'))!.read).toBe(true));
    await eventually(async () => expect((await storedEntry('e2'))!.read).toBe(true));
  });

  it('bookmark toggle from the list works without opening the entry', async () => {
    render(<EntryList />);
    await settle();
    const row = screen.getByTestId('entry-e2');
    fireEvent.click(within(row).getByRole('button', { name: /Bookmark Beta/ }));
    await settle();
    await eventually(async () => expect((await storedEntry('e2'))!.marked).toBe(true));
    expect(useStore.getState().selEntry).toBeNull(); // did not open
  });

  it('shows folder subtitle with feed count', async () => {
    useStore.getState().selectNode('f_tech');
    render(<EntryList />);
    await settle();
    expect(screen.getByText('2 feeds · 2 entries')).toBeInTheDocument();
  });

  it('orders entries newest first', async () => {
    render(<EntryList />);
    await settle();
    const titles = screen.getAllByTestId(/^entry-/).map((el) => el.textContent);
    expect(titles[0]).toContain('Alpha'); // publishedAt 200
    expect(titles[1]).toContain('Beta'); // publishedAt 100
  });
});

describe('incremental loading', () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      entry(`m${String(i).padStart(3, '0')}`, 's_ars', {
        title: `Item ${i}`,
        publishedAt: 100_000 - i,
      }),
    );

  /** Drive the scroll container to its bottom, as a user scrolling would. */
  const scrollToBottom = (el: HTMLElement) => {
    Object.defineProperty(el, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(el, 'scrollTop', { value: 1500, configurable: true });
    fireEvent.scroll(el);
  };

  it('renders the first page and appends a second on scroll', async () => {
    await seedLibrary({ nodes: sampleTree(), entries: many(120) });

    const { container } = render(<EntryList />);
    await settle();

    // PAGE_SIZE is 50, so the first page shows 50 of the 120.
    expect(screen.getAllByTestId(/^entry-/)).toHaveLength(50);

    const scroller = container.querySelector('.list-scroll') as HTMLElement;
    scrollToBottom(scroller);
    await settle();

    expect(screen.getAllByTestId(/^entry-/)).toHaveLength(100);
  });

  it('shows the full match count, not the number rendered', async () => {
    await seedLibrary({ nodes: sampleTree(), entries: many(120) });
    render(<EntryList />);
    await settle();

    expect(screen.getAllByTestId(/^entry-/)).toHaveLength(50);
    expect(screen.getByText('120 entries')).toBeInTheDocument();
  });

  it('reports the end of the list rather than looking like it is still loading', async () => {
    await seedLibrary({ nodes: sampleTree(), entries: many(20) });
    render(<EntryList />);
    await settle();

    expect(screen.getByTestId('list-end')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-more')).not.toBeInTheDocument();
  });

  it('does not claim the end while more pages remain', async () => {
    await seedLibrary({ nodes: sampleTree(), entries: many(120) });
    render(<EntryList />);
    await settle();
    expect(screen.queryByTestId('list-end')).not.toBeInTheDocument();
  });

  it('mark all read clears the count for a selection larger than one page', async () => {
    await seedLibrary({ nodes: sampleTree(), entries: many(120) });
    useStore.getState().selectUnread();
    render(<EntryList />);
    await settle();

    expect(screen.getByText('120 entries')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Mark all read'));

    // Every entry is read now, so the unread view matches nothing — including the
    // 70 that were never paged in.
    //
    // The count and the list are separate live queries that settle independently,
    // so both are waited for rather than sampled at whichever instant the first
    // one lands.
    expect(await screen.findByText('0 entries')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryAllByTestId(/^entry-/)).toHaveLength(0));
  });
});
