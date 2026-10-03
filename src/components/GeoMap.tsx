import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shipment } from '../types';

// Tile source is configurable. Default: OpenStreetMap's public tiles (free, no key, attribution required).
// OSM's public servers are meant for light use; for a busy production site set VITE_MAP_TILE_URL to a
// provider with a free tier or your own tile server.
const TILE_URL = (import.meta.env.VITE_MAP_TILE_URL as string | undefined) || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = (import.meta.env.VITE_MAP_ATTRIBUTION as string | undefined) || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

import { LatLng, isUsableCoordinate } from './geoRoute';

export const GeoMap: React.FC<{ shipment: Shipment }> = ({ shipment }) => {
  const ref = useRef<HTMLDivElement>(null);
  const origin = shipment.originHub.coordinates as LatLng;
  const destination = shipment.destinationHub.coordinates as LatLng;
  const current = isUsableCoordinate(shipment.currentLocation?.coordinates) ? (shipment.currentLocation.coordinates as LatLng) : null;

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { scrollWheelZoom: false, worldCopyJump: true });
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(map);
    const dot = (p: LatLng, color: string, label: string, radius = 8) => L.circleMarker(p, { radius, color: '#ffffff', weight: 2, fillColor: color, fillOpacity: 1 }).bindTooltip(label).addTo(map);
    const path: LatLng[] = [origin, ...(current ? [current] : []), destination];
    L.polyline(path, { color: '#0e7490', weight: 3, dashArray: '6 8', opacity: 0.9 }).addTo(map);
    dot(origin, '#475569', `Origin: ${shipment.originHub.city}`);
    dot(destination, '#0f172a', `Destination: ${shipment.destinationHub.city}`);
    if (current) dot(current, '#06b6d4', `Last known: ${shipment.currentLocation.city}`, 10);
    map.fitBounds(L.latLngBounds(path), { padding: [40, 40], maxZoom: 8 });
    return () => { map.remove(); };
  }, [origin, destination, current, shipment.originHub.city, shipment.destinationHub.city, shipment.currentLocation?.city]);

  return <section aria-label="Shipment route map" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div ref={ref} className="h-[320px] w-full sm:h-[400px]" role="application" aria-label="Interactive map. Use arrow keys to pan and plus or minus to zoom." />
    <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
      Origin {shipment.originHub.city}{current ? `, last known position near ${shipment.currentLocation.city}` : ''}, destination {shipment.destinationHub.city}. The dashed line connects recorded points and is not the vehicle’s exact path.
    </p>
  </section>;
};
