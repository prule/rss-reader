import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArticlePane } from './ArticlePane';
import { useStore } from '../store/store';
import { entry, sampleTree } from '../test/fixtures';
import { eventually, resetLibrary, seedLibrary, settle, storedEntry } from '../test/db';

beforeEach(async () => {
  await resetLibrary();
  await seedLibrary({
    nodes: sampleTree(),
    entries: [
      entry('e2', 's_pl', {
        title: 'Anycast',
        body: '<p>Safe body</p><script>alert(1)</script>',
        read: false,
        marked: false,
      }),
    ],
  });
});

afterEach(resetLibrary);

describe('ArticlePane', () => {
  it('shows the empty state when nothing is selected', async () => {
    render(<ArticlePane />);
    await settle();
    expect(screen.getByText('Select an entry')).toBeInTheDocument();
  });

  it('renders the selected entry with hierarchy tags', async () => {
    useStore.getState().setSelEntry('e2');
    render(<ArticlePane />);
    await settle();
    expect(screen.getByRole('heading', { name: 'Anycast' })).toBeInTheDocument();
    // Full hierarchy path appears as outline tags.
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    // Feed name shows as both the kicker and a tag.
    expect(screen.getAllByText('Packet Loss Weekly').length).toBeGreaterThanOrEqual(2);
  });

  it('neutralizes untrusted markup in the body', async () => {
    useStore.getState().setSelEntry('e2');
    const { container } = render(<ArticlePane />);
    await settle();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('Safe body')).toBeInTheDocument();
  });

  it('toggles read and bookmark from the pane', async () => {
    useStore.getState().setSelEntry('e2');
    render(<ArticlePane />);
    await settle();

    fireEvent.click(screen.getByText('Bookmark'));
    await settle();
    await eventually(async () => expect((await storedEntry('e2'))!.marked).toBe(true));

    fireEvent.click(screen.getByText('Mark read'));
    await settle();
    await eventually(async () => expect((await storedEntry('e2'))!.read).toBe(true));
  });
});
