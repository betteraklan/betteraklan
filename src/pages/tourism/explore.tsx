import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import type { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PlayIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SquareIcon,
} from 'lucide-react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import { Badge } from '@/components/ui/Badge';
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
import { boundsOf, type BoundaryFeature } from '@/lib/tourism/geo';

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

const PLACEMENT_LABEL: Record<Rec['placement'], string> = {
  exact: 'Exact location',
  approximate: 'Approximate pin',
  none: 'Location unavailable',
};

const HOME: [number, number] = [11.75, 122.2];
const HOME_ZOOM = 10;
const TOUR_STEP_MS = 5000;
const TOWN_FEATURES = new Map(
  SOURCES.boundaries.map(f => [
    f.properties.slug,
    { type: 'Feature', properties: {}, geometry: f.geometry },
  ])
);
const TOWN_BOUNDS = new Map(
  SOURCES.boundaries.map(f => [f.properties.slug, boundsOf(f)])
);

// Pin colours per layer. Approximate pins are drawn hollow with a dashed ring.
const LAYER_COLOR: Record<Exclude<Layer, 'all'>, string> = {
  place: '#0d9488',
  event: '#d97706',
  stay: '#2563eb',
  product: '#7c3aed',
};

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Cinematic camera: slow intro, then fly to the selected record or town. */
function Camera({
  lat,
  lon,
  town,
}: {
  lat?: number;
  lon?: number;
  town: string;
}) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    const animate = !reducedMotion();
    const bounds = TOWN_BOUNDS.get(town);
    const isFirst = first.current;
    first.current = false;
    if (lat != null && lon != null) {
      map.flyTo([lat, lon], 15, { animate, duration: 1.4 });
    } else if (bounds) {
      map.flyToBounds(bounds, { padding: [24, 24], animate, duration: 1.6 });
    } else if (isFirst) {
      if (animate) map.flyTo(HOME, HOME_ZOOM, { duration: 2.5 });
    } else {
      map.flyTo(HOME, HOME_ZOOM, { animate, duration: 1.2 });
    }
  }, [lat, lon, town, map]);
  return null;
}

const pulseIcon = L.divIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  html: '<span class="relative flex h-7 w-7"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70 motion-reduce:animate-none"></span><span class="relative m-2 inline-flex h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white"></span></span>',
});

