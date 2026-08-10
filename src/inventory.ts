import type { Availability, Game } from './types';

const positiveQuantity = (quantity: unknown) => typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0;

export function getPrimaryKeyCount(game: Pick<Game, 'platformQuantities'>) {
  return Object.values(game.platformQuantities).reduce((total, quantity) => total + (positiveQuantity(quantity) ? quantity : 0), 0);
}

export function getOtherRegionKeyCount(game: Pick<Game, 'otherRegionInventory' | 'otherRegionKeys'>) {
  const detailedCount = (game.otherRegionInventory ?? []).reduce(
    (total, item) => total + (positiveQuantity(item.quantity) ? item.quantity : 0),
    0,
  );
  return detailedCount || (positiveQuantity(game.otherRegionKeys) ? game.otherRegionKeys : 0);
}

export function getGameAvailability(game: Pick<Game, 'platformQuantities' | 'otherRegionInventory' | 'otherRegionKeys'>): Availability {
  if (getPrimaryKeyCount(game) > 0) return 'Available';
  if (getOtherRegionKeyCount(game) > 0) return 'Other Regions Only';
  return 'Out of Stock';
}
