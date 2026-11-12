import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';

import {
  ArrowRightIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarX2Icon,
  ExternalLinkIcon,
  InfoIcon,
  CompassIcon,
  PauseIcon,
  RouteIcon,
  PlayIcon,
  XIcon,
  Share2Icon,
  SlidersHorizontalIcon,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';

import { advisoriesFor } from '@/lib/tourism/advisories';
import { DATE_STATUS_LABEL, overlaps } from '@/lib/tourism/festivalDates';
import {
  buildRecords,
  densityTier,
  emptyState,
  filterRecords,
  LAYER_LABEL,
  type Layer,
  type Rec,
  type Sources,
  tierBounds,
} from '@/lib/tourism/explore';
import { findMunicipalityAt, type BoundaryFeature } from '@/lib/tourism/geo';
import {
  MAX_STOPS,
  moveStop,
  parseTrip,
  serializeTrip,
} from '@/lib/tourism/trip';

import AklanMap3D, {
  type MapPin,
  type TourMove,
} from './components/AklanMap3D';
import EmptyState from './components/EmptyState';
import FestivalStrip from './components/FestivalStrip';
import FiltersSheet from './components/FiltersSheet';
import LayerGlyph from './components/LayerGlyph';
import { LAYER_COLOR, LAYER_ICON, TOWN_COLOR } from './components/layerMeta';
import RecordCard from './components/RecordCard';
import SearchBar from './components/SearchBar';
import TripTray from './components/TripTray';
import { DatePill, LocationPill, Pill } from './components/StatusPills';
import { useBottomSheet } from './components/useBottomSheet';
import ViewToggle from './components/ViewToggle';

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
const BY_ID = new Map(ALL_RECORDS.map(r => [r.id, r]));
const KNOWN_IDS = new Set(BY_ID.keys());
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
const RING_LEN = 2 * Math.PI * 21;
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
            layer: selected.layer,
            town: selected.town,
            approximate: selected.placement === 'approximate',
            label: `${LAYER_LABEL[selected.layer]} · ${PLACEMENT_LABEL[selected.placement]}`,
          }
        : null,
    [selected]
  );
  const townInfo = MUNICIPALITIES.find(m => m.slug === town) ?? null;
  const empty =
    filtered.length === 0
      ? emptyState(
          ALL_RECORDS,
          filters,
          MUNICIPALITIES.find(m => m.slug === town)?.name ?? null
        )
      : null;
  const mapped = filtered.filter(
    (r): r is Rec & { lat: number; lon: number } =>
      r.lat != null && r.lon != null
  );

  // Client-only map display toggles (the Layer filter above still drives the list).
  const [hiddenLayers, setHiddenLayers] = useState<Layer[]>([]);
  // Off: each municipality in its own colour. On: shade by record density.
  const [shade, setShade] = useState(false);
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
        layer: r.layer,
        town: r.town,
        approximate: r.placement === 'approximate',
        label: LAYER_LABEL[r.layer],
      })),
    // shownKey captures every change to the pin list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shownKey]
  );
  const tierOf = (n: number) => (shade ? densityTier(n, maxCount) : 0);
  const townTier = useMemo(
    () =>
      new Map(
        MUNICIPALITIES.map(m => [
          m.slug,
          shade ? densityTier(counts.get(m.slug) ?? 0, maxCount) : 0,
        ])
      ),
    [counts, shade, maxCount]
  );
  // Legend: the tier under the pointer is highlighted.
  const [hoverTown, setHoverTown] = useState<string | null>(null);
  const hoverCount = hoverTown ? (counts.get(hoverTown) ?? 0) : 0;
  const hoverTier = hoverTown ? tierOf(hoverCount) : null;
  const tierRange = (t: number) => {
    const [lo, hi] = tierBounds(t, maxCount);
    return lo === hi ? `${hi}` : `${lo}–${hi}`;
  };

  // Guided tour: one stop per municipality, TOUR_STEP_MS each; paused by any
  // map gesture or a hidden tab; ends on a "Plan your trip" card.
  const [tour, setTour] = useState<{ step: number; paused: boolean } | null>(
    null
  );
  // 'done' after the last stop, 'skipped' when cut short; false hides the card.
  const [tourDone, setTourDone] = useState<false | 'done' | 'skipped'>(false);
  const stopTour = () => setTour(null);
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
    stopTour();
    update({ sel: id });
  };

  const stepLeft = useRef(TOUR_STEP_MS);
  const stepStart = useRef(0);
  const goToStop = (step: number) => {
    stepLeft.current = TOUR_STEP_MS;
    setTour({ step, paused: false });
    update({ town: MUNICIPALITIES[step].slug, sel: '' });
  };
  const finishTour = (how: 'done' | 'skipped') => {
    setTour(null);
    update({ town: '', sel: '' });
    setTourDone(how);
  };
  const pauseTour = () => {
    setTour(t => {
      if (!t || t.paused) return t;
      stepLeft.current = Math.max(
        0,
        stepLeft.current - (performance.now() - stepStart.current)
      );
      return { ...t, paused: true };
    });
  };
  useEffect(() => {
    if (!tour || tour.paused) return;
    stepStart.current = performance.now();
    const id = window.setTimeout(() => {
      if (tour.step + 1 < MUNICIPALITIES.length) goToStop(tour.step + 1);
      else finishTour('done');
    }, stepLeft.current);
    return () => window.clearTimeout(id);
    // goToStop/finishTour only call setters and `update`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour?.step, tour?.paused]);
  useEffect(() => {
    const on = () => document.hidden && pauseTour();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  const tourMove: TourMove | null = tour
    ? (['fly', 'orbit', 'tilt'] as const)[tour.step % 3]
    : null;
  const ctaRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (tourDone) ctaRef.current?.focus();
  }, [tourDone]);

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

  // Filter changes crossfade the list: the old results fade out over the new.
  const filterKey = `${q}|${town}|${layer}|${from}|${to}`;
  const lastVisible = useRef(visible);
  const lastKey = useRef(filterKey);
  const [ghost, setGhost] = useState<Rec[] | null>(null);
  useEffect(() => {
    if (lastKey.current === filterKey) return;
    lastKey.current = filterKey;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setGhost(lastVisible.current);
    const id = window.setTimeout(() => setGhost(null), 150);
    return () => window.clearTimeout(id);
  }, [filterKey]);
  useEffect(() => {
    lastVisible.current = visible;
  });

  // My trip: saved places, in order, kept in the URL (`trip=id1,id2`) so the
  // link itself is the shareable trip.
  const tripIds = useMemo(
    () => parseTrip(params.get('trip'), KNOWN_IDS),
    [params]
  );
  const tripSet = useMemo(() => new Set(tripIds), [tripIds]);
  const tripStops = tripIds.map(id => BY_ID.get(id)!);
  const route = useMemo(
    () =>
      tripIds
        .map(id => BY_ID.get(id)!)
        .filter(r => r.lat != null && r.lon != null)
        .map(r => ({ id: r.id, lat: r.lat!, lon: r.lon! })),
    [tripIds]
  );
  const setTrip = (ids: string[]) => update({ trip: serializeTrip(ids) });
  const toggleSaved = (id: string) => {
    if (tripSet.has(id)) {
      setTrip(tripIds.filter(x => x !== id));
      return;
    }
    if (tripIds.length >= MAX_STOPS) {
      showToast(
        `Your trip is full (${MAX_STOPS} stops). Remove one to add more.`
      );
      return;
    }
    setTrip([...tripIds, id]);
    showToast(
      `Added to My trip · ${tripIds.length + 1} stop${tripIds.length ? 's' : ''}`
    );
  };
  const [tripOpen, setTripOpen] = useState(false);
  const [fitRouteKey, setFitRouteKey] = useState(0);
  const [squash, setSquash] = useState<{ k: string; n: number } | null>(null);

  // Copy-link toast.
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const showToast = (text: string) =>
    setToast(t => ({ text, n: (t?.n ?? 0) + 1 }));
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Share a link: native share sheet on touch devices, copy + toast elsewhere.
  const shareLink = (url: string, copied: string) => {
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.share) {
      void navigator.share({ url }).catch(() => {});
      return;
    }
    navigator.clipboard
      ?.writeText(url)
      .then(() => showToast(copied))
      .catch(() =>
        showToast("Couldn't copy. Copy the link from the address bar.")
      );
  };

  // Filters sheet: count of active filters and a one-tap reset.
  const activeFilters =
    (town ? 1 : 0) + (layer !== 'all' ? 1 : 0) + (from || to ? 1 : 0);
  const clearAll = () => {
    stopTour();
    update({ town: '', layer: '', from: '', to: '', sel: '' });
  };

  // Near me: asks for location only when tapped; the position never leaves the device.
  const [locating, setLocating] = useState(false);
  const nearMe = () => {
    if (!navigator.geolocation) {
      showToast(
        "This browser can't share your location. Pick a municipality in Filters."
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        const slug = findMunicipalityAt(
          pos.coords.latitude,
          pos.coords.longitude,
          SOURCES.boundaries
        );
        if (!slug) {
          showToast(
            'You seem to be outside Aklan. Pick a municipality in Filters instead.'
          );
          return;
        }
        stopTour();
        update({ town: slug, sel: '', view: 'map' });
        showToast(
          `Showing ${MUNICIPALITIES.find(m => m.slug === slug)?.name}, near you`
        );
      },
      err => {
        setLocating(false);
        showToast(
          err.code === err.PERMISSION_DENIED
            ? 'Location is off for this site. You can still pick a municipality in Filters.'
            : "We couldn't find your location. Try again, or pick a municipality in Filters."
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  };

  // Map failure: fall back to the list automatically, with a way back.
  const [mapFailed, setMapFailed] = useState(false);

  // Festival calendar: picking a month sets the date range and pulses its pins.
  const EVENTS = useMemo(
    () => ALL_RECORDS.filter(r => r.layer === 'event'),
    []
  );
  const [today] = useState(() => new Date());
  const [pulse, setPulse] = useState<{ ids: string[]; key: number } | null>(
    null
  );
  const pickedMonth =
    from && to && from.endsWith('-01') && from.slice(0, 7) === to.slice(0, 7)
      ? from.slice(0, 7)
      : null;

  // List and map as one: hovering a card highlights its pin; tapping a pin
  // scrolls its card into view where the list scrolls on its own (desktop).
  const [hoverRec, setHoverRec] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const pinTapped = useRef(false);
  useEffect(() => {
    if (!sel || !pinTapped.current) return;
    pinTapped.current = false;
    const list = listRef.current;
    const card = list?.querySelector<HTMLElement>(
      `[data-rec="${CSS.escape(sel)}"]`
    );
    if (!list || !card || list.scrollHeight <= list.clientHeight) return;
    list.scrollTo({
      top: card.offsetTop - list.offsetTop - 12,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, [sel]);

  // Switching views: remember each view's page scroll, and morph between
  // them with a view transition where the browser supports it.
  const scrollMemory = useRef<Record<'map' | 'list', number | null>>({
    map: null,
    list: null,
  });
  const switchView = (next: 'map' | 'list') => {
    if (next === view) return;
    if (next === 'map') setMapFailed(false);
    scrollMemory.current[view] = window.scrollY;
    const apply = () => {
      flushSync(() => update({ view: next }));
      const y = scrollMemory.current[next];
      if (y !== null) window.scrollTo({ top: y });
    };
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    if (
      doc.startViewTransition &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      doc.startViewTransition(apply);
    else apply();
  };

  // A floating toggle appears once the inline one scrolls out of sight.
  const toggleRef = useRef<HTMLDivElement>(null);
  const [toggleOffscreen, setToggleOffscreen] = useState(false);
  useEffect(() => {
    const el = toggleRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) =>
      setToggleOffscreen(!e.isIntersecting)
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`motion-safe:[&_button:not(:disabled):active]:scale-[.97] [&_:is(h1,h2,h3)]:text-balance [&_:is(a,button,input,select):focus-visible]:outline-2 [&_:is(a,button,input,select):focus-visible]:outline-offset-2 [&_:is(a,button,input,select):focus-visible]:outline-[#1D4FB0] space-y-6 ${intro ? '' : 'animate-in fade-in duration-(--dur-slow) ease-out-expo motion-reduce:animate-none'} ${bs.active ? '' : 'pb-8'}`}
      style={bs.active ? { paddingBottom: bs.visible + 16 } : undefined}
    >
      <header
        style={intro ? rise(0) : undefined}
        className='[&_button:focus-visible]:!outline-white relative z-[20] rounded-card bg-gradient-to-br from-[#0B3FAE] via-[#1556D6] to-[#2F7BEA] p-4 text-white shadow-elev-2 sm:p-8'
      >
        {/* Decoration is clipped on its own so the search dropdown can overflow the hero. */}
        <div
          aria-hidden='true'
          className='absolute inset-0 overflow-hidden rounded-card'
        >
          <div
            className='absolute inset-0 opacity-25'
            style={{ backgroundImage: WAVES, backgroundSize: '160px 32px' }}
          />
          <div className='absolute -top-16 -right-10 h-56 w-56 rounded-full bg-[#FCD116]/25 blur-3xl' />
        </div>
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
            onClick={() => shareLink(window.location.href, 'Link copied')}
            className='inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-control bg-white px-3 text-sm font-bold text-[#0B3FAE] shadow-elev-2 sm:px-5'
          >
            <Share2Icon aria-hidden='true' className='h-4 w-4' />
            <span className='sr-only sm:not-sr-only'>Share view</span>
          </button>
        </div>
        <div className='relative mt-4 sm:mt-6'>
          <SearchBar
            value={q}
            onChange={v => update({ q: v, sel: '' })}
            records={ALL_RECORDS}
            towns={MUNICIPALITIES}
            onPickRecord={r => {
              stopTour();
              update({ sel: r.id, town: r.town ?? '', q: '' });
            }}
            onPickTown={slug => {
              stopTour();
              update({ town: slug, sel: '', q: '' });
            }}
            onNearMe={nearMe}
            locating={locating}
          />
        </div>
      </header>

      {/* Controls: filters sheet (with active count), clear all, and view. */}
      <div
        style={intro ? rise(1) : undefined}
        className='bg-kapwa-bg-surface border-kapwa-border-weak flex flex-wrap items-center gap-2 rounded-card border p-2 shadow-elev-1 sm:p-3'
      >
        <button
          type='button'
          onClick={() => setFiltersOpen(true)}
          aria-haspopup='dialog'
          aria-label={
            activeFilters
              ? `Filters, ${activeFilters} active`
              : 'Filters, none active'
          }
          className='field-control inline-flex items-center gap-2 font-bold'
        >
          <SlidersHorizontalIcon aria-hidden='true' className='h-4 w-4' />
          Filters
          {activeFilters > 0 && (
            <span
              aria-hidden='true'
              className='flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1D4FB0] px-1.5 text-xs text-white'
            >
              {activeFilters}
            </span>
          )}
        </button>
        {activeFilters > 0 && (
          <button
            type='button'
            onClick={clearAll}
            className='text-kapwa-text-brand min-h-11 px-2 text-sm font-bold'
          >
            Clear all
          </button>
        )}
        <button
          type='button'
          onClick={() => setTripOpen(true)}
          aria-haspopup='dialog'
          aria-label={`My trip, ${tripIds.length} stop${tripIds.length === 1 ? '' : 's'}`}
          className='field-control inline-flex items-center gap-2 font-bold'
        >
          <RouteIcon aria-hidden='true' className='h-4 w-4' />
          My trip
          {tripIds.length > 0 && (
            <span
              aria-hidden='true'
              className='flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1D4FB0] px-1.5 text-xs text-white'
            >
              {tripIds.length}
            </span>
          )}
        </button>
        <div ref={toggleRef} className='ml-auto'>
          <ViewToggle view={view} onChange={switchView} />
        </div>
      </div>
      <TripTray
        open={tripOpen}
        onClose={() => setTripOpen(false)}
        stops={tripStops}
        onMove={(i, dir) => setTrip(moveStop(tripIds, i, dir))}
        onRemove={id => setTrip(tripIds.filter(x => x !== id))}
        onClear={() => setTrip([])}
        onShowRoute={() => {
          setTripOpen(false);
          stopTour();
          if (view !== 'map') switchView('map');
          update({ town: '', sel: '' });
          setFitRouteKey(k => k + 1);
        }}
        onShare={() => {
          const url = new URL(window.location.pathname, window.location.origin);
          url.searchParams.set('trip', serializeTrip(tripIds));
          url.searchParams.set('view', 'map');
          shareLink(url.toString(), 'Trip link copied');
        }}
      />
      <FiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        town={town}
        layer={layer}
        from={from}
        to={to}
        towns={MUNICIPALITIES}
        hasDated={HAS_DATED}
        resultCount={filtered.length}
        update={patch => {
          stopTour();
          update(patch);
        }}
        onClearAll={clearAll}
      />

      {!empty &&
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
            <Card
              className='overflow-hidden p-0 [view-transition-name:explore-map]'
              hover={false}
            >
              <div className='relative isolate h-[55vh] min-h-[320px] w-full sm:h-[62vh] sm:min-h-[360px] lg:h-[70vh] [&_.maplibregl-ctrl-group_button]:!h-11 [&_.maplibregl-ctrl-group_button]:!w-11'>
                <AklanMap3D
                  intro={intro}
                  boundaries={SOURCES.boundaries}
                  townTier={townTier}
                  tierColors={TIER_COLOR}
                  colorMode={shade ? 'density' : 'town'}
                  townColors={TOWN_COLOR}
                  onHoverTown={setHoverTown}
                  tourMove={tourMove}
                  onUserMove={pauseTour}
                  townCount={counts}
                  town={town}
                  pins={pins}
                  selected={selectedPin}
                  onTown={slug => {
                    stopTour();
                    update({ town: slug, sel: '' });
                  }}
                  onPin={id => {
                    pinTapped.current = true;
                    select(id);
                  }}
                  hoverId={hoverRec}
                  pulse={pulse}
                  route={route}
                  fitRouteKey={fitRouteKey}
                  onLoadError={() => {
                    setMapFailed(true);
                    update({ view: 'list' });
                  }}
                  onSettled={setSettledTown}
                  onBackground={() => {
                    stopTour();
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
                        onClick={() => {
                          setHiddenLayers(h =>
                            on ? [...h, k] : h.filter(x => x !== k)
                          );
                          setSquash(s => ({ k, n: (s?.n ?? 0) + 1 }));
                        }}
                        className={`flex min-h-11 flex-none items-center transition-colors duration-(--dur-fast) gap-2 rounded-control px-3 type-meta font-semibold ${on ? 'bg-kapwa-bg-brand-weak' : 'text-kapwa-text-support'}`}
                      >
                        <span
                          key={squash?.k === k ? squash.n : 0}
                          className={`inline-flex ${squash?.k === k ? 'motion-safe:animate-[chip-squash_200ms_var(--ease-out-expo)]' : ''}`}
                        >
                          <LayerGlyph layer={k} hollow={!on} />
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

                {/* Tour controls: start, or pause/resume with a progress ring, and skip. */}
                <div className='absolute top-3 right-3 z-[500] flex items-center gap-2'>
                  {tour && (
                    <button
                      type='button'
                      onClick={() => finishTour('skipped')}
                      className='surface-glass type-meta min-h-11 rounded-full px-3 font-semibold underline-offset-2 hover:underline'
                    >
                      Skip tour
                    </button>
                  )}
                  {tour ? (
                    <button
                      type='button'
                      aria-label={
                        tour.paused
                          ? `Resume tour, stop ${tour.step + 1} of ${MUNICIPALITIES.length}`
                          : `Pause tour, stop ${tour.step + 1} of ${MUNICIPALITIES.length}`
                      }
                      onClick={() =>
                        tour.paused
                          ? setTour({ ...tour, paused: false })
                          : pauseTour()
                      }
                      className='bg-kapwa-bg-surface text-kapwa-text-strong relative flex h-12 w-12 items-center justify-center rounded-full shadow-elev-2'
                    >
                      <svg
                        aria-hidden='true'
                        viewBox='0 0 48 48'
                        className='absolute inset-0 -rotate-90'
                      >
                        <circle
                          cx='24'
                          cy='24'
                          r='21'
                          fill='none'
                          stroke='#D6E4FA'
                          strokeWidth='3'
                        />
                        <circle
                          key={tour.step}
                          cx='24'
                          cy='24'
                          r='21'
                          fill='none'
                          stroke='#1D4FB0'
                          strokeWidth='3'
                          strokeLinecap='round'
                          strokeDasharray={RING_LEN}
                          style={
                            {
                              '--ring-len': RING_LEN,
                              animation: `tour-ring ${TOUR_STEP_MS}ms linear both`,
                              animationPlayState: tour.paused
                                ? 'paused'
                                : 'running',
                            } as React.CSSProperties
                          }
                        />
                      </svg>
                      {tour.paused ? (
                        <PlayIcon aria-hidden='true' className='h-4 w-4' />
                      ) : (
                        <PauseIcon aria-hidden='true' className='h-4 w-4' />
                      )}
                    </button>
                  ) : (
                    <button
                      type='button'
                      onClick={() => {
                        setTourDone(false);
                        goToStop(0);
                      }}
                      className='bg-kapwa-bg-surface text-kapwa-text-strong inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold shadow-elev-2'
                    >
                      <PlayIcon aria-hidden='true' className='h-4 w-4' />
                      Tour Aklan
                    </button>
                  )}
                </div>

                {/* Stop title: cross-fades as the tour moves on. */}
                {tour && (
                  <div className='pointer-events-none absolute top-[72px] left-1/2 z-[500] -translate-x-1/2 sm:top-3'>
                    <p
                      key={tour.step}
                      aria-live='polite'
                      className='surface-glass type-meta motion-safe:animate-[list-fade-in_var(--dur-base)_var(--ease-out-expo)_both] rounded-full px-3 py-1.5 font-semibold whitespace-nowrap'
                    >
                      <span className='text-kapwa-text-support'>
                        {tour.step + 1}/{MUNICIPALITIES.length} ·{' '}
                      </span>
                      {MUNICIPALITIES[tour.step].name}
                      {tour.paused ? ' · paused' : ''}
                    </p>
                  </div>
                )}

                {/* End of tour: next steps, no bookings. */}
                {tourDone && !tour && (
                  <section
                    aria-labelledby='plan-trip'
                    className='surface-glass absolute inset-x-3 bottom-4 z-[510] p-4 motion-safe:animate-[explore-sheet-up_var(--dur-base)_var(--ease-out-expo)_both] sm:inset-x-auto sm:right-3 sm:w-80'
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <h3
                        id='plan-trip'
                        ref={ctaRef}
                        tabIndex={-1}
                        className='type-title outline-none'
                      >
                        <CompassIcon
                          aria-hidden='true'
                          className='text-kapwa-text-brand mr-1.5 inline h-5 w-5 align-[-3px]'
                        />
                        Plan your trip
                      </h3>
                      <button
                        type='button'
                        aria-label='Close'
                        onClick={() => setTourDone(false)}
                        className='-mt-2 -mr-2 flex h-11 w-11 items-center justify-center rounded-full'
                      >
                        <XIcon aria-hidden='true' className='h-4 w-4' />
                      </button>
                    </div>
                    <p className='text-kapwa-text-support type-meta mt-1'>
                      {tourDone === 'done'
                        ? `You've seen all ${MUNICIPALITIES.length} municipalities. Next, look`
                        : 'Look'}{' '}
                      up where to stay and which festivals have dates.
                    </p>
                    <div className='mt-3 flex flex-wrap gap-2'>
                      <button
                        type='button'
                        onClick={() => {
                          setTourDone(false);
                          update({ layer: 'stay', view: 'list', sel: '' });
                        }}
                        className='bg-kapwa-bg-brand-default text-kapwa-text-inverse min-h-11 rounded-control px-3 text-sm font-bold'
                      >
                        Places to stay
                      </button>
                      <button
                        type='button'
                        onClick={() => {
                          setTourDone(false);
                          update({ layer: 'event', view: 'list', sel: '' });
                        }}
                        className='border-kapwa-border-weak min-h-11 rounded-control border px-3 text-sm font-bold'
                      >
                        Festivals
                      </button>
                    </div>
                  </section>
                )}

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
                {shade ? (
                  <span className='flex flex-wrap items-center gap-1.5'>
                    Fewer records
                    {TIER_COLOR.slice(1).map((c, i) => {
                      const t = i + 1;
                      const on = hoverTier === t;
                      return (
                        <span
                          key={c}
                          title={`${tierRange(t)} records`}
                          aria-hidden='true'
                          className={`h-2.5 w-5 origin-bottom rounded-[2px] transition-transform duration-(--dur-fast) ease-out-expo ${on ? 'scale-y-[1.8] ring-2 ring-[#0f234b] ring-offset-1' : ''}`}
                          style={{ background: c }}
                        />
                      );
                    })}
                    More
                    {hoverTown && (
                      <span className='text-kapwa-text-strong ml-1 font-semibold'>
                        {MUNICIPALITIES.find(m => m.slug === hoverTown)?.name}:{' '}
                        {hoverCount} record{hoverCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className='flex w-full flex-wrap items-center gap-x-1'>
                    <span className='text-kapwa-text-strong font-semibold'>
                      Municipalities
                    </span>
                    {MUNICIPALITIES.map(m => (
                      <button
                        key={m.slug}
                        type='button'
                        onClick={() => {
                          stopTour();
                          update({ town: m.slug, sel: '' });
                        }}
                        aria-pressed={town === m.slug}
                        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 transition-colors duration-(--dur-fast) ${hoverTown === m.slug || town === m.slug ? 'bg-kapwa-bg-brand-weak text-kapwa-text-strong font-semibold' : ''}`}
                      >
                        <span
                          aria-hidden='true'
                          className='h-3 w-3 rounded-[3px]'
                          style={{ background: TOWN_COLOR[m.slug] }}
                        />
                        {m.name}
                      </button>
                    ))}
                  </span>
                )}
                <span className='flex items-center gap-1.5'>
                  <LayerGlyph layer='stay' hollow />
                  Dashed outline = approximate location
                </span>
                <span className='flex items-center gap-1.5'>
                  <span
                    aria-hidden='true'
                    className='flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#1D4FB0] px-1 text-[10px] font-bold text-white shadow-elev-1'
                  >
                    12
                  </span>
                  Group of records, tap to expand
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
          {mapFailed && view === 'list' && (
            <Card className='rounded-card p-0' hover={false}>
              <EmptyState
                tone='error'
                title="The map didn't load"
                body='Your connection may be slow, so we switched to the list. Everything is still here.'
                action={{
                  label: 'Try the map again',
                  onClick: () => switchView('map'),
                }}
              />
            </Card>
          )}
          <Card
            className='overflow-hidden rounded-card p-0 [view-transition-name:explore-list]'
            hover={false}
          >
            <h2
              aria-live='polite'
              className='text-kapwa-text-strong border-kapwa-border-weak type-title border-b px-4 pt-4 pb-3'
            >
              {filtered.length} record{filtered.length === 1 ? '' : 's'}
              {townInfo ? ` in ${townInfo.name}` : ' in Aklan'}
            </h2>
            {(layer === 'all' || layer === 'event') && (
              <FestivalStrip
                events={EVENTS}
                today={today}
                selected={pickedMonth}
                onOpen={id => {
                  stopTour();
                  update({ sel: id });
                }}
                onSelect={m => {
                  update({ from: m?.from ?? '', to: m?.to ?? '', sel: '' });
                  if (m)
                    setPulse(p => ({
                      ids: EVENTS.filter(e => overlaps(e, m.from, m.to)).map(
                        e => e.id
                      ),
                      key: (p?.key ?? 0) + 1,
                    }));
                }}
              />
            )}
            {filtered.length === 0 ? (
              <EmptyState
                title={empty!.title}
                body={empty!.body}
                action={{
                  label: empty!.action.label,
                  onClick: () => update({ ...empty!.action.patch, sel: '' }),
                }}
              />
            ) : (
              <div className='relative'>
                <ul
                  ref={listRef}
                  key={filterKey}
                  className='grid gap-3 p-3 motion-safe:animate-[list-fade-in_150ms_linear_both] sm:grid-cols-2 lg:max-h-[70vh] lg:overflow-y-auto'
                >
                  {visible.map(r => (
                    <li key={r.id}>
                      <RecordCard
                        rec={r}
                        selected={sel === r.id}
                        onSelect={select}
                        saved={tripSet.has(r.id)}
                        onToggleSave={toggleSaved}
                        onHover={setHoverRec}
                      />
                    </li>
                  ))}
                </ul>
                {/* The previous results fade out over the new ones. */}
                {ghost && (
                  <ul
                    aria-hidden='true'
                    inert
                    className='pointer-events-none absolute inset-x-0 top-0 grid max-h-full gap-3 overflow-hidden p-3 animate-[list-fade-out_150ms_linear_both] sm:grid-cols-2'
                  >
                    {ghost.map(r => (
                      <li key={r.id}>
                        <RecordCard
                          rec={r}
                          selected={false}
                          onSelect={() => {}}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
      {toggleOffscreen && (
        <div
          className='fixed left-1/2 z-[45] -translate-x-1/2 motion-safe:animate-[list-fade-in_var(--dur-fast)_linear_both]'
          style={{ bottom: (bs.active ? bs.visible : 0) + 16 }}
        >
          <ViewToggle view={view} onChange={switchView} floating />
        </div>
      )}
      {/* Always mounted so screen readers announce the message when it appears. */}
      <div role='status' aria-live='polite' className='sr-only'>
        {toast?.text}
      </div>
      {toast && (
        <div
          key={toast.n}
          aria-hidden='true'
          style={{ bottom: (bs.active ? bs.visible : 0) + 24 }}
          className='type-meta fixed left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#0f234b] px-4 py-2.5 font-semibold text-white shadow-elev-3 motion-safe:animate-[toast-in_var(--dur-base)_var(--ease-out-expo)_both]'
        >
          <Share2Icon className='h-4 w-4' />
          {toast.text}
        </div>
      )}
    </div>
  );
}
