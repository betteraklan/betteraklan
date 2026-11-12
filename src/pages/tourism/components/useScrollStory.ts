import { type RefObject, useEffect, useLayoutEffect, useState } from 'react';

const reduced = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Reveal-on-scroll for `[data-reveal]` descendants: each fades up once when it
 * enters view (CSS does the motion). Content only starts hidden after this runs,
 * so nothing stays invisible without JS, IntersectionObserver or with reduced motion.
 */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = [...el.querySelectorAll<HTMLElement>('[data-reveal]')];
    if (!('IntersectionObserver' in window) || reduced()) return;
    el.classList.add('reveal-ready');
    const io = new IntersectionObserver(
      entries =>
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          (e.target as HTMLElement).dataset.revealed = '';
          io.unobserve(e.target);
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
    );
    items.forEach(i => io.observe(i));
    return () => {
      io.disconnect();
      el.classList.remove('reveal-ready');
    };
  }, [root]);
}

/**
 * Which municipality is being read: of the `[data-town]` elements crossing a
 * reading band near the middle of the viewport, the one closest to its centre
 * (grids put several cards on the band at once). `data-town=""` marks
 * province-wide sections (returns null). Between items, the last one stays.
 */
export function useActiveTown(root: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const el = root.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const onBand = new Set<HTMLElement>();
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          const t = e.target as HTMLElement;
          if (e.isIntersecting) onBand.add(t);
          else onBand.delete(t);
        }
        if (onBand.size === 0) return;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        let best: HTMLElement | null = null;
        let bestD = Infinity;
        for (const t of onBand) {
          const r = t.getBoundingClientRect();
          const d = Math.hypot(
            r.left + r.width / 2 - cx,
            r.top + r.height / 2 - cy
          );
          if (d < bestD) {
            bestD = d;
            best = t;
          }
        }
        setActive(best?.dataset.town || null);
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    el.querySelectorAll<HTMLElement>('[data-town]').forEach(t => io.observe(t));
    return () => io.disconnect();
  }, [root]);
  return active;
}
