import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ConversationContextLink from './ConversationContextLink';

describe('ConversationContextLink', () => {
  it('renders listing context link', () => {
    render(
      <ConversationContextLink
        listing={{
          id: 'listing_1',
          title: 'Sunny room in Prenzlauer Berg',
          href: '/listings/sunny-room--abc12345',
          photoUrl: null,
        }}
      />,
    );

    const link = screen.getByRole('link', { name: /listing sunny room in prenzlauer berg/i });
    expect(link).toHaveAttribute('href', '/listings/sunny-room--abc12345');
  });

  it('renders seeker profile context link', () => {
    render(
      <ConversationContextLink
        seekerProfile={{
          id: 'req_1',
          title: 'Couple looking for 2-room flat',
          href: '/u/berlin_couple',
        }}
      />,
    );

    const link = screen.getByRole('link', { name: /seeker profile couple looking for 2-room flat/i });
    expect(link).toHaveAttribute('href', '/u/berlin_couple');
  });

  it('renders nothing when no context is provided', () => {
    const { container } = render(<ConversationContextLink />);
    expect(container).toBeEmptyDOMElement();
  });
});
