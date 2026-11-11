import type { ReactNode } from 'react';

import {
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarX2Icon,
  CheckCircle2Icon,
  CircleDashedIcon,
  MapPinOffIcon,
} from 'lucide-react';

import type { Rec } from '@/lib/tourism/explore';
import {
  DATE_STATUS_LABEL,
  formatDateRange,
} from '@/lib/tourism/festivalDates';

// Status pills: icon + sentence-case text, so status reads at a glance and never by colour alone.
const PILL_TONE = {
  ok: 'bg-kapwa-bg-success-weak text-kapwa-text-success border-kapwa-border-success',
  warn: 'bg-kapwa-bg-warning-weak text-kapwa-text-warning border-kapwa-border-warning',
  none: 'bg-kapwa-bg-surface-raised text-kapwa-text-support border-kapwa-border-weak',
} as const;

export function Pill({
  tone,
  icon: Icon,
  children,
}: {
  tone: keyof typeof PILL_TONE;
  icon: typeof CheckCircle2Icon;
  children: ReactNode;
}) {
  return (
    <span
      className={`type-meta inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold whitespace-nowrap ${PILL_TONE[tone]}`}
    >
      <Icon aria-hidden='true' className='h-4 w-4 shrink-0' />
      {children}
    </span>
  );
}

const LOCATION_PILL = {
  exact: { tone: 'ok', icon: CheckCircle2Icon, text: 'Exact pin' },
  approximate: {
    tone: 'warn',
    icon: CircleDashedIcon,
    text: 'Approximate pin',
  },
  none: { tone: 'none', icon: MapPinOffIcon, text: 'Not on map' },
} as const;

export function LocationPill({ placement }: { placement: Rec['placement'] }) {
  const p = LOCATION_PILL[placement];
  return (
    <Pill tone={p.tone} icon={p.icon}>
      {p.text}
    </Pill>
  );
}

export function DatePill({ rec }: { rec: Rec }) {
  const when = rec.dates?.start
    ? formatDateRange(rec.dates.start, rec.dates.end)
    : null;
  if (rec.dateStatus === 'confirmed' && when)
    return (
      <Pill tone='ok' icon={CalendarCheckIcon}>
        {when}
      </Pill>
    );
  if (rec.dateStatus === 'tentative' && when)
    return (
      <Pill tone='warn' icon={CalendarClockIcon}>
        Tentative · {when}
      </Pill>
    );
  return (
    <Pill tone='none' icon={CalendarX2Icon}>
      {DATE_STATUS_LABEL.unavailable}
    </Pill>
  );
}
