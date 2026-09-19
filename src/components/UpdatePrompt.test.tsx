import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdatePrompt } from './UpdatePrompt';
import { useAppUpdate } from '../hooks/useAppUpdate';

vi.mock('../hooks/useAppUpdate', () => ({ useAppUpdate: vi.fn() }));

const mockUpdate = vi.mocked(useAppUpdate);

describe('UpdatePrompt', () => {
  const reload = vi.fn();
  const dismiss = vi.fn();

  beforeEach(() => {
    reload.mockClear();
    dismiss.mockClear();
  });

  it('stays out of the way when no update is waiting', () => {
    mockUpdate.mockReturnValue({ updateReady: false, reload, dismiss });
    render(<UpdatePrompt />);
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
  });

  it('prompts to reload once a new version is waiting', async () => {
    mockUpdate.mockReturnValue({ updateReady: true, reload, dismiss });
    render(<UpdatePrompt />);
    expect(screen.getByText(/new version/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('can be dismissed without reloading', async () => {
    mockUpdate.mockReturnValue({ updateReady: true, reload, dismiss });
    render(<UpdatePrompt />);

    await userEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });
});
