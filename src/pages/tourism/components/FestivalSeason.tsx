import { MONTH_NAMES } from '@/lib/tourism/festivalDateText';

interface Props {
  /** 0 for all months, otherwise 1 (January) to 12 (December). */
  month: number;
  /** Festivals each month names, January first (12 numbers). */
  counts: number[];
  onChange: (month: number) => void;
}

/**
 * "Festival season": a month slider under the map. A native range input, so
 * arrow keys, Page Up/Down and Home/End all work and screen readers announce
 * the month and its festival count.
 */
export default function FestivalSeason({ month, counts, onChange }: Props) {
  const text =
    month === 0
      ? 'All months'
      : `${MONTH_NAMES[month - 1]}: ${counts[month - 1]} festival${counts[month - 1] === 1 ? '' : 's'}`;
  return (
    <div className='border-kapwa-border-weak flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2'>
      <label
        htmlFor='festival-season'
        className='text-kapwa-text-strong type-meta shrink-0 font-semibold'
      >
        Festival season
      </label>
      <input
        id='festival-season'
        type='range'
        min={0}
        max={12}
        step={1}
        value={month}
        aria-valuetext={text}
        onChange={e => onChange(Number(e.target.value))}
        className='accent-kapwa-brand-600 h-11 min-w-40 flex-1 cursor-pointer'
      />
      <output
        htmlFor='festival-season'
        className='text-kapwa-text-support type-meta w-36 shrink-0'
      >
        {text}
      </output>
    </div>
  );
}
