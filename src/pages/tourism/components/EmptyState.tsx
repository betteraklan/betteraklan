interface Props {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
  /** 'error' tints the illustration warm for failures (e.g. the map didn't load). */
  tone?: 'empty' | 'error';
}

/** Designed empty / error state: small illustration, what happened, one action. */
export default function EmptyState({
  title,
  body,
  action,
  tone = 'empty',
}: Props) {
  const accent = tone === 'error' ? '#B45309' : '#1D4FB0';
  return (
    <div className='flex flex-col items-center px-6 py-10 text-center'>
      {/* Folded map with a magnifier: decorative. */}
      <svg aria-hidden='true' viewBox='0 0 120 96' className='mb-4 h-24 w-28'>
        <path
          d='M14 22 L42 12 L74 22 L104 12 L104 74 L74 84 L42 74 L14 84 Z'
          fill='#EEF3FB'
          stroke='#A9C7F5'
          strokeWidth='2'
          strokeLinejoin='round'
        />
        <path
          d='M42 12 L42 74 M74 22 L74 84'
          stroke='#A9C7F5'
          strokeWidth='2'
        />
        <path
          d='M24 54 C34 44 46 58 58 46 S82 40 94 48'
          fill='none'
          stroke='#D6E4FA'
          strokeWidth='3'
          strokeLinecap='round'
          strokeDasharray='2 6'
        />
        <circle
          cx='76'
          cy='46'
          r='15'
          fill='white'
          stroke={accent}
          strokeWidth='4'
        />
        <path
          d='M87 57 L100 70'
          stroke={accent}
          strokeWidth='6'
          strokeLinecap='round'
        />
        {tone === 'error' ? (
          <path
            d='M76 39 V48 M76 53 V54'
            stroke={accent}
            strokeWidth='3.5'
            strokeLinecap='round'
          />
        ) : (
          <path
            d='M70 46 h12'
            stroke='#A9C7F5'
            strokeWidth='3.5'
            strokeLinecap='round'
          />
        )}
      </svg>
      <h3 className='type-title text-kapwa-text-strong'>{title}</h3>
      <p className='text-kapwa-text-support type-body mt-1 max-w-sm'>{body}</p>
      {action && (
        <button
          type='button'
          onClick={action.onClick}
          className='bg-kapwa-bg-brand-default text-kapwa-text-inverse mt-4 min-h-11 rounded-control px-5 text-sm font-bold'
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
