import type { TownShape } from '@/lib/tourism/shapes';

/**
 * Small static map of the 17 municipalities that highlights the one being
 * read. Visual aid only (the text already names each place), so it is hidden
 * from assistive technology.
 */
export default function MiniMap({
  shapes,
  active,
}: {
  shapes: { viewBox: string; towns: TownShape[] };
  active: string | null;
}) {
  const name = shapes.towns.find(t => t.slug === active)?.name;
  return (
    <figure aria-hidden='true' className='surface-glass p-3'>
      <svg viewBox={shapes.viewBox} className='h-auto w-full'>
        {shapes.towns.map(t => (
          <path
            key={t.slug}
            d={t.d}
            fill={t.slug === active ? '#1D4FB0' : '#D6E4FA'}
            stroke='#ffffff'
            strokeWidth={1}
            vectorEffect='non-scaling-stroke'
            className='transition-[fill] duration-(--dur-base) ease-out-expo motion-reduce:transition-none'
          />
        ))}
      </svg>
      <figcaption className='type-meta mt-2 text-center font-semibold'>
        <span
          key={active ?? 'aklan'}
          className='inline-block motion-safe:animate-[list-fade-in_var(--dur-base)_linear_both]'
        >
          {name ?? 'All of Aklan'}
        </span>
      </figcaption>
    </figure>
  );
}
