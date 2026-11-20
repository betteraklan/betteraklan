# BetterAklan Tourism Upgrade: Round 2 Prompts (from the Figma)

Round 1 phases 0 to 6 are done; phase 7 has not been run and is folded into prompts H and I below. This round closes the gaps between the Figma "All pages redesign" and the site, and joins the old interactive map to the new pages. Gap analysis: `docs/tourism-figma-gap-plan.md`.

| Round 1 phase | Status |
|---|---|
| 0 Data clean-up (`displayName`, U+FFFD guard) | Done |
| 1 `TourismImage` and fallback tiles | Done (no photos yet) |
| 2 Tab row, Towns grid, phone bottom bar | Done |
| 3 Overview search, quick tiles, places, map teaser, festival band | Done |
| 4 Town page rebuild | Done |
| 5 Stay filters, MapLibre stay map, Leaflet removed | Done |
| 6 12 px text | Done |
| 7 Map links and functions | Not run yet. Covered by prompts H and I below (the Overview teaser and Save to trip already exist from earlier phases) |

## Guardrails (paste both blocks at the top of every prompt)

### 1. Colour: enhance, don't replace

> Stay inside the BetterAklan theme. Colour changes are refinements of existing `kapwa-*` tokens only:
> - Brand: `brand-50`/`100` soft backgrounds, `brand-600` actions and links, `brand-700` hover, `brand-950` darkest hero and band.
> - Festivals and highlights: `orange-50`/`100` backgrounds, `orange-600`/`700` accents. The Figma's yellow button maps to orange-600, not a new yellow.
> - Text and surfaces: `gray-950`, `gray-700`, `gray-50`, neutral surface tokens, `border-kapwa-border-weak`, existing `shadow-elev-*`.
> - The shared navbar and footer are not touched. No new hex values or palettes.
> - Text on photos sits on a dark `brand-950` scrim that gives 4.5:1 contrast.
> - Meaning is never colour only: pair every colour with a shape, icon or text.
> - Before finishing, grep the diff for `#` hex values and inline colour styles and remove them.

### 2. Data: keep everything that already works

> Do not delete, rename, reshape or overwrite existing data or features:
> - `src/data/tourism/*.json` is read-only. Counts come from it at run time and are never typed in by hand. Derived fields (category, type, station) are computed in code and not written back.
> - Keep working: Explore map and list, layers, clustering, festival strip, My trip (persisted in the browser) and share link, advisories (live API with bundled fallback) and the admin page, workbook record ids, "Approximate pin" labels, source notes and links.
> - Keep URLs and params: `/tourism/:slug`, `/tourism/explore?q&town&layer&view&sel&from&to`, `/tourism/accommodations/:area`.
> - Never invent facts. Entrance fees, hiking times, transport times and similar details appear only when a sourced field exists.
> - Grep every import before removing anything. Run the existing tests before and after; report failures, never edit tests to pass.
> - One branch, small commits, one commit per prompt. Check `git status` first and do not touch changes you did not make.

## Skills

| Skill | Use |
|---|---|
| `ui-ux-pro-max:ui-ux-pro-max` | Every UI prompt |
| `design:design-critique` | Review each page |
| `design:accessibility-review` | After each page change |
| `design:ux-copy` | Labels, empty states, notices |
| `engineering:testing-strategy` | Any new logic |
| `code-review` | After each prompt |
| `anthropic-skills:built-in-browser` | Check pages at 375 and 1440 px |

## Models (Opus 5.5 is the highest used)

| Model | ID | Use it for |
|---|---|---|
| Opus 5.5 | `claude-opus-5-5` | Multi-component pages, map functions with new state, final review |
| Sonnet 5.5 | `claude-sonnet-5-5` | Single components, derived data, tests, API wiring |
| Haiku 5.5 | `claude-haiku-5-5` | Scans, text swaps, count checks |

---

## A. Stop number drift (Haiku 5.5)

Skills: `engineering:testing-strategy`.

> Find every hard-coded or duplicated count on the tourism pages (towns, spots, festivals, stays, Boracay and mainland). Replace each with a value computed from the JSON via `tourismData.ts`. The Figma shows 89 spots and 34 festivals but the data has 121 attractions and 40 festivals, so show the data's numbers. Add one test that the hero stats equal the data lengths.

## B. Hero upgrade (Sonnet 5.5)

Skills: `ui-ux-pro-max`, `design:accessibility-review`.

> Rebuild `TourismHero` to the Figma layout: breadcrumb, "Discover Aklan" title, search (reuse `OverviewSearch`), category chips (Beaches, Waterfalls and springs, Caves and hills, Festivals, Heritage, Food and products) that deep-link into Explore, the stats strip from prompt A, and the "Welcome to Aklan" video card using `YouTubeFacade`. With no hero photo yet, use a `brand-950` to `brand-600` gradient. Make the background a `TourismImage` slot with a `brand-950` scrim so a photo can be dropped in later without layout changes.

## C. Stay list and pins (Sonnet 5.5)

Skills: `ui-ux-pro-max`, `design:accessibility-review`.

