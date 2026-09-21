import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useKeyboard } from './useKeyboard';
import { useStore } from '../store/store';
import { entry, sampleTree } from '../test/fixtures';
import {
  eventually,
  resetLibrary,
  seedLibrary,
  settle,
  settleUntil,
  storedEntry,
} from '../test/db';
import { PAGE_SIZE } from '../lib/db/repository';

function Harness({ nodes = sampleTree() }: { nodes?: ReturnType<typeof sampleTree> }) {
  useKeyboard(nodes);
  return <input aria-label="typing" />;
}

beforeEach(async () => {
  await resetLibrary();
  await seedLibrary({
    nodes: sampleTree(),
    entries: [
      entry('e1', 's_ars', { read: false, publishedAt: 300 }),
      entry('e2', 's_pl', { read: false, publishedAt: 200 }),
    ],
  });
});

afterEach(resetLibrary);

describe('useKeyboard', () => {
  it('j and k move through the list and open (mark read)', async () => {
    render(<Harness />);

    fireEvent.keyDown(window, { key: 'j' });
    await settle();
    expect(useStore.getState().selEntry).toBe('e1');
    await eventually(async () => expect((await storedEntry('e1'))!.read).toBe(true));

    fireEvent.keyDown(window, { key: 'j' });
    await settle();
    expect(useStore.getState().selEntry).toBe('e2');

    fireEvent.keyDown(window, { key: 'k' });
    await settle();
    expect(useStore.getState().selEntry).toBe('e1');
  });

  it('b bookmarks and u toggles unread on the current entry', async () => {
    useStore.getState().setSelEntry('e1');
    render(<Harness />);

    fireEvent.keyDown(window, { key: 'b' });
    await settle();
    await eventually(async () => expect((await storedEntry('e1'))!.marked).toBe(true));

    fireEvent.keyDown(window, { key: 'u' });
    await settle();
    await eventually(async () => expect((await storedEntry('e1'))!.read).toBe(true));
  });

  it('n opens add feed and / switches to bookmarks', () => {
    render(<Harness />);
    fireEvent.keyDown(window, { key: 'n' });
    expect(useStore.getState().showAddFeed).toBe(true);
    fireEvent.keyDown(window, { key: '/' });
    expect(useStore.getState().sel.kind).toBe('bookmarks');
  });

  it('letter shortcuts are inert while typing in a field', async () => {
    const { getByLabelText } = render(<Harness />);
    const input = getByLabelText('typing');
    input.focus();
    fireEvent.keyDown(input, { key: 'j' });
    await settle();
    expect(useStore.getState().selEntry).toBeNull();
  });

  it('j past the last loaded entry continues into the next one', async () => {
    // One more entry than a page holds. J walks the stored order, so it must
    // reach entry 51 even though a list would only have paged in 50.
    const total = PAGE_SIZE + 1;
    await seedLibrary({
      nodes: sampleTree(),
      entries: Array.from({ length: total }, (_, i) =>
        entry(`m${String(i).padStart(3, '0')}`, 's_ars', { publishedAt: 100_000 - i }),
      ),
    });

    // Sit on the last entry of the first page.
    useStore.getState().setSelEntry(`m${String(PAGE_SIZE - 1).padStart(3, '0')}`);
    render(<Harness />);

    const expected = `m${String(PAGE_SIZE).padStart(3, '0')}`;
    fireEvent.keyDown(window, { key: 'j' });
    // The walk crosses a page boundary, so how long it takes depends on the data.
    await settleUntil(() => useStore.getState().selEntry === expected);

    // The next one is on the second page — it opened rather than stopping.
    expect(useStore.getState().selEntry).toBe(expected);
    await eventually(async () =>
      expect((await storedEntry(`m${String(PAGE_SIZE).padStart(3, '0')}`))!.read).toBe(true),
    );
  });

  it('j on the very last entry stays put', async () => {
    useStore.getState().setSelEntry('e2'); // oldest of the two
    render(<Harness />);
    fireEvent.keyDown(window, { key: 'j' });
    await settle();
    expect(useStore.getState().selEntry).toBe('e2');
  });
});
