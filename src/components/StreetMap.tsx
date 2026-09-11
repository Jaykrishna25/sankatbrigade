import { useEffect, useRef, useState } from 'react';
import type { CircleMarker, Map as LeafletMap, TileLayer } from 'leaflet';
import type { Incident, Urgency } from '../types/incident';
import { CAMPUS_ORIGIN, INDIA_CENTER, describeCoords } from '../utils/geo';
import { INCIDENT_TYPE_LABEL, URGENCY_LABEL } from '../utils/labels';
import Icon from './Icons';

/**
 * Street map — Leaflet over OpenStreetMap tiles.
 *
 * Deliberate choices:
 *   - Leaflet is bundled with the app and imported lazily, so it lives on our
 *     own origin: no CDN, no third-party script, and it still works when the
 *     app is installed and offline.
 *   - The only thing that needs the network is the tile imagery. If tiles do
 *     not arrive — no connection, blocked host, venue Wi-Fi down — the markers
 *     are still plotted and the map says the imagery is unavailable rather than
 *     showing a silent grey box.
 *   - Positions come from coordinates already on the incident. Nothing is
 *     tracked live, and demo rows are labelled as simulated positions.
 */

const URGENCY_COLOR: Record<Urgency, string> = {
  critical: '#ff4d5e',
  high: '#ffa53a',
  medium: '#52a5ff',
  low: '#93a5c7',
};

interface StreetMapProps {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (incidentId: string) => void;
  onUnavailable?: () => void;
}

