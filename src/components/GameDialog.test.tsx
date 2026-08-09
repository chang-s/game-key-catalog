import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import games from '../data/games.json';
import type { Game } from '../types';
import { captureAnalyticsEvent } from '../analytics';
import { buildRequestMessage, GameDialog, indefiniteArticleFor, shouldCollapseMobileHeader, type RequestChoice } from './GameDialog';

vi.mock('../analytics', async importOriginal => {
  const actual = await importOriginal<typeof import('../analytics')>();
  return {
    ...actual,
    captureAnalyticsEvent: vi.fn(),
  };
});

const inventory=games as Game[];
const mixed=inventory.find(item=>item.id==='009')!;
const regionalOnly=inventory.find(item=>item.id==='007')!;
const noRegions=inventory.find(item=>item.id==='001')!;
const onClose=vi.fn();

beforeEach(()=>{
  onClose.mockClear();
  vi.mocked(captureAnalyticsEvent).mockClear();
  let clipboardText='';
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
    writeText:vi.fn((value:string)=>{clipboardText=value;return Promise.resolve()}),
    readText:vi.fn(()=>Promise.resolve(clipboardText)),
  }});
});
afterEach(cleanup);

describe('GameDialog combined details and request flow',()=>{
  it('shows metadata and all selectable key groups on the first screen',()=>{
    const {container}=render(<GameDialog game={mixed} onClose={onClose}/>);
    expect(screen.getByText(mixed.genre)).toBeInTheDocument();
    expect(container.querySelectorAll('.dialog dl')).toHaveLength(1);
    expect(container.querySelectorAll('.dialog dt')).toHaveLength(3);
    expect(container.querySelectorAll('.good-to-know')).toHaveLength(1);
    expect(screen.getByRole('heading',{name:'US / Global'})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'Other regions'})).toBeInTheDocument();
    expect(screen.getByRole('radio',{name:'Steam, 1 available'})).toBeInTheDocument();
    expect(screen.getByRole('radio',{name:'PlayStation 5 — Korea, 1 available'})).toBeInTheDocument();
    expect(screen.queryByText('Which key would you like?')).not.toBeInTheDocument();
  });

  it('keeps Request key disabled until a row is selected',async()=>{
    const user=userEvent.setup();render(<GameDialog game={mixed} onClose={onClose}/>);
    const request=screen.getByRole('button',{name:'Request key'});expect(request).toBeDisabled();
    await user.click(screen.getByText('Steam'));expect(request).toBeEnabled();
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('request_option_selected',expect.objectContaining({game_id:mixed.id,game_title:mixed.title,option_type:'platform',option_value:'Steam'}));
  });

  it('shows only the selection confirmation and generated message on screen two',async()=>{
    const user=userEvent.setup();const {container}=render(<GameDialog game={mixed} onClose={onClose}/>);
    await user.click(screen.getByRole('radio',{name:'Steam, 1 available'}));await user.click(screen.getByRole('button',{name:'Request key'}));
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('request_key_clicked',expect.objectContaining({game_id:mixed.id,game_title:mixed.title,platform:'Steam',region:'US / Global',key_scope:'primary'}));
    expect(screen.getByRole('heading',{name:'Your request'})).toBeInTheDocument();
    expect(screen.getByText('US / Global')).toBeInTheDocument();
    expect(screen.getByText(`Hi Sola! Could I get a Steam key for ${mixed.title} if it’s still available? (ID: 009)`)).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup',{name:'Available keys'})).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Copy request'})).toBeEnabled();
    expect(container.querySelectorAll('.request-summary')).toHaveLength(1);
    expect(container.querySelectorAll('.copy-instructions')).toHaveLength(1);
    expect(container.querySelectorAll('.message-preview')).toHaveLength(1);
  });

  it('preserves the selection when returning to details',async()=>{
    const user=userEvent.setup();const {container}=render(<GameDialog game={mixed} onClose={onClose}/>);
    await user.click(screen.getByRole('radio',{name:'Steam, 1 available'}));await user.click(screen.getByRole('button',{name:'Request key'}));
    const back=container.querySelector<HTMLButtonElement>('.desktop-artwork-back')!;
    expect(back.closest('.dialog-header-desktop')).toBeInTheDocument();
    expect(container.querySelector('.dialog-main-body .desktop-artwork-back')).not.toBeInTheDocument();
    await user.click(back);
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('request_back_clicked',expect.objectContaining({game_id:mixed.id,game_title:mixed.title}));
    expect(screen.getByRole('radio',{name:'Steam, 1 available'})).toBeChecked();
    expect(screen.getByRole('button',{name:'Request key'})).toBeEnabled();
    expect(container.querySelector('.desktop-artwork-back')).not.toBeInTheDocument();
  });

  it('copies a regional request and confirms success without closing',async()=>{
    const user=userEvent.setup();render(<GameDialog game={mixed} onClose={onClose}/>);
    await user.click(screen.getByRole('radio',{name:'PlayStation 5 — Korea, 1 available'}));await user.click(screen.getByRole('button',{name:'Request key'}));await user.click(screen.getByRole('button',{name:'Copy request'}));
    expect(await navigator.clipboard.readText()).toBe(`Hi Sola! Could I get a PlayStation 5 key for ${mixed.title} (Korea) if it’s still available? (ID: 009)`);
    expect(screen.getByRole('button',{name:'Copied!'})).toBeInTheDocument();expect(onClose).not.toHaveBeenCalled();
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('request_message_copied',expect.objectContaining({game_id:mixed.id,game_title:mixed.title,platform:'PlayStation 5',region:'Korea',key_scope:'regional'}));
    const copyCall=vi.mocked(captureAnalyticsEvent).mock.calls.find(([event])=>event==='request_message_copied');
    expect(JSON.stringify(copyCall?.[1])).not.toContain('Could I get');
  });

  it('captures modal close stage from details and request screens',async()=>{
    const user=userEvent.setup();let view=render(<GameDialog game={mixed} onClose={onClose}/>);
    await user.click(view.container.querySelector<HTMLButtonElement>('.close')!);
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('game_modal_closed',expect.objectContaining({game_id:mixed.id,stage:'details'}));
    vi.mocked(captureAnalyticsEvent).mockClear();
    view.unmount();
    view=render(<GameDialog game={mixed} onClose={onClose}/>);
    await user.click(screen.getByRole('radio',{name:'Steam, 1 available'}));await user.click(screen.getByRole('button',{name:'Request key'}));await user.click(screen.getByRole('button',{name:'Close'}));
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('game_modal_closed',expect.objectContaining({game_id:mixed.id,stage:'request'}));
  });

  it('supports regional-only inventory without an empty primary group',()=>{
    render(<GameDialog game={regionalOnly} onClose={onClose}/>);
    expect(screen.queryByRole('heading',{name:'US / Global'})).not.toBeInTheDocument();
    expect(screen.getByRole('radio',{name:'Battlenet — China, 1 available'})).toBeInTheDocument();
  });

  it('keeps large inventories in the same single scrolling shell',()=>{
    const extreme:Game={...mixed,id:'999',platformQuantities:Object.fromEntries(Array.from({length:8},(_,index)=>[`Primary platform ${index+1}`,1])),primaryKeys:8,otherRegionKeys:10,otherRegionInventory:Array.from({length:10},(_,index)=>({platform:`Regional platform ${index+1}`,region:`Region ${index+1}`,quantity:1}))};
    const {container}=render(<GameDialog game={extreme} onClose={onClose}/>);
    expect(screen.getAllByRole('radio')).toHaveLength(18);expect(container.querySelectorAll('.dialog-scroll')).toHaveLength(1);
    expect(container.querySelector('.dialog-main .desktop-scrollbar')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.desktop-scrollbar')).toHaveLength(1);
  });
});

