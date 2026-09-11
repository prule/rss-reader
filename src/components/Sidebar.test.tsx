import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Sidebar } from './Sidebar';
import { useStore } from '../store/store';
import { node } from '../store/selectors';
import { entry, sampleTree } from '../test/fixtures';

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

beforeEach(() => {
  useStore.setState({
    nodes: sampleTree(),
    entries: [entry('e1', 's_ars', { read: false })],
    sel: { kind: 'all' },
    selEntry: null,
    hoverId: null,
    renamingId: null,
    dragId: null,
    dropId: null,
    dropRoot: false,
  });
});

describe('Sidebar', () => {
  it('renders library shortcuts and tree nodes', () => {
    render(<Sidebar />);
    expect(screen.getByText('All Entries')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Packet Loss Weekly')).toBeInTheDocument();
  });

  it('shows an unread badge on the ancestor folder', () => {
    render(<Sidebar />);
    const row = screen.getByTestId('node-f_tech');
    expect(within(row).getByText('1')).toBeInTheDocument();
  });

  it('reparents a feed when dropped onto a folder (drag and drop)', () => {
    render(<Sidebar />);
    const dt = makeDataTransfer('s_lr');
    const source = screen.getByTestId('node-s_lr');
    const target = screen.getByTestId('node-f_design');

    fireEvent.dragStart(source, { dataTransfer: dt });
    fireEvent.dragOver(target, { dataTransfer: dt });
    fireEvent.drop(target, { dataTransfer: dt });

    expect(node(useStore.getState().nodes, 's_lr')!.parentId).toBe('f_design');
  });

  it('collapsing a folder hides its descendants', () => {
    render(<Sidebar />);
    expect(screen.getByTestId('node-s_pl')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('chev-f_infra'));
    expect(screen.queryByTestId('node-s_pl')).not.toBeInTheDocument();
  });
});
