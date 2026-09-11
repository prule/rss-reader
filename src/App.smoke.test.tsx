import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App shell', () => {
  it('renders the brand and the three panes', () => {
    render(<App />);
    expect(screen.getByText('Ferrite')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Library' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Entries' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Article' })).toBeInTheDocument();
  });
});
