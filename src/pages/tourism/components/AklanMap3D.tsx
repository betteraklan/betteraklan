import { useEffect, useRef, useState } from 'react';

import maplibregl, {
  type GeoJSONSource,
  type LngLatBoundsLike,
  type Map as MLMap,
} from 'maplibre-gl';

import 'maplibre-gl/dist/maplibre-gl.css';

import { aklanHour, skyWash } from '@/lib/tourism/atmosphere';

import { addPinIcons } from './pinIcons';

import type { Layer } from '@/lib/tourism/explore';
import type { BoundaryFeature } from '@/lib/tourism/geo';

// Province outline: union of the municipality boundaries, precomputed so the
// mask has one clean hole (overlapping per-town holes triangulate badly).
import outlineTowns from '@/data/geo/municipalities-boundaries.json';
import outline from '@/data/geo/aklan-outline.json';

export type TourMove = 'fly' | 'orbit' | 'tilt';

export interface MapPin {
  id: string;
  name: string;
  lat: number;
  lon: number;
  color: string;
  /** Record layer: picks the pin's shape, so type is not shown by colour alone. */
  layer: Exclude<Layer, 'all'>;
  /** Municipality slug, used when a stacked group can't be split by zooming. */
  town: string | null;
  approximate: boolean;
  label: string;
}

interface Props {
  boundaries: BoundaryFeature[];
  /** Shading tier (0–5) per municipality slug, by record count. */
  townTier: Map<string, number>;
  /** Colour for each tier, lowest first. */
  tierColors: string[];
  /** Pointer over a municipality (null when it leaves). */
  onHoverTown?: (slug: string | null) => void;
  /** Guided tour stop: varies how the camera arrives. */
  tourMove?: TourMove | null;
  /** The viewer dragged, zoomed, rotated or tilted the map themselves. */
  onUserMove?: () => void;
  /** Record hovered in the list: its pin gets a soft highlight. */
  hoverId?: string | null;
  /** The map can't start (no WebGL) or its style failed to load. */
  onLoadError?: () => void;
  /** Pins to pulse twice; a new `key` replays the pulse. */
  pulse?: { ids: string[]; key: number } | null;
  townCount: Map<string, number>;
  town: string;
  pins: MapPin[];
  selected: MapPin | null;
  onTown: (slug: string) => void;
  onPin: (id: string) => void;
  /** Tap on the map outside any municipality or pin. */
  onBackground?: () => void;
  /** The camera finished moving to this town ('' = province). */
  onSettled?: (town: string) => void;
  /** Play the entrance: flat silhouette, then ease into the camera. */
  intro?: boolean;
}

// Free vector basemap (OpenMapTiles schema, includes building heights). No API key.
const STYLE = 'https://tiles.openfreemap.org/styles/positron';
// Public terrain tiles (AWS Open Data, Terrarium encoding). No API key.
const DEM =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const PAD = 24;
const MAX_PITCH = 55;
const INTRO_MS = 1200;
// Town focus: 2s curved flight, the chosen town lifts while the others dim to 35%.
const TOWN_FLIGHT_MS = 2000;
const REVERSE_MS = 600;
// Tall enough to read at town zoom (~100 m per pixel); translucent so the map shows through.
const LIFT_M = 1200;
const TOWN_PITCH = 40;
const DIM_VEIL = 0.65;
/** Icon scale by zoom; the selected pin is drawn 40% larger. */
const pinSize = (selectedId: string): maplibregl.ExpressionSpecification => [
  'interpolate',
  ['linear'],
  ['zoom'],
  9,
  ['case', ['==', ['get', 'id'], selectedId], 1.05, 0.75],
  14,
  ['case', ['==', ['get', 'id'], selectedId], 1.4, 1],
];

const CLUSTER_MAX_ZOOM = 12;
const LOAD_TIMEOUT_MS = 15_000;
const PULSE_MS = 700;
const FILL_MS = 700;
const FILL_STAGGER_MS = 500;
const COMPASS_PATH = 'M22 4 L25 22 L22 20 L19 22 Z'; // north needle; the south half is drawn plain

