import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  pickSnap,
  rubberBand,
  type Snap,
  SNAP_ORDER,
} from '@/lib/tourism/sheet';

/** Grab handle height: the 44px touch target. */
export const HANDLE_PX = 44;
/** Visible height at peek: handle plus the card's title row. */
const PEEK_PX = 128;
/** Space kept between the site's sticky nav and the sheet at full height. */
const TOP_GAP_PX = 16;

/** Height of the site's sticky top nav, which sits above the sheet (z-50). */
const navHeight = () =>
  document.querySelector<HTMLElement>('nav.sticky')?.getBoundingClientRect()
    .height ?? 0;
const SNAP_LABEL: Record<Snap, string> = {
  peek: 'collapsed',
  half: 'half height',
  full: 'full height',
};

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Bottom safe-area inset in px (0 where the browser reports none). */
function useBottomInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)';
    document.body.append(probe);
    const read = () =>
      setInset(parseFloat(getComputedStyle(probe).paddingBottom) || 0);
    read();
    window.addEventListener('resize', read);
    return () => {
      window.removeEventListener('resize', read);
      probe.remove();
    };
  }, []);
  return inset;
}

/**
 * Phone bottom sheet with peek / half / full snaps, velocity-aware dragging on
 * the grab handle and rubber-banding past either end. Inactive above `lg`.
 * `resetKey` reopens the sheet at half height when the content changes.
 */
export function useBottomSheet(
  wanted: boolean,
  resetKey: string,
  ref: RefObject<HTMLElement | null>
) {
  const phone = useMedia('(max-width: 1023px)');
  const active = wanted && phone;
  const inset = useBottomInset();
  const [vh, setVh] = useState(() => window.innerHeight);
  const [nav, setNav] = useState(navHeight);
  useEffect(() => {
    const on = () => {
      setVh(window.innerHeight);
      setNav(navHeight());
    };
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const heights = useMemo<Record<Snap, number>>(() => {
    const full = Math.max(vh - nav - TOP_GAP_PX, PEEK_PX + inset);
    return {
      peek: PEEK_PX + inset,
      half: Math.min(full, Math.round(vh * 0.5) + inset),
      full,
    };
  }, [vh, nav, inset]);

  const [snap, setSnap] = useState<Snap>('half');
  useEffect(() => setSnap('half'), [resetKey]);

  const offset = (visible: number) => `translateY(${heights.full - visible}px)`;
  const place = (visible: number, animate: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = animate ? '' : 'none';
    el.style.transform = offset(visible);
  };

  // Slide up from off-screen when the sheet first appears.
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = `translateY(${heights.full}px)`;
    const raf = requestAnimationFrame(() => place(heights[snap], true));
    return () => cancelAnimationFrame(raf);
    // Only on activation; later snap changes go through the style prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const drag = useRef<{
    y0: number;
    from: number;
    last: number;
    moved: boolean;
    samples: { t: number; y: number }[];
  } | null>(null);
  // Time a drag ended; the click a browser fires right after it is not a tap.
  const dragEndedAt = useRef(0);

  const settle = (next: Snap) => {
    setSnap(next);
    place(heights[next], true); // also covers next === snap (no re-render)
  };
  const step = (dir: 1 | -1) => {
    const i = SNAP_ORDER.indexOf(snap) + dir;
    settle(SNAP_ORDER[Math.max(0, Math.min(SNAP_ORDER.length - 1, i))]);
  };

  const handleProps = {
    'aria-label': `Details sheet, ${SNAP_LABEL[snap]}. Press to resize, or use the up and down arrow keys.`,
    onPointerDown(e: PointerEvent<HTMLButtonElement>) {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = {
        y0: e.clientY,
        from: heights[snap],
        last: heights[snap],
        moved: false,
        samples: [{ t: e.timeStamp, y: e.clientY }],
      };
    },
    onPointerMove(e: PointerEvent<HTMLButtonElement>) {
      const d = drag.current;
      if (!d) return;
      const dy = d.y0 - e.clientY;
      if (Math.abs(dy) > 4) d.moved = true;
      let v = d.from + dy;
      if (v > heights.full) v = heights.full + rubberBand(v - heights.full);
      else if (v < heights.peek)
        v = heights.peek - rubberBand(heights.peek - v);
      d.last = v;
      d.samples = [...d.samples, { t: e.timeStamp, y: e.clientY }].slice(-6);
      place(v, false);
    },
    onPointerUp(e: PointerEvent<HTMLButtonElement>) {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      if (!d.moved) {
        place(heights[snap], true);
        return; // a tap: the click handler resizes
      }
      dragEndedAt.current = e.timeStamp;
      // Velocity over the last ~100ms, upward positive.
      const s0 = d.samples.find(s => e.timeStamp - s.t <= 100) ?? d.samples[0];
      const dt = Math.max(1, e.timeStamp - s0.t);
      settle(pickSnap(d.last, (s0.y - e.clientY) / dt, heights));
    },
    onPointerCancel() {
      drag.current = null;
      place(heights[snap], true);
    },
    onClick(e: MouseEvent<HTMLButtonElement>) {
      if (e.timeStamp - dragEndedAt.current < 300) return;
      settle(snap === 'full' ? 'peek' : snap === 'peek' ? 'half' : 'full');
    },
    onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        step(-1);
      }
    },
  };

  return {
    active,
    snap,
    handleProps,
    /** Visible sheet height, for page padding below the content. */
    visible: active ? heights[snap] : 0,
    sheetStyle: active
      ? {
          height: heights.full,
          transform: offset(heights[snap]),
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }
      : undefined,
    /** Scroll area height under the handle at the current snap. */
    bodyStyle: active
      ? { maxHeight: heights[snap] - HANDLE_PX - inset }
      : undefined,
    /** Content is inert at peek so hidden controls can't take focus. */
    bodyInert: active && snap === 'peek',
    /** Focus moving into a collapsed sheet opens it to half. */
    onFocus(e: FocusEvent<HTMLElement>) {
      if (active && snap === 'peek' && e.target === e.currentTarget)
        settle('half');
    },
  };
}
