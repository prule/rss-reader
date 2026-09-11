import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useKeyboard } from './useKeyboard';
import { useStore } from '../store/store';
import { entry, sampleTree } from '../test/fixtures';

function Harness() {
  useKeyboard();
  return <input aria-label="typing" />;
}

beforeEach(() => {
  useStore.setState({
    nodes: sampleTree(),
    entries: [
      entry('e1', 's_ars', { read: false }),
      entry('e2', 's_pl', { read: false }),
    ],
    sel: { kind: 'all' },
    selEntry: null,
    query: '',
    activeTags: [],
    showAddFeed: false,
  });
});

describe('useKeyboard', () => {
  it('j and k move through the list and open (mark read)', () => {
    render(<Harness />);
    fireEvent.keyDown(window, { key: 'j' });
    expect(useStore.getState().selEntry).toBe('e1');
    expect(useStore.getState().entries.find((e) => e.id === 'e1')!.read).toBe(true);
    fireEvent.keyDown(window, { key: 'j' });
    expect(useStore.getState().selEntry).toBe('e2');
    fireEvent.keyDown(window, { key: 'k' });
    expect(useStore.getState().selEntry).toBe('e1');
  });

  it('b bookmarks and u toggles unread on the current entry', () => {
    useStore.setState({ selEntry: 'e1' });
    render(<Harness />);
    fireEvent.keyDown(window, { key: 'b' });
    expect(useStore.getState().entries.find((e) => e.id === 'e1')!.marked).toBe(true);
    fireEvent.keyDown(window, { key: 'u' });
    expect(useStore.getState().entries.find((e) => e.id === 'e1')!.read).toBe(true);
  });

  it('n opens add feed and / switches to bookmarks', () => {
    render(<Harness />);
    fireEvent.keyDown(window, { key: 'n' });
    expect(useStore.getState().showAddFeed).toBe(true);
    fireEvent.keyDown(window, { key: '/' });
    expect(useStore.getState().sel.kind).toBe('bookmarks');
  });

  it('letter shortcuts are inert while typing in a field', () => {
    const { getByLabelText } = render(<Harness />);
    const input = getByLabelText('typing');
    input.focus();
    fireEvent.keyDown(input, { key: 'j' });
    expect(useStore.getState().selEntry).toBeNull();
  });
});
