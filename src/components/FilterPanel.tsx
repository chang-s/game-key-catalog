import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type Kind='platforms'|'genres'|'offers';
type Props={id:string;platformOptions:string[];genreOptions:string[];offerOptions:string[];platforms:string[];genres:string[];offers:string[];onToggle:(kind:Kind,value:string)=>void;onClear:()=>void;onClose:()=>void};

const focusableSelector = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function FilterPanel({id,platformOptions,genreOptions,offerOptions,platforms,genres,offers,onToggle,onClear,onClose}:Props){
  const panelRef=useRef<HTMLDivElement>(null);
  const active=platforms.length+genres.length+offers.length;
  useEffect(()=>{
    const panel=panelRef.current;
    panel?.querySelector<HTMLInputElement>('input')?.focus({preventScroll:true});
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){onClose();return}
      if(event.key!=='Tab'||!panel)return;
      const focusable=Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
      if(!focusable.length){event.preventDefault();panel.focus({preventScroll:true});return}
      const first=focusable[0];
      const last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus({preventScroll:true})}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus({preventScroll:true})}
      else if(!panel.contains(document.activeElement)){event.preventDefault();first.focus({preventScroll:true})}
    };
    window.addEventListener('keydown',onKey);
    const mobile=window.matchMedia('(max-width: 700px)').matches;
    if(mobile)document.body.style.overflow='hidden';
    return()=>{window.removeEventListener('keydown',onKey);if(mobile)document.body.style.overflow=''};
  },[onClose]);
  const section=(title:string,kind:Kind,options:string[],selected:string[])=><fieldset><legend>{title}</legend><div className="filter-options">{options.map(option=><label className="check-row" key={option}><input type="checkbox" checked={selected.includes(option)} onChange={()=>onToggle(kind,option)}/><span>{option}</span></label>)}</div></fieldset>;
  return <><button className="filter-backdrop" onClick={onClose} aria-label="Close filters" tabIndex={-1}/><div ref={panelRef} id={id} className="filter-panel" role="dialog" aria-label="Advanced filters" aria-modal="true" tabIndex={-1}><div className="filter-panel-head"><div><strong>Filters</strong><span>{active?`${active} selected`:'Choose any that apply'}</span></div><button className="filter-close" onClick={onClose} aria-label="Close filters"><X/></button></div><div className="filter-panel-scroll">{section('Platform','platforms',platformOptions,platforms)}{section('Genre','genres',genreOptions,genres)}{section('Offer type','offers',offerOptions,offers)}</div><div className="filter-panel-actions"><button className="clear-advanced" onClick={onClear} disabled={!active}>Clear filters</button><button className="done-button" onClick={onClose}>Done</button></div></div></>;
}
