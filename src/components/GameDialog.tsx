import { useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { ArrowLeft, Check, Copy, Globe2, X } from 'lucide-react';
import type { Game } from '../types';
import { captureAnalyticsEvent, gameAnalyticsProperties } from '../analytics';
import { getGameAvailability } from '../inventory';

export type RequestChoice =
  | { kind: 'primary'; platform: string; quantity: number }
  | { kind: 'regional'; platform: string; region: string; quantity: number };

type ModalScreen = 'details' | 'request';

export const indefiniteArticleFor = (label: string) => /^(?:[aeiou]|xbox\b)/i.test(label.trim()) ? 'an' : 'a';

export const shouldCollapseMobileHeader = ({
  boundaryTop,
  scrollportTop,
  collapsedHeaderHeight,
  currentlyCollapsed,
}: {
  boundaryTop: number;
  scrollportTop: number;
  collapsedHeaderHeight: number;
  currentlyCollapsed: boolean;
}) => boundaryTop <= scrollportTop + collapsedHeaderHeight + (currentlyCollapsed ? 12 : 0);

export function buildRequestMessage(game: Game, choice: RequestChoice) {
  const article = indefiniteArticleFor(choice.platform);
  return choice.kind === 'regional'
    ? `Hi Sola! Could I get ${article} ${choice.platform} key for ${game.title} (${choice.region}) if it’s still available? (ID: ${game.id})`
    : `Hi Sola! Could I get ${article} ${choice.platform} key for ${game.title} if it’s still available? (ID: ${game.id})`;
}

const choiceId = (choice: RequestChoice) => choice.kind === 'primary'
  ? `primary:${choice.platform}`
  : `regional:${choice.platform}:${choice.region}`;

const quantityText = (quantity: number) => `${quantity} available`;

function requestChoiceAnalyticsProperties(choice: RequestChoice) {
  return {
    platform: choice.platform,
    region: choice.kind === 'regional' ? choice.region : 'US / Global',
    key_scope: choice.kind,
    key_quantity: choice.quantity,
  };
}

function GameHeader({ game, className = '', onBack }: { game: Game; className?: string; onBack?: () => void }) {
  const [hasCover, setHasCover] = useState(Boolean(game.imageFilename));
  useEffect(() => setHasCover(Boolean(game.imageFilename)), [game.imageFilename]);

  return <div className={`dialog-header ${className}`}>
    {hasCover ? <img className="dialog-cover" src={`./covers/${game.imageFilename}`} alt="" onError={() => setHasCover(false)} /> : <div className="dialog-cover missing" aria-hidden="true" />}
    {onBack && <button className="desktop-artwork-back" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" />Back</button>}
    <div className="dialog-header-overlay" aria-hidden="true">
      <strong>{game.title}</strong>
      <span className="game-type-pill">{game.offerType}</span>
    </div>
  </div>;
}

function GameIdentity({ game, blockRef }: { game: Game; blockRef?: Ref<HTMLDivElement> }) {
  return <div ref={blockRef} className="dialog-title-block">
    <h2 id="dialog-title">{game.title}</h2>
    <span className="game-type-pill">{game.offerType}</span>
  </div>;
}

function GameMetadata({ game }: { game: Game }) {
  return <dl>
    <div><dt>Genre</dt><dd>{game.genre}</dd></div>
    {game.edition && <div><dt>Edition / item</dt><dd>{game.edition}</dd></div>}
    <div><dt>Availability</dt><dd>{getGameAvailability(game)}</dd></div>
  </dl>;
}

function KeyOption({ choice, selected, onSelect }: { choice: RequestChoice; selected: boolean; onSelect: () => void }) {
  const regional = choice.kind === 'regional';
  const label = regional ? `${choice.platform} — ${choice.region}` : choice.platform;
  return <label className={regional ? 'regional-choice' : undefined}>
    <input
      type="radio"
      name="inventory-choice"
      value={choiceId(choice)}
      aria-label={`${label}, ${quantityText(choice.quantity)}`}
      checked={selected}
      onChange={onSelect}
    />
    <span>
      <i className="radio-indicator" aria-hidden="true" />
      {regional && <Globe2 className="region-icon" size={16} aria-hidden="true" />}
      <b>{label}</b>
      <small>{quantityText(choice.quantity)}</small>
    </span>
  </label>;
}

function KeyGroup({ title, choices, selectedId, onSelect, regional = false }: {
  title: string;
  choices: RequestChoice[];
  selectedId: string;
  onSelect: (id: string) => void;
  regional?: boolean;
}) {
  if (!choices.length) return null;
  const headingId = regional ? 'regional-request-options' : 'primary-request-options';
  return <section className={regional ? 'regional-request-options' : undefined} aria-labelledby={headingId}>
    <h3 id={headingId}>{title}</h3>
    <div className="choices">
      {choices.map(choice => {
        const id = choiceId(choice);
        return <KeyOption key={id} choice={choice} selected={selectedId === id} onSelect={() => onSelect(id)} />;
      })}
    </div>
  </section>;
}

function KeySelector({ primaryChoices, regionalChoices, selectedId, onSelect }: {
  primaryChoices: RequestChoice[];
  regionalChoices: RequestChoice[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return <div className="request-groups combined-key-selection" role="radiogroup" aria-label="Available keys">
    <KeyGroup title="US / Global" choices={primaryChoices} selectedId={selectedId} onSelect={onSelect} />
    <KeyGroup title="Other regions" choices={regionalChoices} selectedId={selectedId} onSelect={onSelect} regional />
  </div>;
}

function RequestMessage({ game, choice }: { game: Game; choice: RequestChoice }) {
  return <>
    <section className="request-summary" aria-labelledby="request-summary-title">
      <h3 id="request-summary-title">Your request</h3>
      <strong>{choice.platform}</strong>
      <span>{choice.kind === 'regional' ? choice.region : 'US / Global'}</span>
    </section>
    <section className="copy-instructions" aria-labelledby="copy-instructions-title">
      <h3 id="copy-instructions-title">Copy &amp; send to Sola</h3>
      <p>Copy the message below and send it to Sola!</p>
      <div className="message-preview ph-no-capture ph-mask">{buildRequestMessage(game, choice)}</div>
    </section>
  </>;
}

function ModalActions({ screen, canRequest, copied, onRequest, onCopy, onClose, onBack }: {
  screen: ModalScreen;
  canRequest: boolean;
  copied: boolean;
  onRequest: () => void;
  onCopy: () => void;
  onClose: () => void;
  onBack: () => void;
}) {
  return <div className="dialog-actions">
    {screen === 'details'
      ? <button className="primary" onClick={onRequest} disabled={!canRequest}>Request key</button>
      : <button className="primary copy-action" onClick={onCopy} aria-live="polite">
          {copied ? <><Check />Copied!</> : <><Copy />Copy request</>}
        </button>}
    <button className="secondary-action" onClick={screen === 'details' ? onClose : onBack}>
      {screen === 'details' ? 'Close' : 'Back'}
    </button>
  </div>;
}

export function GameDialog({ game, onClose }: { game: Game | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const scrollbarThumbRef = useRef<HTMLDivElement>(null);
  const scrollbarDragRef = useRef({ active: false, pointerId: -1, grabOffset: 0 });
  const headerBoundaryRef = useRef<HTMLDivElement>(null);
  const titleBlockRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const copyTimerRef = useRef<number | undefined>(undefined);
  const closeCapturedRef = useRef(false);
  const dragRef = useRef({ active: false, pointerId: -1, startY: 0, lastY: 0, lastTime: 0, velocity: 0, offset: 0 });
  const collapsedRef = useRef(false);
  const [screen, setScreen] = useState<ModalScreen>('details');
  const [selectedId, setSelectedId] = useState('');
  const [copied, setCopied] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const primaryChoices = useMemo<RequestChoice[]>(() => game
    ? Object.entries(game.platformQuantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([platform, quantity]) => ({ kind: 'primary', platform, quantity }))
    : [], [game]);
  const regionalChoices = useMemo<RequestChoice[]>(() => game
    ? (game.otherRegionInventory ?? [])
        .filter(item => item.quantity > 0)
        .map(item => ({ kind: 'regional', ...item }))
    : [], [game]);
  const choices = [...primaryChoices, ...regionalChoices];
  const selectedChoice = choices.find(choice => choiceId(choice) === selectedId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!game) {
      dialog?.close();
      return;
    }
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setScreen('details');
    setSelectedId('');
    setCopied(false);
    setHeaderCollapsed(false);
    closeCapturedRef.current = false;
    collapsedRef.current = false;
    dialog?.classList.remove('is-closing', 'is-dragging');
    dialog?.style.removeProperty('--sheet-drag');
    dialog?.style.removeProperty('--backdrop-alpha');
    dialog?.showModal();
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!dialog?.open || active && dialog.contains(active)) return;
      const target = isMobile()
        ? dialog.querySelector<HTMLElement>('.dialog-main-body input:not([disabled]), .dialog-main-body button:not([disabled])')
        : dialog.querySelector<HTMLElement>('.close, .dialog-main-body input:not([disabled]), .dialog-main-body button:not([disabled])');
      target?.focus({ preventScroll: true });
    });
  }, [game]);

  useEffect(() => () => {
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(copyTimerRef.current);
  }, []);

  const updateDesktopScrollbar = () => {
    const scroll = scrollRef.current;
    const rail = scrollbarRef.current;
    const thumb = scrollbarThumbRef.current;
    if (!scroll || !rail || !thumb) return;
    const trackHeight = Math.max(0, scroll.clientHeight - 36);
    rail.style.height = `${trackHeight}px`;
    const scrollRange = scroll.scrollHeight - scroll.clientHeight;
    const thumbHeight = scrollRange > 0 ? Math.max(32, trackHeight * scroll.clientHeight / scroll.scrollHeight) : trackHeight;
    const thumbRange = Math.max(0, trackHeight - thumbHeight);
    const thumbTop = scrollRange > 0 ? thumbRange * scroll.scrollTop / scrollRange : 0;
    rail.classList.toggle('is-visible', scrollRange > 1);
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${thumbTop}px)`;
  };

  const syncDesktopTitleHeight = () => {
    const dialog = dialogRef.current;
    const titleBlock = titleBlockRef.current;
    if (!dialog || !titleBlock || isMobile()) {
      dialog?.style.removeProperty('--dialog-title-expanded-height');
      return;
    }
    dialog.style.setProperty('--dialog-title-expanded-height', `${titleBlock.getBoundingClientRect().height}px`);
  };

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    requestAnimationFrame(syncDesktopTitleHeight);
    updateDesktopScrollbar();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateDesktopScrollbar);
    observer.observe(scroll);
    const content = scroll.querySelector('.dialog-main-body');
    if (content) observer.observe(content);
    return () => observer.disconnect();
  }, [game, screen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const handleClose = () => {
      if (game && !closeCapturedRef.current) {
        closeCapturedRef.current = true;
        captureAnalyticsEvent('game_modal_closed', {
          ...gameAnalyticsProperties(game),
          stage: screen === 'request' ? 'request' : 'details',
        });
      }
      onClose();
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      openerRef.current = null;
    };
    dialog?.addEventListener('close', handleClose);
    return () => dialog?.removeEventListener('close', handleClose);
  }, [game, onClose, screen]);

  if (!game) return <dialog ref={dialogRef} />;

  const matchesMedia = (query: string) => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  const isMobile = () => matchesMedia('(max-width: 700px)');
  const reducedMotion = () => matchesMedia('(prefers-reduced-motion: reduce)');

  const setDragOffset = (offset: number) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.style.setProperty('--sheet-drag', `${offset}px`);
    dialog.style.setProperty('--backdrop-alpha', String(Math.max(0, 1 - offset / Math.max(dialog.clientHeight * .8, 1))));
  };

  const dismiss = () => {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    if (!closeCapturedRef.current) {
      closeCapturedRef.current = true;
      captureAnalyticsEvent('game_modal_closed', {
        ...gameAnalyticsProperties(game),
        stage: screen === 'request' ? 'request' : 'details',
      });
    }
    if (!isMobile() || reducedMotion()) {
      dialog.close();
      return;
    }
    dialog.classList.remove('is-dragging');
    dialog.classList.add('is-closing');
    dialog.style.setProperty('--sheet-drag', `${Math.max(dialog.clientHeight, window.innerHeight)}px`);
    dialog.style.setProperty('--backdrop-alpha', '0');
    closeTimerRef.current = window.setTimeout(() => dialog.close(), 220);
  };

  const resetScroll = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      scrollRef.current.classList.add('at-top');
    }
    requestAnimationFrame(updateDesktopScrollbar);
    setHeaderCollapsed(false);
    collapsedRef.current = false;
  };

  const showScreen = (nextScreen: ModalScreen) => {
    resetScroll();
    setCopied(false);
    setScreen(nextScreen);
  };

  const showRequestScreen = () => {
    if (!selectedChoice) return;
    captureAnalyticsEvent('request_key_clicked', {
      ...gameAnalyticsProperties(game),
      ...requestChoiceAnalyticsProperties(selectedChoice),
    });
    showScreen('request');
  };

  const showDetailsScreen = () => {
    captureAnalyticsEvent('request_back_clicked', gameAnalyticsProperties(game));
    showScreen('details');
  };

  const copyRequest = async () => {
    if (!selectedChoice) return;
    await navigator.clipboard.writeText(buildRequestMessage(game, selectedChoice));
    captureAnalyticsEvent('request_message_copied', {
      ...gameAnalyticsProperties(game),
      ...requestChoiceAnalyticsProperties(selectedChoice),
    });
    window.clearTimeout(copyTimerRef.current);
    setCopied(true);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 1800);
  };

  const selectChoice = (id: string) => {
    const choice = choices.find(item => choiceId(item) === id);
    setSelectedId(id);
    setCopied(false);
    if (!choice) return;
    captureAnalyticsEvent('request_option_selected', {
      ...gameAnalyticsProperties(game),
      option_type: choice.kind === 'regional' ? 'regional_key' : 'platform',
      option_value: choice.kind === 'regional' ? `${choice.platform}:${choice.region}` : choice.platform,
    });
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    event.currentTarget.classList.toggle('at-top', scrollTop <= 0);
    updateDesktopScrollbar();
    const mobile = isMobile();
    let nextCollapsed: boolean;

    if (mobile) {
      const dialog = dialogRef.current;
      const boundary = headerBoundaryRef.current;
      const collapsedHeaderHeight = dialog
        ? Number.parseFloat(getComputedStyle(dialog).getPropertyValue('--dialog-header-collapsed-height'))
        : Number.NaN;

      nextCollapsed = Boolean(boundary && Number.isFinite(collapsedHeaderHeight))
        && shouldCollapseMobileHeader({
          boundaryTop: boundary?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
          scrollportTop: event.currentTarget.getBoundingClientRect().top,
          collapsedHeaderHeight,
          currentlyCollapsed: collapsedRef.current,
        });
    } else {
      nextCollapsed = collapsedRef.current ? scrollTop > 8 : scrollTop > 24;
    }
    if (nextCollapsed === collapsedRef.current) return;
    if (!mobile && nextCollapsed) syncDesktopTitleHeight();
    collapsedRef.current = nextCollapsed;
    setHeaderCollapsed(nextCollapsed);
  };

  const handleScrollbarPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const scroll = scrollRef.current;
    const rail = scrollbarRef.current;
    const thumb = scrollbarThumbRef.current;
    if (!scroll || !rail || !thumb || event.button !== 0) return;
    event.preventDefault();
    const railTop = rail.getBoundingClientRect().top;
    const thumbTop = thumb.getBoundingClientRect().top;
    const onThumb = (event.target as HTMLElement).closest('.desktop-scrollbar-thumb');
    scrollbarDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      grabOffset: onThumb ? event.clientY - thumbTop : thumb.offsetHeight / 2,
    };
    rail.setPointerCapture(event.pointerId);
    const targetTop = event.clientY - railTop - scrollbarDragRef.current.grabOffset;
    const thumbRange = rail.clientHeight - thumb.offsetHeight;
    scroll.scrollTop = thumbRange > 0 ? Math.max(0, Math.min(thumbRange, targetTop)) / thumbRange * (scroll.scrollHeight - scroll.clientHeight) : 0;
  };

  const handleScrollbarPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = scrollbarDragRef.current;
    const scroll = scrollRef.current;
    const rail = scrollbarRef.current;
    const thumb = scrollbarThumbRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId || !scroll || !rail || !thumb) return;
    const targetTop = event.clientY - rail.getBoundingClientRect().top - drag.grabOffset;
    const thumbRange = rail.clientHeight - thumb.offsetHeight;
    scroll.scrollTop = thumbRange > 0 ? Math.max(0, Math.min(thumbRange, targetTop)) / thumbRange * (scroll.scrollHeight - scroll.clientHeight) : 0;
  };

  const handleScrollbarPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (scrollbarDragRef.current.pointerId !== event.pointerId) return;
    scrollbarDragRef.current.active = false;
    scrollbarRef.current?.releasePointerCapture(event.pointerId);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile() || event.pointerType === 'mouse' || event.button !== 0 || !(event.target as HTMLElement).closest('.sheet-handle-area')) return;
    const now = performance.now();
    dragRef.current = { active: true, pointerId: event.pointerId, startY: event.clientY, lastY: event.clientY, lastTime: now, velocity: 0, offset: 0 };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    const offset = Math.max(0, event.clientY - drag.startY);
    if (offset === 0) return;
    if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      dialogRef.current?.classList.add('is-dragging');
    }
    event.preventDefault();
    const now = performance.now();
    const elapsed = Math.max(now - drag.lastTime, 1);
    drag.velocity = (event.clientY - drag.lastY) / elapsed;
    drag.lastY = event.clientY;
    drag.lastTime = now;
    drag.offset = offset;
    setDragOffset(offset);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    drag.active = false;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId);
    const dialog = dialogRef.current;
    dialog?.classList.remove('is-dragging');
    if (drag.offset > Math.min((dialog?.clientHeight ?? 0) * .28, 180) || drag.velocity > .7) {
      dismiss();
      return;
    }
    setDragOffset(0);
  };

  return <dialog
    ref={dialogRef}
    className={`dialog${headerCollapsed ? ' header-collapsed' : ''}`}
    onClick={event => { if (event.target === dialogRef.current) dismiss(); }}
    aria-labelledby="dialog-title"
  >
    <button className="close" onClick={dismiss} aria-label="Close"><X /></button>
    <div
      className="dialog-scroll"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div className="sheet-handle-area" aria-hidden="true"><span /></div>
      <GameHeader
        game={game}
        className="dialog-header-desktop"
        onBack={screen === 'request' ? showDetailsScreen : undefined}
      />
      <div className="dialog-panel">
        <div className="dialog-content">
          <div ref={scrollRef} className="dialog-main at-top" onScroll={handleScroll}>
            <GameHeader game={game} className="dialog-header-mobile" />
            <div ref={headerBoundaryRef} className="dialog-header-boundary" aria-hidden="true" />
            <div className="dialog-main-body">
              <GameIdentity game={game} blockRef={titleBlockRef} />
              {screen === 'details' ? <>
                <GameMetadata game={game} />
                <KeySelector
                  primaryChoices={primaryChoices}
                  regionalChoices={regionalChoices}
                  selectedId={selectedId}
                  onSelect={selectChoice}
                />
                {game.notes && <section className="good-to-know"><h3>Good to know</h3><p>{game.notes}</p></section>}
              </> : selectedChoice && <RequestMessage game={game} choice={selectedChoice} />}
            </div>
            <div className="dialog-scroll-range-spacer" aria-hidden="true" />
          </div>
          <div
            ref={scrollbarRef}
            className="desktop-scrollbar"
            aria-hidden="true"
            onPointerDown={handleScrollbarPointerDown}
            onPointerMove={handleScrollbarPointerMove}
            onPointerUp={handleScrollbarPointerUp}
            onPointerCancel={handleScrollbarPointerUp}
          >
            <div ref={scrollbarThumbRef} className="desktop-scrollbar-thumb" />
          </div>
          <ModalActions
            screen={screen}
            canRequest={Boolean(selectedChoice)}
            copied={copied}
            onRequest={showRequestScreen}
            onCopy={copyRequest}
            onClose={dismiss}
            onBack={showDetailsScreen}
          />
        </div>
      </div>
    </div>
  </dialog>;
}