/** Municipality slugs from the northernmost to the southernmost (by centre latitude). */
const NORTH_TO_SOUTH = (
  outlineTowns as { features: BoundaryFeature[] }
).features
  .map(f => {
    const [[s], [n]] = (() => {
      const pts = (
        f.geometry.type === 'Polygon'
          ? f.geometry.coordinates
          : f.geometry.coordinates.flat()
      ).flat();
      const lats = pts.map(p => p[1]);
      return [[Math.min(...lats)], [Math.max(...lats)]];
    })();
    return { slug: f.properties.slug, mid: (s + n) / 2 };
  })
  .sort((a, b) => b.mid - a.mid)
  .map(t => t.slug);

/** Province outline as an SVG path (flat projection), shown while the map loads. */
const SILHOUETTE = (() => {
  const g = outline.geometry as
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };
  const rings =
    g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.map(p => p[0]);
  const pts = rings.flat();
  const minX = Math.min(...pts.map(p => p[0]));
  const maxY = Math.max(...pts.map(p => p[1]));
  // Shrink longitude so the shape keeps its proportions near 11.7°N.
  const kx = Math.cos((11.7 * Math.PI) / 180);
  const w = (Math.max(...pts.map(p => p[0])) - minX) * kx;
  const h = maxY - Math.min(...pts.map(p => p[1]));
  const d = rings
    .map(
      r =>
        'M' +
        r
          .map(([x, y]) =>
            [(((x - minX) * kx) / w) * 1000, ((maxY - y) / w) * 1000]
              .map(v => v.toFixed(1))
              .join(' ')
          )
          .join('L') +
        'Z'
    )
    .join('');
  return { d, viewBox: `0 0 1000 ${((h / w) * 1000).toFixed(0)}` };
})();

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Same curve as the --ease-out-expo CSS token.
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Flat over the province, tilting to 3D as you zoom towards street level. */
const pitchFor = (zoom: number) =>
  Math.round(Math.min(1, Math.max(0, (zoom - 10.5) / 3.5)) * MAX_PITCH);

type LL = [[number, number], [number, number]];
function boundsOf(features: BoundaryFeature[]): LL {
  const pts = features.flatMap(f =>
    (f.geometry.type === 'Polygon'
      ? f.geometry.coordinates
      : f.geometry.coordinates.flat()
    ).flat()
  );
  const lons = pts.map(p => p[0]);
  const lats = pts.map(p => p[1]);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}

