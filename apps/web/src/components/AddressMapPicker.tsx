import { useCallback, useEffect, useRef, useState } from 'react';
import { BERLIN_NEIGHBORHOODS_SORTED, NEIGHBORHOOD_LABELS } from '../types/listing';
import type { BerlinNeighborhood } from '../types/listing';
import 'leaflet/dist/leaflet.css';

export interface LocationValue {
  address: string;
  neighborhood: BerlinNeighborhood;
  lat: number;
  lng: number;
  approximateLocation: boolean;
}

interface Props {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  addressError?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

const BERLIN_CENTER: [number, number] = [52.52, 13.405];

export default function AddressMapPicker({ value, onChange, addressError }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [query, setQuery] = useState(value.address);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);

  const updateMarker = useCallback(async (lat: number, lng: number) => {
    if (!leafletMap.current) return;
    const L = await import('leaflet');

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(leafletMap.current);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current?.getLatLng();
        if (pos) onChange({ ...value, lat: pos.lat, lng: pos.lng });
      });
    }
    leafletMap.current.setView([lat, lng], 14);
  }, [onChange, value]);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      const L = await import('leaflet');
      if (cancelled || !mapRef.current) return;

      if (leafletMap.current) {
        leafletMap.current.remove();
      }

      const map = L.map(mapRef.current).setView(
        value.lat && value.lng ? [value.lat, value.lng] : BERLIN_CENTER,
        13,
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      leafletMap.current = map;
      if (value.lat && value.lng) {
        markerRef.current = L.marker([value.lat, value.lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current?.getLatLng();
          if (pos) onChange({ ...value, lat: pos.lat, lng: pos.lng });
        });
      }

      map.on('click', (e: L.LeafletMouseEvent) => {
        onChange({ ...value, lat: e.latlng.lat, lng: e.latlng.lng });
        updateMarker(e.latlng.lat, e.latlng.lng);
      });
    }

    initMap();
    return () => {
      cancelled = true;
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (value.lat && value.lng && leafletMap.current) {
      updateMarker(value.lat, value.lng);
    }
  }, [value.lat, value.lng, updateMarker]);

  useEffect(() => {
    setQuery(value.address);
  }, [value.address]);

  async function searchAddress(q: string) {
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Berlin, Germany')}&limit=5&bounded=1&viewbox=13.088,52.338,13.761,52.675`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
    } finally {
      setSearching(false);
    }
  }

  function selectSuggestion(s: NominatimResult) {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setQuery(s.display_name.split(',').slice(0, 2).join(','));
    setSuggestions([]);
    onChange({ ...value, address: s.display_name.split(',').slice(0, 2).join(','), lat, lng });
    updateMarker(lat, lng);
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <label className="field-label" htmlFor="address-search">Address search</label>
        <input
          id="address-search"
          type="text"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange({ ...value, address: next });
            searchAddress(next);
          }}
          placeholder="Start typing an address in Berlin..."
          minLength={5}
          className={addressError ? 'field-input border-red-400' : 'field-input'}
          aria-invalid={Boolean(addressError)}
          aria-describedby={addressError ? 'address-error' : undefined}
        />
        {addressError && (
          <p id="address-error" className="mt-1 text-xs text-red-600">
            {addressError}
          </p>
        )}
        {searching && <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Searching…</p>}
        {suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--color-border)] bg-white shadow-lg">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-paper-warm)]"
                >
                  {s.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="field-label" htmlFor="neighborhood">Neighborhood</label>
        <select
          id="neighborhood"
          value={value.neighborhood}
          onChange={(e) => onChange({ ...value, neighborhood: e.target.value as BerlinNeighborhood })}
          className="field-input"
        >
          {BERLIN_NEIGHBORHOODS_SORTED.map((n) => (
            <option key={n} value={n}>{NEIGHBORHOOD_LABELS[n]}</option>
          ))}
        </select>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.approximateLocation}
          onChange={(e) => onChange({ ...value, approximateLocation: e.target.checked })}
          className="size-4 rounded border-[var(--color-border)] text-[var(--color-accent)]"
        />
        Hide precise location on the map (show approximate area only)
      </label>

      <div ref={mapRef} className="h-64 w-full overflow-hidden rounded-xl border border-[var(--color-border)]" />
      <p className="text-xs text-[var(--color-ink-muted)]">Click the map or drag the pin to set the location.</p>
    </div>
  );
}