function PlacementBadge({ rec }: { rec: Rec }) {
  const variant =
    rec.placement === 'exact'
      ? 'success'
      : rec.placement === 'approximate'
        ? 'warning'
        : 'slate';
  return (
    <Badge variant={variant}>
      {PLACEMENT_LABEL[rec.placement]}
      {rec.placementNote ? ` · ${rec.placementNote}` : ''}
    </Badge>
  );
}

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
  const townInfo = MUNICIPALITIES.find(m => m.slug === town) ?? null;
  const reason =
    filtered.length === 0 ? emptyReason(ALL_RECORDS, filters) : null;
  const mapped = filtered.filter(
    (r): r is Rec & { lat: number; lon: number } =>
      r.lat != null && r.lon != null
  );

  const [touring, setTouring] = useState(false);
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
  const [sheetOpen, setSheetOpen] = useState(true);
  useEffect(() => setSheetOpen(true), [sel, town]);
  // On phones the map view shows details as a bottom sheet over the map.
  const sheet = view === 'map' && (selected !== null || townInfo !== null);

  // Long result lists push the details panel out of view on phones. After a
  // user picks a result below desktop width, bring the details into view and
  // move focus there so the change is noticed by touch and screen-reader users.
  const detailRef = useRef<HTMLElement>(null);
  const prevSel = useRef(sel);
  useEffect(() => {
    if (
      sel &&
      sel !== prevSel.current &&
      view === 'list' &&
      window.matchMedia('(max-width: 1023px)').matches
    ) {
      detailRef.current?.focus({ preventScroll: true });
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      className={`animate-in fade-in space-y-6 duration-500 motion-reduce:animate-none ${sheet && sheetOpen ? 'max-lg:pb-[55vh]' : 'pb-8'}`}
    >
      <header className='bg-kapwa-bg-surface border-kapwa-border-weak rounded-xl border p-6 shadow-sm'>
        <div className='flex items-center gap-3'>
          <MapPinIcon
            aria-hidden='true'
            className='text-kapwa-text-brand h-5 w-5'
          />
          <h1 className='kapwa-heading-lg text-kapwa-text-strong'>
            Explore Aklan
          </h1>
        </div>
        <p className='text-kapwa-text-support mt-2 text-sm'>
          Places, festivals, accommodation listings, and local products from
          BetterAklan&apos;s records. Approximate pins show area or municipality
          locations, not exact ones.
        </p>
      </header>

      {/* Controls: search stays visible; the rest folds away on phones. */}
      <div className='flex flex-wrap items-end gap-3'>
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
            className='border-kapwa-border-weak bg-kapwa-bg-surface w-full rounded-md border py-2 pr-3 pl-9 text-sm'
          />
        </label>
        <button
          type='button'
          aria-expanded={filtersOpen}
          aria-controls='explore-filters'
          onClick={() => setFiltersOpen(o => !o)}
          className='border-kapwa-border-weak bg-kapwa-bg-surface text-kapwa-text-strong inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold sm:hidden'
        >
          <SlidersHorizontalIcon aria-hidden='true' className='h-4 w-4' />
          Filters
        </button>
        <div
          id='explore-filters'
          className={`${filtersOpen ? 'flex' : 'hidden'} w-full flex-wrap items-end gap-3 sm:contents`}
        >
          <label className='text-kapwa-text-strong text-xs font-bold'>
            Municipality
            <select
              value={town}
              onChange={e => {
                setTouring(false);
                update({ town: e.target.value, sel: '' });
              }}
              className='border-kapwa-border-weak bg-kapwa-bg-surface mt-1 block rounded-md border px-3 py-2 text-sm font-normal'
            >
              <option value=''>All municipalities</option>
              {MUNICIPALITIES.map(m => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className='text-kapwa-text-strong text-xs font-bold'>
            Layer
            <select
              value={layer}
              onChange={e => update({ layer: e.target.value, sel: '' })}
              className='border-kapwa-border-weak bg-kapwa-bg-surface mt-1 block rounded-md border px-3 py-2 text-sm font-normal'
            >
              <option value='all'>All records</option>
              {(Object.keys(LAYER_LABEL) as Exclude<Layer, 'all'>[]).map(k => (
                <option key={k} value={k}>
                  {LAYER_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          {(layer === 'event' || layer === 'all') && (
            <fieldset className='flex flex-wrap gap-2 text-xs font-bold'>
              <legend className='sr-only'>Festival date range</legend>
              <label>
                From
                <input
                  type='date'
                  value={from}
                  onChange={e => update({ from: e.target.value })}
                  className='border-kapwa-border-weak bg-kapwa-bg-surface mt-1 block rounded-md border px-2 py-1.5 text-sm font-normal'
                />
              </label>
              <label>
                To
                <input
                  type='date'
                  value={to}
                  onChange={e => update({ to: e.target.value })}
                  className='border-kapwa-border-weak bg-kapwa-bg-surface mt-1 block rounded-md border px-2 py-1.5 text-sm font-normal'
                />
              </label>
            </fieldset>
          )}
        </div>
        <div
          role='group'
          aria-label='View'
          className='flex overflow-hidden rounded-md border text-sm font-bold'
        >
          {(['map', 'list'] as const).map(v => (
            <button
              key={v}
              type='button'
              aria-pressed={view === v}
              onClick={() => update({ view: v })}
              className={`px-4 py-2 capitalize ${view === v ? 'bg-kapwa-bg-brand-default text-kapwa-text-inverse' : 'bg-kapwa-bg-surface text-kapwa-text-strong'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <p aria-live='polite' className='text-kapwa-text-muted text-xs'>
        {filtered.length} result{filtered.length === 1 ? '' : 's'}
        {reason ? ` · ${reason}` : ''}
        {!reason &&
        (filters.from || filters.to) &&
        filtered.some(r => r.dateStatus === 'unavailable')
          ? ` · ${filtered.filter(r => r.dateStatus === 'unavailable').length} kept with no recorded date; the rest fall in the range.`
          : ''}
      </p>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]'>
        <div className='min-w-0 space-y-4'>
          {view === 'map' ? (
            <Card className='overflow-hidden p-0' hover={false}>
              <div className='relative isolate h-[62vh] min-h-[360px] w-full lg:h-[70vh]'>
                <MapContainer
                  center={HOME}
                  zoom={HOME_ZOOM - 1}
                  scrollWheelZoom
                  preferCanvas
                  className='h-full w-full'
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                  />
                  {town && TOWN_FEATURES.has(town) && (
                    <GeoJSON
                      key={town}
                      data={TOWN_FEATURES.get(town) as unknown as GeoJsonObject}
                      style={{
                        color: '#d97706',
                        weight: 2,
                        dashArray: '6 4',
                        fillColor: '#f59e0b',
                        fillOpacity: 0.12,
                      }}
                      interactive={false}
                    />
                  )}
                  {mapped.map(r => {
                    const color = LAYER_COLOR[r.layer];
                    const approx = r.placement === 'approximate';
                    return (
                      <CircleMarker
                        key={r.id}
                        center={[r.lat, r.lon]}
                        radius={sel === r.id ? 9 : 6}
                        pathOptions={{
                          color: approx ? color : '#ffffff',
                          weight: approx ? 2 : 1.5,
                          dashArray: approx ? '3 3' : undefined,
                          fillColor: color,
                          fillOpacity: approx ? 0.3 : 0.9,
                        }}
                        eventHandlers={{ click: () => select(r.id) }}
                      >
                        <Tooltip direction='top'>
                          {r.name}
                          {approx ? ' (approximate)' : ''}
                        </Tooltip>
                      </CircleMarker>
                    );
                  })}
                  {selected && selected.lat != null && selected.lon != null && (
                    <Marker
                      position={[selected.lat, selected.lon]}
                      icon={pulseIcon}
                      interactive={false}
                    />
                  )}
                  <Camera
                    lat={selected?.lat ?? undefined}
                    lon={selected?.lon ?? undefined}
                    town={town}
                  />
                </MapContainer>

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
                  className='bg-kapwa-bg-surface text-kapwa-text-strong absolute top-3 right-3 z-[500] inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-lg'
                >
                  {touring ? (
                    <SquareIcon aria-hidden='true' className='h-4 w-4' />
                  ) : (
                    <PlayIcon aria-hidden='true' className='h-4 w-4' />
                  )}
                  {touring ? 'Stop tour' : 'Tour Aklan'}
                </button>
                <div className='pointer-events-none absolute inset-x-0 bottom-0 z-[500] flex flex-col justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 pt-20 text-white sm:flex-row sm:items-end'>
                  <div
                    key={selected?.id ?? town}
                    className='animate-in fade-in slide-in-from-bottom-2 duration-700 motion-reduce:animate-none'
                  >
                    <p className='text-xs font-bold tracking-widest uppercase opacity-80'>
                      {selected
                        ? LAYER_LABEL[selected.layer]
                        : townInfo
                          ? `Municipality · ${filtered.length} results`
                          : 'Province'}
                    </p>
                    <p className='text-2xl font-bold sm:text-3xl'>
                      {selected?.name ?? townInfo?.name ?? 'Aklan'}
                    </p>
                  </div>
                  <ul
                    aria-label='Map legend'
                    className='flex flex-wrap gap-x-3 gap-y-1 text-[11px]'
                  >
                    {(
                      Object.keys(LAYER_COLOR) as (keyof typeof LAYER_COLOR)[]
                    ).map(k => (
                      <li key={k} className='flex items-center gap-1'>
                        <span
                          aria-hidden='true'
                          className='h-2.5 w-2.5 rounded-full border border-white'
                          style={{ background: LAYER_COLOR[k] }}
                        />
                        {LAYER_LABEL[k]}
                      </li>
                    ))}
                    <li className='flex items-center gap-1'>
                      <span
                        aria-hidden='true'
                        className='h-2.5 w-2.5 rounded-full border border-dashed border-white'
                      />
                      Faded dashed = approximate
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          ) : null}

          {/* Results: always rendered so keyboard users can reach them in both views. */}
          <Card className='overflow-hidden p-0' hover={false}>
            {filtered.length === 0 ? (
              <p className='text-kapwa-text-support p-6 text-sm'>{reason}</p>
            ) : (
              <ul className='divide-kapwa-border-weak divide-y lg:max-h-[60vh] lg:overflow-y-auto'>
                {visible.map(r => (
                  <li key={r.id}>
                    <button
                      type='button'
                      aria-pressed={sel === r.id}
                      onClick={() => select(r.id)}
                      className={`focus-visible:ring-kapwa-border-brand w-full space-y-1 p-4 text-left focus-visible:ring-2 ${sel === r.id ? 'bg-kapwa-bg-brand-weak' : ''}`}
                    >
                      <span className='text-kapwa-text-strong block text-sm font-bold'>
                        {r.name}
                      </span>
                      <span className='text-kapwa-text-support block text-xs'>
                        {LAYER_LABEL[r.layer]}
                        {r.townName ? ` · ${r.townName}` : ''}
                      </span>
                      <span className='flex flex-wrap gap-1.5 pt-1'>
                        <PlacementBadge rec={r} />
                        {r.layer === 'event' && (
                          <Badge
                            variant={
                              r.dateStatus === 'confirmed'
                                ? 'success'
                                : r.dateStatus === 'tentative'
                                  ? 'warning'
                                  : 'slate'
                            }
                          >
                            {DATE_STATUS_LABEL[r.dateStatus]}
                          </Badge>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {visible.length < filtered.length && (
              <div className='border-kapwa-border-weak border-t p-3 text-center'>
                <button
                  type='button'
                  onClick={() => setPageSize(s => s + RESULTS_PAGE)}
                  className='text-kapwa-text-brand text-sm font-bold hover:underline'
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
          className={`space-y-4 outline-none lg:sticky lg:top-4 lg:self-start ${sheet ? 'max-lg:bg-kapwa-bg-surface max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:space-y-3 max-lg:overflow-y-auto max-lg:rounded-t-2xl max-lg:p-3 max-lg:shadow-[0_-8px_24px_rgba(0,0,0,0.2)] ' + (sheetOpen ? 'max-lg:max-h-[52vh]' : 'max-lg:max-h-14 max-lg:overflow-hidden') : ''}`}
        >
          {sheet && (
            <button
              type='button'
              aria-expanded={sheetOpen}
              onClick={() => setSheetOpen(o => !o)}
              className='text-kapwa-text-support flex w-full items-center justify-center gap-2 py-1 text-xs font-bold lg:hidden'
            >
              {sheetOpen ? (
                <ChevronDownIcon aria-hidden='true' className='h-4 w-4' />
              ) : (
                <ChevronUpIcon aria-hidden='true' className='h-4 w-4' />
              )}
              {sheetOpen ? 'Hide details' : 'Show details'}
            </button>
          )}
          {selected ? (
            <Card hover={false}>
              <CardContent className='space-y-3 p-5'>
                <p className='text-kapwa-text-muted text-xs font-bold uppercase'>
                  {LAYER_LABEL[selected.layer]}
                </p>
                <h2 className='text-kapwa-text-strong text-lg font-bold'>
                  {selected.name}
                </h2>
                <p className='text-kapwa-text-support text-sm'>
                  {selected.description}
                </p>
                <dl className='space-y-1 text-xs'>
                  <div>
                    <dt className='inline font-bold'>Location: </dt>
                    <dd className='inline'>
                      <PlacementBadge rec={selected} />
                    </dd>
                  </div>
                  {selected.layer === 'event' && (
                    <div>
                      <dt className='inline font-bold'>Date: </dt>
                      <dd className='inline'>
                        {DATE_STATUS_LABEL[selected.dateStatus]}
                        {selected.dates?.start
                          ? ` · ${selected.dates.start}${selected.dates.end ? ` to ${selected.dates.end}` : ''}`
                          : ''}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className='inline font-bold'>Last checked: </dt>
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
                    className='text-kapwa-text-brand inline-flex items-center gap-1 text-xs font-bold hover:underline'
                  >
                    Source{' '}
                    <ExternalLinkIcon aria-hidden='true' className='h-3 w-3' />
                  </a>
                )}
                <button
                  type='button'
                  onClick={() => update({ sel: '' })}
                  className='text-kapwa-text-support block text-xs underline'
                >
                  Clear selection
                </button>
              </CardContent>
            </Card>
          ) : null}

          {townInfo && (
            <Card hover={false}>
              <CardContent className='space-y-3 p-5'>
                <h2 className='text-kapwa-text-strong text-lg font-bold'>
                  {townInfo.name}
                </h2>
                {(['place', 'event', 'product', 'stay'] as const).map(k => {
                  const n = ALL_RECORDS.filter(
                    r => r.town === townInfo.slug && r.layer === k
                  ).length;
                  return (
                    <p key={k} className='text-kapwa-text-support text-sm'>
                      <span className='font-bold'>{LAYER_LABEL[k]}: </span>
                      {n
                        ? `${n} record${n === 1 ? '' : 's'}`
                        : 'BetterAklan has no records for this category yet.'}
                    </p>
                  );
                })}
                <h3 className='text-kapwa-text-strong pt-2 text-sm font-bold'>
                  Notices
                </h3>
                {advisoriesFor(townInfo.slug).length ? (
                  <ul className='space-y-2 text-sm'>
                    {advisoriesFor(townInfo.slug).map(a => (
                      <li key={a.id}>
                        <strong>{a.title}</strong> · {a.issuer} · published{' '}
                        {a.publishedAt}
                        {a.endsAt ? ` · until ${a.endsAt}` : ''}
                        <a
                          href={a.sourceUrl}
                          target='_blank'
                          rel='noreferrer'
                          className='text-kapwa-text-brand block text-xs hover:underline'
                        >
                          Source
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='text-kapwa-text-support text-sm'>
                    No verified notices are published for this municipality yet.
                  </p>
                )}
                <Link
                  to={`/tourism/${townInfo.slug}`}
                  className='text-kapwa-text-brand block text-sm font-bold hover:underline'
                >
                  Full municipality page
                </Link>
              </CardContent>
            </Card>
          )}

          {!selected && !townInfo && (
            <p className='text-kapwa-text-support text-sm'>
              Select a result on the map or in the list to see its details,
              source, and location precision.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