export default function AklanMap3D({
  boundaries,
  townTier,
  tierColors,
  onHoverTown,
  tourMove = null,
  onUserMove,
  hoverId = null,
  onLoadError,
  pulse = null,
  townCount,
  town,
  pins,
  selected,
  onTown,
  onPin,
  intro = false,
  onBackground,
  onSettled,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const needle = useRef<SVGGElement>(null);
  // Decorative loops pause while the tab is hidden.
  const [tabHidden, setTabHidden] = useState(() => document.hidden);
  useEffect(() => {
    const on = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  // Time-of-day wash in Aklan; checked every 10 minutes (no animation cost).
  const [wash, setWash] = useState(() => skyWash(aklanHour()));
  useEffect(() => {
    const id = window.setInterval(() => setWash(skyWash(aklanHour())), 600_000);
    return () => window.clearInterval(id);
  }, []);
  // Read once at mount: the entrance plays only on the first camera move.
  const introRef = useRef(intro);
  // Latest callbacks for map event handlers registered once.
  const cb = useRef({
    onTown,
    onPin,
    onBackground,
    onSettled,
    onHoverTown,
    onUserMove,
    onLoadError,
  });
  useEffect(() => {
    cb.current = {
      onTown,
      onPin,
      onBackground,
      onSettled,
      onHoverTown,
      onUserMove,
      onLoadError,
    };
  });
  const tourMoveRef = useRef(tourMove);
  tourMoveRef.current = tourMove;
  const tierColorsRef = useRef(tierColors);

  // Create the map once.
  useEffect(() => {
    if (!el.current) return;
    const province = boundsOf(boundaries);
    const lowEnd = (navigator.hardwareConcurrency ?? 4) <= 4;
    let map: MLMap;
    try {
      map = new maplibregl.Map({
        container: el.current,
        style: STYLE,
        bounds: province as LngLatBoundsLike,
        fitBoundsOptions: { padding: PAD },
        maxBounds: [
          [province[0][0] - 0.05, province[0][1] - 0.05],
          [province[1][0] + 0.05, province[1][1] + 0.05],
        ],
        maxPitch: MAX_PITCH + 5,
        // On touch screens one finger scrolls the page; two fingers move the map.
        cooperativeGestures: window.matchMedia('(pointer: coarse)').matches,
        canvasContextAttributes: { antialias: !lowEnd },
        attributionControl: { compact: true },
      });
    } catch {
      // No WebGL (or similar): the page falls back to the list.
      cb.current.onLoadError?.();
      return;
    }
    mapRef.current = map;
    // Only the style itself failing to arrive counts as a map failure; tile
    // errors later do not. 'style.load' needs no rendered frame, and the
    // timer never fails while the tab is hidden (background tabs don't render).
    let loaded = false;
    let failTimer = 0;
    const fail = () => {
      if (!loaded) cb.current.onLoadError?.();
    };
    const arm = () => {
      window.clearTimeout(failTimer);
      failTimer = window.setTimeout(() => {
        if (document.hidden) arm();
        else fail();
      }, LOAD_TIMEOUT_MS);
    };
    arm();
    map.on('error', (e: { error?: { url?: string } }) => {
      // Sprite or glyph hiccups don't stop the map; only the style request does.
      if (!loaded && (!e.error?.url || e.error.url === STYLE)) fail();
    });
    map.once('style.load', () => {
      loaded = true;
      window.clearTimeout(failTimer);
    });
    map
      .getCanvas()
      .setAttribute(
        'aria-label',
        'Map of Aklan. Arrow keys pan, plus and minus zoom. Use the results list to choose a record.'
      );
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      'bottom-right'
    );

    // Furthest zoom-out is exactly the whole province, at any container size.
    const fitMin = () => {
      const cam = map.cameraForBounds(province as LngLatBoundsLike, {
        padding: PAD,
      });
      if (cam?.zoom != null) map.setMinZoom(cam.zoom);
    };
    map.on('resize', fitMin);

    // A drag, zoom, rotate or tilt by the viewer (not by code) pauses the tour.
    for (const type of ['dragstart', 'zoomstart', 'rotatestart', 'pitchstart'])
      map.on(type, (e: { originalEvent?: Event }) => {
        if (e.originalEvent) cb.current.onUserMove?.();
      });
    // The compass needle points to true north as the map turns.
    map.on('rotate', () => {
      if (needle.current)
        needle.current.style.transform = `rotate(${-map.getBearing()}deg)`;
    });

    // User zoom (wheel, pinch, buttons) tilts the camera with the zoom level.
    map.on('zoom', e => {
      if ((e as { originalEvent?: Event }).originalEvent)
        map.setPitch(pitchFor(map.getZoom()));
    });

    map.on('load', () => {
      fitMin();
      const g = outline.geometry as
        | { type: 'Polygon'; coordinates: number[][][] }
        | { type: 'MultiPolygon'; coordinates: number[][][][] };
      const outerRings =
        g.type === 'Polygon'
          ? [g.coordinates[0]]
          : g.coordinates.map(p => p[0]);

      map.addSource('dem', {
        type: 'raster-dem',
        tiles: [DEM],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 13,
        attribution: 'Terrain: Mapzen, AWS Open Data',
      });
      map.setTerrain({ source: 'dem', exaggeration: 1.15 });
      map.addLayer({
        id: 'hillshade',
        type: 'hillshade',
        source: 'dem',
        paint: {
          'hillshade-exaggeration': 0.35,
          'hillshade-shadow-color': '#5b6b7f',
          'hillshade-highlight-color': '#ffffff',
        },
      });

      map.addSource('towns', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        promoteId: 'slug',
      });
      map.addLayer({
        id: 'town-fill',
        type: 'fill',
        source: 'towns',
        paint: {
          // Animated tier (feature-state) blended across the tier colours.
          'fill-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['feature-state', 'tier'], 0],
            ...tierColorsRef.current.flatMap((c, i) => [i, c]),
          ] as unknown as maplibregl.ExpressionSpecification,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.62,
            ['get', 'opacity'],
          ],
        },
      });

      // 3D buildings from OpenStreetMap heights, from street-level zoom.
      map.addLayer({
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#d9dde3',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14,
            0,
            15,
            ['coalesce', ['get', 'render_height'], 4],
          ],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.9,
        },
      });

      // Everything outside Aklan: a flat mask so focus stays on the province.
      map.addLayer({
        id: 'outside-mask',
        type: 'fill',
        source: {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [province[0][0] - 3, province[0][1] - 3],
                  [province[1][0] + 3, province[0][1] - 3],
                  [province[1][0] + 3, province[1][1] + 3],
                  [province[0][0] - 3, province[1][1] + 3],
                  [province[0][0] - 3, province[0][1] - 3],
                ],
                ...outerRings,
              ],
            },
          },
        },
        paint: { 'fill-color': '#eef1f5', 'fill-opacity': 0.94 },
      });

      // Entrance only: a solid Aklan silhouette that fades as the camera settles.
      if (introRef.current)
        map.addLayer({
          id: 'silhouette',
          type: 'fill',
          source: { type: 'geojson', data: outline as GeoJSON.Feature },
          paint: {
            'fill-color': '#1D4FB0',
            'fill-opacity': 0.9,
            'fill-opacity-transition': { duration: INTRO_MS, delay: 0 },
          },
        });

      map.addLayer({
        id: 'town-line',
        type: 'line',
        source: 'towns',
        paint: {
          'line-color': ['case', ['get', 'selected'], '#1D4FB0', '#8a9bb5'],
          'line-width': ['case', ['get', 'selected'], 2.5, 0.8],
        },
      });

      // Pins cluster at low zoom; count bubbles expand on tap.
      addPinIcons(map);
      map.addSource('pins', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterRadius: 36,
      });
      const isCluster = [
        'has',
        'point_count',
      ] as maplibregl.ExpressionSpecification;
      const notCluster = ['!', isCluster] as maplibregl.ExpressionSpecification;
      const bubble = [
        'step',
        ['get', 'point_count'],
        15,
        10,
        18,
        50,
        23,
      ] as maplibregl.ExpressionSpecification;
      map.addLayer({
        id: 'cluster-shadow',
        type: 'circle',
        source: 'pins',
        filter: isCluster,
        paint: {
          'circle-radius': ['+', bubble, 3],
          'circle-color': '#0f234b',
          'circle-opacity': 0.22,
          'circle-blur': 0.7,
          'circle-translate': [0, 2],
        },
      });
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'pins',
        filter: isCluster,
        paint: {
          'circle-radius': bubble,
          'circle-color': '#1D4FB0',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'pins',
        filter: isCluster,
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 13,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: { 'text-color': '#ffffff' },
      });
      // List hover: a soft halo at the record's position. Its own one-point
      // source, so it shows even while the pin sits inside a cluster bubble.
      map.addSource('pin-hover', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'pin-hover',
        type: 'circle',
        source: 'pin-hover',
        paint: {
          // Wider than the largest cluster bubble, so it reads as a ring around it.
          'circle-radius': 26,
          'circle-color': 'rgba(29,79,176,0.12)',
          'circle-stroke-color': '#1D4FB0',
          'circle-stroke-width': 2.5,
          'circle-stroke-opacity': 0.8,
        },
      });
      // Calendar pick: expanding rings on the matching pins, played twice.
      map.addSource('pin-pulse', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'pin-pulse',
        type: 'circle',
        source: 'pin-pulse',
        paint: {
          'circle-radius': 10,
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-color': '#b45309',
          'circle-stroke-width': 3,
          'circle-stroke-opacity': 0,
        },
      });
      // Selected pin: a brand ring under the enlarged icon.
      map.addLayer({
        id: 'pin-ring',
        type: 'circle',
        source: 'pins',
        filter: ['all', notCluster, ['==', ['get', 'id'], '']],
        paint: {
          'circle-radius': 19,
          'circle-color': 'rgba(29,79,176,0.12)',
          'circle-stroke-color': '#1D4FB0',
          'circle-stroke-width': 3,
        },
      });
      map.addLayer({
        id: 'pins',
        type: 'symbol',
        source: 'pins',
        filter: notCluster,
        layout: {
          'icon-image': [
            'concat',
            'pin-',
            ['get', 'layer'],
            ['case', ['get', 'approximate'], '-approx', ''],
          ],
          'icon-size': pinSize(''),
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'symbol-sort-key': ['case', ['==', ['get', 'id'], ''], 1, 0],
        },
      });

      // Chosen town rises as a translucent slab; height tweens via paint transition.
      map.addLayer({
        id: 'town-lift',
        type: 'fill-extrusion',
        source: 'towns',
        filter: ['==', ['get', 'slug'], ''],
        paint: {
          'fill-extrusion-color': '#3B78DB',
          'fill-extrusion-opacity': 0.2,
          'fill-extrusion-height': 0,
        },
      });
      // Veil over every other town (and its pins): opacity 0.65 leaves them at 35%.
      map.addLayer({
        id: 'town-dim',
        type: 'fill',
        source: 'towns',
        filter: ['!=', ['get', 'slug'], ''],
        paint: { 'fill-color': '#eef1f5', 'fill-opacity': 0 },
      });

      // Hover: municipality highlight and a name tooltip.
      const tip = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
      });
      let hovered: string | number | undefined;
      map.on('mousemove', 'town-fill', e => {
        const f = e.features?.[0];
        if (!f) return;
        if (hovered !== undefined)
          map.setFeatureState(
            { source: 'towns', id: hovered },
            { hover: false }
          );
        if (hovered !== f.id) cb.current.onHoverTown?.(String(f.id));
        hovered = f.id;
        if (hovered !== undefined)
          map.setFeatureState(
            { source: 'towns', id: hovered },
            { hover: true }
          );
        map.getCanvas().style.cursor = 'pointer';
        const n = f.properties.count as number;
        tip
          .setLngLat(e.lngLat)
          .setText(`${f.properties.name} · ${n} record${n === 1 ? '' : 's'}`)
          .addTo(map);
      });
      map.on('mouseleave', 'town-fill', () => {
        if (hovered !== undefined)
          map.setFeatureState(
            { source: 'towns', id: hovered },
            { hover: false }
          );
        hovered = undefined;
        map.getCanvas().style.cursor = '';
        tip.remove();
        cb.current.onHoverTown?.(null);
      });
      map.on('mouseenter', 'pins', e => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (f)
          tip.setLngLat(e.lngLat).setText(String(f.properties.name)).addTo(map);
      });
      map.on('mouseleave', 'pins', () => tip.remove());
      map.on('mouseenter', 'clusters', e => {
        map.getCanvas().style.cursor = 'pointer';
        const n = e.features?.[0]?.properties.point_count as number;
        tip
          .setLngLat(e.lngLat)
          .setText(`${n} records · tap to expand`)
          .addTo(map);
      });
      map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = '';
        tip.remove();
      });

      // Clicks: a pin wins over the municipality underneath it.
      map.on('click', e => {
        const hit = map.queryRenderedFeatures(e.point, {
          layers: ['clusters', 'pins', 'town-fill'],
        });
        const cluster = hit.find(f => f.layer.id === 'clusters');
        const pin = hit.find(f => f.layer.id === 'pins');
        if (cluster) {
          // Zoom just far enough for this group to split apart.
          const src = map.getSource('pins') as GeoJSONSource;
          const centre = (cluster.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ];
          const id = cluster.properties.cluster_id as number;
          void src.getClusterExpansionZoom(id).then(async z => {
            if (z <= CLUSTER_MAX_ZOOM) {
              map.easeTo({
                center: centre,
                zoom: Math.min(z + 0.25, 16),
                pitch: pitchFor(z),
                duration: 600,
              });
              return;
            }
            // Records stacked on one approximate pin never split; open their town instead.
            const [leaf] = await src.getClusterLeaves(id, 1, 0);
            const slug = leaf?.properties?.town as string | undefined;
            if (slug) cb.current.onTown(slug);
          });
        } else if (pin) cb.current.onPin(String(pin.properties.id));
        else if (hit[0]) cb.current.onTown(String(hit[0].properties.slug));
        else cb.current.onBackground?.();
      });

      setReady(true);
    });

    return () => {
      window.clearTimeout(failTimer);
      map.remove();
      mapRef.current = null;
    };
  }, [boundaries]);

  // Municipality shading and selection.
  useEffect(() => {
    const src = mapRef.current?.getSource('towns') as GeoJSONSource | undefined;
    if (!ready || !src) return;
    src.setData({
      type: 'FeatureCollection',
      features: boundaries.map(f => {
        const slug = f.properties.slug;
        return {
          type: 'Feature',
          properties: {
            slug,
            name: f.properties.name,
            count: townCount.get(slug) ?? 0,
            selected: slug === town,
            opacity: town && slug !== town ? 0.12 : town ? 0.28 : 0.42,
          },
          geometry: f.geometry,
        };
      }),
    });
  }, [ready, boundaries, townCount, town]);

  // Shading tiers fill in from the lowest tier: 700 ms per town, north to south
  // on first load; later changes tween from the current shade with no stagger.
  const shownTier = useRef(new Map<string, number>());
  const firstFill = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const target = (slug: string) => townTier.get(slug) ?? 0;
    const set = (slug: string, tier: number) => {
      shownTier.current.set(slug, tier);
      map.setFeatureState({ source: 'towns', id: slug }, { tier });
    };
    if (reducedMotion()) {
      NORTH_TO_SOUTH.forEach(s => set(s, target(s)));
      return;
    }
    const stagger = firstFill.current ? FILL_STAGGER_MS : 0;
    firstFill.current = false;
    const from = new Map(
      NORTH_TO_SOUTH.map(s => [s, shownTier.current.get(s) ?? 0])
    );
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      let done = true;
      NORTH_TO_SOUTH.forEach((s, i) => {
        const delay = (stagger * i) / Math.max(1, NORTH_TO_SOUTH.length - 1);
        const p = Math.min(1, Math.max(0, (now - t0 - delay) / FILL_MS));
        if (p < 1) done = false;
        const a = from.get(s) ?? 0;
        set(s, a + (target(s) - a) * (1 - Math.pow(1 - p, 3)));
      });
      if (!done) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [ready, townTier]);

  // Record pins.
  useEffect(() => {
    const src = mapRef.current?.getSource('pins') as GeoJSONSource | undefined;
    if (!ready || !src) return;
    src.setData({
      type: 'FeatureCollection',
      features: pins.map(p => ({
        type: 'Feature',
        properties: {
          id: p.id,
          name: `${p.name} · ${p.label}${p.approximate ? ' (approximate location)' : ''}`,
          color: p.color,
          layer: p.layer,
          town: p.town ?? '',
          approximate: p.approximate,
        },
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      })),
    });
  }, [ready, pins]);

  // Town focus: dim the others and lift the chosen one; reverse when cleared.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const still = reducedMotion();
    const ms = still ? 0 : town ? TOWN_FLIGHT_MS : REVERSE_MS;
    map.setPaintProperty('town-dim', 'fill-opacity-transition', {
      duration: ms,
      delay: 0,
    });
    map.setPaintProperty('town-lift', 'fill-extrusion-height-transition', {
      duration: ms,
      delay: 0,
    });
    if (!town) {
      map.setPaintProperty('town-dim', 'fill-opacity', 0);
      map.setPaintProperty('town-lift', 'fill-extrusion-height', 0);
      return;
    }
    map.setFilter('town-dim', ['!=', ['get', 'slug'], town]);
    map.setPaintProperty('town-dim', 'fill-opacity', DIM_VEIL);
    // Start the new town flat so its lift always tweens up from the ground.
    map.setPaintProperty('town-lift', 'fill-extrusion-height-transition', {
      duration: 0,
      delay: 0,
    });
    map.setPaintProperty('town-lift', 'fill-extrusion-height', 0);
    map.setFilter('town-lift', ['==', ['get', 'slug'], town]);
    const raf = requestAnimationFrame(() => {
      map.setPaintProperty('town-lift', 'fill-extrusion-height-transition', {
        duration: ms,
        delay: 0,
      });
      map.setPaintProperty('town-lift', 'fill-extrusion-height', LIFT_M);
    });
    return () => cancelAnimationFrame(raf);
  }, [ready, town]);

  // Camera: fly to the record (street level, tilted), the town, or the province.
  // MapLibre skips the animation when the user prefers reduced motion.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    let target: maplibregl.FlyToOptions & { duration: number };
    if (selected) {
      target = {
        center: [selected.lon, selected.lat],
        zoom: 16,
        pitch: MAX_PITCH,
        bearing: -20,
        duration: 2200,
      };
    } else {
      const f = boundaries.find(b => b.properties.slug === town);
      const bounds = (
        f ? boundsOf([f]) : boundsOf(boundaries)
      ) as LngLatBoundsLike;
      const cam = map.cameraForBounds(bounds, { padding: f ? 48 : PAD });
      if (!cam) return;
      const zoom = Math.max(cam.zoom ?? 10, map.getMinZoom());
      target = {
        center: cam.center,
        zoom,
        // Tilt town views so the lifted town reads as raised.
        pitch: f ? Math.max(pitchFor(zoom), TOWN_PITCH) : pitchFor(zoom),
        bearing: f ? -12 : 0,
        duration: f ? TOWN_FLIGHT_MS : 1600,
        ...(f && tourMoveRef.current === 'tilt' ? { pitch: 8 } : {}),
        // Curved path: rise to a slightly wider view mid-flight, then drop in.
        minZoom: f
          ? Math.max(map.getMinZoom(), Math.min(map.getZoom(), zoom) - 0.75)
          : undefined,
      };
    }

    const settledOn = selected ? null : town;
    const move = !selected && town ? tourMoveRef.current : null;
    const onEnd = () => {
      if (settledOn !== null) cb.current.onSettled?.(settledOn);
      // Tour stops vary how the camera finishes: a slow orbit or a tilt up.
      if (reducedMotion() || !move) return;
      if (move === 'orbit')
        map.easeTo({
          bearing: map.getBearing() + 40,
          duration: 2800,
          easing: t => t,
        });
      else if (move === 'tilt')
        map.easeTo({ pitch: MAX_PITCH, duration: 1800, easing: easeOutExpo });
    };
    // Listen only after starting the move: starting it stops any earlier flight,
    // and that stop fires its own moveend.
    const listen = () => {
      if (reducedMotion()) onEnd();
      else map.once('moveend', onEnd);
    };

    if (introRef.current) {
      // Entrance: straight ease (no zoom-out arc) from the flat province view.
      introRef.current = false;
      map.easeTo({ ...target, duration: INTRO_MS, easing: easeOutExpo });
      listen();
      if (map.getLayer('silhouette')) {
        map.setPaintProperty('silhouette', 'fill-opacity', 0);
        const id = window.setTimeout(() => {
          if (map.getLayer('silhouette')) map.removeLayer('silhouette');
        }, INTRO_MS + 100);
        return () => {
          window.clearTimeout(id);
          map.off('moveend', onEnd);
        };
      }
      return () => {
        map.off('moveend', onEnd);
      };
    }
    map.flyTo({
      ...target,
      curve: selected ? 1.5 : move === 'fly' ? 1.8 : 1.42,
    });
    listen();
    return () => {
      map.off('moveend', onEnd);
    };
  }, [ready, boundaries, town, selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const pin = hoverId ? pins.find(p => p.id === hoverId) : null;
    (map.getSource('pin-hover') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: pin
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'Point', coordinates: [pin.lon, pin.lat] },
            },
          ]
        : [],
    });
  }, [ready, hoverId, pins]);

  // Pulse the calendar's matching pins twice (skipped with reduced motion).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !pulse || reducedMotion()) return;
    const want = new Set(pulse.ids);
    (map.getSource('pin-pulse') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: pins
        .filter(p => want.has(p.id))
        .map(p => ({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        })),
    });
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = (now - t0) / PULSE_MS;
      if (t >= 2) {
        map.setPaintProperty('pin-pulse', 'circle-stroke-opacity', 0);
        return;
      }
      const p = t % 1;
      map.setPaintProperty('pin-pulse', 'circle-radius', 10 + 24 * p);
      map.setPaintProperty('pin-pulse', 'circle-stroke-opacity', 1 - p);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // Replays only when a new pulse is requested.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pulse?.key]);

  // Selected pin grows and gains a ring; the label is anchored above it.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const id = selected?.id ?? '';
    map.setLayoutProperty('pins', 'icon-size', pinSize(id));
    map.setLayoutProperty('pins', 'symbol-sort-key', [
      'case',
      ['==', ['get', 'id'], id],
      1,
      0,
    ]);
    map.setFilter('pin-ring', [
      'all',
      ['!', ['has', 'point_count']],
      ['==', ['get', 'id'], id],
    ]);
    if (!selected) return;
    const label = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = selected.name;
    const sub = document.createElement('div');
    sub.textContent = selected.label;
    label.append(title, sub);
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 22,
    })
      .setLngLat([selected.lon, selected.lat])
      .setDOMContent(label)
      .addTo(map);
    return () => {
      popup.remove();
    };
  }, [ready, selected]);

  return (
    <>
      <div
        ref={el}
        role='region'
        aria-label='Map of Aklan. Use the list below to select records with a keyboard.'
        className='h-full w-full bg-[#eef1f5] [&_.maplibregl-canvas:focus]:outline-3 [&_.maplibregl-canvas:focus]:-outline-offset-4 [&_.maplibregl-canvas:focus]:outline-[#1D4FB0]'
      />
      {/* Atmosphere: decorative only, never intercepts taps. */}
      <div
        aria-hidden='true'
        className='aklan-waves pointer-events-none absolute inset-0 z-[1]'
        style={{ animationPlayState: tabHidden ? 'paused' : undefined }}
      />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 z-[2] transition-opacity duration-[2s]'
        data-phase={wash.phase}
        style={{
          opacity: wash.opacity,
          // The sun sets to the west, over Boracay: warmest at the left edge.
          background: `radial-gradient(120% 90% at 0% 60%, ${wash.color}, transparent 70%)`,
          mixBlendMode: 'soft-light',
        }}
      />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(15,35,75,0.22)_100%)]'
      />
      <svg
        aria-hidden='true'
        viewBox='0 0 44 44'
        className='pointer-events-none absolute top-[64px] right-3 z-[4] h-11 w-11 drop-shadow'
      >
        <circle cx='22' cy='22' r='20' fill='rgba(255,255,255,0.9)' />
        <g
          className='aklan-compass-ring'
          style={{ animationPlayState: tabHidden ? 'paused' : undefined }}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <line
              key={i}
              x1='22'
              y1='3.5'
              x2='22'
              y2={i % 6 === 0 ? 7.5 : 5.5}
              stroke='#8a9bb5'
              strokeWidth='1'
              transform={`rotate(${i * 15} 22 22)`}
            />
          ))}
        </g>
        <g ref={needle} style={{ transformOrigin: '22px 22px' }}>
          <path d={COMPASS_PATH} fill='#BE123C' />
          <path d='M22 40 L25 22 L22 24 L19 22 Z' fill='#8a9bb5' />
          <text
            x='22'
            y='15.5'
            textAnchor='middle'
            fontSize='6'
            fontWeight='700'
            fill='#0f234b'
          >
            N
          </text>
        </g>
      </svg>
      {!ready && (
        <div
          role='status'
          className='skeleton-shimmer absolute inset-0 z-[400] flex items-center justify-center bg-[#e7ecf2]'
        >
          <svg
            aria-hidden='true'
            viewBox={SILHOUETTE.viewBox}
            className='h-3/4 w-3/4 text-[#c9d4e3]'
          >
            <path d={SILHOUETTE.d} fill='currentColor' />
          </svg>
          <span className='sr-only'>Loading map</span>
        </div>
      )}
    </>
  );
}