> On the stay page, add the station chip counts from the derived `station` field (for example "Station 2 · 70"), a "Directions" link on every row (Google Maps by coordinates), and "Exact pin" or "Approximate pin · barangay centre" from `geocodePrecision`. Replace numbered pagination with "Load 20 more" and keep "Showing 1 to 20 of N". Legend entries use shape plus text, not colour alone. Keep the grouped marker for shared coordinates.

## D. Getting here and Plan your visit (Sonnet 5.5)

Skills: `ui-ux-pro-max`, `design:ux-copy`, `engineering:testing-strategy`.

> Read `functions/api/flights.ts`, `functions/api/weather.ts` and the airports pages. Build a "Getting here" card for the Overview and a "Plan your visit" panel for the town page. The live line ("Today: KLO 3 departures, 2 arrivals") comes from the flights API with a quiet fallback when it fails. The town panel shows: stays count in that town from the data, a weather link or short forecast from the weather API, Emergency hotlines linking to the existing page, and the municipality website if the data has one. Transport times and the "boat from Caticlan jetty" steps only appear if a sourced field exists; otherwise leave them out and add a `TODO(source)` note in the PR description, not in the UI.

## E. Festival calendar (Sonnet 5.5)

Skills: `ui-ux-pro-max`, `design:ux-copy`, `engineering:testing-strategy`.

> Upgrade `FestivalBand` to the Figma month grid: twelve month cards with counts, up to three festivals each with town and date text exactly as the data gives it, "No festivals listed yet" for empty months, and a featured card for the Ati-Atihan chosen from data. Add "Add to my calendar": generate an `.ics` file in the browser for festivals with a parseable date, and show a plain note for ones like "3rd Sun". Test the date parsing, including the unconfirmed ones.

## F. Spot categories (Sonnet 5.5)

Skills: `engineering:testing-strategy`.

> Add `categoryOf(record)` that returns Beach, Falls, Cave, Culture, Nature or Other from the name and description, never writing back to the JSON. Use it for the town page filter chips (All, Beaches, Falls, Caves, Culture) and the category badge on each card. Add a test with real examples from the data, and output a list of records classed "Other" for a person to review.

## G. Town page finish (Opus 5.5)

Skills: `ui-ux-pro-max`, `design:design-critique`, `design:accessibility-review`.

> Compare `[municipality].tsx` to the Figma Town page (Malay). Add what is missing without losing current features: category chips from F, "Show all N spots" collapse, the Plan your visit panel from D, a mini-map card reading "N spots on the map, Open map" linking to `/tourism/explore?town=<slug>`, date tiles on festival cards ("JUN 15" or "DATE TBC"), "More events on <Town>'s official website", and a "Spotted a mistake? Suggest a fix" link. Keep advisories, source notes, verbatim workbook names and prev/next links.

## H. Wire the old map to the new pages (Opus 5.5)

Skills: `ui-ux-pro-max`, `engineering:testing-strategy`.

> Using only the existing Explore URL params, add: "See on map" on every spot card (`?sel=<recordId>&town=<slug>`), "Open in Explore" on stay rows (`?layer=stay&sel=<id>`), festival month cards linking to `?layer=event&from=<start>&to=<end>`, and a "Take the tour" button that starts the existing tour with a `tour=1` param. Add a visible "Copy link" button on Explore. Verify each link opens Explore with the right selection, and add an e2e test for three of them.

## I. New map functions (Sonnet 5.5, one commit each, Opus 5.5 reviews)

Skills: `ui-ux-pro-max`, `engineering:testing-strategy`, `design:accessibility-review`.

> 1. Festival season slider: a month control on the Explore map that filters event pins and pulses matches, built on `FestivalStrip` and `festivalDates.ts`. Keyboard operable.
> 2. Notices layer: a toggle that marks places in towns with active verified advisories, using `advisoriesFor`; draw nothing when there are none.
> 3. Near me: ask for location only when tapped, sort the list by distance, work normally if denied.
> 4. Search this area: a button after panning or zooming that filters the list to the map view bounds.
> 5. Trip days: split saved places into Day 1, Day 2 with a route per day, extending the existing trip store without breaking saved or shared trips from before.

## J. Photos (Sonnet 5.5, after the source is decided)

Skills: `ui-ux-pro-max`, `design:design-system`.

> Fill `tourism-images.json` entries `{ recordId, src, alt, credit }` for the 17 town heroes and the 10 featured places. Export WebP at 1200 and 600 px, keep the credit visible on each image, and keep the fallback tile for every record without a photo. Do not use images without a documented licence.

## K. Final QA and data check (Opus 5.5)

Skills: `design:design-critique`, `design:accessibility-review`, `code-review`.

> Review the whole tourism section at 375, 768 and 1440 px in light and dark. Confirm no new colours (grep the diff), text 12 px or larger, visible focus, 44 px targets and reduced motion respected. Confirm no data was lost: compare per-town festival, attraction and product counts and the 478 stays (434 Boracay, 44 mainland) before and after, and confirm every existing URL still works and all existing tests pass.

---

## Suggested order

A, B, C, D, E, F, G, H, I (items 1 to 5 in order), then J when photos are ready, K after each group.

## Not checked

I took your word that phases 0 to 6 were run, and the git log agrees (commits through `60ce014`). I have not run these prompts, the site or its tests. Transport times and spot facts in the Figma have no source in the repo, so prompts D and G leave them out until sourced. Opus 5.5 is the highest model used anywhere.
