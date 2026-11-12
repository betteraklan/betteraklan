import { useId, useMemo, useRef, useState } from 'react';

import {
  ClockIcon,
  LocateFixedIcon,
  LoaderCircleIcon,
  MapPinnedIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';

import {
  LAYER_LABEL,
  type Rec,
  searchSuggestions,
} from '@/lib/tourism/explore';

import LayerGlyph from './LayerGlyph';

const RECENT_KEY = 'betteraklan:recent-searches';
const MAX_RECENT = 5;

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

type Option =
  | { kind: 'recent'; text: string }
  | { kind: 'town'; slug: string; name: string }
  | { kind: 'record'; rec: Rec };

interface Props {
  value: string;
  onChange: (q: string) => void;
  records: Rec[];
  towns: { slug: string; name: string }[];
  onPickRecord: (rec: Rec) => void;
  onPickTown: (slug: string) => void;
  onNearMe: () => void;
  locating: boolean;
}

/**
 * The page's main search: a combobox showing recent searches when empty and,
 * once two letters are typed, matching municipalities and records grouped by
 * layer. Recent searches stay in this browser only.
 */
export default function SearchBar({
  value,
  onChange,
  records,
  towns,
  onPickRecord,
  onPickTown,
  onNearMe,
  locating,
}: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState(readRecent);
  const inputRef = useRef<HTMLInputElement>(null);

  const remember = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const next = [t, ...recent.filter(r => r !== t)].slice(0, MAX_RECENT);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: recent searches just won't persist.
    }
  };
  const forget = () => {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // ignore
    }
  };

  const sugg = useMemo(
    () => searchSuggestions(records, towns, value),
    [records, towns, value]
  );
  const options: Option[] = useMemo(
    () =>
      value.trim().length >= 2
        ? [
            ...sugg.towns.map(t => ({ kind: 'town' as const, ...t })),
            ...sugg.groups.flatMap(g =>
              g.items.map(rec => ({ kind: 'record' as const, rec }))
            ),
          ]
        : recent.map(text => ({ kind: 'recent' as const, text })),
    [sugg, recent, value]
  );
  const showList = open && options.length > 0;

  const pick = (o: Option) => {
    if (o.kind === 'recent') {
      onChange(o.text);
      remember(o.text);
    } else if (o.kind === 'town') {
      remember(o.name);
      onPickTown(o.slug);
    } else {
      remember(o.rec.name);
      onPickRecord(o.rec);
    }
    setOpen(false);
    setActive(-1);
  };

  const optId = (i: number) => `${id}-opt-${i}`;
  let i = -1; // running option index while rendering groups

  const row = (o: Option, label: React.ReactNode, icon: React.ReactNode) => {
    i += 1;
    const idx = i;
    return (
      <li
        key={optId(idx)}
        id={optId(idx)}
        role='option'
        aria-selected={active === idx}
        // mousedown, not click: picking must happen before the input blurs.
        onMouseDown={e => {
          e.preventDefault();
          pick(o);
        }}
        onMouseEnter={() => setActive(idx)}
        className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 ${active === idx ? 'bg-kapwa-bg-brand-weak' : ''}`}
      >
        {icon}
        <span className='type-body min-w-0 truncate'>{label}</span>
      </li>
    );
  };

  return (
    <div className='relative flex w-full gap-2'>
      <div className='relative min-w-0 flex-1'>
        <label htmlFor={`${id}-input`} className='sr-only'>
          Search places, festivals, stays and products
        </label>
        <SearchIcon
          aria-hidden='true'
          className='text-kapwa-text-support pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2'
        />
        <input
          ref={inputRef}
          id={`${id}-input`}
          type='search'
          role='combobox'
          autoComplete='off'
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete='list'
          aria-activedescendant={active >= 0 ? optId(active) : undefined}
          value={value}
          placeholder='Search places, festivals or towns'
          onChange={e => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive(a => Math.min(options.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive(a => Math.max(-1, a - 1));
            } else if (e.key === 'Enter') {
              if (showList && active >= 0) {
                e.preventDefault();
                pick(options[active]);
              } else {
                remember(value);
                setOpen(false);
              }
            } else if (e.key === 'Escape') {
              if (showList) setOpen(false);
              else onChange('');
            }
          }}
          className='border-kapwa-border-weak text-kapwa-text-strong type-body h-13 w-full [&::-webkit-search-cancel-button]:hidden rounded-full border bg-white pr-11 pl-12 shadow-elev-2 outline-none placeholder:text-kapwa-text-support'
        />
        {value && (
          <button
            type='button'
            aria-label='Clear search'
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className='text-kapwa-text-support absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full'
          >
            <XIcon aria-hidden='true' className='h-4 w-4' />
          </button>
        )}

        {showList && (
          <ul
            id={listId}
            role='listbox'
            aria-label={
              value.trim().length >= 2 ? 'Suggestions' : 'Recent searches'
            }
            className='bg-kapwa-bg-surface border-kapwa-border-weak absolute inset-x-0 top-[calc(100%+6px)] z-[600] max-h-[60vh] overflow-y-auto rounded-panel border p-2 text-left text-kapwa-text-strong shadow-elev-3'
          >
            {value.trim().length < 2 ? (
              <>
                <li
                  role='presentation'
                  className='type-meta text-kapwa-text-support flex items-center justify-between px-3 py-1 font-semibold'
                >
                  Recent searches
                  <button
                    type='button'
                    tabIndex={-1}
                    onMouseDown={e => {
                      e.preventDefault();
                      forget();
                    }}
                    className='text-kapwa-text-brand min-h-11 px-2 font-semibold'
                  >
                    Clear
                  </button>
                </li>
                {recent.map(text =>
                  row(
                    { kind: 'recent', text },
                    text,
                    <ClockIcon
                      aria-hidden='true'
                      className='text-kapwa-text-support h-4 w-4 shrink-0'
                    />
                  )
                )}
              </>
            ) : (
              <>
                {sugg.towns.length > 0 && (
                  <li
                    role='presentation'
                    className='type-meta text-kapwa-text-support px-3 pt-1 font-semibold'
                  >
                    Municipalities
                  </li>
                )}
                {sugg.towns.map(t =>
                  row(
                    { kind: 'town', ...t },
                    t.name,
                    <MapPinnedIcon
                      aria-hidden='true'
                      className='text-kapwa-text-brand h-4 w-4 shrink-0'
                    />
                  )
                )}
                {sugg.groups.map(g => (
                  <li key={g.layer} role='presentation'>
                    <p className='type-meta text-kapwa-text-support px-3 pt-2 font-semibold'>
                      {LAYER_LABEL[g.layer]}
                    </p>
                    <ul role='group' aria-label={LAYER_LABEL[g.layer]}>
                      {g.items.map(rec =>
                        row(
                          { kind: 'record', rec },
                          <>
                            {rec.name}
                            {rec.townName && (
                              <span className='text-kapwa-text-support type-meta'>
                                {' '}
                                · {rec.townName}
                              </span>
                            )}
                          </>,
                          <LayerGlyph layer={rec.layer} />
                        )
                      )}
                    </ul>
                  </li>
                ))}
              </>
            )}
          </ul>
        )}
      </div>
      <button
        type='button'
        onClick={onNearMe}
        disabled={locating}
        aria-label='Show the municipality near me'
        title='Uses your location once, only on this device'
        className='text-kapwa-text-strong inline-flex h-13 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold shadow-elev-2'
      >
        {locating ? (
          <LoaderCircleIcon
            aria-hidden='true'
            className='h-5 w-5 motion-safe:animate-spin'
          />
        ) : (
          <LocateFixedIcon aria-hidden='true' className='h-5 w-5' />
        )}
        <span className='hidden sm:inline'>Near me</span>
      </button>
    </div>
  );
}
