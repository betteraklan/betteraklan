import { useEffect, useRef, useState } from 'react';

import maplibregl, {
  type GeoJSONSource,
  type LngLatBoundsLike,
  type Map as MLMap,
} from 'maplibre-gl';

import 'maplibre-gl/dist/maplibre-gl.css';

import { addPinIcons } from './pinIcons';

import type { Layer } from '@/lib/tourism/explore';
import type { BoundaryFeature } from '@/lib/tourism/geo';

// Province outline: union of the municipality boundaries, precomputed so the
// mask has one clean hole (overlapping per-town holes triangulate badly).
import outline from '@/data/geo/aklan-outline.json';

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
  /** Fill colour per municipality slug (shading by record count). */
  townFill: Map<string, string>;
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
  townFill,
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
  // Read once at mount: the entrance plays only on the first camera move.
  const introRef = useRef(intro);
  // Latest callbacks for map event handlers registered once.
  const cb = useRef({ onTown, onPin, onBackground, onSettled });
  useEffect(() => {
    cb.current = { onTown, onPin, onBackground, onSettled };
  });

  // Create the map once.
  useEffect(() => {
    if (!el.current) return;
    const province = boundsOf(boundaries);
    const lowEnd = (navigator.hardwareConcurrency ?? 4) <= 4;
    const map = new maplibregl.Map({
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
    mapRef.current = map;
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
          'fill-color': ['get', 'fill'],
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
            fill: townFill.get(slug) ?? '#EEF3FB',
            selected: slug === town,
            opacity: town && slug !== town ? 0.12 : town ? 0.28 : 0.42,
          },
          geometry: f.geometry,
        };
      }),
    });
  }, [ready, boundaries, townFill, townCount, town]);

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
        // Curved path: rise to a slightly wider view mid-flight, then drop in.
        minZoom: f
          ? Math.max(map.getMinZoom(), Math.min(map.getZoom(), zoom) - 0.75)
          : undefined,
      };
    }

    const settledOn = selected ? null : town;
    const onEnd = () => {
      if (settledOn !== null) cb.current.onSettled?.(settledOn);
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
    map.flyTo({ ...target, curve: selected ? 1.5 : 1.42 });
    listen();
    return () => {
      map.off('moveend', onEnd);
    };
  }, [ready, boundaries, town, selected]);

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
