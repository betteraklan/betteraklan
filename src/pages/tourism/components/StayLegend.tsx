import LayerGlyph from './LayerGlyph';

/**
 * Key to the stay map. Each entry is a shape plus words, so nothing depends on
 * colour alone: a solid square is an exact pin, a dashed hollow square an
 * approximate one, and a round bubble a group of nearby pins. The shapes are
 * the ones the map draws.
 */
export default function StayLegend() {
  return (
    <ul
      aria-label='Map legend'
      className='text-kapwa-text-support type-meta flex flex-wrap gap-x-6 gap-y-2'
    >
      <li className='flex items-center gap-2'>
        <LayerGlyph layer='stay' size={18} />
        <span>
          <strong className='text-kapwa-text-strong'>Exact pin</strong>: the
          published address was found
        </span>
      </li>
      <li className='flex items-center gap-2'>
        <LayerGlyph layer='stay' hollow size={18} />
        <span>
          <strong className='text-kapwa-text-strong'>Approximate pin</strong>:
          at the barangay or municipality centre
        </span>
      </li>
      <li className='flex items-center gap-2'>
        <svg
          aria-hidden='true'
          width={18}
          height={18}
          viewBox='0 0 18 18'
          className='text-kapwa-text-brand shrink-0'
        >
          <circle cx={9} cy={9} r={8} fill='currentColor' />
        </svg>
        <span>
          <strong className='text-kapwa-text-strong'>Round bubble</strong>: a
          group of nearby pins, tap to zoom in
        </span>
      </li>
      <li>
        Stays that share one address share one pin; tap it to see all of them.
      </li>
    </ul>
  );
}
