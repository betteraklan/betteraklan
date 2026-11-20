import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { BookmarkIcon, MapPinIcon, SearchIcon, XIcon } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbHome,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/navigation/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { PaginationControls } from '@/components/ui/Pagination';

import {
  boundsOfPoints,
  deriveStation,
  deriveType,
  facetCounts,
  groupStays,
  hasFilters,
  matchesStay,
  NO_FILTERS,
  type Station,
  type StayFilters,
  type StayType,
  TYPE_LABEL,
} from '@/lib/tourism/accommodations';
import { MAX_STOPS, serializeTrip } from '@/lib/tourism/trip';
import { useSavedTrip } from '@/lib/tourism/tripStore';

import accommodationsData from '@/data/tourism/accommodations.json';
import { Accommodation } from '@/types/tourism';

import SaveToTripButton from '../components/SaveToTripButton';
import StayMap from '../components/StayMap';
import { KNOWN_IDS } from '../components/tourismData';

type Area = 'mainland' | 'boracay';

const AREA_LABELS: Record<Area, string> = {
  mainland: 'Aklan Mainland',
  boracay: 'Boracay',
};
const CHIP =
  'type-meta inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 font-semibold transition-colors duration-(--dur-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kapwa-border-brand';
const CHIP_ON =
  'bg-kapwa-bg-brand-default border-kapwa-border-brand text-kapwa-text-inverse';
const CHIP_OFF =
  'bg-kapwa-bg-surface border-kapwa-border-weak text-kapwa-text-strong hover:border-kapwa-border-brand';

