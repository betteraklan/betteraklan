import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  BedDoubleIcon,
  CloudSunIcon,
  ExternalLinkIcon,
  GlobeIcon,
  PhoneCallIcon,
} from 'lucide-react';

import { hotlinesUrl, websiteUrl } from '@/lib/tourism/gettingHere';
import { fetchWeatherForCity } from '@/lib/weather';

import municipal from '@/data/directory/municipal.json';
import type { WeatherData } from '@/types';

import { staysIn } from './tourismData';

const ROW =
  'flex min-h-11 items-center gap-3 rounded-panel border border-kapwa-border-weak p-3';

/** The municipal hall's website from the directory, or null (none is recorded yet). */
function municipalWebsite(slug: string): string | null {
  const m = (municipal as { slug: string; website: string | null }[]).find(
    x => x.slug === `municipality-of-${slug}`
  );
  return websiteUrl(m?.website);
}

/**
 * "Plan your visit" on a town page. Every row comes from data or a live
 * service: the stays count from the accommodations data, the weather from the
 * weather API, the hotlines link to the existing Aklan hotlines page, and the
 * website from the directory. A row with nothing behind it is left out, and a
 * weather failure falls back to the plain link.
 *
 * Travel times and boat or road steps are not shown: no sourced field holds
 * them.
 */
export default function PlanYourVisit({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  useEffect(() => {
    let live = true;
    setWeather(null);
    fetchWeatherForCity(name).then(
      w => live && setWeather(w),
      () => undefined // quiet: the link below still works
    );
    return () => {
      live = false;
    };
  }, [name]);

  const stays = staysIn(slug);
  const website = municipalWebsite(slug);

  return (
    <section
      aria-labelledby='plan-heading'
      className='bg-kapwa-bg-brand-weak border-kapwa-border-weak space-y-3 rounded-card border p-4 md:p-6'
    >
      <h2 id='plan-heading' className='kapwa-heading-md text-kapwa-text-strong'>
        Plan your visit
      </h2>
      <ul className='grid gap-3 sm:grid-cols-2'>
        {stays > 0 && (
          <li className={`${ROW} bg-kapwa-bg-surface`}>
            <BedDoubleIcon
              aria-hidden='true'
              className='text-kapwa-text-brand h-5 w-5 shrink-0'
            />
            <Link
              to={`/tourism/explore?layer=stay&town=${slug}&view=list`}
              className='text-kapwa-text-strong type-body font-semibold hover:underline'
            >
              {stays} place{stays === 1 ? '' : 's'} to stay in {name}
            </Link>
          </li>
        )}

        <li className={`${ROW} bg-kapwa-bg-surface`}>
          <CloudSunIcon
            aria-hidden='true'
            className='text-kapwa-text-brand h-5 w-5 shrink-0'
          />
          <span className='type-body'>
            {weather ? (
              <span className='text-kapwa-text-strong font-semibold'>
                {weather.temperature}°C, {weather.condition}.{' '}
              </span>
            ) : null}
            <Link
              to='/map'
              className='text-kapwa-text-brand font-semibold hover:underline'
            >
              Weather in {name}
              <span className='sr-only'> on the map</span>
            </Link>
          </span>
        </li>

        <li className={`${ROW} bg-kapwa-bg-surface`}>
          <PhoneCallIcon
            aria-hidden='true'
            className='text-kapwa-text-brand h-5 w-5 shrink-0'
          />
          <a
            href={hotlinesUrl(name)}
            target='_blank'
            rel='noreferrer'
            className='text-kapwa-text-brand type-body inline-flex items-center gap-1 font-semibold hover:underline'
          >
            Emergency hotlines
            <ExternalLinkIcon aria-hidden='true' className='h-3.5 w-3.5' />
            <span className='sr-only'> (opens in a new tab)</span>
          </a>
        </li>

        {website && (
          <li className={`${ROW} bg-kapwa-bg-surface`}>
            <GlobeIcon
              aria-hidden='true'
              className='text-kapwa-text-brand h-5 w-5 shrink-0'
            />
            <a
              href={website}
              target='_blank'
              rel='noreferrer'
              className='text-kapwa-text-brand type-body inline-flex items-center gap-1 font-semibold hover:underline'
            >
              Municipality of {name} website
              <ExternalLinkIcon aria-hidden='true' className='h-3.5 w-3.5' />
              <span className='sr-only'> (opens in a new tab)</span>
            </a>
          </li>
        )}
      </ul>
    </section>
  );
}
