import {describe,expect,it} from 'vitest';
import gamesRaw from './data/games.json';
import {filterGames} from './catalog';
import type {Game} from './types';

const games=gamesRaw as Game[];
const base={query:'',availability:'Available' as const,platforms:[],genres:[],offers:[]};

describe('catalog filtering',()=>{
  it('defaults to normal requestable inventory',()=>expect(filterGames(games,base).every(game=>game.primaryKeys>0)).toBe(true));
  it('searches partial titles',()=>expect(filterGames(games,{...base,query:'lord of'}).map(game=>game.id)).toEqual(['009']));
  it('uses OR logic for multiple platforms',()=>expect(filterGames(games,{...base,platforms:['Steam','Xbox']}).map(game=>game.id)).toEqual(['003','009','010','011','014','015','016','018','023','026','030','035','039','041','042','052','053','057','058','059','062','063','064','065','066','067','068','069','075','078','079','080','083','084','085','086','087','088','093','094','096','097','110','111','112','113','114','115','116','117','119']));
  it('uses OR logic for multiple genres',()=>expect(filterGames(games,{...base,genres:['Shooter','Roleplaying']}).map(game=>game.id)).toEqual(['001','002','003','005','006','009','010','012','013','017','020','022','023','031','034','035','038','040','047','051','054','057','059','062','063','064','065','070','075','087','090','092','100','101','102','103','104','105','106','107','112','119']));
  it('uses OR logic for multiple offer types',()=>expect(filterGames(games,{...base,offers:['Full Game','Subscription']}).map(game=>game.id)).toEqual(['003','004','005','014','016','022','034','035','038','039','040','041','042','047','050','051','054','059','062','063','064','065','066','067','068','069','073','075','079','080','081','082','084','085','089','090','091','092','094','095','097','098','099','100','101','102','103','104','105','106','107','108','112','113','114','115','116','117']));
  it('uses AND logic across categories',()=>expect(filterGames(games,{...base,platforms:['Steam','Xbox'],genres:['Shooter','Roleplaying'],offers:['Full Game']}).map(game=>game.id)).toEqual(['003','035','059','062','063','064','065','075','112']));
  it('combines search and advanced filters',()=>expect(filterGames(games,{...base,query:'diablo',platforms:['Steam']}).map(game=>game.id)).toEqual(['009']));
  it('combines availability and advanced filters',()=>expect(filterGames(games,{...base,availability:'All',genres:['Racing & Flying']}).map(game=>game.id)).toEqual(['008','053','068','089','109']));
  it('shows regional-only inventory separately',()=>expect(filterGames(games,{...base,availability:'Other Regions Only'}).map(game=>game.id)).toEqual(['007','019','021','025','032','033','036','045','046','071']));
  it('shows out-of-stock separately',()=>expect(filterGames(games,{...base,availability:'Out of Stock'}).map(game=>game.id)).toEqual(['008','024','027','028','029','043','048','049','055','056','060','072','076','077','109','118']));
});
