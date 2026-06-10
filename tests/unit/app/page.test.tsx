import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Navigation (rendered by this page) reads auth state from the Supabase
// browser client — stub it so it doesn't create a real client.
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  }),
}));

import HomePage from '../../../app/page';

describe('HomePage', () => {
  it('renders the PaleoDesk hero', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /paleontology/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/curated corpus of recent fossil discoveries/i)
    ).toBeInTheDocument();
  });

  it('points the primary call-to-action at /chat', () => {
    render(<HomePage />);
    const cta = screen.getByRole('link', { name: /start a conversation/i });
    expect(cta).toHaveAttribute('href', '/chat');
  });
});
