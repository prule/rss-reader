import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Sidebar } from './Sidebar';
import { node } from '../store/selectors';
import { entry, sampleTree } from '../test/fixtures';
import { eventually, resetLibrary, seedLibrary, settle, storedNodes } from '../test/db';

function makeDataTransfer(id: string) {
  const store: Record<string, string> = { 'text/plain': id };
  return {
    effectAllowed: 'move',
    setData: (k: string, v: string) => {
      store[k] = v;
    },
    getData: (k: string) => store[k] ?? '',
  };
}

beforeEach(async () => {
  await resetLibrary();
  await seedLibrary({
    nodes: sampleTree(),
    entries: [entry('e1', 's_ars', { read: false })],
  });
});

afterEach(resetLibrary);

describe('Sidebar', () => {
  it('renders library shortcuts and tree nodes', async () => {
    render(<Sidebar />);
    await settle();
    expect(screen.getByText('All Entries')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Packet Loss Weekly')).toBeInTheDocument();
  });

  it('shows an unread badge on the ancestor folder', async () => {
    render(<Sidebar />);
    await settle();
    const row = screen.getByTestId('node-f_tech');
    expect(within(row).getByText('1')).toBeInTheDocument();
  });

  it('reparents a feed when dropped onto a folder (drag and drop)', async () => {
    render(<Sidebar />);
    await settle();
    const dt = makeDataTransfer('s_lr');
    const source = screen.getByTestId('node-s_lr');
    const target = screen.getByTestId('node-f_design');

    fireEvent.dragStart(source, { dataTransfer: dt });
    fireEvent.dragOver(target, { dataTransfer: dt });
    fireEvent.drop(target, { dataTransfer: dt });
    await settle();

    await eventually(async () =>
      expect(node(await storedNodes(), 's_lr')!.parentId).toBe('f_design'),
    );
  });

  it('collapsing a folder hides its descendants', async () => {
    render(<Sidebar />);
    await settle();
    expect(screen.getByTestId('node-s_pl')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('chev-f_infra'));
    // The collapse is a database write; wait on its visible outcome.
    await eventually(() => expect(screen.queryByTestId('node-s_pl')).not.toBeInTheDocument());
  });
});
