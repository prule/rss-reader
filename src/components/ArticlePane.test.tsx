import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ArticlePane } from './ArticlePane';
import { useStore } from '../store/store';
import { entry, sampleTree } from '../test/fixtures';

beforeEach(() => {
  useStore.setState({
    nodes: sampleTree(),
    entries: [
      entry('e2', 's_pl', {
        title: 'Anycast',
        body: '<p>Safe body</p><script>alert(1)</script>',
        read: false,
        marked: false,
      }),
    ],
    sel: { kind: 'all' },
    selEntry: null,
  });
});

describe('ArticlePane', () => {
  it('shows the empty state when nothing is selected', () => {
    render(<ArticlePane />);
    expect(screen.getByText('Select an entry')).toBeInTheDocument();
  });

  it('renders the selected entry with hierarchy tags', () => {
    useStore.setState({ selEntry: 'e2' });
    render(<ArticlePane />);
    expect(screen.getByRole('heading', { name: 'Anycast' })).toBeInTheDocument();
    // Full hierarchy path appears as outline tags.
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    // Feed name shows as both the kicker and a tag.
    expect(screen.getAllByText('Packet Loss Weekly').length).toBeGreaterThanOrEqual(2);
  });

  it('neutralizes untrusted markup in the body', () => {
    useStore.setState({ selEntry: 'e2' });
    const { container } = render(<ArticlePane />);
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('Safe body')).toBeInTheDocument();
  });

  it('toggles read and bookmark from the pane', () => {
    useStore.setState({ selEntry: 'e2' });
    render(<ArticlePane />);
    fireEvent.click(screen.getByText('Bookmark'));
    expect(useStore.getState().entries[0].marked).toBe(true);
    fireEvent.click(screen.getByText('Mark read'));
    expect(useStore.getState().entries[0].read).toBe(true);
  });
});
