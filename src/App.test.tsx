import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

beforeEach(()=>{
  Object.defineProperty(window,'matchMedia',{writable:true,value:vi.fn().mockImplementation(query=>({matches:query.includes('700px'),media:query,onchange:null,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn()}))});
});
afterEach(cleanup);

describe('advanced filter UI',()=>{
  it('uses the approved brand assets and exact footer copy',()=>{
    const {container}=render(<App/>);
    expect(container.querySelector('.masthead-art')).toHaveAttribute('src','./brand/bear-bakery-banner.png');
    expect(container.querySelector('.mark img')).toHaveAttribute('src','./brand/white-bread.png');
    expect(screen.getByText('made for friends to enjoy! 💖')).toBeInTheDocument();
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    expect(screen.getByText('Seattle')).toBeInTheDocument();
    expect(container.querySelector('.sticky-brand img')).toHaveAttribute('src','./brand/white-bread.png');
    expect(screen.getAllByRole('button',{name:'Back to top'})).toHaveLength(2);
    expect(screen.queryByText('Game Key Bakery')).not.toBeInTheDocument();
  });

  it('returns to the top from either bakery icon',async()=>{
    const scrollTo=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
    const user=userEvent.setup();render(<App/>);
    await user.click(screen.getAllByRole('button',{name:'Back to top'})[0]);
    expect(scrollTo).toHaveBeenCalledWith({top:0,behavior:'smooth'});
    expect(document.body.querySelectorAll('.bread-sparkles i')).toHaveLength(9);
    await user.click(screen.getAllByRole('button',{name:'Back to top'})[0]);
    expect(document.body.querySelectorAll('.bread-sparkles i')).toHaveLength(9);
    scrollTo.mockRestore();
  });

  it('returns to the top without smooth scrolling for reduced-motion users',async()=>{
    vi.mocked(window.matchMedia).mockImplementation(query=>({matches:query==='(prefers-reduced-motion: reduce)',media:query,onchange:null,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn()}));
    const scrollTo=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
    const user=userEvent.setup();render(<App/>);
    await user.click(screen.getAllByRole('button',{name:'Back to top'})[0]);
    expect(scrollTo).toHaveBeenCalledWith({top:0,behavior:'auto'});
    expect(document.body.querySelector('.bread-sparkles')).not.toBeInTheDocument();
    scrollTo.mockRestore();
  });

  it('does not celebrate from the sticky bakery button',async()=>{
    const scrollTo=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
    const user=userEvent.setup();render(<App/>);
    await user.click(screen.getAllByRole('button',{name:'Back to top'})[1]);
    expect(document.body.querySelector('.bread-sparkles')).not.toBeInTheDocument();
    scrollTo.mockRestore();
  });

  it('is hidden by default and opens from the Filters button',async()=>{
    const user=userEvent.setup();render(<App/>);
    const button=screen.getByRole('button',{name:'Filters'});
    expect(button).toHaveAttribute('aria-expanded','false');
    expect(screen.queryByRole('dialog',{name:'Advanced filters'})).not.toBeInTheDocument();
    await user.click(button);
    expect(screen.getByRole('dialog',{name:'Advanced filters'})).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded','true');
  });

  it('supports multiple selections, live count, chips, removal, and advanced-only clearing',async()=>{
    const user=userEvent.setup();render(<App/>);await user.click(screen.getByRole('button',{name:'Filters'}));
    await user.click(screen.getByRole('checkbox',{name:'Steam'}));
    await user.click(screen.getByRole('checkbox',{name:'Xbox'}));
    await user.click(screen.getByRole('checkbox',{name:'Shooter'}));
    expect(screen.getByLabelText('3 active filters')).toBeInTheDocument();
    expect(screen.getByText('3 selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Done'}));
    expect(screen.getByRole('button',{name:'Remove Steam filter'})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Remove Xbox filter'})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Remove Shooter filter'})).toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Remove Xbox filter'}));
    expect(screen.getByLabelText('2 active filters')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox',{name:'Search games'}),'call');
    await user.click(screen.getByRole('button',{name:'Clear filters'}));
    expect(screen.getByRole('textbox',{name:'Search games'})).toHaveValue('call');
    expect(screen.queryByLabelText(/active filters/)).not.toBeInTheDocument();
  });

  it('preserves selections when closed and reopened and closes with Escape',async()=>{
    const user=userEvent.setup();render(<App/>);const button=screen.getByRole('button',{name:'Filters'});
    await user.click(button);await user.click(screen.getByRole('checkbox',{name:'Full Game'}));await user.click(screen.getByRole('button',{name:'Done'}));
    await user.click(button);expect(screen.getByRole('checkbox',{name:'Full Game'})).toBeChecked();
    await user.keyboard('{Escape}');expect(screen.queryByRole('dialog',{name:'Advanced filters'})).not.toBeInTheDocument();expect(button).toHaveFocus();
  });

  it('updates results immediately using cross-category AND logic',async()=>{
    const user=userEvent.setup();render(<App/>);await user.click(screen.getByRole('button',{name:'Filters'}));
    await user.click(screen.getByRole('checkbox',{name:'Steam'}));await user.click(screen.getByRole('checkbox',{name:'Xbox'}));
    await user.click(screen.getByRole('checkbox',{name:'Shooter'}));await user.click(screen.getByRole('checkbox',{name:'Roleplaying'}));
    await user.click(screen.getByRole('checkbox',{name:'Full Game'}));
    expect(screen.getByText((_,element)=>element?.tagName==='P'&&element.textContent?.trim()==='11 items')).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Halo: Campaign Evolved/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Gears of War: Reloaded/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Call of Duty®: Modern Warfare® III/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Call of Duty: Black Ops 4 - Digital Deluxe/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Fallout 76: Gleaming Depths/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Quake Arena Arcade/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Wasteland 3/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/DOOM \(2016\)/})).toBeInTheDocument();
  });

  it('offers comfortable semantic checkbox rows and an obvious mobile Done action',async()=>{
    const user=userEvent.setup();render(<App/>);await user.click(screen.getByRole('button',{name:'Filters'}));
    const dialog=screen.getByRole('dialog',{name:'Advanced filters'});
    expect(within(dialog).getAllByRole('checkbox').length).toBeGreaterThan(0);
    expect(within(dialog).getByRole('button',{name:'Done'})).toBeInTheDocument();
    expect(within(dialog).getAllByRole('checkbox')[0]).toHaveFocus();
  });
});
