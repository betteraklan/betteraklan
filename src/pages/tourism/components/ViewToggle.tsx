import { ListIcon, MapIcon } from 'lucide-react';

type View = 'map' | 'list';

/** Map / List switch; the highlight slides between the two segments. */
export default function ViewToggle({
  view,
  onChange,
  floating = false,
}: {
  view: View;
  onChange: (v: View) => void;
  floating?: boolean;
}) {
  return (
    <div
      role='group'
      aria-label='View'
      className={`relative grid grid-cols-2 rounded-full p-1 text-sm font-bold ${floating ? 'bg-[#0f234b] text-white shadow-elev-3' : 'bg-kapwa-bg-surface border-kapwa-border-weak border'}`}
    >
      <span
        aria-hidden='true'
        className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full transition-transform duration-(--dur-base) ease-out-expo motion-reduce:transition-none ${floating ? 'bg-white' : 'bg-kapwa-bg-brand-default'} ${view === 'list' ? 'translate-x-full' : ''}`}
      />
      {(['map', 'list'] as const).map(v => {
        const on = view === v;
        const Icon = v === 'map' ? MapIcon : ListIcon;
        return (
          <button
            key={v}
            type='button'
            aria-pressed={on}
            onClick={() => onChange(v)}
            className={`relative z-[1] inline-flex min-h-11 items-center justify-center gap-2 px-4 capitalize transition-colors duration-(--dur-base) ${on ? (floating ? 'text-[#0f234b]' : 'text-kapwa-text-inverse') : ''}`}
          >
            <Icon aria-hidden='true' className='h-4 w-4' />
            {v}
          </button>
        );
      })}
    </div>
  );
}
