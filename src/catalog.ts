import type { Availability, Game } from './types';

export type Filters={query:string;availability:Availability|'All';platforms:string[];genres:string[];offers:string[]};

export function filterGames(games:Game[],filters:Filters){
  const query=filters.query.trim().toLowerCase();
  return games.filter(game=>{
    const searchable=[game.title,game.edition,game.offerType,game.genre].join(' ').toLowerCase();
    const platformMatch=filters.platforms.length===0||filters.platforms.some(platform=>(game.platformQuantities[platform as keyof typeof game.platformQuantities]||0)>0);
    const genreMatch=filters.genres.length===0||filters.genres.includes(game.genre);
    const offerMatch=filters.offers.length===0||filters.offers.includes(game.offerType);
    return game.active&&searchable.includes(query)&&(filters.availability==='All'||game.availability===filters.availability)&&platformMatch&&genreMatch&&offerMatch;
  });
}
