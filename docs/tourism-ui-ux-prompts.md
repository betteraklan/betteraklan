# BetterAklan Tourism: UI/UX + Motion Prompt Pack

Context (from the "BetterAklan Ui website tourism" chat): the Explore page (`src/pages/tourism/explore.tsx`) has a 3D MapLibre map locked to Aklan (`components/AklanMap3D.tsx`), a light civic layout, layer toggles (place / event / stay / product), a phone bottom sheet, a guided tour, and a Sources section. There is no animation library installed. Only `maplibre-gl`, Tailwind 4 and `lucide-react` are in `package.json`.

Skills to invoke: `ui-ux-pro-max:ui-ux-pro-max` (always), `design:design-critique`, `design:accessibility-review`, `design:ux-copy`, `design-md` (only if you want a reference brand), `code-review` (last).

Rules every prompt below inherits (from the ui-ux-pro-max checks):
- Keep the existing `kapwa-*` tokens. Do not introduce new hex colours.
- Respect `prefers-reduced-motion`: final state, no parallax, no scroll-jacking.
- Animate `transform` and `opacity` only. Animate at most 1–2 hero elements per view.
- Timing: micro 150–250 ms, panels 300–450 ms, map camera 1.2–2.5 s. Exit faster than enter.
- Touch targets ≥44px. Visible focus rings. Contrast ≥4.5:1. Lucide icons only, no emoji.
- Check at 375, 768, 1024 and 1440 px. Prefer CSS and MapLibre-native animation over adding a dependency.

---

## A. Audit first (run once)

**A1. Design critique**
> Use `design:design-critique` and `ui-ux-pro-max` on `/tourism/explore` at 375, 768 and 1440 px. List the 10 biggest UX problems ranked by impact (hierarchy, clutter, tap targets, empty states, filter discoverability, map-vs-list balance). Don't change code yet. Output a table: issue, evidence, fix, effort.

**A2. Accessibility audit**
> Run `design:accessibility-review` on the Explore page. Check keyboard access to map pins and the list, focus order between map, filters and bottom sheet, aria labels on icon-only buttons, colour-only meaning in pin colours (teal/amber/blue/violet), and contrast of white/90 glass panels over the map. Fix every critical finding.

---

## B. Visual design

**B1. Design tokens and depth**
> Using `ui-ux-pro-max`, define a small motion and elevation token set in the Tailwind theme (`--ease-out-expo`, `--dur-fast/base/slow`, 3 shadow levels, 3 radii) that fits the kapwa tokens. Replace the ad-hoc `GLASS`/`FIELD` constants in `explore.tsx` with these tokens so the whole tourism section shares one look.

**B2. Typography and hierarchy**
> Tighten the Explore page type scale: one display style for the page title and municipality names, one for card titles, one for meta text. Use `text-wrap: balance` on headings, a 16px minimum body and line-height 1.5. Make festival dates and "Exact / Approximate pin" badges scannable at a glance.

**B3. Place cards with real imagery**
> Redesign the record cards: image-first (16:10, lazy-loaded WebP, blurred colour placeholder to avoid layout shift), then title, municipality, layer chip, and a one-line "why go" teaser. Add a graceful no-photo fallback (municipality-tinted gradient plus layer icon). Keep the "Approximate pin" honesty badge.

**B4. Pin and cluster design**
> Redesign map pins: per-layer shape as well as colour (circle / diamond / square / hexagon) so meaning isn't colour-only, a soft drop shadow, a selected state that scales up with a ring, and hollow dashed pins for approximate locations. Add clustering at low zoom with count bubbles that expand on tap.

---

## C. Animation and creativity

**C1. Cinematic page entrance**
> Add a 1.2 s Explore entrance: the map starts as a flat top-down Aklan silhouette, then eases into the current pitch/bearing (`easeTo`) while the header and filter bar fade up 12px with a 60 ms stagger. Run once per session. Skip when reduced motion is on.

**C2. Municipality fly-to with a narrative card**
> When a municipality is selected, `flyTo` it with a curved path (zoom out slightly, pan, zoom in, 2 s) while the other municipalities dim to 35% and the chosen one lifts (fill-extrusion height tween). Slide a info card in from the side (desktop) or up as a sheet (phone) at the end of the flight. Tapping the background reverses it.

