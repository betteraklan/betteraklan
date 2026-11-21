import { useState } from 'react';

import { BookmarkIcon } from 'lucide-react';

import { LAYER_LABEL, type Rec, teaser } from '@/lib/tourism/explore';

import type { Category } from '@/lib/tourism/category';

import CategoryBadge from './CategoryBadge';
import LayerGlyph from './LayerGlyph';
import TourismImage from './TourismImage';
import { DatePill, LocationPill } from './StatusPills';
import { displayName } from '@/lib/tourism/displayName';

interface Props {
  rec: Rec;
  selected?: boolean;
  /** Distance from the visitor ("3.2 km"), shown after the town (Near me). */
  distance?: string;
  /** Shown as a badge in the article form (town pages). */
  category?: Category;
  /**
   * Makes the whole card a button (Explore). Without it the card is an
   * article that shows the full description and `children`, for pages that
   * list records in full (town pages).
   */
  onSelect?: (id: string) => void;
  /** Laid over the image's top-left corner, article form only (date tile). */
  corner?: React.ReactNode;
  /** Extra details and links, shown only in the article form. */
  children?: React.ReactNode;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
  /** Pointer or focus on the card (null when it leaves), to highlight its pin. */
  onHover?: (id: string | null) => void;
}

/**
 * Image-first result card. The photo frame is TourismImage (fixed 16:10,
 * lazy, credited); without a photo it shows the layer's fallback tile. The bookmark is a sibling of the card button
 * (buttons can't nest) laid over the image corner.
 */
export default function RecordCard({
  rec,
  selected = false,
  onSelect,
  category,
  distance,
  corner,
  children,
  saved = false,
  onToggleSave,
  onHover,
}: Props) {
  // Spring only in response to a tap, never on first render.
  const [spring, setSpring] = useState(0);
  const nameId = `rec-${rec.id}-name`;

  const pills = (
    <span className='flex flex-wrap items-center gap-1.5'>
      <span className='type-meta border-kapwa-border-weak text-kapwa-text-strong inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold'>
        <LayerGlyph layer={rec.layer} />
        {LAYER_LABEL[rec.layer]}
      </span>
      {category && <CategoryBadge category={category} />}
      {rec.layer === 'event' && <DatePill rec={rec} />}
      {rec.placement !== 'exact' && <LocationPill placement={rec.placement} />}
    </span>
  );

  return (
    <div
      data-rec={rec.id}
      className='relative h-full'
      onMouseEnter={() => onHover?.(rec.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(rec.id)}
      onBlur={() => onHover?.(null)}
    >
      {onSelect ? (
        <button
          type='button'
          aria-pressed={selected}
          onClick={() => onSelect(rec.id)}
          className={`group bg-kapwa-bg-surface border-kapwa-border-weak flex h-full w-full flex-col overflow-hidden rounded-panel border text-left shadow-elev-1 transition-[box-shadow,translate] duration-(--dur-fast) ease-out-expo hover:shadow-elev-2 motion-safe:hover:-translate-y-0.5 ${selected ? 'ring-2 ring-[#1D4FB0]' : ''}`}
        >
          <TourismImage image={rec.image} layer={rec.layer} links={false} />

          <span className='flex flex-1 flex-col gap-1.5 p-3'>
            <span className='text-kapwa-text-strong type-body line-clamp-2 pr-1 font-semibold'>
              {displayName(rec.name)}
            </span>
            {(rec.townName || distance) && (
              <span className='text-kapwa-text-support type-meta'>
                {[rec.townName, distance && `${distance} away`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
            {pills}
            {rec.description && (
              <span className='text-kapwa-text-support type-meta line-clamp-1'>
                {teaser(rec.description)}
              </span>
            )}
          </span>
        </button>
      ) : (
        <article
          aria-labelledby={nameId}
          className='bg-kapwa-bg-surface border-kapwa-border-weak flex h-full w-full flex-col overflow-hidden rounded-panel border shadow-elev-1'
        >
          <TourismImage image={rec.image} layer={rec.layer} />
          <div className='flex flex-1 flex-col gap-2 p-4'>
            <h3
              id={nameId}
              className='text-kapwa-text-strong type-body pr-1 font-semibold'
            >
              {displayName(rec.name)}
            </h3>
            {corner && <div className='absolute top-2 left-2'>{corner}</div>}
            {pills}
            {rec.description && (
              <p className='text-kapwa-text-support type-body'>
                {rec.description}
              </p>
            )}
            {children}
          </div>
        </article>
      )}

      {onToggleSave && (
        <button
          type='button'
          aria-pressed={saved}
          aria-label={
            saved
              ? `Remove ${displayName(rec.name)} from my trip`
              : `Add ${displayName(rec.name)} to my trip`
          }
          onClick={() => {
            onToggleSave(rec.id);
            setSpring(n => n + 1);
          }}
          className='absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-elev-2 backdrop-blur-sm'
        >
          <span
            key={spring}
            className={`inline-flex ${spring ? 'motion-safe:animate-[bookmark-spring_450ms_var(--ease-kapwa-spring)]' : ''}`}
          >
            <BookmarkIcon
              aria-hidden='true'
              className={`h-5 w-5 ${saved ? 'text-[#1D4FB0]' : 'text-kapwa-text-support'}`}
              fill={saved ? 'currentColor' : 'none'}
            />
          </span>
        </button>
      )}
    </div>
  );
}