export default function StreetMap({ incidents, selectedId, onSelect, onUnavailable }: StreetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const boundsRef = useRef<[number, number][]>([]);
  const meMarkerRef = useRef<CircleMarker | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [tiles, setTiles] = useState<'pending' | 'ok' | 'unavailable'>('pending');
  const [meNote, setMeNote] = useState<string | null>(null);

  const located = incidents.filter(
    (incident) => typeof incident.location.lat === 'number' && typeof incident.location.lng === 'number',
  );

  useEffect(() => {
    let cancelled = false;
    let tileErrors = 0;

    (async () => {
      try {
        const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
        if (cancelled || !containerRef.current) return;
        leafletRef.current = L;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const map = L.map(containerRef.current, {
          scrollWheelZoom: false,
          attributionControl: true,
        }).setView([INDIA_CENTER.lat, INDIA_CENTER.lng], INDIA_CENTER.zoom);
        mapRef.current = map;

        const layer: TileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        });
        layer.on('tileload', () => {
          if (!cancelled) setTiles('ok');
        });
        layer.on('tileerror', () => {
          tileErrors += 1;
          if (tileErrors >= 3 && !cancelled) setTiles((current) => (current === 'ok' ? current : 'unavailable'));
        });
        layer.addTo(map);

        const points: [number, number][] = [];
        located.forEach((incident) => {
          const point: [number, number] = [incident.location.lat as number, incident.location.lng as number];
          points.push(point);
          const colour = URGENCY_COLOR[incident.final_urgency];
          const isSelected = incident.incident_id === selectedId;
          const marker = L.circleMarker(point, {
            radius: isSelected ? 12 : 9,
            color: colour,
            weight: isSelected ? 4 : 2,
            fillColor: colour,
            fillOpacity: 0.55,
          }).addTo(map);
          marker.bindPopup(
            `<strong>${incident.incident_id}</strong><br>${URGENCY_LABEL[incident.final_urgency]} · ${
              INCIDENT_TYPE_LABEL[incident.incident_type]
            }<br>${incident.location.label}${incident.is_demo ? '<br><em>Simulated demo position</em>' : ''}`,
          );
          marker.on('click', () => onSelect(incident.incident_id));
          if (isSelected) marker.openPopup();
        });

        boundsRef.current = points;
        // Open on whatever has actually been reported: one place zooms in, a
        // spread across the country zooms out to fit it, nothing at all shows
        // the local area rather than pretending to know better.
        if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [36, 36] });
        else if (points.length === 1) map.setView(points[0], 16);
        else map.setView([CAMPUS_ORIGIN.lat, CAMPUS_ORIGIN.lng], 15);

        window.setTimeout(() => map.invalidateSize(), 60);
        if (!cancelled) setStatus('ready');
      } catch {
        if (cancelled) return;
        setStatus('failed');
        onUnavailable?.();
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents, selectedId]);

  const fitAll = () => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const points = boundsRef.current;
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [36, 36] });
    else if (points.length === 1) map.setView(points[0], 16);
  };

  const showIndia = () => {
    mapRef.current?.setView([INDIA_CENTER.lat, INDIA_CENTER.lng], INDIA_CENTER.zoom);
  };

  /** Centre on the viewer's own position — anywhere in the country. */
  const locateMe = () => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (!('geolocation' in navigator)) {
      setMeNote('This browser does not support location access. Use the search on the report form instead.');
      return;
    }
    setMeNote('Requesting your location…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point: [number, number] = [position.coords.latitude, position.coords.longitude];
        if (meMarkerRef.current) meMarkerRef.current.remove();
        meMarkerRef.current = L.circleMarker(point, {
          radius: 8,
          color: '#8b7bff',
          weight: 3,
          fillColor: '#8b7bff',
          fillOpacity: 0.35,
        })
          .addTo(map)
          .bindPopup('Your approximate position — shown on this device only, never shared.');
        map.setView(point, 15);
        meMarkerRef.current.openPopup();
        const described = describeCoords(point[0], point[1]);
        setMeNote(`Centred on ${described.label}.`);
      },
      () => setMeNote('Location permission was declined or unavailable. The map is unchanged.'),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60_000 },
    );
  };

  if (status === 'failed') {
    return (
      <div className="sb-empty" role="status">
        <strong>The street map could not start.</strong>
        <div style={{ marginTop: 6 }}>
          Everything else — reporting, triage, the queue — keeps working, and the campus map never needs the
          network.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sb-map-toolbar">
        <button type="button" className="sb-btn sb-btn--subtle sb-btn--sm" onClick={fitAll}>
          <Icon name="search" size={14} />
          Fit all incidents
        </button>
        <button type="button" className="sb-btn sb-btn--subtle sb-btn--sm" onClick={showIndia}>
          <Icon name="map" size={14} />
          Whole of India
        </button>
        <button type="button" className="sb-btn sb-btn--ghost sb-btn--sm" onClick={locateMe}>
          <Icon name="pin" size={14} />
          Locate me
        </button>
        {meNote && <span className="sb-map-toolbar__note">{meNote}</span>}
      </div>

      <div className="sb-streetmap" ref={containerRef} aria-label="Street map of reported incident locations">
        {status === 'loading' && (
          <div className="sb-streetmap__loading">
            <span className="sb-spinner" /> Loading map…
          </div>
        )}
      </div>

      {tiles === 'unavailable' && (
        <p className="sb-hint sb-hint--warn" role="status">
          Map imagery is unavailable right now (no connection to the tile service). Incident positions are still
          plotted, and the campus map works with no network at all.
        </p>
      )}

      <div className="sb-map__legend">
        <span>
          <i className="sb-map__swatch" style={{ background: URGENCY_COLOR.critical }} /> Critical
        </span>
        <span>
          <i className="sb-map__swatch" style={{ background: URGENCY_COLOR.high }} /> High
        </span>
        <span>
          <i className="sb-map__swatch" style={{ background: URGENCY_COLOR.medium }} /> Medium
        </span>
        <span>
          <i className="sb-map__swatch" style={{ background: URGENCY_COLOR.low }} /> Low
        </span>
        <span>
          {located.length} of {incidents.length} incidents have coordinates, across{' '}
          {new Set(located.map((incident) => incident.location.region ?? 'unknown region')).size} state(s).
          Reports work anywhere in India: demo rows use simulated positions, live reports use the coordinates
          your browser returned or the city you named.
        </span>
      </div>
    </div>
  );
}
