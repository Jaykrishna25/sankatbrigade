import type { MapZoneId } from '../types/incident';
import { findPlaceInText, findStateInText, nearestPlace, type Place } from '../data/indiaPlaces';

/**
 * Geography helpers.
 *
 * SankatBrigade is not tied to one campus: a report can come from anywhere in
 * India. Coordinates come from the reporter's browser, place names are resolved
 * against the offline index in data/indiaPlaces.ts, and the map opens on
 * whatever has actually been reported — zooming out to the whole country when
 * incidents are spread across it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CAMPUS_ORIGIN only anchors the SIMULATED coordinates on the demo rows, and is
 * where the map falls back to when nothing has coordinates yet. Change it to
 * your own campus; it does not limit where reports can come from.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const CAMPUS_ORIGIN = { lat: 23.0225, lng: 72.5714, label: 'Ahmedabad, Gujarat' };

/** Roughly the centre of India, used when the map should show the whole country. */
export const INDIA_CENTER = { lat: 22.9, lng: 79.2, zoom: 5 };

export interface ResolvedPlace {
  label: string;
  region: string | null;
  place: string | null;
  lat: number | null;
  lng: number | null;
  approximate: boolean;
}

/**
 * Resolve a typed or spoken location anywhere in India to a label, a state and
 * approximate coordinates — offline, with no geocoding service.
 */
export function resolveIndianPlace(
  text: string,
  options: { fromFreeText?: boolean } = {},
): ResolvedPlace | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  const place: Place | null = findPlaceInText(trimmed);
  if (place) {
    // From a location field, keep whatever detail the reporter typed
    // ("Andheri, Mumbai" stays as typed). From a whole sentence, use the
    // canonical name — the sentence is not a location label.
    const label =
      options.fromFreeText || trimmed.toLowerCase() === place.name.toLowerCase()
        ? `${place.name}, ${place.state}`
        : trimmed;
    return { label, region: place.state, place: place.name, lat: place.lat, lng: place.lng, approximate: true };
  }

  const state = findStateInText(trimmed);
  if (state) return { label: trimmed, region: state, place: null, lat: null, lng: null, approximate: true };

  return null;
}

/** Turn coordinates into a human label: the nearest indexed city and its state. */
export function describeCoords(lat: number, lng: number): { label: string; region: string | null; place: string | null } {
  const nearest = nearestPlace(lat, lng);
  if (!nearest || nearest.km > 160) {
    return { label: `Approx. ${formatCoords(lat, lng)}`, region: null, place: null };
  }
  const proximity = nearest.km <= 12 ? nearest.place.name : `${nearest.km} km from ${nearest.place.name}`;
  return {
    label: `${proximity}, ${nearest.place.state}`,
    region: nearest.place.state,
    place: nearest.place.name,
  };
}

/** Roughly 0.0004° ≈ 45 m, so these offsets spread the demo campus over ~500 m. */
const ZONE_OFFSET: Record<MapZoneId, [number, number]> = {
  'science-block': [0.0012, -0.0016],
  library: [0.0013, -0.0002],
  'admin-block': [0.0011, 0.0011],
  'hostel-a': [0.0012, 0.0026],
  'hostel-b': [0.0002, 0.0026],
  canteen: [0.0002, -0.0003],
  parking: [0.0001, 0.0011],
  'sports-ground': [-0.0007, -0.0015],
  'main-gate': [-0.0014, 0.0004],
  bridge: [-0.001, 0.0022],
  unmapped: [-0.0018, 0.0031],
};

/**
 * A simulated position for a demo incident, derived from its zone. Clearly
 * labelled as simulated everywhere it is shown — no demo row claims to be a
 * real GPS fix.
 */
export function simulatedCoords(zone: MapZoneId, index = 0): { lat: number; lng: number } {
  const [dLat, dLng] = ZONE_OFFSET[zone] ?? ZONE_OFFSET.unmapped;
  // A tiny deterministic jitter so several incidents in one zone do not stack.
  const jitter = ((index * 37) % 11) * 0.00002;
  return {
    lat: Number((CAMPUS_ORIGIN.lat + dLat + jitter).toFixed(6)),
    lng: Number((CAMPUS_ORIGIN.lng + dLng - jitter).toFixed(6)),
  };
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** Opens the point in whatever map app the device has. No API key, no tracking. */
export function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function openStreetMapLink(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
}

/** Metres between two points — used only to show how far apart reports are. */
export function distanceMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
