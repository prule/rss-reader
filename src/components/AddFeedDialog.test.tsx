import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the smart-add helpers; keep hostFrom/subscribeFeed real for display/fallback.
vi.mock('../lib/feeds', async () => {
  const actual = await vi.importActual<typeof import('../lib/feeds')>('../lib/feeds');
  return { ...actual, addFromInput: vi.fn(), addSelectedFeeds: vi.fn() };
});

import { AddFeedDialog } from './AddFeedDialog';
import { addFromInput, addSelectedFeeds } from '../lib/feeds';
import { useStore } from '../store/store';

const mockAdd = vi.mocked(addFromInput);
const mockAddSelected = vi.mocked(addSelectedFeeds);

beforeEach(() => {
  mockAdd.mockReset();
  mockAddSelected.mockReset();
  useStore.setState({ nodes: [], entries: [], toast: '' });
  useStore.getState().openAddFeed();
});

describe('AddFeedDialog — smart discovery', () => {
  it('moves to the selection step and adds the checked feeds', async () => {
    mockAdd.mockResolvedValueOnce({
      kind: 'discovered',
      candidates: [
        { url: 'https://tc/feed', type: 'rss', title: 'Main' },
        { url: 'https://tc/ai/feed', type: 'rss', title: 'AI' },
      ],
    });
    render(<AddFeedDialog />);
    fireEvent.change(screen.getByLabelText('Feed or site URL'), {
      target: { value: 'https://techcrunch.com' },
    });

    fireEvent.click(screen.getByText('Subscribe'));
    await waitFor(() => expect(screen.getByText('Feeds found')).toBeInTheDocument());

    // Both discovered, both selected by default; uncheck one.
    expect(screen.getByLabelText('Main')).toBeChecked();
    fireEvent.click(screen.getByLabelText('AI'));

    fireEvent.click(screen.getByText(/Add selected/));
    expect(mockAddSelected).toHaveBeenCalledWith(
      [{ url: 'https://tc/feed', type: 'rss', title: 'Main' }],
      null,
    );
    expect(useStore.getState().showAddFeed).toBe(false);
  });

  it('surfaces a toast and adds nothing when discovery fails', async () => {
    mockAdd.mockResolvedValueOnce({ kind: 'error' });
    render(<AddFeedDialog />);
    fireEvent.change(screen.getByLabelText('Feed or site URL'), {
      target: { value: 'https://down.example' },
    });

    fireEvent.click(screen.getByText('Subscribe'));
    await waitFor(() => expect(useStore.getState().toast).toMatch(/couldn't reach/i));
    // Dialog stays open on the input step; nothing was created.
    expect(useStore.getState().showAddFeed).toBe(true);
    expect(useStore.getState().addPhase).toBe('input');
    expect(useStore.getState().nodes).toHaveLength(0);
  });

  it('offers add-as-is when no feeds are found', async () => {
    mockAdd.mockResolvedValueOnce({ kind: 'none-found' });
    render(<AddFeedDialog />);
    fireEvent.change(screen.getByLabelText('Feed or site URL'), {
      target: { value: 'https://empty.example' },
    });

    fireEvent.click(screen.getByText('Subscribe'));
    await waitFor(() => expect(screen.getByText('No feeds found')).toBeInTheDocument());
    expect(screen.getByText('Add URL anyway')).toBeInTheDocument();
  });
});
