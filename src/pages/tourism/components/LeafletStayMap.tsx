// Previous Leaflet map for the accommodations page, kept beside the
// MapLibre version until it is removed. Not imported anywhere.
import { useEffect, useMemo } from 'react';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

import { Card } from '@/components/ui/Card';

import { Accommodation } from '@/types/tourism';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type Area = 'mainland' | 'boracay';

const AREA_CENTER: Record<Area, [number, number]> = {
  mainland: [11.75, 122.2],
  boracay: [11.965, 121.925],
};
const AREA_ZOOM: Record<Area, number> = {
  mainland: 10,
  boracay: 14,
};

function googleMapsUrl(lat: number, lon: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

function escapeHtml(s: string) {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return s.replace(/[&<>"']/g, c => map[c]);
}

type MappableAccommodation = Accommodation & { lat: number; lon: number };

interface CoordinateGroup {
  lat: number;
  lon: number;
  items: MappableAccommodation[];
}

/** Many published addresses only say e.g. "Station 1, Brgy. Balabag" with no
 * street/building detail, so geocoding — however accurate — collapses dozens
 * of establishments onto one point. Rather than let leaflet.markercluster
 * spiderfy those into a fan of fake individual positions, group them into a
 * single marker with a list popup: an honest representation of what the
 * source data can actually support. */
function groupByCoordinate(points: MappableAccommodation[]): CoordinateGroup[] {
  const groups = new Map<string, CoordinateGroup>();
  for (const p of points) {
    const key = `${p.lat},${p.lon}`;
    const existing = groups.get(key);
    if (existing) existing.items.push(p);
    else groups.set(key, { lat: p.lat, lon: p.lon, items: [p] });
  }
  return [...groups.values()];
}

function groupPopupHtml(g: CoordinateGroup): string {
  if (g.items.length === 1) {
    const p = g.items[0];
    return `<div class="space-y-1 text-sm">
      <p class="font-semibold">${escapeHtml(p.name)}</p>
      <p class="text-xs text-gray-500">${escapeHtml(p.address)}</p>
      ${p.geocodePrecision !== 'exact' ? `<p class="text-[11px] font-semibold">Approximate pin · ${escapeHtml(p.geocodePrecision)} level</p>` : ''}
      <a href="${googleMapsUrl(p.lat, p.lon)}" target="_blank" rel="noreferrer" class="text-xs font-medium text-blue-600">Open in Google Maps →</a>
    </div>`;
  }
  const list = g.items
    .map(
      p => `<li class="border-b border-gray-100 py-1 last:border-0">
        <p class="font-medium">${escapeHtml(p.name)}</p>
        <p class="text-[11px] text-gray-500">${escapeHtml(p.address)}</p>
      </li>`
    )
    .join('');
  return `<div class="max-w-[260px] space-y-1 text-sm">
    <p class="font-semibold">${g.items.length} establishments in this area</p>
    <p class="text-xs text-gray-500">Their published addresses aren't precise enough to place them individually.</p>
    <ul class="mt-1 max-h-48 overflow-y-auto">${list}</ul>
    <a href="${googleMapsUrl(g.lat, g.lon)}" target="_blank" rel="noreferrer" class="mt-1 block text-xs font-medium text-blue-600">Open area in Google Maps →</a>
  </div>`;
}

/** Vanilla leaflet.markercluster layer — used for Boracay's ~430 points,
 * where individual react-leaflet Markers would be an unreadable pile. */
function ClusterLayer({ groups }: { groups: CoordinateGroup[] }) {
  const map = useMap();
  useEffect(() => {
    const cluster = L.markerClusterGroup();
    groups.forEach(g => {
      const marker = L.marker([g.lat, g.lon]);
      marker.bindPopup(groupPopupHtml(g), { maxWidth: 280 });
      cluster.addLayer(marker);
    });
    map.addLayer(cluster);
    return () => {
      map.removeLayer(cluster);
    };
  }, [groups, map]);
  return null;
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 18, { duration: 1 });
  }, [target, map]);
  return null;
}

export default function LeafletStayMap({
  area,
  filtered,
  flyTarget,
}: {
  area: Area;
  filtered: Accommodation[];
  flyTarget: [number, number] | null;
}) {
  const mappable = useMemo(
    () =>
      filtered.filter(
        (a): a is MappableAccommodation => a.lat != null && a.lon != null
      ),
    [filtered]
  );
  const groupedMappable = useMemo(
    () => groupByCoordinate(mappable),
    [mappable]
  );
  return (
    <Card className='overflow-hidden p-0' hover={false}>
      <div className='h-[60vh] w-full'>
        <MapContainer
          center={AREA_CENTER[area]}
          zoom={AREA_ZOOM[area]}
          scrollWheelZoom
          className='h-full w-full'
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
          {area === 'boracay' ? (
            <ClusterLayer groups={groupedMappable} />
          ) : (
            groupedMappable.map(g => (
              <Marker key={`${g.lat}-${g.lon}`} position={[g.lat, g.lon]}>
                <Tooltip direction='top' offset={[0, -35]}>
                  {g.items.length === 1
                    ? g.items[0].name
                    : `${g.items.length} establishments`}
                  {g.items.some(p => p.geocodePrecision !== 'exact')
                    ? ' (approximate pin)'
                    : ''}
                </Tooltip>
                <Popup>
                  {g.items.length === 1 ? (
                    <div className='space-y-1 text-sm'>
                      <p className='font-semibold'>{g.items[0].name}</p>
                      <p className='text-xs text-gray-500'>
                        {g.items[0].address}
                      </p>
                      {g.items[0].geocodePrecision !== 'exact' && (
                        <p className='text-[11px] font-semibold'>
                          Approximate pin · {g.items[0].geocodePrecision} level
                        </p>
                      )}
                      <a
                        href={googleMapsUrl(g.lat, g.lon)}
                        target='_blank'
                        rel='noreferrer'
                        className='text-xs font-medium text-blue-600 hover:underline'
                      >
                        Open in Google Maps →
                      </a>
                    </div>
                  ) : (
                    <div className='max-w-[260px] space-y-1 text-sm'>
                      <p className='font-semibold'>
                        {g.items.length} establishments in this area
                      </p>
                      <p className='text-xs text-gray-500'>
                        Their published addresses aren&apos;t precise enough to
                        place them individually.
                      </p>
                      <ul className='mt-1 max-h-48 overflow-y-auto'>
                        {g.items.map(p => (
                          <li
                            key={p.name}
                            className='border-b border-gray-100 py-1 last:border-0'
                          >
                            <p className='font-medium'>{p.name}</p>
                            <p className='text-[11px] text-gray-500'>
                              {p.address}
                            </p>
                          </li>
                        ))}
                      </ul>
                      <a
                        href={googleMapsUrl(g.lat, g.lon)}
                        target='_blank'
                        rel='noreferrer'
                        className='mt-1 block text-xs font-medium text-blue-600 hover:underline'
                      >
                        Open area in Google Maps →
                      </a>
                    </div>
                  )}
                </Popup>
              </Marker>
            ))
          )}
          <FlyTo target={flyTarget} />
        </MapContainer>
      </div>
    </Card>
  );
}
