import { describe, expect, it } from 'vitest';
import { filterGames } from './catalog';
import { getGameAvailability } from './inventory';
import type { Game } from './types';

const game = (overrides: Partial<Game> & Pick<Game, 'id' | 'title' | 'offerType' | 'genre'>): Game => ({
  imageFilename: `${overrides.id}.jpg`,
  platformQuantities: {},
  primaryKeys: 0,
  otherRegionKeys: 0,
  availability: 'Out of Stock',
  dateAdded: '2026-08-09',
  active: true,
  ...overrides,
});

const games: Game[] = [
  game({
    id: '001',
    title: 'Halo: Campaign Evolved',
    offerType: 'Full Game',
    genre: 'Shooter',
    platformQuantities: { Steam: 1 },
    primaryKeys: 1,
    availability: 'Available',
  }),
  game({
    id: '002',
    title: 'Forza Motorsport: Racing Heroes Car Pack',
    offerType: 'Game Add-on',
    genre: 'Racing & Flying',
    platformQuantities: { Xbox: 2 },
    primaryKeys: 2,
    availability: 'Available',
  }),
  game({
    id: '003',
    title: 'Killer Instinct',
    offerType: 'Full Game',
    genre: 'Fighting',
    primaryKeys: 0,
    availability: 'Available',
  }),
  game({
    id: '004',
    title: 'World of Warcraft Classic: Mists of Pandaria',
    offerType: 'Subscription',
    genre: 'Roleplaying',
    platformQuantities: { Battlenet: 2 },
    primaryKeys: 2,
    otherRegionKeys: 1,
    otherRegionInventory: [
      { platform: 'Battlenet', region: 'Europe', quantity: 1 },
      { platform: 'Battlenet', region: 'China', quantity: 0 },
    ],
    availability: 'Available',
  }),
  game({
    id: '005',
    title: 'Hearthstone: Regional Bundle',
    offerType: 'Game Add-on',
    genre: 'Strategy',
    otherRegionKeys: 2,
    otherRegionInventory: [
      { platform: 'Battlenet', region: 'China', quantity: 2 },
      { platform: 'Battlenet', region: 'Europe', quantity: 0 },
    ],
    availability: 'Other Regions Only',
  }),
  game({
    id: '006',
    title: 'Inactive Available Game',
    offerType: 'Full Game',
    genre: 'Shooter',
    platformQuantities: { Xbox: 1 },
    primaryKeys: 1,
    availability: 'Available',
    active: false,
  }),
];

const base = { query: '', availability: 'Available' as const, platforms: [], genres: [], offers: [] };
const ids = (result: Game[]) => result.map(game => game.id);

describe('catalog filtering', () => {
  it('defaults to normal requestable inventory', () => {
    expect(ids(filterGames(games, base))).toEqual(['001', '002', '004']);
  });

  it('searches partial titles', () => {
    expect(ids(filterGames(games, { ...base, query: 'campaign' }))).toEqual(['001']);
  });

  it('uses OR logic for multiple platforms', () => {
    expect(ids(filterGames(games, { ...base, platforms: ['Steam', 'Xbox'] }))).toEqual(['001', '002']);
  });

  it('uses OR logic for multiple genres', () => {
    expect(ids(filterGames(games, { ...base, genres: ['Shooter', 'Roleplaying'] }))).toEqual(['001', '004']);
  });

  it('uses OR logic for multiple offer types', () => {
    expect(ids(filterGames(games, { ...base, offers: ['Full Game', 'Subscription'] }))).toEqual(['001', '004']);
  });

  it('uses AND logic across categories', () => {
    expect(ids(filterGames(games, { ...base, platforms: ['Steam', 'Battlenet'], genres: ['Shooter'], offers: ['Full Game'] }))).toEqual(['001']);
  });

  it('combines search and advanced filters', () => {
    expect(ids(filterGames(games, { ...base, query: 'warcraft', platforms: ['Battlenet'] }))).toEqual(['004']);
  });

  it('combines availability and advanced filters', () => {
    expect(ids(filterGames(games, { ...base, availability: 'All', genres: ['Fighting', 'Racing & Flying'] }))).toEqual(['002', '003']);
  });

  it('shows regional-only inventory separately', () => {
    expect(ids(filterGames(games, { ...base, availability: 'Other Regions Only' }))).toEqual(['005']);
  });

  it('shows out-of-stock separately', () => {
    expect(ids(filterGames(games, { ...base, availability: 'Out of Stock' }))).toEqual(['003']);
  });

  it('derives availability from quantities instead of trusting a stale label', () => {
    const depleted = games.find(game => game.id === '003')!;
    expect(depleted.availability).toBe('Available');
    expect(getGameAvailability(depleted)).toBe('Out of Stock');
  });

  it('keeps a game available when one option is depleted but another still has inventory', () => {
    expect(ids(filterGames(games, { ...base, platforms: ['Battlenet'] }))).toEqual(['004']);
    expect(filterGames(games, { ...base, platforms: ['Xbox'] }).some(game => game.id === '004')).toBe(false);
  });
});
