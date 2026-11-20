# Tourism: Figma "All pages redesign" vs the current site

Figma file: BetterAklan (page 1, section "All pages redesign (Tourism first)"). Reviewed: Overview, Town page (Malay), Where to stay (Boracay) and the phone frames. Compared against branch `feat/tourism-explore-map` (HEAD `69863ac`) and the JSON files in `src/data/tourism/`.

## 1. Already built (matches the Figma)

| Figma | In the repo |
|---|---|
| Tourism sub-nav and phone tab bar | `TourismTabs`, `TourismBottomBar`, `tourismNav.ts` |
| Overview search, quick tiles, Help tile | `OverviewSearch`, quick tiles in `index.tsx` |
| Top places with category tabs | `PlacesTabs` |
| Festivals band and Towns grid | `FestivalBand`, `TownsGrid` |
| Map teaser | `index.tsx` teaser using `MiniMap` shapes |
| Town page rebuild | `[municipality].tsx` (commit `f172edd`) |
| Stay chips, numbered rows, result count, type and station | commits `bb2d91d`, `ed970ae` |
| Stay map on MapLibre with Save to trip | `StayMap`, `SaveToTripButton` (commits `a722986`, `3a83d45`) |
| Image frame with fallback tiles | `TourismImage` |
| 12 px minimum text | commit `69863ac` |
| Interactive 3D map, trip tray, festival strip, advisories | unchanged in `explore.tsx` |

Twelve files are modified but not committed in the working tree (`[municipality].tsx`, `index.tsx`, `layout.tsx`, `TourismTabs.tsx`, `TownsGrid.tsx`, `StatusPills.tsx`, `Pagination.tsx`, the accommodations page, plus `docs/` and `e2e/tourism/`). I did not make those changes and did not touch them.

## 2. Can be built now with data and APIs the repo already has

| Figma element | Why it is possible |
|---|---|
| "Today: KLO 3 departures, 2 arrivals" and Live schedule link | `functions/api/flights.ts` and the airports pages already exist |
| "Weather in Malay, 5-day forecast" | `functions/api/weather.ts` exists |
| Hero stats strip | Compute from the JSON files (see section 4 for number mismatches) |
| Boracay station chips with counts (Station 2 · 70 …) | `station` is already derived; just count it |
| "Directions" button on every place and stay | Coordinates exist; link to Google Maps like the old accommodations page |
| "Exact pin / Approximate pin · barangay centre" labels | `geocodePrecision` has exact 246, barangay 216, municipality 16 |
| Festival calendar by month, with featured card | `festivalDates.ts` and the 40 festival records |
| "Add to my calendar" | Generate an `.ics` file in the browser from dated festivals; undated ones ("3rd Sun") get a plain-text note |
| "Where to stay" dark band and "Getting here" card | Counts from data; flight line from the API |
| Town page "Plan your visit": stays count, Hotlines, Municipality website link | Data and existing pages; the airport line needs sourcing (below) |
| "Suggest a fix" link | Link to the repo's issue form |

## 3. Needs content or a decision first

| Figma element | Problem |
|---|---|
| Photos (sunset hero, Boracay beach, Ati-Atihan) | `tourism-images.json` is empty. Photo source and licence must be decided. "Photo needed" tiles are the right fallback until then |
| Spot facts: "Entrance ₱50", "Cross 5 rivers on foot", "Hike, bike or motorbike", "Local guides" | Not in the data. Show only if a source is added; do not invent |
| Category chips (Beach, Cave, Falls, Culture) | The data has no category. Derive from names and descriptions, then have a person review, as was done for stay type |
| "Fly into Caticlan, 1.5 to 2 hours from Kalibo", "Two airports, then a short boat ride", e-trike line | Needs an official source before it ships |
| "Fiesta de Obreros" style short descriptions | Keep the verbatim workbook text; do not rewrite |

## 4. Problems in the Figma to fix before building

1. **Numbers do not match the data.** Figma says 89 spots and 34 festivals. The data has 121 attractions and 40 festivals. The 478 stays (434 Boracay, 44 mainland) are correct. Always compute counts from the data.
2. **Navy "Where to stay" band and yellow button.** The existing colours are brand-950 and orange-600/700. The yellow in Figma looks like a different token; use orange.
3. **Sunset hero photo gradient.** Fine as photography, but the text overlay needs a dark brand-950 scrim for 4.5:1 contrast on the bright orange side.
4. **Stay map legend colours.** Green, orange and blue dots carry meaning by colour alone. Add shape or text (already planned: shaped pins).
5. **Small text.** Figma meta lines look under 12 px.
6. **Stay list "Load 20 more" vs numbered pagination.** Pick one; "Load more" keeps map pins stable and is friendlier on phones.

## 5. Joining the interactive map to the new pages (data unchanged)

The 3D map (`AklanMap3D`, `explore.tsx`) stays the single full map. The new pages link into it and reuse its data layer (`buildRecords`, records, trip store). Nothing in `src/data/tourism/*.json` is edited.

| Where | Integration | Status |
|---|---|---|
| Overview teaser "Open the map" | Link to `/tourism/explore`; "Take the tour" starts the existing tour via a query param | Add the param |
| Town page "10 spots on the map, Open map" | `/tourism/explore?town=<slug>`; mini-map pins from `buildRecords` for that town | Link exists; verify pins |
| Spot "See on map" | `/tourism/explore?sel=<recordId>&town=<slug>` | Add button, params exist |
| Stay "Show on map" | Selects the pin on `StayMap`; "Open in Explore" goes to `?layer=stay&sel=<id>` | `StayMap` built; add the link |
| Festival month cards | `/tourism/explore?layer=event&from=<month start>&to=<month end>` | Params exist |
| Save to trip everywhere | One trip store (already persisted in the browser) | Done; reuse |
| Notices | The same advisory source feeds the town banner and a map layer toggle | Toggle is new |
| New map functions | Festival season slider, Near me (on tap), Search this area, Trip days | New, one at a time with tests |

Single sources of truth to keep: `buildRecords` for places, `advisoriesFor` for notices, the trip store for saved places, URL params for shareable views.

## 6. Suggested next steps

1. Confirm the stray working-tree changes with whoever made them, then commit or stash them.
2. Fix the count mismatch by computing every stat from data (S).
3. Add the Directions button and the exact/approximate labels where missing (S).
4. Build "Getting here" with the flights API and only sourced airport text; keep the live line optional if the API is down (M).
5. Add Weather and Emergency lines to Plan your visit (S).
6. Add the `.ics` calendar export for dated festivals (S).
7. Derive spot categories with a tested function and have a person review them (M).
8. Wire the map links in section 5, then the new map functions in order: festival season slider, notices toggle, Near me, Search this area, Trip days (M each).
9. Photos once the source is decided (M).

## Not checked

I read the Figma screenshots and structure, not its prototype links, spacing or variables (the file defines none). I did not run the site or the tests. The Figma colour values were not read from tokens; visual comparisons are by eye.
