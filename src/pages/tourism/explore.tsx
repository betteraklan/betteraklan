import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ExternalLinkIcon, MapPinIcon, SearchIcon } from 'lucide-react';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import {
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
import type { BoundaryFeature } from '@/lib/tourism/geo';

import accommodationsData from '@/data/tourism/accommodations.json';
import boundaryData from '@/data/geo/municipalities-boundaries.json';
import centroidData from '@/data/geo/municipality-centroids.json';
import municipalitiesData from '@/data/tourism/municipalities.json';
import resortsData from '@/data/tourism/resorts.json';
import type { Accommodation, MunicipalityTourism } from '@/types/tourism';

// Same default marker fix as the accommodations map.
L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

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

const PLACEMENT_LABEL: Record<Rec['placement'], string> = {
  exact: 'Exact location',
  approximate: 'Approximate pin',
  none: 'Location unavailable',
};

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 15, { duration: 0.8 });
  }, [target, map]);
  return null;
}

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
  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) =>
      v ? next.set(k, v) : next.delete(k)
    );
    setParams(next, { replace: true });
  };

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
  const flyTarget: [number, number] | null =
    selected && selected.lat != null && selected.lon != null
      ? [selected.lat, selected.lon]
      : null;

  const select = (id: string) => update({ sel: id });

  return (
    <div className='animate-in fade-in space-y-6 pb-8 duration-500'>
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

      {/* Controls */}
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
            placeholder='Search by name or description'
            className='border-kapwa-border-weak bg-kapwa-bg-surface w-full rounded-md border py-2 pr-3 pl-9 text-sm'
          />
        </label>
        <label className='text-kapwa-text-strong text-xs font-bold'>
          Municipality
          <select
            value={town}
            onChange={e => update({ town: e.target.value, sel: '' })}
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
              <div className='h-[55vh] min-h-[320px] w-full'>
                <MapContainer
                  center={[11.75, 122.2]}
                  zoom={10}
                  scrollWheelZoom
                  className='h-full w-full'
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                  />
                  {mapped.map(r => (
                    <Marker
                      key={r.id}
                      position={[r.lat, r.lon]}
                      opacity={r.placement === 'approximate' ? 0.6 : 1}
                      eventHandlers={{ click: () => select(r.id) }}
                    >
                      <Tooltip direction='top' offset={[0, -35]}>
                        {r.name}
                        {r.placement === 'approximate' ? ' (approximate)' : ''}
                      </Tooltip>
                    </Marker>
                  ))}
                  <FlyTo target={flyTarget} />
                </MapContainer>
              </div>
            </Card>
          ) : null}

          {/* Results: always rendered so keyboard users can reach them in both views. */}
          <Card className='overflow-hidden p-0' hover={false}>
            {filtered.length === 0 ? (
              <p className='text-kapwa-text-support p-6 text-sm'>{reason}</p>
            ) : (
              <ul className='divide-kapwa-border-weak max-h-[60vh] divide-y overflow-y-auto'>
                {filtered.map(r => (
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
          </Card>
        </div>

        {/* Detail / quick view */}
        <aside aria-label='Details' className='space-y-4'>
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
