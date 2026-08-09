import { Globe2 } from 'lucide-react';
import type { Game } from '../types';

export function GameCard({game,onOpen}:{game:Game;onOpen:(g:Game)=>void}) {
  const entries=Object.entries(game.platformQuantities).filter(([,q])=>q>0);
  const stateClass=game.availability==='Available'?'is-available':game.availability==='Other Regions Only'?'is-regional':'is-out';
  return <article className={`card ${stateClass}`}>
    <button className="card-main" onClick={()=>onOpen(game)} aria-label={`View details for ${game.title}`}>
      <div className="cover-wrap"><img src={`./covers/${game.imageFilename}`} alt={`${game.title} cover`} loading="lazy" onError={e=>{e.currentTarget.hidden=true;e.currentTarget.parentElement?.classList.add('missing')}} /></div>
      <div className="card-body">
        <p className="eyebrow">{game.offerType}</p><h2>{game.title}</h2>
        <div className="platform-list">
          {entries.map(([p,q])=><span key={p}>{p} <strong>×{q}</strong></span>)}
          {game.primaryKeys>0&&game.otherRegionKeys>0&&<span className="region-count" title={`${game.otherRegionKeys} other-region ${game.otherRegionKeys===1?'key':'keys'}`} aria-label={`${game.otherRegionKeys} additional other-region ${game.otherRegionKeys===1?'key':'keys'}`}><Globe2 size={15} aria-hidden="true"/><strong>{game.otherRegionKeys}</strong></span>}
        </div>
        <div className="stock-row">
          {game.availability==='Available'&&<strong className="status available">{game.primaryKeys} {game.primaryKeys===1?'key':'keys'} available</strong>}
          {game.availability==='Other Regions Only'&&<strong className="status regional"><Globe2 size={16} aria-hidden="true"/>Other regions only</strong>}
          {game.availability==='Out of Stock'&&<strong className="status out">Out of Stock</strong>}
        </div>
      </div>
    </button>
  </article>
}
