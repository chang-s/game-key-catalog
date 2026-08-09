import {describe,expect,it} from 'vitest';
import gamesRaw from './data/games.json';
import {filterGames} from './catalog';
import type {Game} from './types';

const games=gamesRaw as Game[];
const base={query:'',availability:'Available' as const,platforms:[],genres:[],offers:[]};

describe('catalog filtering',()=>{
  it('defaults to normal requestable inventory',()=>expect(filterGames(games,base).every(game=>game.primaryKeys>0)).toBe(true));
  it('searches partial titles',()=>expect(filterGames(games,{...base,query:'lord of'}).map(game=>game.id)).toEqual(['009']));
  it('uses OR logic for multiple platforms',()=>expect(filterGames(games,{...base,platforms:['Steam','Xbox']}).map(game=>game.id)).toEqual(['003','009','010','011']));
  it('uses OR logic for multiple genres',()=>expect(filterGames(games,{...base,genres:['Shooter','Roleplaying']}).map(game=>game.id)).toEqual(['001','002','003','005','006','009','010','012']));
  it('uses OR logic for multiple offer types',()=>expect(filterGames(games,{...base,offers:['Full Game','Subscription']}).map(game=>game.id)).toEqual(['003','004','005']));
  it('uses AND logic across categories',()=>expect(filterGames(games,{...base,platforms:['Steam','Xbox'],genres:['Shooter','Roleplaying'],offers:['Full Game']}).map(game=>game.id)).toEqual(['003']));
  it('combines search and advanced filters',()=>expect(filterGames(games,{...base,query:'diablo',platforms:['Steam']}).map(game=>game.id)).toEqual(['009']));
  it('combines availability and advanced filters',()=>expect(filterGames(games,{...base,availability:'All',genres:['Racing & Flying']}).map(game=>game.id)).toEqual(['008']));
  it('shows regional-only inventory separately',()=>expect(filterGames(games,{...base,availability:'Other Regions Only'}).map(game=>game.id)).toEqual(['007']));
  it('shows out-of-stock separately',()=>expect(filterGames(games,{...base,availability:'Out of Stock'}).map(game=>game.id)).toEqual(['008']));
});
