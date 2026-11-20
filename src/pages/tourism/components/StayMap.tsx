import { useMemo, useState } from 'react';

import { XIcon } from 'lucide-react';

import { Card } from '@/components/ui/Card';

import { googleMapsUrl, type StayGroup } from '@/lib/tourism/accommodations';
import type { GeocodePrecision } from '@/types/tourism';

import AklanMap3D, { type MapPin } from './AklanMap3D';
import { LAYER_COLOR } from './layerMeta';
import SaveToTripButton from './SaveToTripButton';
import { SOURCES, TIER_COLOR } from './tourismData';

export interface StayPoint {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  geocodePrecision: GeocodePrecision;
}

interface Props {
  groups: StayGroup<StayPoint>[];
  /** Resting view; null shows the whole province. */
  view: [[number, number], [number, number]] | null;
  selectedId: string | null;
  onSelect: (groupId: string | null) => void;
  saved: string[];
  onToggleSave: (stayId: string) => void;
}

const NO_TIERS = new Map<string, number>();

/**
 * Accommodations on the Explore map (MapLibre): the same pins, clustering and
 * camera. Stays that share one coordinate are one pin; choosing it lists them
 * all below the map, with Save to trip and a Google Maps link.
 */
export default function StayMap({
  groups,
  view,
  selectedId,
  onSelect,
  saved,
  onToggleSave,
}: Props) {
  const [failed, setFailed] = useState(false);
  const pins = useMemo<MapPin[]>(
    () =>
      groups.map(g => ({
        id: g.id,
        name:
          g.items.length === 1
            ? g.items[0].name
            : `${g.items.length} establishments`,
        lat: g.lat,
        lon: g.lon,
        color: LAYER_COLOR.stay,
        layer: 'stay',
        town: null,
        approximate: g.items.some(p => p.geocodePrecision !== 'exact'),
        label: 'Accommodations',
      })),
    [groups]
  );
  const group = groups.find(g => g.id === selectedId) ?? null;
  const selectedPin = pins.find(p => p.id === selectedId) ?? null;

  return (
    <div className='space-y-3'>
      <Card className='overflow-hidden p-0' hover={false}>
        <div className='relative isolate h-[55vh] min-h-[320px] w-full sm:h-[60vh] [&_.maplibregl-ctrl-group_button]:!h-11 [&_.maplibregl-ctrl-group_button]:!w-11'>
          {failed ? (
            <p className='text-kapwa-text-support type-body flex h-full items-center justify-center p-6 text-center'>
              The map couldn&apos;t load in this browser. Every establishment is
              still in the list below.
            </p>
          ) : (
            <AklanMap3D
              boundaries={SOURCES.boundaries}
              townTier={NO_TIERS}
              tierColors={TIER_COLOR}
              townCount={NO_TIERS}
              town=''
              view={view}
              pins={pins}
              selected={selectedPin}
              onTown={() => undefined}
              onPin={onSelect}
              onBackground={() => onSelect(null)}
              onLoadError={() => setFailed(true)}
            />
          )}
        </div>
      </Card>

      {group && (
        <section
          aria-labelledby='stay-pin-heading'
          className='bg-kapwa-bg-surface border-kapwa-border-weak space-y-3 rounded-card border p-4 shadow-elev-1'
        >
          <div className='flex items-start justify-between gap-3'>
            <div className='space-y-1'>
              <h2
                id='stay-pin-heading'
                className='text-kapwa-text-strong type-body font-bold'
              >
                {group.items.length === 1
                  ? group.items[0].name
                  : `${group.items.length} establishments at this pin`}
              </h2>
              {group.items.length > 1 && (
                <p className='text-kapwa-text-support type-meta'>
                  Their published addresses aren&apos;t precise enough to place
                  them individually.
                </p>
              )}
            </div>
            <button
              type='button'
              onClick={() => onSelect(null)}
              aria-label='Close'
              className='text-kapwa-text-support hover:text-kapwa-text-strong inline-flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-kapwa-border-brand'
            >
              <XIcon aria-hidden='true' className='h-5 w-5' />
            </button>
          </div>
          <ul className='divide-kapwa-border-weak max-h-72 divide-y overflow-y-auto'>
            {group.items.map(p => (
              <li
                key={p.id}
                className='flex items-start justify-between gap-3 py-2'
              >
                <div className='min-w-0 space-y-0.5'>
                  {group.items.length > 1 && (
                    <p className='text-kapwa-text-strong type-body font-semibold'>
                      {p.name}
                    </p>
                  )}
                  <p className='text-kapwa-text-support type-meta'>
                    {p.address}
                  </p>
                  {p.geocodePrecision !== 'exact' && (
                    <p className='text-kapwa-text-support text-xs font-bold'>
                      Approximate pin · {p.geocodePrecision} level
                    </p>
                  )}
                </div>
                <SaveToTripButton
                  name={p.name}
                  saved={saved.includes(p.id)}
                  onToggle={() => onToggleSave(p.id)}
                />
              </li>
            ))}
          </ul>
          <a
            href={googleMapsUrl(group.lat, group.lon)}
            target='_blank'
            rel='noreferrer'
            className='text-kapwa-text-brand type-meta inline-flex min-h-11 items-center gap-1 font-semibold hover:underline'
          >
            {group.items.length === 1
              ? 'Open in Google Maps →'
              : 'Open this area in Google Maps →'}
            <span className='sr-only'> (opens in a new tab)</span>
          </a>
        </section>
      )}
    </div>
  );
}
