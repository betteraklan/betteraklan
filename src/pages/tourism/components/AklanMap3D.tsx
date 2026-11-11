import { useEffect, useRef, useState } from 'react';

import maplibregl, {
  type GeoJSONSource,
  type LngLatBoundsLike,
  type Map as MLMap,
} from 'maplibre-gl';

import 'maplibre-gl/dist/maplibre-gl.css';

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
}

// Free vector basemap (OpenMapTiles schema, includes building heights). No API key.
const STYLE = 'https://tiles.openfreemap.org/styles/positron';
// Public terrain tiles (AWS Open Data, Terrarium encoding). No API key.
const DEM =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const PAD = 24;
const MAX_PITCH = 55;

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
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  // Latest callbacks for map event handlers registered once.
  const cb = useRef({ onTown, onPin });
  useEffect(() => {
    cb.current = { onTown, onPin };
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
      canvasContextAttributes: { antialias: !lowEnd },
      attributionControl: { compact: true },
    });
    mapRef.current = map;
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

      map.addLayer({
        id: 'town-line',
        type: 'line',
        source: 'towns',
        paint: {
          'line-color': ['case', ['get', 'selected'], '#1D4FB0', '#8a9bb5'],
          'line-width': ['case', ['get', 'selected'], 2.5, 0.8],
        },
      });

      map.addSource('pins', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'pins',
        type: 'circle',
        source: 'pins',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3.5, 15, 7],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['case', ['get', 'approximate'], 0.35, 0.95],
          'circle-stroke-color': [
            'case',
            ['get', 'approximate'],
            ['get', 'color'],
            '#ffffff',
          ],
          'circle-stroke-width': 1.5,
          'circle-pitch-alignment': 'map',
        },
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

      // Clicks: a pin wins over the municipality underneath it.
      map.on('click', e => {
        const hit = map.queryRenderedFeatures(e.point, {
          layers: ['pins', 'town-fill'],
        });
        const pin = hit.find(f => f.layer.id === 'pins');
        if (pin) cb.current.onPin(String(pin.properties.id));
        else if (hit[0]) cb.current.onTown(String(hit[0].properties.slug));
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
          name: p.approximate ? `${p.name} (approximate)` : p.name,
          color: p.color,
          approximate: p.approximate,
        },
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      })),
    });
  }, [ready, pins]);

  // Camera: fly to the record (street level, tilted), the town, or the province.
  // MapLibre skips the animation when the user prefers reduced motion.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (selected) {
      map.flyTo({
        center: [selected.lon, selected.lat],
        zoom: 16,
        pitch: MAX_PITCH,
        bearing: -20,
        duration: 2200,
        curve: 1.5,
      });
      return;
    }
    const f = boundaries.find(b => b.properties.slug === town);
    const target = (
      f ? boundsOf([f]) : boundsOf(boundaries)
    ) as LngLatBoundsLike;
    const cam = map.cameraForBounds(target, { padding: f ? 48 : PAD });
    if (!cam) return;
    const zoom = Math.max(cam.zoom ?? 10, map.getMinZoom());
    map.flyTo({
      center: cam.center,
      zoom,
      pitch: pitchFor(zoom),
      bearing: f ? -12 : 0,
      duration: f ? 2000 : 1600,
      curve: 1.42,
    });
  }, [ready, boundaries, town, selected]);

  // Anchored tooltip on the selected record, with a soft pulse.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selected) return;
    const dot = document.createElement('span');
    dot.className = 'relative flex h-6 w-6';
    dot.innerHTML =
      '<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/60 motion-reduce:animate-none"></span><span class="relative m-1.5 inline-flex h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white"></span>';
    const label = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = selected.name;
    const sub = document.createElement('div');
    sub.textContent = selected.label;
    label.append(title, sub);
    const marker = new maplibregl.Marker({ element: dot })
      .setLngLat([selected.lon, selected.lat])
      .setPopup(
        new maplibregl.Popup({
          closeButton: false,
          offset: 16,
        }).setDOMContent(label)
      )
      .addTo(map);
    marker.togglePopup();
    return () => {
      marker.remove();
    };
  }, [ready, selected]);

  return (
    <div
      ref={el}
      role='region'
      aria-label='Map of Aklan. Use the list below to select records with a keyboard.'
      className='h-full w-full bg-[#eef1f5]'
    />
  );
}
