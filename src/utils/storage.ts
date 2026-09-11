/**
 * LocalStorage persistence for the SankatBrigade demo.
 *
 * Everything stays on this device. No server, no database, no account. If
 * storage is unavailable (private browsing, blocked cookies) the app falls back
 * to in-memory state for the session instead of crashing.
 */

import type { Incident } from '../types/incident';
import { DEMO_INCIDENTS } from '../data/demoIncidents';
import { extractIncident } from './incidentExtractor';
import { clearSessionMedia } from './mediaStore';

const INCIDENTS_KEY = 'sankatbrigade.incidents.v1';
const SEQUENCE_KEY = 'sankatbrigade.sequence.v1';
const THEME_KEY = 'sankatbrigade.theme.v1';
const INTRO_KEY = 'sankatbrigade.intro-seen.v1';

/** Demo incident ids run SB-1041..SB-1046, so the first live report is SB-1047. */
const SEQUENCE_START = 1046;

const memoryStore = new Map<string, string>();
let storageWorks: boolean | null = null;

function canUseStorage(): boolean {
  if (storageWorks !== null) return storageWorks;
  try {
    const probe = '__sb_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    storageWorks = true;
  } catch {
    storageWorks = false;
  }
  return storageWorks;
}

function readRaw(key: string): string | null {
  if (canUseStorage()) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      /* fall through to memory */
    }
  }
  return memoryStore.get(key) ?? null;
}

function writeRaw(key: string, value: string): void {
  memoryStore.set(key, value);
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota or privacy mode - memory copy already kept */
  }
}

export function storageAvailable(): boolean {
  return canUseStorage();
}

/* ---------------- incidents ---------------- */

export function loadIncidents(): Incident[] {
  const raw = readRaw(INCIDENTS_KEY);
  if (!raw) {
    const seeded = DEMO_INCIDENTS.map(materialiseDemoTimestamps);
    saveIncidents(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Incident[];
    if (!Array.isArray(parsed)) throw new Error('bad shape');
    return parsed.filter((item) => typeof item?.incident_id === 'string').map(normaliseIncident);
  } catch {
    const seeded = DEMO_INCIDENTS.map(materialiseDemoTimestamps);
    saveIncidents(seeded);
    return seeded;
  }
}

export function saveIncidents(incidents: Incident[]): void {
  try {
    writeRaw(INCIDENTS_KEY, JSON.stringify(incidents));
  } catch {
    /* an oversized photo data URL can blow the quota - the app still works */
  }
}

export function resetDemoData(): Incident[] {
  clearSessionMedia();
  const seeded = DEMO_INCIDENTS.map(materialiseDemoTimestamps);
  saveIncidents(seeded);
  writeRaw(SEQUENCE_KEY, String(SEQUENCE_START));
  return seeded;
}

/**
 * Records saved by an earlier version of the app can be missing newer fields.
 * Rather than crash or silently drop them, fill the gaps from the stored report
 * text — the extractor is deterministic, so the result is what the incident
 * would have had all along.
 */
function normaliseIncident(incident: Incident): Incident {
  const evidence = incident.evidence ?? ({} as Incident['evidence']);
  return {
    ...incident,
    classification: incident.classification ?? extractIncident(incident.raw_text ?? '').classification,
    location: {
      ...incident.location,
      region: incident.location?.region ?? null,
      place: incident.location?.place ?? null,
    },
    evidence: {
      text_report: evidence.text_report ?? true,
      photo: evidence.photo ?? false,
      voice: evidence.voice ?? false,
      video: evidence.video ?? false,
      audio: evidence.audio ?? false,
      photo_data_url: evidence.photo_data_url ?? null,
      photo_name: evidence.photo_name ?? null,
      video_name: evidence.video_name ?? null,
      video_size_kb: evidence.video_size_kb ?? null,
      audio_name: evidence.audio_name ?? null,
      audio_seconds: evidence.audio_seconds ?? null,
    },
  };
}

/** Demo rows are stored with relative ages so the queue always looks live. */
function materialiseDemoTimestamps(incident: Incident): Incident {
  const minutesAgo = Number(incident.created_at);
  if (!Number.isFinite(minutesAgo)) return incident;
  const created = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  const updated = new Date(Date.now() - Math.max(0, minutesAgo - 4) * 60_000).toISOString();
  return {
    ...incident,
    created_at: created,
    updated_at: updated,
    timeline: incident.timeline.map((entry, index) => ({
      ...entry,
      at: new Date(Date.now() - Math.max(0, minutesAgo - index * 3) * 60_000).toISOString(),
    })),
  };
}

/* ---------------- incident ids ---------------- */

export function nextIncidentId(): string {
  const raw = readRaw(SEQUENCE_KEY);
  const current = raw ? Number(raw) : SEQUENCE_START;
  const next = Number.isFinite(current) ? current + 1 : SEQUENCE_START + 1;
  writeRaw(SEQUENCE_KEY, String(next));
  return `SB-${next}`;
}

/* ---------------- ui preferences ---------------- */

export type ThemeName = 'dark' | 'light';

export function loadTheme(): ThemeName {
  return readRaw(THEME_KEY) === 'light' ? 'light' : 'dark';
}

export function saveTheme(theme: ThemeName): void {
  writeRaw(THEME_KEY, theme);
}

/** The cinematic intro plays once per browser session (sessionStorage). */
export function introAlreadySeen(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    window.sessionStorage.setItem(INTRO_KEY, '1');
  } catch {
    /* ignore */
  }
}
