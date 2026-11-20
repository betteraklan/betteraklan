import { useRef } from 'react';
import { Link } from 'react-router-dom';

import {
  ArrowRight,
  CalendarHeart,
  CompassIcon,
  ExternalLinkIcon,
  LifeBuoyIcon,
  MapIcon,
  MapPinIcon,
  PartyPopperIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TreesIcon,
  WavesIcon,
} from 'lucide-react';

import {
  Breadcrumb,
  BreadcrumbHome,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/navigation/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { YouTubeFacade } from '@/components/ui/YouTubeFacade';

import { config } from '@/lib/lguConfig';
import { lguLabels } from '@/lib/lguLabels';
import { displayName } from '@/lib/tourism/displayName';
import { type BoundaryFeature, findMunicipalityAt } from '@/lib/tourism/geo';
import { projectTowns } from '@/lib/tourism/shapes';

import boundaryData from '@/data/geo/municipalities-boundaries.json';
import featuredAttractions from '@/data/tourism/resorts.json';
import municipalitiesTourism from '@/data/tourism/municipalities.json';
import { FeaturedAttraction } from '@/types/tourism';

import FestivalBand from './components/FestivalBand';
import GettingHere from './components/GettingHere';
import { LAYER_ICON } from './components/layerMeta';
import MiniMap from './components/MiniMap';
import OverviewSearch from './components/OverviewSearch';
import PlacesTabs from './components/PlacesTabs';
import { HERO_CHIPS } from './components/tourismNav';
import { COUNTS } from './components/tourismData';
import TourismHero from './components/TourismHero';
import { useActiveTown, useReveal } from './components/useScrollStory';

const BOUNDARIES = (boundaryData as { features: BoundaryFeature[] }).features;
const SHAPES = projectTowns(BOUNDARIES, 600, 2);

// Every count on this page comes from the tourism JSON files.
const HOTLINES = `https://hotlines.bettergov.ph/?city=${encodeURIComponent(config.lgu.name)}&province=${encodeURIComponent(config.lgu.province)}`;

// Gentle hover lift for cards; the movement is off under reduced motion.
const LIFT =
  'transition-[translate,box-shadow,border-color] duration-(--dur-fast) ease-out-expo hover:border-kapwa-border-brand hover:shadow-elev-2 motion-safe:hover:-translate-y-0.5';
const GROUP_LIFT =
  'transition-[translate,box-shadow,border-color] duration-(--dur-fast) ease-out-expo group-hover:border-kapwa-border-brand group-hover:shadow-elev-2 group-focus-visible:border-kapwa-border-brand motion-safe:group-hover:-translate-y-0.5';
const TILE =
  'border-kapwa-border-weak flex h-full min-h-20 items-center gap-3 rounded-card border p-4 focus-visible:outline-2 focus-visible:outline-kapwa-border-brand';

function SectionHead({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div
      data-reveal
      className='border-kapwa-border-weak flex items-center gap-2 border-b pb-3'
    >
      <Icon aria-hidden='true' className='text-kapwa-text-brand h-4 w-4' />
      <h2 className='kapwa-heading-md text-kapwa-text-strong'>{children}</h2>
    </div>
  );
}

function TileBody({
  icon: Icon,
  iconTint,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconTint: string;
  title: React.ReactNode;
  text: React.ReactNode;
}) {
  return (
    <>
      <Icon aria-hidden='true' className={`${iconTint} h-6 w-6 shrink-0`} />
      <span>
        <span className='text-kapwa-text-strong type-body flex items-center gap-1 font-semibold'>
          {title}
        </span>
        <span className='text-kapwa-text-support type-meta'>{text}</span>
      </span>
    </>
  );
}

function attractionIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('beach') || n.includes('island') || n.includes('point'))
    return WavesIcon;
  if (n.includes('falls') || n.includes('spring') || n.includes('eco'))
    return TreesIcon;
  if (n.includes('festival')) return PartyPopperIcon;
  return SparklesIcon;
}

