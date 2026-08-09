import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock3, Search, SlidersHorizontal, X } from 'lucide-react';
import rawGames from './data/games.json';
import type { Availability, Game } from './types';
import { filterGames } from './catalog';
import { FilterPanel } from './components/FilterPanel';
import { GameCard } from './components/GameCard';
import { GameDialog } from './components/GameDialog';
import { captureAnalyticsEvent, discoveryMethod, filterStateKey, gameAnalyticsProperties, type FilterState, type UiState } from './analytics';

type Sort='az'|'recent'|'keys';
type FilterKind='platforms'|'genres'|'offers';

const updatedLabel=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Los_Angeles'}).format(new Date(__LAST_UPDATED__));
const seattleTimeFormatter=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Los_Angeles'});

function SeattleClock(){
  const [time,setTime]=useState(()=>seattleTimeFormatter.format(new Date()));
  useEffect(()=>{
    let interval:number|undefined;
    const now=new Date();
    const timeout=window.setTimeout(()=>{
      setTime(seattleTimeFormatter.format(new Date()));
      interval=window.setInterval(()=>setTime(seattleTimeFormatter.format(new Date())),60_000);
    },(60-now.getSeconds())*1000-now.getMilliseconds());
    return ()=>{window.clearTimeout(timeout);if(interval)window.clearInterval(interval)};
  },[]);
  return <span className="seattle-clock"><Clock3 aria-hidden/><span>Seattle</span><span aria-hidden="true">·</span><time>{time}</time></span>;
}

