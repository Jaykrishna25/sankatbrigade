/**
 * Session media store.
 *
 * Photos are small enough to downscale and keep in localStorage. Video and
 * audio are not — a single phone clip would blow the storage quota many times
 * over. So the playable file is held in memory as a blob URL for this browser
 * session only, and the incident record keeps just the details (name, size,
 * duration).
 *
 * The UI states this plainly wherever video or audio appears: the evidence is
 * playable now, and it is gone on refresh. Nothing is uploaded anywhere.
 */

export type MediaKind = 'video' | 'audio';

const store = new Map<string, Partial<Record<MediaKind, string>>>();

export function setSessionMedia(incidentId: string, kind: MediaKind, objectUrl: string): void {
  const entry = store.get(incidentId) ?? {};
  const previous = entry[kind];
  if (previous && previous !== objectUrl) URL.revokeObjectURL(previous);
  entry[kind] = objectUrl;
  store.set(incidentId, entry);
}

export function getSessionMedia(incidentId: string, kind: MediaKind): string | null {
  return store.get(incidentId)?.[kind] ?? null;
}

export function hasSessionMedia(incidentId: string): boolean {
  const entry = store.get(incidentId);
  return Boolean(entry && (entry.video || entry.audio));
}

/** Called when demo data is reset, so blob URLs are not leaked. */
export function clearSessionMedia(): void {
  store.forEach((entry) => {
    Object.values(entry).forEach((url) => {
      if (url) URL.revokeObjectURL(url);
    });
  });
  store.clear();
}