/** A row of toggle chips for one facet. Click the active chip to clear it. */
function ChipGroup<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V | '';
  options: { value: V; label: string; count: number }[];
  onChange: (v: V | '') => void;
}) {
  const labelId = `chips-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className='space-y-2'>
      <p
        id={labelId}
        className='text-kapwa-text-support type-meta font-semibold'
      >
        {label}
      </p>
      <div
        role='group'
        aria-labelledby={labelId}
        className='flex flex-wrap gap-2'
      >
        {options.map(o => {
          const on = value === o.value;
          // A chip with nothing behind it is hidden, unless it is the chosen one.
          if (!on && o.count === 0) return null;
          return (
            <button
              key={o.value}
              type='button'
              aria-pressed={on}
              onClick={() => onChange(on ? '' : o.value)}
              className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
            >
              {o.label}
              <span className={on ? '' : 'text-kapwa-text-support'}>
                {o.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Stays that have a map position. */
const located = <T extends { lat: number | null; lon: number | null }>(
  list: T[]
) =>
  list.filter(
    (a): a is T & { lat: number; lon: number } => a.lat != null && a.lon != null
  );

export default function AccommodationsPage() {
  const { area: areaParam } = useParams<{ area: string }>();
  const [search, setSearch] = useState('');
  const [municipalityFilter, setMunicipalityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<StayFilters['type']>('');
  const [stationFilter, setStationFilter] =
    useState<StayFilters['station']>('');
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const mapBox = useRef<HTMLDivElement>(null);
  const trip = useSavedTrip(KNOWN_IDS);
  const [tripNote, setTripNote] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const isValidArea = areaParam === 'mainland' || areaParam === 'boracay';
  const area = (isValidArea ? areaParam : 'mainland') as Area;

  // Each stay keeps its Explore record id (stay-<index in the JSON>), which
  // is what My trip stores.
  const all = useMemo(
    () =>
      (accommodationsData as Accommodation[])
        .map((a, i) => ({ ...a, id: `stay-${i}` }))
        .filter(a => a.area === area),
    [area]
  );

  const municipalities = useMemo(() => {
    if (area !== 'mainland') return [];
    const set = new Set<string>();
    all.forEach(a => a.municipality && set.add(a.municipality));
    return [...set].sort();
  }, [all, area]);

  const filters: StayFilters = useMemo(
    () => ({
      search,
      municipality: municipalityFilter,
      type: typeFilter,
      station: area === 'boracay' ? stationFilter : '',
    }),
    [search, municipalityFilter, typeFilter, stationFilter, area]
  );
  const filtered = useMemo(
    () => all.filter(a => matchesStay(a, filters)),
    [all, filters]
  );
  const facets = useMemo(() => facetCounts(all, filters), [all, filters]);
  const clearFilters = () => {
    setSearch(NO_FILTERS.search);
    setMunicipalityFilter(NO_FILTERS.municipality);
    setTypeFilter(NO_FILTERS.type);
    setStationFilter(NO_FILTERS.station);
  };

  // Changing area starts fresh: a Kalibo filter means nothing in Boracay.
  useEffect(() => {
    setSearch('');
    setMunicipalityFilter('');
    setTypeFilter('');
    setStationFilter('');
  }, [area]);

  // Reset to page 1 whenever the visible result set changes shape, so a
  // filter/search doesn't strand the user on a now-empty page.
  useEffect(() => {
    setPage(1);
  }, [search, municipalityFilter, typeFilter, stationFilter, area]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pagedFiltered = useMemo(
    () => filtered.slice((page - 1) * perPage, page * perPage),
    [filtered, page, perPage]
  );

  const groups = useMemo(() => groupStays(located(filtered)), [filtered]);
  // Boracay opens on the island; the mainland on the whole province.
  const view = useMemo(
    () => (area === 'boracay' ? boundsOfPoints(located(all)) : null),
    [all, area]
  );
  const showOnMap = (stayId: string) => {
    const g = groups.find(x => x.items.some(p => p.id === stayId));
    if (!g) return;
    setSelectedPin(g.id);
    mapBox.current?.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };
  const toggleSave = (stayId: string) => {
    const name = all.find(a => a.id === stayId)?.name ?? '';
    const result = trip.toggle(stayId);
    setTripNote(
      result === 'full'
        ? `Your trip is full (${MAX_STOPS} stops). Remove one to add more.`
        : result === 'added'
          ? `Added ${name} to My trip.`
          : `Removed ${name} from My trip.`
    );
  };

  if (!isValidArea) {
    return <Navigate to='/tourism/accommodations/mainland' replace />;
  }

  return (
    <div className='animate-in fade-in space-y-6 pb-8 duration-(--dur-slow) ease-out-expo'>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbHome href='/' />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href='/tourism'>Tourism</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{AREA_LABELS[area]} Accommodations</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className='bg-kapwa-bg-surface border-kapwa-border-weak rounded-card border p-6 shadow-elev-1'>
        <div className='flex items-center gap-3'>
          <MapPinIcon
            aria-hidden='true'
            className='text-kapwa-text-brand h-5 w-5'
          />
          <h1 className='kapwa-heading-lg text-kapwa-text-strong'>
            {AREA_LABELS[area]} Accommodations
          </h1>
        </div>
        <p className='text-kapwa-text-support mt-2 text-sm'>
          {all.length} accommodation establishments in {AREA_LABELS[area]},
          Aklan, from the Provincial Government of Aklan&apos;s published
          listing. Being listed here does not confirm current accreditation or
          availability.
        </p>
      </header>

      {/* Announced politely; the result count below is the page status. */}
      <p aria-live='polite' className='sr-only'>
        {tripNote}
      </p>
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='relative min-w-[220px] flex-1'>
            <SearchIcon
              aria-hidden='true'
              className='text-kapwa-text-disabled absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2'
            />
            <input
              type='text'
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search by name…'
              aria-label='Search by name'
              className='border-kapwa-border-weak bg-kapwa-bg-surface min-h-11 w-full rounded-md border py-2 pr-3 pl-9 text-sm'
            />
          </div>
          {area === 'mainland' && (
            <select
              value={municipalityFilter}
              onChange={e => setMunicipalityFilter(e.target.value)}
              aria-label='Municipality'
              className='border-kapwa-border-weak bg-kapwa-bg-surface text-kapwa-text-strong min-h-11 rounded-md border px-3 py-2 text-sm'
            >
              <option value=''>All municipalities</option>
              {municipalities.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>

        <ChipGroup<StayType | 'none'>
          label='Type'
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            ...(Object.keys(TYPE_LABEL) as StayType[]).map(k => ({
              value: k as StayType | 'none',
              label: TYPE_LABEL[k],
              count: facets.type.get(k) ?? 0,
            })),
            {
              value: 'none' as const,
              label: 'Not stated',
              count: facets.type.get('none') ?? 0,
            },
          ]}
        />
        {area === 'boracay' && (
          <ChipGroup<Station | 'none'>
            label='Station'
            value={stationFilter}
            onChange={setStationFilter}
            options={[
              ...(['Station 1', 'Station 2', 'Station 3'] as Station[]).map(
                s => ({
                  value: s as Station | 'none',
                  label: s,
                  count: facets.station.get(s) ?? 0,
                })
              ),
              {
                value: 'none' as const,
                label: 'Not stated',
                count: facets.station.get('none') ?? 0,
              },
            ]}
          />
        )}
        <p className='text-kapwa-text-muted text-xs'>
          Type comes from the establishment&apos;s name and station from its
          published address. &quot;Not stated&quot; means they don&apos;t say.
        </p>

        <div className='flex flex-wrap items-center gap-3'>
          <p
            role='status'
            aria-live='polite'
            className='text-kapwa-text-strong type-body font-semibold'
          >
            Showing {filtered.length} of {all.length} establishments
          </p>
          {trip.ids.length > 0 && (
            <Link
              to={`/tourism/explore?trip=${serializeTrip(trip.ids)}`}
              className='text-kapwa-text-brand type-meta inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline'
            >
              <BookmarkIcon aria-hidden='true' className='h-4 w-4' />
              My trip: {trip.ids.length} stop{trip.ids.length === 1 ? '' : 's'}{' '}
              · Open in Explore
            </Link>
          )}
          {hasFilters(filters) && (
            <button
              type='button'
              onClick={clearFilters}
              className='text-kapwa-text-brand type-meta inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kapwa-border-brand'
            >
              <XIcon aria-hidden='true' className='h-4 w-4' />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div ref={mapBox}>
        <StayMap
          groups={groups}
          view={view}
          selectedId={selectedPin}
          onSelect={setSelectedPin}
          saved={trip.ids}
          onToggleSave={toggleSave}
        />
      </div>

      <Card className='overflow-hidden p-0' hover={false}>
        <h2 className='sr-only'>Establishments</h2>
        {pagedFiltered.length === 0 ? (
          <div className='space-y-3 p-6 text-center'>
            <p className='text-kapwa-text-strong type-body font-semibold'>
              No establishments match these filters.
            </p>
            {hasFilters(filters) && (
              <button
                type='button'
                onClick={clearFilters}
                className={`${CHIP} ${CHIP_OFF}`}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ol
            role='list'
            start={(page - 1) * perPage + 1}
            className='divide-kapwa-border-weak divide-y'
          >
            {pagedFiltered.map((a, i) => {
              const type = deriveType(a.name);
              const station =
                area === 'boracay' ? deriveStation(a.address) : null;
              return (
                <li
                  key={`${a.name}-${a.address}`}
                  className='flex gap-3 p-4 sm:gap-4'
                >
                  <span className='text-kapwa-text-support type-meta w-8 shrink-0 pt-0.5 text-right font-semibold tabular-nums'>
                    {(page - 1) * perPage + i + 1}.
                  </span>
                  <div className='min-w-0 flex-1 space-y-1.5'>
                    <h3 className='text-kapwa-text-strong text-sm leading-tight font-bold'>
                      {a.name}
                    </h3>
                    <p className='text-kapwa-text-support text-xs leading-relaxed'>
                      {a.address}
                    </p>
                    {(type || station) && (
                      <p className='text-kapwa-text-support type-meta flex flex-wrap gap-x-3'>
                        {type && <span>{TYPE_LABEL[type]}</span>}
                        {station && <span>{station}</span>}
                      </p>
                    )}
                    <div className='flex flex-wrap items-center gap-x-3 gap-y-1 pt-1'>
                      {a.lat != null && a.lon != null ? (
                        <button
                          type='button'
                          onClick={() => showOnMap(a.id)}
                          className='text-kapwa-text-brand flex min-h-11 items-center gap-1 text-xs font-medium hover:underline'
                        >
                          <MapPinIcon aria-hidden='true' className='h-3 w-3' />{' '}
                          Show on map
                          <span className='sr-only'>: {a.name}</span>
                        </button>
                      ) : (
                        <span className='text-kapwa-text-disabled text-xs italic'>
                          Location unavailable
                        </span>
                      )}
                      <SaveToTripButton
                        name={a.name}
                        saved={trip.ids.includes(a.id)}
                        onToggle={() => toggleSave(a.id)}
                      />
                      {a.geocodePrecision !== 'exact' && a.lat != null && (
                        <span className='text-kapwa-text-support text-xs font-bold'>
                          Approximate pin · {a.geocodePrecision} level
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          resultsPerPage={perPage}
          totalItems={filtered.length}
          onPageChange={setPage}
          onResultsPerPageChange={n => {
            setPerPage(n);
            setPage(1);
          }}
        />
      </Card>

      <p className='text-kapwa-text-disabled text-center text-xs italic'>
        Source:{' '}
        <a
          href='https://aklan.gov.ph/tourism/accommodation/'
          target='_blank'
          rel='noreferrer'
          className='text-kapwa-text-brand not-italic hover:underline'
        >
          Provincial Government of Aklan
        </a>
        . Locations geocoded from published addresses via OpenStreetMap and may
        not be exact.
      </p>
    </div>
  );
}