function BakeryButton({className='',celebrate=false,onBreadClick}:{className?:string;celebrate?:boolean;onBreadClick?:()=>void}){
  const [burst,setBurst]=useState(0);
  const [celebrating,setCelebrating]=useState(false);
  const [sparkleOrigin,setSparkleOrigin]=useState<{x:number;y:number}|null>(null);
  const cleanupRef=useRef<number|undefined>(undefined);
  const buttonRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>()=>window.clearTimeout(cleanupRef.current),[]);
  const backToTop=()=>{
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bounds=buttonRef.current?.getBoundingClientRect();
    onBreadClick?.();
    if(!onBreadClick)captureAnalyticsEvent('bread_clicked',celebrate?{header_state:'expanded',action:'sparkle'}:{header_state:'sticky',action:'scroll_to_top'});
    window.scrollTo({top:0,behavior:reduced?'auto':'smooth'});
    setBurst(value=>value+1);
    setCelebrating(true);
    setSparkleOrigin(celebrate&&!reduced&&bounds?{x:bounds.left+bounds.width/2,y:bounds.top+bounds.height/2}:null);
    window.clearTimeout(cleanupRef.current);
    cleanupRef.current=window.setTimeout(()=>{setCelebrating(false);setSparkleOrigin(null)},700);
  };
  return <>
    <button ref={buttonRef} className={`bakery-button ${className}${celebrating?' is-celebrating':''}`.trim()} onClick={backToTop} aria-label="Back to top">
      <img key={`bread-${burst}`} src="./brand/white-bread.png" alt="" aria-hidden="true" />
    </button>
    {celebrating&&sparkleOrigin&&createPortal(<span key={`sparkles-${burst}`} className="bread-sparkles" style={{left:sparkleOrigin.x,top:sparkleOrigin.y}} aria-hidden="true">{Array.from({length:9},(_,index)=><i key={index}/>)}</span>,document.body)}
  </>;
}

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
  const [isSticky,setIsSticky]=useState(false);
  const filterButtonRef=useRef<HTMLButtonElement>(null);
  const mastheadRef=useRef<HTMLElement>(null);

  useEffect(()=>{
    const updateSticky=()=>setIsSticky((mastheadRef.current?.getBoundingClientRect().bottom??1)<=0);
    updateSticky();
    window.addEventListener('scroll',updateSticky,{passive:true});
    window.addEventListener('resize',updateSticky);
    return ()=>{window.removeEventListener('scroll',updateSticky);window.removeEventListener('resize',updateSticky)};
  },[]);

  const genreOptions=[...new Set(games.map(g=>g.genre))].sort();
  const offerOptions=[...new Set(games.map(g=>g.offerType))].sort();
  const platformOptions=[...new Set(games.flatMap(g=>Object.keys(g.platformQuantities).filter(p=>g.platformQuantities[p as keyof typeof g.platformQuantities]!>0)))].sort();
  const advancedCount=platforms.length+genres.length+offers.length;
  const filtered=useMemo(()=>filterGames(games,{query,availability,platforms,genres,offers}).sort((a,b)=>sort==='keys'?b.primaryKeys-a.primaryKeys:sort==='recent'?b.dateAdded.localeCompare(a.dateAdded)||a.title.localeCompare(b.title):a.title.localeCompare(b.title)),[games,query,availability,platforms,genres,offers,sort]);
  const filterState:FilterState=useMemo(()=>({availability,platforms,genres,offers}),[availability,platforms,genres,offers]);
  const uiState:UiState=isSticky?'sticky':'normal';
  const resultCountFor=(next:FilterState=filterState,nextQuery=query)=>filterGames(games,{query:nextQuery,availability:next.availability as Availability|'All',platforms:next.platforms,genres:next.genres,offers:next.offers}).length;
  const searchAnalyticsRef=useRef('');
  const availabilityAnalyticsRef=useRef(availability);
  const sortAnalyticsRef=useRef(sort);

  useEffect(()=>{
    const settledQuery=query.trim();
    if(!settledQuery){
      searchAnalyticsRef.current='';
      return;
    }
    const filtersKey=filterStateKey(filterState);
    const eventKey=`${settledQuery}|${filtered.length}|${uiState}|${filtersKey}`;
    const timeout=window.setTimeout(()=>{
      if(searchAnalyticsRef.current===eventKey)return;
      searchAnalyticsRef.current=eventKey;
      const properties={query_length:settledQuery.length,results_count:filtered.length,ui_state:uiState};
      captureAnalyticsEvent('search_used',properties);
      if(filtered.length===0)captureAnalyticsEvent('search_no_results',{...properties,active_filter_state:filterState});
    },600);
    return()=>window.clearTimeout(timeout);
  },[query,filtered.length,uiState,filterState]);

  useEffect(()=>{
    if(availabilityAnalyticsRef.current===availability)return;
    availabilityAnalyticsRef.current=availability;
    captureAnalyticsEvent('filter_changed',{filter_type:'availability',filter_value:availability,results_count:filtered.length,ui_state:uiState});
  },[availability,filtered.length,uiState]);

  useEffect(()=>{
    if(sortAnalyticsRef.current===sort)return;
    sortAnalyticsRef.current=sort;
    captureAnalyticsEvent('sort_changed',{sort_value:sort,ui_state:uiState});
  },[sort,uiState]);

  const setters={platforms:setPlatforms,genres:setGenres,offers:setOffers};
  const trackFilterChange=(filter_type:string,filter_value:string|string[],next:FilterState)=>captureAnalyticsEvent('filter_changed',{filter_type,filter_value:Array.isArray(filter_value)?filter_value.join(','):filter_value,results_count:resultCountFor(next),ui_state:uiState});
  const toggle=(kind:FilterKind,value:string)=>setters[kind](current=>{
    const nextValues=current.includes(value)?current.filter(item=>item!==value):[...current,value];
    trackFilterChange(kind,nextValues,{...filterState,[kind]:nextValues});
    return nextValues;
  });
  const remove=(kind:FilterKind,value:string)=>setters[kind](current=>{
    const nextValues=current.filter(item=>item!==value);
    trackFilterChange(kind,nextValues,{...filterState,[kind]:nextValues});
    return nextValues;
  });
  const clearAdvanced=()=>{
    const previous={availability,platforms,genres,offers};
    setPlatforms([]);setGenres([]);setOffers([]);
    if(previous.platforms.length||previous.genres.length||previous.offers.length)captureAnalyticsEvent('filters_cleared',{previous_filter_state:previous,ui_state:uiState,results_count:resultCountFor({...filterState,platforms:[],genres:[],offers:[]})});
  };
  const closeFilters=useCallback(()=>{setFiltersOpen(false);filterButtonRef.current?.focus()},[]);
  const open=(game:Game)=>{captureAnalyticsEvent('game_opened',{...gameAnalyticsProperties(game),discovery_method:discoveryMethod(query,filterState),ui_state:uiState});setSelected(game)};
  const chips=[...platforms.map(value=>({kind:'platforms' as const,value})),...genres.map(value=>({kind:'genres' as const,value})),...offers.map(value=>({kind:'offers' as const,value}))];

  return <>
    <header className="masthead" ref={mastheadRef}>
      <img className="masthead-art" src="./brand/bear-bakery-banner.webp" alt="" aria-hidden="true" />
      <div className="brand"><BakeryButton className="mark" celebrate/><div><h1>Sola’s Game Key Bakery</h1><p>Fresh game keys looking for a good home ♡</p><div className="bakery-meta"><span>Last updated · <time dateTime={__LAST_UPDATED__}>{updatedLabel}</time></span><SeattleClock/></div></div></div>
      <p className="intro">I get extra game keys from time to time and share them with friends. Find one you’d enjoy and copy a request!</p>
    </header>
    <main>
      <section className={`catalog-head${isSticky?' is-sticky':''}`} aria-label="Catalog controls">
        <div className="catalog-primary"><div className="sticky-brand"><BakeryButton className="sticky-bakery-button"/></div><div className="search"><Search aria-hidden/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search games..." aria-label="Search games"/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear search"><X/></button>}</div></div>
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
