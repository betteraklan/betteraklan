import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  BookmarkIcon,
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  ExternalLinkIcon,
  MapIcon,
  PartyPopperIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from 'lucide-react';

import { DetailSection } from '@/components/layout/PageLayouts';
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
import { displayName } from '@/lib/tourism/displayName';
import { projectTowns } from '@/lib/tourism/shapes';
import { MAX_STOPS, serializeTrip } from '@/lib/tourism/trip';
import { useSavedTrip } from '@/lib/tourism/tripStore';

import municipalitiesTourism from '@/data/tourism/municipalities.json';
import type { Advisory, MunicipalityTourism } from '@/types/tourism';

import MiniMap from './components/MiniMap';
import RecordCard from './components/RecordCard';
import { AdvisoryKindPill } from './components/StatusPills';
import TourismHero from './components/TourismHero';
import { BY_ID, KNOWN_IDS, SOURCES } from './components/tourismData';

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
          className='text-kapwa-text-warning h-5 w-5'
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
  const { advisories, status: advisoriesStatus } = useAdvisories();
  const trip = useSavedTrip(KNOWN_IDS);
  const [tripNote, setTripNote] = useState('');
  const municipalities = municipalitiesTourism as MunicipalityTourism[];
  const index = municipalities.findIndex(m => m.slug === slug);
  const municipality = index >= 0 ? municipalities[index] : undefined;

  if (!municipality)
    return <div className='p-20 text-center'>Municipality not found</div>;

  const notices = advisoriesFor(municipality.slug, advisories);
  const prev =
    municipalities[(index - 1 + municipalities.length) % municipalities.length];
  const next = municipalities[(index + 1) % municipalities.length];
  const sections = SECTIONS.filter(s => municipality[s.key].length > 0);

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
            <BreadcrumbHome href='/' />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href='/tourism'>Tourism</BreadcrumbLink>
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
        shapes={SHAPES}
        aside={<MiniMap shapes={SHAPES} active={municipality.slug} />}
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
                    {municipality[s.key].length}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* --- MY TRIP --- */}
      <div className='space-y-1'>
        {trip.ids.length > 0 && (
          <Link
            to={`/tourism/explore?trip=${serializeTrip(trip.ids)}`}
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
          <DetailSection title={s.title} icon={s.icon}>
            <ul className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              {municipality[s.key].map((entry, i) => {
                const rec = entry.name
                  ? BY_ID.get(`${s.prefix}-${municipality.slug}-${i}`)
                  : undefined;
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
          </DetailSection>
        </div>
      ))}

      {/* --- SOURCE NOTE --- */}
      <p className='text-kapwa-text-disabled text-xs italic'>
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
