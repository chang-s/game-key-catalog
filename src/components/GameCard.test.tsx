import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameCard } from './GameCard';
import type { Game } from '../types';

const game: Game = {
  id: '003', title: 'Halo: Campaign Evolved', offerType: 'Full Game', genre: 'Shooter',
  imageFilename: '003-halo-ce-premium.png', platformQuantities: { Steam: 1 },
  primaryKeys: 1, otherRegionKeys: 0, availability: 'Available', dateAdded: '2026-08-08', active: true,
};

afterEach(cleanup);

describe('GameCard', () => {
  it('uses one full-card interactive target without a repeated CTA', () => {
    render(<GameCard game={game} onOpen={() => undefined} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByText(/request key/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view details for halo/i })).toBeInTheDocument();
  });

  it('opens from the keyboard', async () => {
    const onOpen = vi.fn();
    render(<GameCard game={game} onOpen={onOpen} />);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledWith(game);
  });

  it('keeps mixed-region inventory secondary to primary availability', () => {
    render(<GameCard game={{...game, primaryKeys: 4, otherRegionKeys: 5, platformQuantities: { Steam: 1, Battlenet: 1 }}} onOpen={() => undefined} />);
    expect(screen.getByText('4 keys available')).toBeInTheDocument();
    expect(screen.getByLabelText('5 additional other-region keys')).toBeInTheDocument();
    expect(screen.queryByText('5 other-region keys')).not.toBeInTheDocument();
  });

  it('renders distinct regional-only and out-of-stock primary states', () => {
    const { rerender } = render(<GameCard game={{...game, primaryKeys: 0, otherRegionKeys: 1, platformQuantities: {}, availability: 'Other Regions Only'}} onOpen={() => undefined} />);
    expect(screen.getByText('Other regions only')).toBeInTheDocument();
    rerender(<GameCard game={{...game, primaryKeys: 0, otherRegionKeys: 0, platformQuantities: {}, availability: 'Out of Stock'}} onOpen={() => undefined} />);
    expect(screen.getByText('Out of Stock')).toHaveClass('out');
  });

  it('removes failed cover images before showing the fallback state', () => {
    const { container } = render(<GameCard game={game} onOpen={() => undefined} />);
    const image = screen.getByAltText('Halo: Campaign Evolved cover');
    fireEvent.error(image);
    expect(container.querySelector('.cover-wrap')).toHaveClass('missing');
    expect(screen.queryByAltText('Halo: Campaign Evolved cover')).not.toBeInTheDocument();
  });
});
