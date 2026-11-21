import { useState } from 'react';

import type { Rec } from '@/lib/tourism/explore';
import type { TourismImage as Photo } from '@/types/tourism';

import { LAYER_ICON } from './layerMeta';

type Layer = Rec['layer'];

/** WebP photos come in 1200 and 600 px; let the browser pick by width. */
const srcSet = (src: string) =>
  src.endsWith('.webp')
    ? `${src.replace(/\.webp$/, '-600.webp')} 600w, ${src} 1200w`
    : undefined;

const STRIP =
  'type-meta absolute right-0 bottom-0 max-w-full bg-black/55 px-2 py-0.5 text-white';

/**
 * The visible credit. A CC photo's credit wraps rather than truncating, and
 * links the photo's page and its licence, as the licence requires. Inside a
 * card that is itself a button, links can't nest, so it shows the same words
 * as plain text; the town page's article cards link them.
 */
function Credit({ image, links }: { image: Photo; links: boolean }) {
  const text = `Photo: ${image.credit}`;
  if (!image.licenceUrl)
    return (
      <span title={text} className={`${STRIP} truncate`}>
        {text}
      </span>
    );
  return (
    <span className={`${STRIP} line-clamp-3`}>
      {links && image.sourcePage ? (
        <a
          href={image.sourcePage}
          target='_blank'
          rel='noreferrer'
          className='underline'
        >
          {text}
          <span className='sr-only'> (photo page, opens in a new tab)</span>
        </a>
      ) : (
        text
      )}{' '}
      {links ? (
        <a
          href={image.licenceUrl}
          target='_blank'
          rel='noreferrer license'
          className='font-semibold underline'
        >
          {image.licence}
          <span className='sr-only'> licence (opens in a new tab)</span>
        </a>
      ) : (
        <span className='font-semibold'>{image.licence}</span>
      )}
    </span>
  );
}

// Fallback tiles use only brand blue, orange and one existing teal (Tailwind
// teal-600, the repo's "Dark Teal"). Orange-700 keeps the white icon at 3:1+.
const TILE: Record<Layer, string> = {
  place: 'bg-kapwa-brand-600',
  stay: 'bg-kapwa-brand-700',
  event: 'bg-kapwa-orange-700',
  product: 'bg-teal-600',
};

interface Props {
  /** Verified photo from `tourism-images.json`; omit for the fallback tile. */
  image?: Photo;
  layer?: Layer;
  /**
   * Fill the parent as a backdrop (the hero) instead of a 16:10 frame. With no
   * photo it is a brand-950 to brand-600 gradient; a photo gets a brand-950
   * scrim so text over it stays readable. The parent keeps its own size, so a
   * photo can be dropped in later without any layout change.
   */
  fill?: boolean;
  /** False inside a card that is a button, where links cannot nest. */
  links?: boolean;
}

/**
 * Photo frame with a fixed 16:10 ratio, so the layout is set before the image
 * loads. Lazy-loaded, with its alt text and a visible credit line. Without a
 * photo, or if the photo fails, it shows the layer's fallback tile.
 */
export default function TourismImage({
  image,
  layer = 'place',
  fill = false,
  links = true,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const Icon = LAYER_ICON[layer];
  const showPhoto = !!image && !failed;

  if (fill)
    return (
      <span
        data-hero-backdrop={showPhoto ? 'photo' : 'gradient'}
        className='absolute inset-0 -z-10 block overflow-hidden bg-gradient-to-br from-kapwa-brand-950 to-kapwa-brand-600'
      >
        {showPhoto && (
          <>
            <img
              src={image.src}
              srcSet={srcSet(image.src)}
              sizes='100vw'
              alt={image.alt}
              width={1600}
              height={1000}
              decoding='async'
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={`h-full w-full object-cover transition-opacity duration-(--dur-base) ease-out-expo motion-reduce:transition-none ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
            {/* Scrim: keeps white text at 4.5:1 over any part of a photo. */}
            <span
              aria-hidden='true'
              className='absolute inset-0 bg-gradient-to-r from-kapwa-brand-950/90 via-kapwa-brand-950/60 to-kapwa-brand-950/20'
            />
            <Credit image={image} links={links} />
          </>
        )}
      </span>
    );

  return (
    <span
      className={`relative block aspect-[16/10] w-full overflow-hidden ${TILE[layer]} ${showPhoto && !loaded ? 'skeleton-shimmer' : ''}`}
    >
      {showPhoto ? (
        <>
          <img
            src={image.src}
            srcSet={srcSet(image.src)}
            sizes='(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw'
            alt={image.alt}
            width={1600}
            height={1000}
            loading='lazy'
            decoding='async'
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-(--dur-base) ease-out-expo motion-reduce:transition-none ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
          <Credit image={image} links={links} />
        </>
      ) : (
        <span
          aria-hidden='true'
          className='absolute inset-0 flex items-center justify-center'
        >
          <Icon className='h-10 w-10 text-white/85' strokeWidth={1.5} />
        </span>
      )}
    </span>
  );
}
