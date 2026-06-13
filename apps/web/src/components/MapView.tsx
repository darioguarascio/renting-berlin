import { useEffect, useRef } from 'react';
import type { ListingSummary } from '../types/listing';
import 'leaflet/dist/leaflet.css';

interface Props {
  listings: ListingSummary[];
  height?: string;
}

export default function MapView({ listings, height = '500px' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || listings.length === 0) return;

    let cancelled = false;

    async function init() {
      const L = await import('leaflet');

      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
      }).setView([52.52, 13.405], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      const icon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background:#2679a3;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(38,121,163,0.45)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const bounds: L.LatLngExpression[] = [];
      for (const listing of listings) {
        const lat = listing.lat;
        const lng = listing.lng;
        bounds.push([lat, lng]);
        L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${listing.title}</strong><br/>€${listing.rentPerMonth}/mo<br/><a href="/listings/${listing.path}">View</a>`,
          );
      }

      if (bounds.length > 1) {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
      }

      mapRef.current = map;
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [listings]);

  if (listings.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-warm)] text-sm text-[var(--color-ink-muted)]"
        style={{ height }}
      >
        No listings to show on the map
      </div>
    );
  }

  return <div ref={containerRef} className="w-full overflow-hidden rounded-xl border border-[var(--color-border)]" style={{ height }} />;
}