describe('buildRequestMessage',()=>{
  it.each([
    ['Xbox Play Anywhere','an'],['Xbox','an'],['Steam','a'],['Battlenet','a'],['PlayStation 5','a'],['Mobile','a'],
  ])('uses %s with the correct indefinite article', (platform,article)=>{
    expect(indefiniteArticleFor(platform)).toBe(article);
    expect(buildRequestMessage(noRegions,{kind:'primary',platform,quantity:1})).toContain(`Could I get ${article} ${platform} key`);
  });

  it('uses structured regional choices and never adds a bread emoji',()=>{
    const choice:RequestChoice={kind:'regional',platform:'Battlenet',region:'China',quantity:1};
    const message=buildRequestMessage(regionalOnly,choice);
    expect(message).toContain('a Battlenet key');expect(message).toContain('(China)');expect(message).toContain('(ID: 007)');expect(message).not.toContain('🍞');
  });
});

describe('shouldCollapseMobileHeader',()=>{
  it('collapses when the expanded header boundary reaches the compact header line',()=>{
    expect(shouldCollapseMobileHeader({
      boundaryTop:196,
      scrollportTop:100,
      collapsedHeaderHeight:96,
      currentlyCollapsed:false,
    })).toBe(true);
  });

  it('uses a small geometric hysteresis while the header is collapsed',()=>{
    expect(shouldCollapseMobileHeader({
      boundaryTop:204,
      scrollportTop:100,
      collapsedHeaderHeight:96,
      currentlyCollapsed:true,
    })).toBe(true);
  });
});
