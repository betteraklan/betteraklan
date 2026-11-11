import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  ArrowRightIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarX2Icon,
  ExternalLinkIcon,
  InfoIcon,
  ListIcon,
  MapIcon,
  PlayIcon,
  SearchIcon,
  Share2Icon,
  SlidersHorizontalIcon,
  SquareIcon,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';

import { advisoriesFor } from '@/lib/tourism/advisories';
import { DATE_STATUS_LABEL } from '@/lib/tourism/festivalDates';
import {
  buildRecords,
  emptyReason,
  filterRecords,
  LAYER_LABEL,
  type Layer,
  type Rec,
  type Sources,
} from '@/lib/tourism/explore';
import { type BoundaryFeature } from '@/lib/tourism/geo';

import AklanMap3D, { type MapPin } from './components/AklanMap3D';
import { LAYER_COLOR, LAYER_ICON, LAYER_LETTER } from './components/layerMeta';
import RecordCard from './components/RecordCard';
import { DatePill, LocationPill, Pill } from './components/StatusPills';
import { useBottomSheet } from './components/useBottomSheet';

import accommodationsData from '@/data/tourism/accommodations.json';
import boundaryData from '@/data/geo/municipalities-boundaries.json';
import centroidData from '@/data/geo/municipality-centroids.json';
import municipalitiesData from '@/data/tourism/municipalities.json';
import resortsData from '@/data/tourism/resorts.json';
import type { Accommodation, MunicipalityTourism } from '@/types/tourism';

const SOURCES: Sources = {
  municipalities: municipalitiesData as MunicipalityTourism[],
  resorts: resortsData as Sources['resorts'],
  accommodations: accommodationsData as Accommodation[],
  centroids: centroidData as Sources['centroids'],
  boundaries: (boundaryData as { features: BoundaryFeature[] }).features,
};
const ALL_RECORDS = buildRecords(SOURCES);
const MUNICIPALITIES = [...SOURCES.municipalities].sort((a, b) =>
  a.name.localeCompare(b.name)
);
const LAYERS: Layer[] = ['all', 'place', 'event', 'stay', 'product'];
const RESULTS_PAGE = 50;
// The date filter only appears once at least one festival has a sourced date.
const HAS_DATED = ALL_RECORDS.some(r => r.dateStatus !== 'unavailable');

const PLACEMENT_LABEL: Record<Rec['placement'], string> = {
  exact: 'Exact location',
  approximate: 'Approximate pin',
  none: 'Location unavailable',
};

const TOUR_STEP_MS = 5000;
// Shading ramp for record counts: brighter means more BetterAklan records.
const TIER_COLOR = [
  '#EEF3FB',
  '#D6E4FA',
  '#A9C7F5',
  '#6FA0EC',
  '#3B78DB',
  '#1D4FB0',
];
// Sea backdrop: soft wave lines, drawn once as an inline SVG.
const WAVES = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='24'%3E%3Cpath d='M0 12 Q15 2 30 12 T60 12 T90 12 T120 12' fill='none' stroke='%231D4FB0' stroke-width='1' stroke-opacity='.35'/%3E%3C/svg%3E")`;

const INTRO_KEY = 'betteraklan:explore-intro-played';
/** The entrance plays once per browser session and never with reduced motion. */
function introWanted(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return false;
  try {
    return sessionStorage.getItem(INTRO_KEY) !== '1';
  } catch {
    return false;
  }
}
// Fade up 12px; the second element starts 60ms after the first.
const rise = (i: number) => ({
  animation: `explore-rise var(--dur-slow) var(--ease-out-expo) ${i * 60}ms both`,
});

