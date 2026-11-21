import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import {
  BookmarkIcon,
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  ExternalLinkIcon,
  FlagIcon,
  MapIcon,
  PartyPopperIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from 'lucide-react';

import {
  Breadcrumb,
  BreadcrumbHome,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/navigation/Breadcrumb';
import { Card, CardContent } from '@/components/ui/Card';

import { advisoriesFor, useAdvisories } from '@/lib/tourism/advisories';
import {
  type Category,
  categoryOf,
  FILTER_CATEGORIES,
} from '@/lib/tourism/category';
import { displayName } from '@/lib/tourism/displayName';
import { dateTile, parseFestivalDate } from '@/lib/tourism/festivalDateText';
import { config } from '@/lib/lguConfig';
import { projectTowns } from '@/lib/tourism/shapes';
import { MAX_STOPS, serializeTripDays } from '@/lib/tourism/trip';
import { useSavedTrip } from '@/lib/tourism/tripStore';

import municipalitiesTourism from '@/data/tourism/municipalities.json';
import type { Advisory, MunicipalityTourism } from '@/types/tourism';

import MiniMap from './components/MiniMap';
import PlanYourVisit from './components/PlanYourVisit';
import RecordCard from './components/RecordCard';
import { AdvisoryKindPill } from './components/StatusPills';
import TourismHero from './components/TourismHero';
import {
  BY_ID,
  KNOWN_IDS,
  municipalWebsite,
  SOURCES,
  spotsOnMap,
} from './components/tourismData';

const SHAPES = projectTowns(SOURCES.boundaries, 600, 2);

// Page sections, in the order they have always appeared.
const SECTIONS = [
  {
    key: 'festivals',
    prefix: 'event',
    title: 'Festivals & Events',
    icon: PartyPopperIcon,
  },
  {
    key: 'attractions',
    prefix: 'place',
    title: 'Spots & Attractions',
    icon: SparklesIcon,
  },
  {
    key: 'products',
    prefix: 'product',
    title: 'Products & Local Delicacies',
    icon: ShoppingBagIcon,
  },
] as const;

// Chip wording for each filterable category.
const CHIP_LABEL: Record<(typeof FILTER_CATEGORIES)[number], string> = {
  Beach: 'Beaches',
  Falls: 'Falls',
  Cave: 'Caves',
  Culture: 'Culture',
};

// Spots shown before "Show all": four rows of two on wide screens.
const SPOTS_SHOWN = 8;

/** Calendar tile for a festival card, read from its own description. */
function DateTileBadge({ description }: { description: string }) {
  const t = dateTile(parseFestivalDate(description));
  return (
    <span className='bg-kapwa-bg-surface text-kapwa-text-strong flex w-16 flex-col items-center rounded-panel py-1.5 leading-tight shadow-elev-2'>
      <span
        aria-hidden='true'
        className='type-meta text-kapwa-text-brand font-bold'
      >
        {t.top}
      </span>
      <span aria-hidden='true' className='type-meta text-center font-bold'>
        {t.bottom}
      </span>
      <span className='sr-only'>{t.label}</span>
    </span>
  );
}

/** "N spots on the map", with the town highlighted, linking into Explore. */
function TownMapCard({ slug, name }: { slug: string; name: string }) {
  const n = spotsOnMap(slug);
  return (
    <section
      aria-labelledby='town-map-heading'
      className='bg-kapwa-bg-surface border-kapwa-border-weak flex items-center gap-4 rounded-card border p-4 shadow-elev-1 lg:flex-col lg:items-stretch lg:gap-3'
    >
      <div className='w-28 shrink-0 lg:w-full'>
        <MiniMap shapes={SHAPES} active={slug} />
      </div>
      <div className='min-w-0'>
        <h2
          id='town-map-heading'
          className='text-kapwa-text-strong type-body font-semibold'
        >
          {n} spot{n === 1 ? '' : 's'} on the map
        </h2>
        <Link
          to={`/tourism/explore?town=${slug}`}
          className='text-kapwa-text-brand type-body inline-flex min-h-11 items-center gap-2 font-semibold hover:underline'
        >
          <MapIcon aria-hidden='true' className='h-4 w-4' />
          Open map
          <span className='sr-only'> of {name}</span>
        </Link>
      </div>
    </section>
  );
}

/** Links out to the town's own site, or the provincial page when none is recorded. */
function MoreEvents({ slug, name }: { slug: string; name: string }) {
  const site = municipalWebsite(slug);
  const href = site ?? `https://aklan.gov.ph/tourism/${slug}/`;
  const text = site
    ? `More events on ${name}’s official website`
    : `More events on the Aklan Provincial Tourism page for ${name}`;
  return (
    <a
      href={href}
      target='_blank'
      rel='noreferrer'
      className='text-kapwa-text-brand type-body inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline'
    >
      {text}
      <ExternalLinkIcon aria-hidden='true' className='h-4 w-4' />
      <span className='sr-only'> (opens in a new tab)</span>
    </a>
  );
}

const FALLBACK_NOTE =
  'Live notices couldn’t be loaded. Showing the last published list.';

/** Verified notices for the town; rendered only when there is at least one. */
function NoticeBanner({
  notices,
  fallback,
  townName,
}: {
  notices: Advisory[];
  fallback: boolean;
  townName: string;
}) {
  if (notices.length === 0)
    return fallback ? (
      <p className='text-kapwa-text-muted type-meta'>{FALLBACK_NOTE}</p>
    ) : null;
  return (
    <section
      aria-labelledby='town-notices'
      className='bg-kapwa-bg-warning-weak border-kapwa-border-warning space-y-3 rounded-card border p-4'
    >
      <h2
        id='town-notices'
        className='text-kapwa-text-strong type-body flex items-center gap-2 font-bold'
      >
        <TriangleAlertIcon
          aria-hidden='true'
          className='text-kapwa-text-accent-orange h-5 w-5'
        />
        Notices for {townName}
      </h2>
      <ul className='space-y-3'>
        {notices.map(a => (
          <li key={a.id} className='type-body space-y-1'>
            <p className='flex flex-wrap items-center gap-2'>
              <AdvisoryKindPill kind={a.kind} />
              <strong className='text-kapwa-text-strong'>{a.title}</strong>
            </p>
            {a.summary && (
              <p className='text-kapwa-text-support'>{a.summary}</p>
            )}
            <p className='text-kapwa-text-support type-meta'>
              {a.issuer} · published {a.publishedAt}
              {a.endsAt ? ` · until ${a.endsAt}` : ''} ·{' '}
              <a
                href={a.sourceUrl}
                target='_blank'
                rel='noreferrer'
                className='text-kapwa-text-brand font-semibold hover:underline'
              >
                Source
                <span className='sr-only'> (opens in a new tab)</span>
              </a>
            </p>
          </li>
        ))}
      </ul>
      {fallback && (
        <p className='text-kapwa-text-support type-meta'>{FALLBACK_NOTE}</p>
      )}
    </section>
  );
}

export default function TourismMunicipalityDetail() {
  const { municipality: slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { advisories, status: advisoriesStatus } = useAdvisories();
  const trip = useSavedTrip(KNOWN_IDS);
  const [tripNote, setTripNote] = useState('');
  // Which town's spot list is open; a new town starts collapsed.
  const [openSpots, setOpenSpots] = useState<string | null>(null);
  const municipalities = municipalitiesTourism as MunicipalityTourism[];
  const index = municipalities.findIndex(m => m.slug === slug);
  const municipality = index >= 0 ? municipalities[index] : undefined;

  if (!municipality)
    return <div className='p-20 text-center'>Municipality not found</div>;

  const notices = advisoriesFor(municipality.slug, advisories);
  const prev =
    municipalities[(index - 1 + municipalities.length) % municipalities.length];
  const next = municipalities[(index + 1) % municipalities.length];
  // Category comes from the record's own text (see categoryOf); the data has
  // none. Festivals are Culture, places are read from their name and
  // description, and products carry no category.
  const allItems = (s: (typeof SECTIONS)[number]) =>
    municipality[s.key].map((entry, i) => {
      const rec = entry.name
        ? BY_ID.get(`${s.prefix}-${municipality.slug}-${i}`)
        : undefined;
      const category: Category | null =
        rec && rec.layer !== 'product' ? categoryOf(rec) : null;
      return { entry, i, rec, category };
    });
  const counts: Partial<Record<Category, number>> = {};
  for (const s of SECTIONS)
    for (const it of allItems(s))
      if (it.category) counts[it.category] = (counts[it.category] ?? 0) + 1;
  // Only categories this town has, so no chip leads to an empty page.
  const chips = FILTER_CATEGORIES.filter(c => (counts[c] ?? 0) > 0);
  const asked = params.get('category');
  const active = chips.find(c => c.toLowerCase() === asked) ?? null;
  const choose = (c: Category | null) => {
    const next = new URLSearchParams(params);
    if (c) next.set('category', c.toLowerCase());
    else next.delete('category');
    setParams(next, { replace: true });
  };
  const itemsOf = (s: (typeof SECTIONS)[number]) =>
    allItems(s).filter(it => !active || it.category === active);
  const sections = SECTIONS.filter(s => itemsOf(s).length > 0);
  // Long spot lists start collapsed; a category chip already narrows the list.
  const spotsOpen = openSpots === municipality.slug;
  const collapsible = (s: (typeof SECTIONS)[number]) =>
    s.key === 'attractions' && !active && itemsOf(s).length > SPOTS_SHOWN;
  const shownOf = (s: (typeof SECTIONS)[number]) =>
    collapsible(s) && !spotsOpen
      ? itemsOf(s).slice(0, SPOTS_SHOWN)
      : itemsOf(s);
  const namedSpots = itemsOf(SECTIONS[1]).filter(it => it.rec).length;

  const toggleSave = (id: string) => {
    const name = displayName(BY_ID.get(id)?.name ?? '');
    const result = trip.toggle(id);
    setTripNote(
      result === 'full'
        ? `Your trip is full (${MAX_STOPS} stops). Remove one to add more.`
        : result === 'added'
          ? `Added ${name} to My trip.`
          : `Removed ${name} from My trip.`
    );
  };

  return (
    <div className='animate-in fade-in space-y-6 pb-8 duration-(--dur-slow) ease-out-expo'>
      {/* --- BREADCRUMBS --- */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbHome
              href='/'
              aria-label='Home'
              className='text-kapwa-text-support'
            />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href='/tourism' className='text-kapwa-text-support'>
              Tourism
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{municipality.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* --- NOTICES (only when there is one) --- */}
      <NoticeBanner
        notices={notices}
        fallback={advisoriesStatus === 'fallback'}
        townName={municipality.name}
      />

      {/* --- HERO --- */}
      <TourismHero
        eyebrow='Municipality'
        title={municipality.name}
        description={`Festivals, spots, and local products of the Municipality of ${municipality.name}, Aklan.`}
        actions={
          <Link
            to={`/tourism/explore?town=${municipality.slug}`}
            className='text-kapwa-text-brand inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold shadow-elev-2'
          >
            <MapIcon aria-hidden='true' className='h-4 w-4' />
            See {municipality.name} on the map
          </Link>
        }
      />

      {municipality.overview && (
        <p className='text-kapwa-text-support type-body max-w-3xl'>
          {municipality.overview.text}
        </p>
      )}

      <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]'>
        <PlanYourVisit slug={municipality.slug} name={municipality.name} />
        <TownMapCard slug={municipality.slug} name={municipality.name} />
      </div>

      {/* --- IN-PAGE TABS --- */}
      {sections.length > 0 && (
        <nav aria-label='On this page'>
          <ul className='flex flex-wrap gap-2'>
            {sections.map(s => (
              <li key={s.key}>
                <a
                  href={`#${s.key}`}
                  className='bg-kapwa-bg-surface border-kapwa-border-weak text-kapwa-text-strong type-meta inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 font-semibold transition-colors duration-(--dur-fast) hover:border-kapwa-border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kapwa-border-brand'
                >
                  {s.title}
                  <span className='text-kapwa-text-support'>
                    {itemsOf(s).length}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* --- CATEGORY FILTER --- */}
      {chips.length > 0 && (
        <div className='space-y-1'>
          <div
            role='group'
            aria-label='Filter by category'
            className='flex flex-wrap gap-2'
          >
            {[null, ...chips].map(c => {
              const on = (c ?? null) === active;
              return (
                <button
                  key={c ?? 'all'}
                  type='button'
                  aria-pressed={on}
                  onClick={() => choose(c)}
                  className={`type-meta inline-flex min-h-11 items-center rounded-full border px-4 font-semibold transition-colors duration-(--dur-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kapwa-border-brand ${on ? 'bg-kapwa-bg-brand-default border-kapwa-border-brand text-kapwa-text-inverse' : 'bg-kapwa-bg-surface border-kapwa-border-weak text-kapwa-text-strong hover:border-kapwa-border-brand'}`}
                >
                  {c ? `${CHIP_LABEL[c]} · ${counts[c]}` : 'All'}
                </button>
              );
            })}
          </div>
          <p aria-live='polite' className='sr-only'>
            {active
              ? `Showing ${counts[active]} ${CHIP_LABEL[active].toLowerCase()} records`
              : ''}
          </p>
        </div>
      )}

      {/* --- MY TRIP --- */}
      <div className='space-y-1'>
        {trip.ids.length > 0 && (
          <Link
            to={`/tourism/explore?trip=${serializeTripDays(trip.days)}`}
            className='text-kapwa-text-brand type-meta inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline'
          >
            <BookmarkIcon aria-hidden='true' className='h-4 w-4' />
            My trip: {trip.ids.length} stop{trip.ids.length === 1 ? '' : 's'} ·
            Open in Explore
          </Link>
        )}
        <p
          role='status'
          aria-live='polite'
          className='text-kapwa-text-support type-meta'
        >
          {tripNote}
        </p>
      </div>

      {/* --- SECTIONS --- */}
      {sections.map(s => (
        <div key={s.key} id={s.key}>
          <section
            aria-labelledby={`${s.key}-heading`}
            className='bg-kapwa-bg-surface border-kapwa-border-weak overflow-hidden rounded-2xl border shadow-sm'
          >
            <div className='bg-kapwa-bg-surface-raised/50 border-kapwa-border-weak flex items-center gap-2 border-b px-6 py-4'>
              <s.icon
                aria-hidden='true'
                className='text-kapwa-text-brand h-4 w-4'
              />
              <h2
                id={`${s.key}-heading`}
                className='text-kapwa-text-support type-meta font-bold tracking-widest uppercase'
              >
                {s.title}
              </h2>
            </div>
            <div className='space-y-4 p-6'>
              <ul
                id={`${s.key}-list`}
                className='grid grid-cols-1 gap-4 md:grid-cols-2'
              >
                {shownOf(s).map(({ entry, i, rec, category }) => {
                  // Nameless entries are free-text paragraphs, kept as they were.
                  if (!rec)
                    return (
                      <li key={`${s.key}-${i}`}>
                        <Card
                          hover={false}
                          className='border-kapwa-border-weak h-full shadow-elev-1'
                        >
                          <CardContent className='p-4'>
                            <p className='text-kapwa-text-support type-body'>
                              {entry.description}
                            </p>
                          </CardContent>
                        </Card>
                      </li>
                    );
                  return (
                    <li key={rec.id}>
                      <RecordCard
                        rec={rec}
                        category={category ?? undefined}
                        corner={
                          rec.layer === 'event' ? (
                            <DateTileBadge description={rec.description} />
                          ) : undefined
                        }
                        saved={trip.ids.includes(rec.id)}
                        onToggleSave={toggleSave}
                      >
                        {rec.location && (
                          <p className='text-kapwa-text-muted type-meta'>
                            Location/barangay: {rec.location}
                          </p>
                        )}
                        {rec.layer === 'event' && (
                          <p className='text-kapwa-text-muted type-meta'>
                            Last checked:{' '}
                            {rec.dates?.lastCheckedAt ?? 'Not recorded'}
                          </p>
                        )}
                        <Link
                          to={`/tourism/explore?town=${municipality.slug}&sel=${rec.id}`}
                          className='text-kapwa-text-brand type-meta mt-auto inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline'
                        >
                          <MapIcon aria-hidden='true' className='h-4 w-4' />
                          See on map
                          <span className='sr-only'>
                            : {displayName(rec.name)}
                          </span>
                        </Link>
                      </RecordCard>
                    </li>
                  );
                })}
              </ul>
              {collapsible(s) && (
                <button
                  type='button'
                  aria-expanded={spotsOpen}
                  aria-controls={`${s.key}-list`}
                  onClick={() =>
                    setOpenSpots(spotsOpen ? null : municipality.slug)
                  }
                  className='bg-kapwa-bg-surface border-kapwa-border-weak text-kapwa-text-strong type-body inline-flex min-h-11 w-full items-center justify-center rounded-full border px-4 font-semibold transition-colors duration-(--dur-fast) hover:border-kapwa-border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kapwa-border-brand'
                >
                  {spotsOpen
                    ? 'Show fewer spots'
                    : `Show all ${namedSpots} spots`}
                </button>
              )}
              {s.key === 'festivals' && (
                <MoreEvents slug={municipality.slug} name={municipality.name} />
              )}
            </div>
          </section>
        </div>
      ))}

      {/* --- SOURCE NOTE --- */}
      <p className='text-kapwa-text-support text-xs italic'>
        Adapted from the official{' '}
        <a
          href={`https://aklan.gov.ph/tourism/${municipality.slug}/`}
          target='_blank'
          rel='noreferrer'
          className='text-kapwa-text-brand not-italic hover:underline'
        >
          Aklan Provincial Government Tourism page for {municipality.name}
          <ExternalLinkIcon className='ml-1 inline h-3 w-3' />
        </a>
        .
      </p>

      <p className='type-meta text-kapwa-text-support'>
        Spotted a mistake?{' '}
        <a
          href={`${config.portal.githubUrl}/issues/new?title=${encodeURIComponent(`Tourism fix: ${municipality.name}`)}&body=${encodeURIComponent(`Page: /tourism/${municipality.slug}\n\nWhat is wrong, and where can the correct information be checked?\n`)}`}
          target='_blank'
          rel='noreferrer'
          className='text-kapwa-text-brand inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline'
        >
          <FlagIcon aria-hidden='true' className='h-4 w-4' />
          Suggest a fix
          <span className='sr-only'> (opens GitHub in a new tab)</span>
        </a>
      </p>

      {/* --- PREV / NEXT --- */}
      <div className='border-kapwa-border-weak flex items-center justify-between gap-4 border-t pt-6'>
        <Link
          to={`/tourism/${prev.slug}`}
          state={{ scrollToContent: true }}
          className='text-kapwa-text-support hover:text-kapwa-text-brand flex items-center gap-1.5 text-sm font-bold transition-colors'
        >
          <ChevronLeft className='h-4 w-4' />
          {prev.name}
        </Link>
        <CalendarHeart
          className='text-kapwa-text-disabled h-4 w-4'
          aria-hidden='true'
        />
        <Link
          to={`/tourism/${next.slug}`}
          state={{ scrollToContent: true }}
          className='text-kapwa-text-support hover:text-kapwa-text-brand flex items-center gap-1.5 text-sm font-bold transition-colors'
        >
          {next.name}
          <ChevronRight className='h-4 w-4' />
        </Link>
      </div>
    </div>
  );
}