export default function TourismIndex() {
  const attractions = featuredAttractions as FeaturedAttraction[];
  const municipalities = [...municipalitiesTourism].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  const activeTown = useActiveTown(root);

  return (
    <div ref={root} className='space-y-10'>
      <TourismHero
        title='Discover Aklan'
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList className='text-white/70'>
              <BreadcrumbItem>
                <BreadcrumbHome
                  href='/'
                  aria-label='Home'
                  className='text-white/90 hover:text-white'
                />
              </BreadcrumbItem>
              <BreadcrumbSeparator className='text-white/70' />
              <BreadcrumbItem>
                <BreadcrumbPage className='text-white'>Tourism</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        search={<OverviewSearch onDark />}
        chips={[...HERO_CHIPS]}
        stats={[
          { value: COUNTS.towns, label: 'Municipalities' },
          { value: COUNTS.spots, label: 'Spots and attractions' },
          { value: COUNTS.festivals, label: 'Festivals' },
          { value: COUNTS.stays, label: 'Places to stay' },
        ]}
        video={
          <YouTubeFacade
            videoId='0iy3YKv1FZk'
            title='Welcome to Aklan!'
            subtitle='Watch · Aklan Tourism'
          />
        }
        description={`From the world-famous shores of Boracay to the hidden waterfalls and centuries-old festivals of its ${COUNTS.towns} municipalities, ${lguLabels.fullName} invites you to discover a province where nature, culture, and hospitality meet.`}
      />

      {/* --- QUICK TILES --- */}
      <section aria-label='Plan your visit' data-town=''>
        <ul className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
          <li data-reveal style={{ '--i': 0 } as React.CSSProperties}>
            <Link
              to='/tourism/explore?layer=stay&view=list'
              className={`bg-kapwa-bg-brand-weak ${TILE} ${LIFT}`}
            >
              <TileBody
                icon={LAYER_ICON.stay}
                iconTint='text-kapwa-text-brand'
                title='Where to stay'
                text={`${COUNTS.stays} places to stay in Boracay and the mainland`}
              />
            </Link>
          </li>
          <li data-reveal style={{ '--i': 1 } as React.CSSProperties}>
            <a
              href='#festivals'
              className={`bg-kapwa-bg-accent-orange-weak ${TILE} ${LIFT}`}
            >
              <TileBody
                icon={LAYER_ICON.event}
                iconTint='text-kapwa-text-accent-orange'
                title='Festivals'
                text={`${COUNTS.festivals} festivals through the year`}
              />
            </a>
          </li>
          <li data-reveal style={{ '--i': 2 } as React.CSSProperties}>
            <a
              href={HOTLINES}
              target='_blank'
              rel='noreferrer'
              className={`bg-kapwa-bg-surface ${TILE} ${LIFT}`}
            >
              <TileBody
                icon={LifeBuoyIcon}
                iconTint='text-kapwa-text-brand'
                title={
                  <>
                    Help while travelling
                    <ExternalLinkIcon
                      aria-hidden='true'
                      className='h-3.5 w-3.5'
                    />
                  </>
                }
                text={
                  <>
                    Emergency hotlines for Aklan
                    <span className='sr-only'>
                      {' '}
                      (opens hotlines.bettergov.ph in a new tab)
                    </span>
                  </>
                }
              />
            </a>
          </li>
        </ul>
      </section>

      {/* --- GETTING HERE (airports from the data; live flights line) --- */}
      <GettingHere />

      {/* Reading column plus a sticky mini-map (wide screens) that follows it. */}
      <div className='xl:grid xl:grid-cols-[minmax(0,1fr)_200px] xl:gap-8'>
        <div className='min-w-0 space-y-12'>
          {/* --- PLACES TO VISIT --- */}
          <section data-town='' className='space-y-4'>
            <SectionHead icon={SparklesIcon}>Places to visit</SectionHead>
            <div data-reveal>
              <PlacesTabs />
            </div>
          </section>

          {/* --- FEATURED HIGHLIGHTS --- */}
          <section className='space-y-4'>
            <div
              data-reveal
              className='border-kapwa-border-weak flex items-center gap-2 border-b pb-3'
            >
              <CompassIcon
                aria-hidden='true'
                className='text-kapwa-text-brand h-4 w-4'
              />
              <h2 className='kapwa-heading-md text-kapwa-text-strong'>
                Featured Highlights
              </h2>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {attractions.map((spot, i) => {
                const Icon = attractionIcon(spot.name);
                const town =
                  findMunicipalityAt(
                    spot.latitude,
                    spot.longitude,
                    BOUNDARIES
                  ) ?? '';
                return (
                  <div
                    key={spot.id}
                    data-reveal
                    data-town={town}
                    style={{ '--i': i % 3 } as React.CSSProperties}
                    className='h-full'
                  >
                    <Card
                      hover={false}
                      className={`group flex h-full flex-col ${LIFT}`}
                    >
                      <CardContent className='flex h-full flex-col space-y-3 p-5'>
                        <div className='flex items-start gap-3'>
                          <div className='border-kapwa-border-brand bg-kapwa-bg-surface text-kapwa-text-brand group-hover:bg-kapwa-bg-brand-default group-hover:text-kapwa-text-inverse shrink-0 rounded-control border p-2 shadow-elev-1 transition-colors'>
                            <Icon className='h-5 w-5' />
                          </div>
                          <div className='min-w-0 flex-1'>
                            <h3 className='text-kapwa-text-strong text-base leading-tight font-bold'>
                              {displayName(spot.name)}
                            </h3>
                            <p className='text-kapwa-text-support mt-0.5 text-xs font-medium'>
                              {spot.address}
                            </p>
                          </div>
                        </div>

                        <p className='text-kapwa-text-support flex-1 text-sm leading-relaxed'>
                          {spot.notes}
                        </p>

                        <a
                          href={spot.google_maps_link}
                          target='_blank'
                          rel='noreferrer'
                          className='text-kapwa-text-brand mt-auto flex items-center gap-1.5 border-kapwa-border-weak border-t pt-3 text-xs font-bold tracking-widest uppercase hover:underline'
                        >
                          <MapPinIcon className='h-3.5 w-3.5' />
                          View on Map
                          <ExternalLinkIcon className='h-3 w-3' />
                        </a>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </section>

          {/* --- MAP TEASER --- */}
          <section
            data-reveal
            data-town=''
            aria-labelledby='map-teaser-heading'
            className='bg-kapwa-bg-brand-weak border-kapwa-border-weak grid items-center gap-6 rounded-card border p-4 sm:grid-cols-[200px_minmax(0,1fr)] md:p-6'
          >
            <div className='mx-auto w-full max-w-[200px]'>
              <MiniMap shapes={SHAPES} active={null} />
            </div>
            <div className='space-y-3'>
              <h2
                id='map-teaser-heading'
                className='kapwa-heading-md text-kapwa-text-strong'
              >
                See Aklan on the map
              </h2>
              <p className='text-kapwa-text-support type-body'>
                {COUNTS.records} BetterAklan records across {COUNTS.towns}{' '}
                municipalities: places, festivals, local products and places to
                stay.
              </p>
              <Link
                to='/tourism/explore?view=map'
                className='bg-kapwa-bg-brand-default hover:bg-kapwa-bg-brand-hover text-kapwa-text-inverse type-body inline-flex min-h-11 items-center gap-2 rounded-full px-5 font-semibold transition-colors duration-(--dur-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kapwa-border-brand'
              >
                <MapIcon aria-hidden='true' className='h-4 w-4' />
                Open the map
              </Link>
            </div>
          </section>

          {/* --- FESTIVALS THROUGH THE YEAR --- */}
          <FestivalBand />

          {/* --- EXPLORE BY MUNICIPALITY --- */}
          <section id='municipalities' className='scroll-mt-28 space-y-4'>
            <div
              data-reveal
              className='border-kapwa-border-weak flex items-center gap-2 border-b pb-3'
            >
              <MapPinIcon
                aria-hidden='true'
                className='text-kapwa-text-brand h-4 w-4'
              />
              <h2 className='kapwa-heading-md text-kapwa-text-strong'>
                Explore by Municipality
              </h2>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {municipalities.map((m, i) => (
                <Link
                  key={m.slug}
                  to={`/tourism/${m.slug}`}
                  data-reveal
                  data-town={m.slug}
                  style={{ '--i': i % 3 } as React.CSSProperties}
                  className='group block h-full'
                  aria-label={`Explore tourism in ${m.name}`}
                >
                  <Card
                    hover={false}
                    className={`border-kapwa-border-weak flex h-full flex-col shadow-elev-1 ${GROUP_LIFT}`}
                  >
                    <CardContent className='flex h-full flex-col space-y-4 p-4'>
                      <div className='flex items-start gap-3'>
                        <div className='bg-kapwa-bg-surface text-kapwa-text-brand border-kapwa-border-brand group-hover:bg-kapwa-bg-brand-default group-hover:text-kapwa-text-inverse shrink-0 rounded-control border p-2 shadow-elev-1 transition-colors'>
                          <MapPinIcon className='h-5 w-5' />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <h3 className='group-hover:text-kapwa-text-brand text-kapwa-text-strong text-base leading-tight font-bold transition-colors'>
                            {m.name}
                          </h3>
                          <p className='text-kapwa-text-support mt-0.5 text-xs font-bold tracking-widest uppercase'>
                            Municipality
                          </p>
                        </div>
                        <ArrowRight className='group-hover:text-kapwa-text-link text-kapwa-text-support mt-1 h-4 w-4 transition-all' />
                      </div>

                      <div className='mt-auto flex flex-wrap items-center gap-2 border-t border-kapwa-border-weak pt-3'>
                        <Badge variant='secondary' className='gap-1'>
                          <CalendarHeart className='h-3 w-3' />
                          {m.festivals.length} Festival
                          {m.festivals.length === 1 ? '' : 's'}
                        </Badge>
                        <Badge variant='primary' className='gap-1'>
                          <SparklesIcon className='h-3 w-3' />
                          {m.attractions.length} Attraction
                          {m.attractions.length === 1 ? '' : 's'}
                        </Badge>
                        {m.products.length > 0 && (
                          <Badge variant='slate' className='gap-1'>
                            <ShoppingBagIcon className='h-3 w-3' />
                            Local Products
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* --- SOURCE NOTE --- */}
          <p
            data-reveal
            className='text-kapwa-text-support text-center text-xs italic'
          >
            Attraction, festival, and product details are adapted from the
            official{' '}
            <a
              href='https://aklan.gov.ph/tourism/'
              target='_blank'
              rel='noreferrer'
              className='text-kapwa-text-brand not-italic hover:underline'
            >
              Aklan Provincial Government Tourism pages
            </a>
            . Photos and additional curated experiences are coming soon.
          </p>
        </div>
        <aside className='hidden xl:block'>
          <div className='sticky top-[calc(var(--tourism-sticky-top,128px)+8px)]'>
            <MiniMap shapes={SHAPES} active={activeTown} />
          </div>
        </aside>
      </div>
    </div>
  );
}
