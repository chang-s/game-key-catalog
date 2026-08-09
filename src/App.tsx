import { useCallback, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import rawGames from './data/games.json';
import type { Availability, Game } from './types';
import { filterGames } from './catalog';
import { FilterPanel } from './components/FilterPanel';
import { GameCard } from './components/GameCard';
import { GameDialog } from './components/GameDialog';

type Sort='az'|'recent'|'keys';
type FilterKind='platforms'|'genres'|'offers';

export default function App(){
  const games=rawGames as Game[];
  const [query,setQuery]=useState('');
  const [availability,setAvailability]=useState<Availability|'All'>('Available');
  const [platforms,setPlatforms]=useState<string[]>([]);
  const [genres,setGenres]=useState<string[]>([]);
  const [offers,setOffers]=useState<string[]>([]);
  const [sort,setSort]=useState<Sort>('az');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [selected,setSelected]=useState<Game|null>(null);
  const filterButtonRef=useRef<HTMLButtonElement>(null);

  const genreOptions=[...new Set(games.map(g=>g.genre))].sort();
  const offerOptions=[...new Set(games.map(g=>g.offerType))].sort();
  const platformOptions=[...new Set(games.flatMap(g=>Object.keys(g.platformQuantities).filter(p=>g.platformQuantities[p as keyof typeof g.platformQuantities]!>0)))].sort();
  const advancedCount=platforms.length+genres.length+offers.length;
  const filtered=useMemo(()=>filterGames(games,{query,availability,platforms,genres,offers}).sort((a,b)=>sort==='keys'?b.primaryKeys-a.primaryKeys:sort==='recent'?b.dateAdded.localeCompare(a.dateAdded)||a.title.localeCompare(b.title):a.title.localeCompare(b.title)),[games,query,availability,platforms,genres,offers,sort]);

  const setters={platforms:setPlatforms,genres:setGenres,offers:setOffers};
  const toggle=(kind:FilterKind,value:string)=>setters[kind](current=>current.includes(value)?current.filter(item=>item!==value):[...current,value]);
  const remove=(kind:FilterKind,value:string)=>setters[kind](current=>current.filter(item=>item!==value));
  const clearAdvanced=()=>{setPlatforms([]);setGenres([]);setOffers([])};
  const closeFilters=useCallback(()=>{setFiltersOpen(false);filterButtonRef.current?.focus()},[]);
  const open=(game:Game)=>setSelected(game);
  const chips=[...platforms.map(value=>({kind:'platforms' as const,value})),...genres.map(value=>({kind:'genres' as const,value})),...offers.map(value=>({kind:'offers' as const,value}))];

  return <>
    <header className="masthead">
      <img className="masthead-art" src="./brand/bear-bakery-banner.png" alt="" aria-hidden="true" />
      <div className="brand"><span className="mark" aria-hidden="true"><img src="./brand/white-bread.png" alt="" /></span><div><h1>Sola’s Game Key Bakery</h1><p>Fresh game keys looking for a good home ♡</p></div></div>
      <p className="intro">I get extra game keys from time to time and share them with friends. Find one you’d enjoy and copy a request!</p>
    </header>
    <main>
      <section className="catalog-head" aria-label="Catalog controls">
        <div className="search"><Search aria-hidden/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search games..." aria-label="Search games"/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear search"><X/></button>}</div>
        <div className="quick-controls">
          <button ref={filterButtonRef} className="filter-toggle" onClick={()=>setFiltersOpen(open=>!open)} aria-expanded={filtersOpen} aria-controls="advanced-filters"><SlidersHorizontal/> Filters{advancedCount>0&&<b aria-label={`${advancedCount} active filters`}>{advancedCount}</b>}</button>
          <label><span>Availability</span><select value={availability} onChange={event=>setAvailability(event.target.value as Availability|'All')}><option>Available</option><option>Other Regions Only</option><option>Out of Stock</option><option>All</option></select></label>
          <label><span>Sort</span><select value={sort} onChange={event=>setSort(event.target.value as Sort)}><option value="az">A–Z</option><option value="recent">Recently added</option><option value="keys">Most keys available</option></select></label>
        </div>
        {filtersOpen&&<FilterPanel id="advanced-filters" platformOptions={platformOptions} genreOptions={genreOptions} offerOptions={offerOptions} platforms={platforms} genres={genres} offers={offers} onToggle={toggle} onClear={clearAdvanced} onClose={closeFilters}/>} 
      </section>
      {advancedCount>0&&<div className="filter-chips" aria-label="Active filters">{chips.map(chip=><button key={`${chip.kind}-${chip.value}`} onClick={()=>remove(chip.kind,chip.value)} aria-label={`Remove ${chip.value} filter`}>{chip.value}<X aria-hidden/></button>)}<button className="clear-advanced" onClick={clearAdvanced}>Clear filters</button></div>}
      <div className="results-line"><p aria-live="polite"><strong>{filtered.length}</strong> {filtered.length===1?'item':'items'}</p></div>
      {filtered.length?<section className="grid" aria-label="Game catalog">{filtered.map(game=><GameCard key={game.id} game={game} onOpen={item=>open(item)}/>)}</section>:<section className="empty"><span aria-hidden>🥐</span><h2>{query?'Nothing fresh out of the oven for that search':'No keys match those filters.'}</h2><p>Try a different search or adjust your filters.</p>{advancedCount>0&&<button className="primary" onClick={clearAdvanced}>Clear filters</button>}{query&&advancedCount===0&&<button className="primary" onClick={()=>setQuery('')}>Clear search</button>}</section>}
    </main>
    <footer><p>made for friends to enjoy! 💖</p></footer>
    <GameDialog game={selected} onClose={()=>setSelected(null)}/>
  </>;
}