**C3. Animated record-density shading**
> Animate the municipality shading tiers on load: counts fill from the lowest tier to the real tier over 700 ms, staggered north to south. Show a legend that highlights the matching tier on hover.

**C4. Living Aklan atmosphere**
> Give the sea a subtle slow wave drift (CSS `background-position` on the existing `WAVES` SVG, 40 s loop, paused when the tab is hidden or reduced motion is on), a soft vignette, and a slowly rotating compass. Add a gentle "Boracay sunset" colour wash tied to the time of day. Keep it ≤2% GPU on a mid phone.

**C5. Guided Tour 2.0**
> Upgrade the existing 5 s tour: a progress ring around the play button, a step title chip that cross-fades per stop, camera moves that vary (orbit, fly, tilt-up), pause on user touch, and a "Skip tour" link. End with a "Plan your trip" CTA card.

**C6. Micro-interactions**
> Add: layer toggle chips that morph their icon with a 200 ms squash, filter changes that crossfade the list (150 ms) instead of popping, a heart/bookmark that springs, skeleton shimmer for loading, and a `Share2Icon` copy-link toast. Press feedback is `scale(.97)` on tap.

**C7. Festival calendar strip**
> Add a horizontal month strip above the list with festival dots (Ati-Atihan, Sampaguita etc. from the data). Selecting a date filters the map and pulses the matching pins twice. Show "Happening now / This month / Upcoming" with the existing `DATE_STATUS_LABEL`.

**C8. Scroll storytelling on the tourism landing**
> On `/tourism` (`index.tsx`), add reveal-on-scroll sections with `IntersectionObserver` (8–16px rise, 350 ms, no scroll-jacking), a sticky mini-map that follows the section being read and highlights its municipality, and a hero with a slow Ken Burns image. Use CSS only. Don't add GSAP unless a requirement can't be met without it.

---

## D. Mobile / UX flow

**D1. Phone bottom sheet physics**
> Rebuild the phone bottom sheet with three snap points (peek / half / full), drag with velocity, rubber-band at the edges, a 44px grab handle, and focus-safe content. The map must stay interactive above the sheet. Respect the safe-area inset.

**D2. Search and filters**
> Make search the hero: a floating bar with recent searches, suggestions grouped by layer, and a "Near me" button (geolocation permission asked on tap only, never on load). Collapse the municipality and date filters into a single "Filters" sheet with an active-count badge and a one-tap "Clear all".

**D3. Empty, error and loading states**
> Replace blank results with designed states: a friendly illustration, the `emptyReason` text rewritten via `design:ux-copy` in plain Filipino-English, and one suggested action ("Show all places in Kalibo"). Add a map-load failure fallback that switches to the list view automatically.

**D4. List and map as one experience**
> Sync hover and tap between list rows and pins (row hover highlights the pin, pin tap scrolls the row into view). Add a persistent map/list toggle with a shared-element morph and keep scroll position when switching.

**D5. Trip basket**
> Add a lightweight "My trip" tray: save places, see them as a numbered route on the map with an animated dashed line, show total distance, and share via link (state in the URL, matching the existing `useSearchParams` pattern).

---

## E. Performance and polish

**E1. Perf pass**
> Profile the Explore page on a throttled mid-range phone. Lazy-load `AklanMap3D` and the heavy JSON, virtualize the results list beyond the 50-item page, cap `devicePixelRatio` at 2, and stop all CSS and map animations when the tab is hidden. Report before/after Lighthouse numbers.

**E2. Final QA**
> Run the pre-delivery checklist from `ui-ux-pro-max`: no emoji icons, `cursor-pointer`, hover transitions 150–300 ms, 4.5:1 contrast, visible focus, reduced motion respected, 375/768/1024/1440 px verified in the browser pane with screenshots. Then run `code-review` on the diff.

---

## Suggested order

1. A1, A2
2. B1, B2
3. C1, C2, D1
4. B3, B4, C6
5. C3, C4, C5
6. D2, D3, D4, C7
7. C8, D5
8. E1, E2

Each prompt is self-contained, so you can paste them one at a time.
