import { describe, expect, it } from 'vitest';
import gamesRaw from './data/games.json';
import { getGameAvailability, getOtherRegionKeyCount, getPrimaryKeyCount } from './inventory';
import type { Game } from './types';

const games = gamesRaw as Game[];

describe('production inventory data', () => {
  it('stores availability derived from claimable quantities', () => {
    for (const game of games) {
      expect(game.availability, `${game.id} ${game.title}`).toBe(getGameAvailability(game));
    }
  });

  it('keeps primary totals aligned with per-platform quantities', () => {
    for (const game of games) {
      expect(game.primaryKeys, `${game.id} ${game.title}`).toBe(getPrimaryKeyCount(game));
    }
  });

  it('keeps other-region totals aligned with detailed regional quantities when details exist', () => {
    for (const game of games.filter(game => game.otherRegionInventory?.length)) {
      expect(game.otherRegionKeys, `${game.id} ${game.title}`).toBe(getOtherRegionKeyCount(game));
    }
  });
});
