import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureAnalyticsEvent } from './analytics';
import App from './App';

vi.mock('./analytics', async importOriginal => {
  const actual = await importOriginal<typeof import('./analytics')>();
  return {
    ...actual,
    AnalyticsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    captureAnalyticsEvent: vi.fn(),
  };
});

beforeEach(()=>{
  vi.mocked(captureAnalyticsEvent).mockClear();
  Object.defineProperty(window,'matchMedia',{writable:true,value:vi.fn().mockImplementation(query=>({matches:query.includes('700px'),media:query,onchange:null,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn()}))});
});
afterEach(()=>{vi.useRealTimers();cleanup()});

describe('advanced filter UI',()=>{
  it('uses the approved brand assets and exact footer copy',()=>{
    const {container}=render(<App/>);
    expect(container.querySelector('.masthead-art')).toHaveAttribute('src','./brand/bear-bakery-banner.webp');
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

  it('captures bread clicks using the matching header behavior',async()=>{
    const scrollTo=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
    const user=userEvent.setup();render(<App/>);
    await user.click(screen.getAllByRole('button',{name:'Back to top'})[0]);
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('bread_clicked',{header_state:'expanded',action:'sparkle'});
    await user.click(screen.getAllByRole('button',{name:'Back to top'})[1]);
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('bread_clicked',{header_state:'sticky',action:'scroll_to_top'});
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
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('filter_changed',expect.objectContaining({filter_type:'platforms',results_count:expect.any(Number),ui_state:expect.stringMatching(/normal|sticky/)}));
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('filters_cleared',expect.objectContaining({previous_filter_state:expect.objectContaining({platforms:expect.any(Array),genres:expect.any(Array),offers:expect.any(Array)}),ui_state:expect.stringMatching(/normal|sticky/)}));
  });

  it('captures settled searches without sending the literal query',async()=>{
    vi.useFakeTimers();
    render(<App/>);
    fireEvent.change(screen.getByRole('textbox',{name:'Search games'}),{target:{value:'call'}});
    await vi.advanceTimersByTimeAsync(599);
    expect(captureAnalyticsEvent).not.toHaveBeenCalledWith('search_used',expect.anything());
    await vi.advanceTimersByTimeAsync(1);
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('search_used',expect.objectContaining({query_length:4,results_count:expect.any(Number),ui_state:expect.stringMatching(/normal|sticky/)}));
    expect(JSON.stringify(vi.mocked(captureAnalyticsEvent).mock.calls)).not.toContain('call');
  });

  it('captures zero-result settled searches with active filter state',async()=>{
    vi.useFakeTimers();
    render(<App/>);
    fireEvent.change(screen.getByRole('textbox',{name:'Search games'}),{target:{value:'zzzzzzzz'}});
    await vi.advanceTimersByTimeAsync(600);
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('search_no_results',expect.objectContaining({query_length:8,results_count:0,active_filter_state:expect.objectContaining({availability:'Available'}),ui_state:expect.stringMatching(/normal|sticky/)}));
  });

  it('captures sort and availability changes',async()=>{
    const user=userEvent.setup();render(<App/>);
    await user.selectOptions(screen.getByLabelText('Sort'),'recent');
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('sort_changed',{sort_value:'recent',ui_state:expect.stringMatching(/normal|sticky/)});
    await user.selectOptions(screen.getByLabelText('Availability'),'All');
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('filter_changed',expect.objectContaining({filter_type:'availability',filter_value:'All',ui_state:expect.stringMatching(/normal|sticky/)}));
  });

  it('captures game opens with discovery context',async()=>{
    const user=userEvent.setup();render(<App/>);
    await user.click(screen.getAllByRole('button',{name:/View details for/})[0]);
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('game_opened',expect.objectContaining({game_id:expect.any(String),game_title:expect.any(String),availability:expect.any(String),platforms:expect.any(Array),discovery_method:'browse',ui_state:expect.stringMatching(/normal|sticky/)}));
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
    expect(screen.getByText((_,element)=>element?.tagName==='P'&&element.textContent?.trim()==='20 items')).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Halo: Campaign Evolved/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Gears of War: Reloaded/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Call of Duty®: Modern Warfare® III/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Call of Duty: Black Ops 4 - Digital Deluxe/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Fallout 76: Gleaming Depths/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Quake Arena Arcade/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Wasteland 3/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/DOOM \(2016\)/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/The Elder Scrolls III: Morrowind/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Wolfenstein: The Old Blood/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/DOOM Eternal Standard Edition/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/The Elder Scrolls® Online/})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:/Halo: The Master Chief Collection/})).toBeInTheDocument();
  });

  it('offers comfortable semantic checkbox rows and an obvious mobile Done action',async()=>{
    const user=userEvent.setup();render(<App/>);await user.click(screen.getByRole('button',{name:'Filters'}));
    const dialog=screen.getByRole('dialog',{name:'Advanced filters'});
    expect(dialog).toHaveAttribute('aria-modal','true');
    expect(within(dialog).getAllByRole('checkbox').length).toBeGreaterThan(0);
    expect(within(dialog).getByRole('button',{name:'Done'})).toBeInTheDocument();
    expect(within(dialog).getAllByRole('checkbox')[0]).toHaveFocus();
  });

  it('keeps keyboard focus inside the filter dialog and restores it to the opener',async()=>{
    const user=userEvent.setup();render(<App/>);
    const button=screen.getByRole('button',{name:'Filters'});
    await user.click(button);
    const dialog=screen.getByRole('dialog',{name:'Advanced filters'});
    const close=within(dialog).getByRole('button',{name:'Close filters'});
    const done=within(dialog).getByRole('button',{name:'Done'});
    done.focus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({shift:true});
    expect(done).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog',{name:'Advanced filters'})).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });
});