export default function TourismExplore() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const town = params.get('town') ?? '';
  const layerParam = (params.get('layer') ?? 'all') as Layer;
  const layer: Layer = LAYERS.includes(layerParam) ? layerParam : 'all';
  const view = params.get('view') === 'list' ? 'list' : 'map';
  const sel = params.get('sel') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  // Replace (not push) so filter and view changes don't flood history.
  const update = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) =>
        v ? next.set(k, v) : next.delete(k)
      );
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const filters = {
    q,
    town,
    layer,
    from: from || undefined,
    to: to || undefined,
  };
  const filtered = useMemo(
    () =>
      filterRecords(ALL_RECORDS, {
        q,
        town,
        layer,
        from: from || undefined,
        to: to || undefined,
      }),
    [q, town, layer, from, to]
  );
  const selected = ALL_RECORDS.find(r => r.id === sel) ?? null;
  const selectedPin = useMemo<MapPin | null>(
    () =>
      selected && selected.lat != null && selected.lon != null
        ? {
            id: selected.id,
            name: selected.name,
            lat: selected.lat,
            lon: selected.lon,
            color: LAYER_COLOR[selected.layer],
            letter: LAYER_LETTER[selected.layer],
            approximate: selected.placement === 'approximate',
            label: `${LAYER_LABEL[selected.layer]} · ${PLACEMENT_LABEL[selected.placement]}`,
          }
        : null,
    [selected]
  );
  const townInfo = MUNICIPALITIES.find(m => m.slug === town) ?? null;
  const reason =
    filtered.length === 0 ? emptyReason(ALL_RECORDS, filters) : null;
  const mapped = filtered.filter(
    (r): r is Rec & { lat: number; lon: number } =>
      r.lat != null && r.lon != null
  );

  // Client-only map display toggles (the Layer filter above still drives the list).
  const [hiddenLayers, setHiddenLayers] = useState<Layer[]>([]);
  const [shade, setShade] = useState(true);
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    filtered.forEach(r => r.town && c.set(r.town, (c.get(r.town) ?? 0) + 1));
    return c;
  }, [filtered]);
  const maxCount = Math.max(1, ...counts.values());
  const shown = mapped.filter(r => !hiddenLayers.includes(r.layer));
  const shownKey = shown.map(r => r.id).join();
  const pins = useMemo<MapPin[]>(
    () =>
      shown.map(r => ({
        id: r.id,
        name: r.name,
        lat: r.lat,
        lon: r.lon,
        color: LAYER_COLOR[r.layer],
        letter: LAYER_LETTER[r.layer],
        approximate: r.placement === 'approximate',
        label: LAYER_LABEL[r.layer],
      })),
    // shownKey captures every change to the pin list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shownKey]
  );
  const townFill = useMemo(
    () =>
      new Map(
        [...counts].map(([slug, n]) => [
          slug,
          TIER_COLOR[shade && n ? Math.ceil((5 * n) / maxCount) : 0],
        ])
      ),
    [counts, shade, maxCount]
  );

  const [touring, setTouring] = useState(false);
  const [intro] = useState(introWanted);
  useEffect(() => {
    if (!intro) return;
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      // Storage blocked: the entrance may replay, which is harmless.
    }
  }, [intro]);
  const select = (id: string) => {
    setTouring(false);
    update({ sel: id });
  };

  // Guided tour: fly through each municipality in turn, then return to the overview.
  useEffect(() => {
    if (!touring) return;
    const id = setTimeout(() => {
      const next =
        MUNICIPALITIES[MUNICIPALITIES.findIndex(m => m.slug === town) + 1];
      if (next) update({ town: next.slug, sel: '' });
      else {
        update({ town: '', sel: '' });
        setTouring(false);
      }
    }, TOUR_STEP_MS);
    return () => clearTimeout(id);
  }, [touring, town, update]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  // The town card waits for the map to finish flying there (list view needs no wait).
  const [settledTown, setSettledTown] = useState<string | null>(null);
  useEffect(() => {
    if (!town || view !== 'map') return;
    // Fallback if the map never reports in (tiles down): show the card anyway.
    const id = window.setTimeout(() => setSettledTown(town), 2600);
    return () => window.clearTimeout(id);
  }, [town, view]);
  const cardReady = view === 'list' || settledTown === town;
  // On phones the map view shows details as a bottom sheet over the map.
  const sheet =
    view === 'map' && (selected !== null || (townInfo !== null && cardReady));

  // Long result lists push the details panel out of view on phones. After a
  // user picks a result below desktop width, bring the details into view and
  // move focus there so the change is noticed by touch and screen-reader users.
  const detailRef = useRef<HTMLElement>(null);
  const bs = useBottomSheet(sheet, `${sel}|${town}`, detailRef);
  // While the phone bottom sheet is up, keep focused elements from scrolling under it.
  useEffect(() => {
    if (!bs.visible) return;
    const root = document.documentElement;
    root.style.scrollPaddingBottom = `${bs.visible}px`;
    return () => {
      root.style.scrollPaddingBottom = '';
    };
  }, [bs.visible]);
  const prevSel = useRef(sel);
  useEffect(() => {
    if (
      sel &&
      sel !== prevSel.current &&
      window.matchMedia('(max-width: 1023px)').matches
    ) {
      detailRef.current?.focus({ preventScroll: true });
      if (view === 'list')
        detailRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
    }
    prevSel.current = sel;
  }, [sel, view]);

  // Render results in pages so a 600-row list stays usable on phones.
  // The selected row is always rendered, even when it sits past the page.
  const [pageSize, setPageSize] = useState(RESULTS_PAGE);
  useEffect(() => setPageSize(RESULTS_PAGE), [q, town, layer, from, to]);
  const selIndex = filtered.findIndex(r => r.id === sel);
  const visible = filtered.slice(0, Math.max(pageSize, selIndex + 1));

  return (
    <div
      className={`[&_:is(h1,h2,h3)]:text-balance [&_:is(a,button,input,select):focus-visible]:outline-2 [&_:is(a,button,input,select):focus-visible]:outline-offset-2 [&_:is(a,button,input,select):focus-visible]:outline-[#1D4FB0] space-y-6 ${intro ? '' : 'animate-in fade-in duration-(--dur-slow) ease-out-expo motion-reduce:animate-none'} ${bs.active ? '' : 'pb-8'}`}
      style={bs.active ? { paddingBottom: bs.visible + 16 } : undefined}
    >
      <header
        style={intro ? rise(0) : undefined}
        className='[&_button:focus-visible]:!outline-white relative overflow-hidden rounded-card bg-gradient-to-br from-[#0B3FAE] via-[#1556D6] to-[#2F7BEA] p-4 text-white shadow-elev-2 sm:p-8'
      >
        <div
          aria-hidden='true'
          className='absolute inset-0 opacity-25'
          style={{ backgroundImage: WAVES, backgroundSize: '160px 32px' }}
        />
        <div
          aria-hidden='true'
          className='absolute -top-16 -right-10 h-56 w-56 rounded-full bg-[#FCD116]/25 blur-3xl'
        />
        <div className='relative flex items-center justify-between gap-4 sm:items-end'>
          <div className='flex items-stretch gap-4'>
            <span
              aria-hidden='true'
              className='w-1.5 shrink-0 rounded-full bg-[#FCD116]'
            />
            <div>
              <p className='type-meta hidden font-bold tracking-[0.2em] text-white/70 uppercase sm:block'>
                BetterAklan Tourism
              </p>
              <h1 className='type-display text-white sm:mt-1'>Explore Aklan</h1>
              <p className='type-body mt-1 hidden max-w-xl text-white/85 sm:block'>
                Find places, festivals, and public visitor information across
                all 17 municipalities.
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={() => {
              const url = window.location.href;
              if (navigator.share)
                void navigator.share({ url }).catch(() => {});
              else void navigator.clipboard?.writeText(url);
            }}
            className='inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-control bg-white px-3 text-sm font-bold text-[#0B3FAE] shadow-elev-2 sm:px-5'
          >
            <Share2Icon aria-hidden='true' className='h-4 w-4' />
            <span className='sr-only sm:not-sr-only'>Share view</span>
          </button>
        </div>
      </header>

      {/* Controls card: search stays visible; the rest folds away on phones. */}
      <div
        style={intro ? rise(1) : undefined}
        className='bg-kapwa-bg-surface border-kapwa-border-weak flex flex-wrap items-end gap-3 rounded-card border p-3 shadow-elev-1 sm:p-4'
      >
        <label className='relative min-w-[200px] flex-1'>
          <span className='sr-only'>Search records</span>
          <SearchIcon
            aria-hidden='true'
            className='text-kapwa-text-disabled absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2'
          />
          <input
            type='search'
            value={q}
            onChange={e => update({ q: e.target.value, sel: '' })}
            placeholder='Search records'
            className='field-control w-full pl-9'
          />
        </label>
        <button
          type='button'
          aria-expanded={filtersOpen}
          aria-controls='explore-filters'
          onClick={() => setFiltersOpen(o => !o)}
          className='field-control inline-flex items-center gap-2 font-bold sm:hidden'
        >
          <SlidersHorizontalIcon aria-hidden='true' className='h-4 w-4' />
          Filters
        </button>
        <div
          id='explore-filters'
          className={`${filtersOpen ? 'flex' : 'hidden'} w-full flex-wrap items-end gap-3 sm:contents`}
        >
          <label className='text-kapwa-text-strong type-meta font-semibold'>
            Municipality
            <select
              value={town}
              onChange={e => {
                setTouring(false);
                update({ town: e.target.value, sel: '' });
              }}
              className='field-control mt-1 block font-normal'
            >
              <option value=''>All municipalities</option>
              {MUNICIPALITIES.map(m => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className='text-kapwa-text-strong type-meta font-semibold'>
            Layer
            <select
              value={layer}
              onChange={e => update({ layer: e.target.value, sel: '' })}
              className='field-control mt-1 block font-normal'
            >
              <option value='all'>All records</option>
              {(Object.keys(LAYER_LABEL) as Exclude<Layer, 'all'>[]).map(k => (
                <option key={k} value={k}>
                  {LAYER_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          {HAS_DATED && (layer === 'event' || layer === 'all') && (
            <fieldset className='type-meta flex flex-wrap gap-2 font-semibold'>
              <legend className='sr-only'>Festival date range</legend>
              <label>
                From
                <input
                  type='date'
                  value={from}
                  onChange={e => update({ from: e.target.value })}
                  className='field-control mt-1 block px-2 font-normal'
                />
              </label>
              <label>
                To
                <input
                  type='date'
                  value={to}
                  onChange={e => update({ to: e.target.value })}
                  className='field-control mt-1 block px-2 font-normal'
                />
              </label>
            </fieldset>
          )}
          {!HAS_DATED && layer === 'event' && (
            <p className='text-kapwa-text-support type-meta self-center'>
              No festival dates are recorded yet, so there is no date filter.
            </p>
          )}
        </div>
        <div
          role='group'
          aria-label='View'
          className='border-kapwa-border-weak flex overflow-hidden rounded-control border text-sm font-bold'
        >
          {(['map', 'list'] as const).map(v => (
            <button
              key={v}
              type='button'
              aria-pressed={view === v}
              onClick={() => update({ view: v })}
              className={`inline-flex min-h-11 items-center gap-2 px-4 capitalize ${view === v ? 'bg-kapwa-bg-brand-default text-kapwa-text-inverse' : 'bg-kapwa-bg-surface text-kapwa-text-strong'}`}
            >
              {v === 'map' ? (
                <MapIcon aria-hidden='true' className='h-4 w-4' />
              ) : (
                <ListIcon aria-hidden='true' className='h-4 w-4' />
              )}
              {v}
            </button>
          ))}
        </div>
      </div>

      {!reason &&
        (filters.from || filters.to) &&
        filtered.some(r => r.dateStatus === 'unavailable') && (
          <p className='text-kapwa-text-muted type-meta'>
            {filtered.filter(r => r.dateStatus === 'unavailable').length} kept
            with no recorded date; the rest fall in the range.
          </p>
        )}

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]'>
        <div className='min-w-0 space-y-4'>
          {view === 'map' ? (
            <Card className='overflow-hidden p-0' hover={false}>
              <div className='relative isolate h-[55vh] min-h-[320px] w-full sm:h-[62vh] sm:min-h-[360px] lg:h-[70vh] [&_.maplibregl-ctrl-group_button]:!h-11 [&_.maplibregl-ctrl-group_button]:!w-11'>
                <AklanMap3D
                  intro={intro}
                  boundaries={SOURCES.boundaries}
                  townFill={townFill}
                  townCount={counts}
                  town={town}
                  pins={pins}
                  selected={selectedPin}
                  onTown={slug => {
                    setTouring(false);
                    update({ town: slug, sel: '' });
                  }}
                  onPin={select}
                  onSettled={setSettledTown}
                  onBackground={() => {
                    setTouring(false);
                    if (town || sel) update({ town: '', sel: '' });
                  }}
                />

                {/* Layer widget: show or hide each pin type, and the municipality shading. */}
                <div
                  role='group'
                  aria-label='Map layers'
                  className='surface-glass absolute top-3 left-3 z-[500] flex max-w-[calc(100%-1.5rem)] gap-1.5 overflow-x-auto p-2 sm:flex-col'
                >
                  {(
                    Object.keys(LAYER_COLOR) as (keyof typeof LAYER_COLOR)[]
                  ).map(k => {
                    const on = !hiddenLayers.includes(k);
                    return (
                      <button
                        key={k}
                        type='button'
                        aria-pressed={on}
                        onClick={() =>
                          setHiddenLayers(h =>
                            on ? [...h, k] : h.filter(x => x !== k)
                          )
                        }
                        className={`flex min-h-11 flex-none items-center transition-colors duration-(--dur-fast) gap-2 rounded-control px-3 type-meta font-semibold ${on ? 'bg-kapwa-bg-brand-weak' : 'text-kapwa-text-support'}`}
                      >
                        <span
                          aria-hidden='true'
                          className='flex h-4 w-4 items-center justify-center rounded-full border-2 text-[9px] leading-none font-bold'
                          style={{
                            borderColor: LAYER_COLOR[k],
                            background: on ? LAYER_COLOR[k] : 'transparent',
                            color: on ? '#ffffff' : LAYER_COLOR[k],
                          }}
                        >
                          {LAYER_LETTER[k]}
                        </span>
                        {LAYER_LABEL[k]}
                      </button>
                    );
                  })}
                  <button
                    type='button'
                    aria-pressed={shade}
                    onClick={() => setShade(v => !v)}
                    className={`flex min-h-11 flex-none items-center transition-colors duration-(--dur-fast) gap-2 rounded-control px-3 type-meta font-semibold ${shade ? 'bg-kapwa-bg-brand-weak' : 'text-kapwa-text-support'}`}
                  >
                    Shade by records
                  </button>
                </div>

                {/* Cinematic overlays: tour control, caption, legend. */}
                <button
                  type='button'
                  aria-pressed={touring}
                  onClick={() => {
                    if (touring) setTouring(false);
                    else {
                      update({ town: MUNICIPALITIES[0].slug, sel: '' });
                      setTouring(true);
                    }
                  }}
                  className='bg-kapwa-bg-surface text-kapwa-text-strong absolute top-3 right-3 z-[500] inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold shadow-elev-2'
                >
                  {touring ? (
                    <SquareIcon aria-hidden='true' className='h-4 w-4' />
                  ) : (
                    <PlayIcon aria-hidden='true' className='h-4 w-4' />
                  )}
                  {touring ? 'Stop tour' : 'Tour Aklan'}
                </button>
                <div
                  key={selected?.id ?? town}
                  className='animate-in fade-in slide-in-from-bottom-2 pointer-events-none absolute bottom-4 left-3 z-[500] max-w-[70%] surface-glass px-4 py-2.5 duration-(--dur-slow) ease-out-expo motion-reduce:animate-none'
                >
                  <p className='text-kapwa-text-muted type-meta font-semibold tracking-wider uppercase'>
                    {selected
                      ? LAYER_LABEL[selected.layer]
                      : townInfo
                        ? `Municipality · ${filtered.length} results`
                        : 'Province'}
                  </p>
                  <p className='text-kapwa-text-strong type-display'>
                    {selected?.name ?? townInfo?.name ?? 'Aklan'}
                  </p>
                </div>
              </div>
              <div
                role='group'
                aria-label='Map legend'
                className='border-kapwa-border-weak text-kapwa-text-support type-meta flex flex-wrap items-center gap-x-5 gap-y-2 border-t px-4 py-3'
              >
                <span className='flex items-center gap-1.5'>
                  Fewer records
                  {TIER_COLOR.slice(1).map(c => (
                    <span
                      key={c}
                      aria-hidden='true'
                      className='h-2.5 w-5'
                      style={{ background: c }}
                    />
                  ))}
                  More
                </span>
                <span className='flex items-center gap-1.5'>
                  <span
                    aria-hidden='true'
                    className='h-3 w-3 rounded-full border-2 border-dashed border-[#2563eb] bg-[#2563eb]/30'
                  />
                  Approximate location
                </span>
                <span className='flex items-center gap-1.5'>
                  <span
                    aria-hidden='true'
                    className='h-3 w-5 rounded-sm border-2 border-[#1D4FB0] bg-[#D6E4FA]'
                  />
                  Selected municipality
                </span>
              </div>
            </Card>
          ) : null}

          {/* Results: always rendered so keyboard users can reach them in both views. */}
          <Card className='overflow-hidden rounded-card p-0' hover={false}>
            <h2
              aria-live='polite'
              className='text-kapwa-text-strong border-kapwa-border-weak type-title border-b px-4 pt-4 pb-3'
            >
              {filtered.length} record{filtered.length === 1 ? '' : 's'}
              {townInfo ? ` in ${townInfo.name}` : ' in Aklan'}
            </h2>
            {filtered.length === 0 ? (
              <p className='text-kapwa-text-support type-body p-6'>{reason}</p>
            ) : (
              <ul className='grid gap-3 p-3 sm:grid-cols-2 lg:max-h-[70vh] lg:overflow-y-auto'>
                {visible.map(r => (
                  <li key={r.id}>
                    <RecordCard
                      rec={r}
                      selected={sel === r.id}
                      onSelect={select}
                    />
                  </li>
                ))}
              </ul>
            )}
            {visible.length < filtered.length && (
              <div className='border-kapwa-border-weak border-t p-2'>
                <button
                  type='button'
                  onClick={() => setPageSize(s => s + RESULTS_PAGE)}
                  className='text-kapwa-text-brand hover:bg-kapwa-bg-hover min-h-11 w-full rounded-control text-sm font-bold'
                >
                  Show{' '}
                  {Math.min(RESULTS_PAGE, filtered.length - visible.length)}{' '}
                  more ({filtered.length - visible.length} left)
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Detail / quick view */}
        <aside
          ref={detailRef}
          tabIndex={-1}
          aria-label='Details'
          style={bs.sheetStyle}
          onFocus={bs.onFocus}
          className={`outline-none lg:sticky lg:top-4 lg:self-start ${bs.active ? 'bg-kapwa-bg-surface fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-card shadow-[0_-8px_24px_rgb(15_35_75/0.22)] transition-transform duration-(--dur-base) ease-out-expo motion-reduce:transition-none' : ''}`}
        >
          {bs.active && (
            <button
              type='button'
              {...bs.handleProps}
              className='flex h-11 w-full shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing'
            >
              <span
                aria-hidden='true'
                className='bg-kapwa-border-strong h-1.5 w-10 rounded-full'
              />
            </button>
          )}
          <div
            inert={bs.bodyInert}
            style={bs.bodyStyle}
            className={
              bs.active
                ? 'space-y-3 overflow-y-auto overscroll-contain px-3 pb-3'
                : 'space-y-4'
            }
          >
            {selected ? (
              <Card hover={false}>
                <CardContent className='space-y-3 p-5'>
                  <p className='text-kapwa-text-muted type-meta font-semibold tracking-wider uppercase'>
                    {LAYER_LABEL[selected.layer]}
                  </p>
                  <h2 className='text-kapwa-text-strong type-title'>
                    {selected.name}
                  </h2>
                  <p className='text-kapwa-text-support type-body'>
                    {selected.description}
                  </p>
                  <dl className='type-meta space-y-2'>
                    {selected.layer === 'event' && (
                      <div className='flex flex-wrap items-center gap-2'>
                        <dt className='font-semibold'>Date</dt>
                        <dd>
                          <DatePill rec={selected} />
                        </dd>
                      </div>
                    )}
                    <div className='flex flex-wrap items-center gap-2'>
                      <dt className='font-semibold'>Location</dt>
                      <dd className='flex flex-wrap items-center gap-2'>
                        <LocationPill placement={selected.placement} />
                        {selected.placementNote && (
                          <span className='text-kapwa-text-support'>
                            {selected.placementNote}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className='inline font-semibold'>Last checked: </dt>
                      <dd className='inline'>
                        {selected.dates?.lastCheckedAt ?? 'Not recorded'}
                      </dd>
                    </div>
                  </dl>
                  {selected.dates?.sourceUrl && (
                    <a
                      href={selected.dates.sourceUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='text-kapwa-text-brand type-meta inline-flex items-center gap-1 font-semibold hover:underline'
                    >
                      Source{' '}
                      <ExternalLinkIcon
                        aria-hidden='true'
                        className='h-3 w-3'
                      />
                    </a>
                  )}
                  <button
                    type='button'
                    onClick={() => update({ sel: '' })}
                    className='text-kapwa-text-support type-meta block underline'
                  >
                    Clear selection
                  </button>
                </CardContent>
              </Card>
            ) : null}

            {townInfo && cardReady && (
              <Card
                key={townInfo.slug}
                hover={false}
                className='rounded-card lg:motion-safe:animate-[explore-slide-in_var(--dur-base)_var(--ease-out-expo)_both]'
              >
                <CardContent className='space-y-4 p-5'>
                  <div>
                    <h2 className='text-kapwa-text-strong type-display'>
                      {townInfo.name}
                    </h2>
                    <p className='text-kapwa-text-support type-meta font-semibold'>
                      Municipality overview
                    </p>
                  </div>
                  <ul className='divide-kapwa-border-weak border-kapwa-border-weak divide-y border-y'>
                    {(['place', 'event', 'stay', 'product'] as const).map(k => {
                      const n = ALL_RECORDS.filter(
                        r => r.town === townInfo.slug && r.layer === k
                      ).length;
                      const Icon = LAYER_ICON[k];
                      return (
                        <li key={k}>
                          <button
                            type='button'
                            disabled={!n}
                            aria-pressed={layer === k}
                            onClick={() => update({ layer: k, sel: '' })}
                            className={`flex min-h-12 w-full items-center transition-colors duration-(--dur-fast) justify-between gap-3 rounded-control px-2 py-3 text-left enabled:hover:bg-kapwa-bg-hover disabled:cursor-default ${layer === k ? 'bg-kapwa-bg-brand-weak' : ''}`}
                          >
                            <span className='text-kapwa-text-strong flex items-center gap-3 font-bold'>
                              <Icon
                                aria-hidden='true'
                                className='text-kapwa-text-support h-6 w-6'
                              />
                              {LAYER_LABEL[k]}
                            </span>
                            <span className='text-kapwa-text-support type-meta'>
                              {n
                                ? `${n} record${n === 1 ? '' : 's'}`
                                : 'No records yet'}
                              {n ? (
                                <ArrowRightIcon
                                  aria-hidden='true'
                                  className='text-kapwa-text-brand ml-2 inline h-4 w-4'
                                />
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div>
                    <h3 className='text-kapwa-text-strong type-title'>
                      Notices
                    </h3>
                    {advisoriesFor(townInfo.slug).length ? (
                      <ul className='type-body mt-2 space-y-2'>
                        {advisoriesFor(townInfo.slug).map(a => (
                          <li key={a.id}>
                            <strong>{a.title}</strong> · {a.issuer} · published{' '}
                            {a.publishedAt}
                            {a.endsAt ? ` · until ${a.endsAt}` : ''}
                            <a
                              href={a.sourceUrl}
                              target='_blank'
                              rel='noreferrer'
                              className='text-kapwa-text-brand type-meta block hover:underline'
                            >
                              Source
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className='text-kapwa-text-support type-body mt-2'>
                        No verified notices published.
                      </p>
                    )}
                  </div>
                  <Link
                    to={`/tourism/${townInfo.slug}`}
                    className='text-kapwa-text-brand type-body inline-flex items-center gap-2 font-bold hover:underline'
                  >
                    View municipality page
                    <ArrowRightIcon aria-hidden='true' className='h-4 w-4' />
                  </Link>
                </CardContent>
              </Card>
            )}

            {!selected && !townInfo && (
              <p className='text-kapwa-text-support type-body'>
                Select a result on the map or in the list to see its details,
                source, and location precision.
              </p>
            )}
          </div>
        </aside>
      </div>

      <section
        aria-labelledby='sources-heading'
        className='bg-kapwa-bg-surface border-kapwa-border-weak space-y-5 rounded-card border p-5 shadow-elev-1 sm:p-6'
      >
        <div className='bg-kapwa-bg-brand-weak text-kapwa-text-strong type-body flex gap-3 rounded-panel p-4'>
          <InfoIcon
            aria-hidden='true'
            className='text-kapwa-text-brand mt-0.5 h-5 w-5 shrink-0'
          />
          <p>
            <strong>Listings only.</strong> BetterAklan shows published records.
            It does not take bookings or payments, and it does not guess dates.
            Check with the venue or organiser before you travel.
          </p>
        </div>
        <h2 id='sources-heading' className='text-kapwa-text-strong type-title'>
          Information and sources
        </h2>
        <div className='grid gap-4 md:grid-cols-3'>
          <div className='border-kapwa-border-weak space-y-2 rounded-panel border p-4'>
            <h3 className='text-kapwa-text-strong type-meta font-bold tracking-wide uppercase'>
              Where records come from
            </h3>
            <ul className='text-kapwa-text-support type-body space-y-3'>
              <li>
                Places, festivals and products:{' '}
                <a
                  href='https://aklan.gov.ph/tourism/'
                  target='_blank'
                  rel='noreferrer'
                  className='text-kapwa-text-brand hover:underline'
                >
                  Aklan Provincial Government Tourism pages
                </a>
              </li>
              <li>
                Accommodation:{' '}
                <a
                  href='https://aklan.gov.ph/tourism/accommodation/'
                  target='_blank'
                  rel='noreferrer'
                  className='text-kapwa-text-brand hover:underline'
                >
                  Provincial Government of Aklan
                </a>
              </li>
              <li>Municipality boundaries: BetterAklan boundary file</li>
            </ul>
          </div>
          <div className='border-kapwa-border-weak space-y-2 rounded-panel border p-4'>
            <h3 className='text-kapwa-text-strong type-meta font-bold tracking-wide uppercase'>
              Location precision
            </h3>
            <ul className='text-kapwa-text-support type-body space-y-3'>
              <li className='flex flex-col items-start gap-1'>
                <LocationPill placement='exact' />
                Pinned at the published address.
              </li>
              <li className='flex flex-col items-start gap-1'>
                <LocationPill placement='approximate' />
                Placed by area or municipality; not exact.
              </li>
              <li className='flex flex-col items-start gap-1'>
                <LocationPill placement='none' />
                Listed, but not on the map.
              </li>
            </ul>
          </div>
          <div className='border-kapwa-border-weak space-y-2 rounded-panel border p-4'>
            <h3 className='text-kapwa-text-strong type-meta font-bold tracking-wide uppercase'>
              Dates and notices
            </h3>
            <ul className='text-kapwa-text-support type-body space-y-3'>
              <li className='flex flex-col items-start gap-1'>
                <Pill tone='ok' icon={CalendarCheckIcon}>
                  Confirmed date
                </Pill>
                Date from a cited source.
              </li>
              <li className='flex flex-col items-start gap-1'>
                <Pill tone='warn' icon={CalendarClockIcon}>
                  Tentative · date
                </Pill>
                Source says the date may change.
              </li>
              <li className='flex flex-col items-start gap-1'>
                <Pill tone='none' icon={CalendarX2Icon}>
                  {DATE_STATUS_LABEL.unavailable}
                </Pill>
                No source date. Never estimated.
              </li>
              <li>
                Notices appear only when verified, with issuer and source.
              </li>
            </ul>
          </div>
        </div>
        <p className='text-kapwa-text-muted type-meta'>
          Last checked: Not recorded. Map data &copy; OpenStreetMap
          contributors. Accommodation locations are geocoded from published
          addresses and may not be exact.
        </p>
      </section>
    </div>
  );
}
