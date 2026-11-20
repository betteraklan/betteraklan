import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Link, useLocation } from 'react-router-dom';

import { ChevronDownIcon } from 'lucide-react';

import { activeTab, STAY_LINKS, TABS } from './tourismNav';

// The grid pulls in every tourism dataset, so it loads only when opened.
const TownsGrid = lazy(() => import('./TownsGrid'));

type Panel = 'towns' | 'stay';

const TAB_CLASS =
  'type-body relative inline-flex min-h-12 items-center gap-1 whitespace-nowrap px-3 font-semibold transition-colors duration-(--dur-fast) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kapwa-border-brand';
const ON =
  'text-kapwa-text-brand after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-kapwa-bg-brand-default';
const OFF = 'text-kapwa-text-support hover:text-kapwa-text-strong';

/**
 * Sticky "Visit Aklan" tab row under the site nav. Towns and Where to stay
 * open a panel below the row; Escape, an outside click or navigating closes
 * it. Publishes --tourism-sticky-top (nav plus row height) so anchors and
 * focused elements scroll clear of both.
 */
export default function TourismTabs() {
  const { pathname, search } = useLocation();
  const current = activeTab(pathname, search);
  const townSlug =
    current === 'towns' ? pathname.replace(/\/+$/, '').split('/').pop() : null;
  const [panel, setPanel] = useState<Panel | null>(null);
  const [top, setTop] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttons = useRef<Partial<Record<Panel, HTMLButtonElement | null>>>({});

  // Stick just under the site nav, whose height differs by screen size.
  useLayoutEffect(() => {
    const nav = document.querySelector<HTMLElement>('nav.sticky');
    const bar = barRef.current;
    const root = document.documentElement;
    const update = () => {
      const navH = nav?.getBoundingClientRect().height ?? 0;
      setTop(navH);
      root.style.setProperty(
        '--tourism-sticky-top',
        `${navH + (bar?.offsetHeight ?? 0)}px`
      );
    };
    update();
    const ro =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (nav) ro?.observe(nav);
    if (bar) ro?.observe(bar);
    return () => {
      ro?.disconnect();
      root.style.removeProperty('--tourism-sticky-top');
    };
  }, []);

  // Where to stay is not lazy: move focus to its first link as it opens
  // (the Towns grid does the same when it mounts).
  useEffect(() => {
    if (panel === 'stay') panelRef.current?.querySelector('a')?.focus();
  }, [panel]);

  // Navigating closes any open panel.
  useEffect(() => setPanel(null), [pathname, search]);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      buttons.current[panel]?.focus();
      setPanel(null);
    };
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [panel]);

  return (
    <div
      ref={wrapRef}
      className='bg-kapwa-bg-surface border-kapwa-border-weak sticky z-30 border-b shadow-elev-1'
      style={{ top }}
    >
      <nav aria-label='Visit Aklan' className='container mx-auto sm:px-4'>
        <ul
          ref={barRef}
          className='flex overflow-x-auto px-2 [scrollbar-width:none] sm:px-0'
        >
          {TABS.map(t => {
            const on = current === t.id;
            if (t.to)
              return (
                <li key={t.id} className='shrink-0'>
                  <Link
                    to={t.to}
                    aria-current={on ? 'page' : undefined}
                    className={`${TAB_CLASS} ${on ? ON : OFF}`}
                  >
                    {t.label}
                  </Link>
                </li>
              );
            const id = t.id as Panel;
            const open = panel === id;
            return (
              <li key={t.id} className='shrink-0'>
                <button
                  type='button'
                  ref={el => {
                    buttons.current[id] = el;
                  }}
                  aria-expanded={open}
                  aria-controls={`tourism-${id}-panel`}
                  aria-current={on ? 'true' : undefined}
                  onClick={() => setPanel(open ? null : id)}
                  className={`${TAB_CLASS} ${on || open ? ON : OFF}`}
                >
                  {t.label}
                  <ChevronDownIcon
                    aria-hidden='true'
                    className={`h-4 w-4 transition-transform duration-(--dur-fast) motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {panel && (
        <div
          ref={panelRef}
          id={`tourism-${panel}-panel`}
          role='region'
          aria-label={panel === 'towns' ? 'Towns' : 'Where to stay'}
          className='border-kapwa-border-weak border-t'
        >
          <div className='container mx-auto max-h-[min(70vh,34rem)] overflow-y-auto px-4 py-4'>
            {panel === 'towns' ? (
              <Suspense
                fallback={
                  <p className='text-kapwa-text-support type-meta'>
                    Loading towns…
                  </p>
                }
              >
                <TownsGrid
                  activeSlug={townSlug}
                  onNavigate={() => setPanel(null)}
                />
              </Suspense>
            ) : (
              <ul className='grid gap-2 sm:grid-cols-3'>
                {STAY_LINKS.map(s => (
                  <li key={s.to}>
                    <Link
                      to={s.to}
                      aria-current={
                        pathname.replace(/\/+$/, '') === s.to
                          ? 'page'
                          : undefined
                      }
                      onClick={() => setPanel(null)}
                      className='bg-kapwa-bg-surface border-kapwa-border-weak text-kapwa-text-strong type-body flex min-h-11 items-center rounded-card border px-3 font-semibold transition-shadow duration-(--dur-fast) hover:shadow-elev-1 focus-visible:outline-2 focus-visible:outline-kapwa-border-brand aria-[current=page]:border-kapwa-border-brand'
                    >
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
