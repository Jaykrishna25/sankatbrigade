import type { Incident } from '../types/incident';

/**
 * Client for the optional AI language layer.
 *
 * The browser never holds a key. It calls this deployment's own
 * /api/assistant endpoint, which exists only where a server can run one
 * (Cloudflare Pages Functions, the Docker image, `npm run dev:ai`). On a
 * pure static host such as GitHub Pages there is no endpoint, probe() returns
 * disabled, and the assistant stays fully deterministic — which is the
 * supported, tested state, not a degraded one.
 *
 * Nothing here can change an incident's priority: triage happens in the
 * browser, before any of this runs.
 */

export interface AiStatus {
  enabled: boolean;
  provider: string | null;
}

const PROBE_TIMEOUT_MS = 2500;
const ASK_TIMEOUT_MS = 15_000;

function endpoint(): string {
  // Hash routing means location.href can carry a #/route — strip it.
  const base = window.location.href.split('#')[0];
  return new URL('api/assistant', base).href;
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    // A static host may answer any path with index.html and a 200 — only JSON counts.
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('application/json')) throw new Error('not json');
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

/** Is an AI layer available on this deployment? Safe to call on every load. */
export async function probeAi(): Promise<AiStatus> {
  try {
    const payload = (await fetchJson(endpoint(), { method: 'GET' }, PROBE_TIMEOUT_MS)) as {
      ok?: boolean;
      enabled?: boolean;
      provider?: string | null;
    };
    if (payload?.ok && payload.enabled) {
      return { enabled: true, provider: payload.provider ?? 'configured' };
    }
  } catch {
    /* no endpoint, offline, blocked, or too slow — deterministic mode it is */
  }
  return { enabled: false, provider: null };
}

export interface AskAiInput {
  question: string;
  incident: Incident | null;
  history: { role: 'bot' | 'user'; text: string }[];
}

/**
 * Ask the language layer. Returns null on any failure so the caller can use its
 * deterministic answer instead — a dead provider must never become a dead app.
 */
export async function askAi({ question, incident, history }: AskAiInput): Promise<string | null> {
  try {
    const payload = (await fetchJson(
      endpoint(),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          question,
          // Send only the fields the model needs to explain the record.
          incident: incident
            ? {
                incident_id: incident.incident_id,
                incident_type: incident.incident_type,
                final_urgency: incident.final_urgency,
                verification_status: incident.verification_status,
                lifecycle_status: incident.lifecycle_status,
                location: incident.location.label,
                region: incident.location.region,
                people_affected: incident.people_affected,
                hazards: incident.hazards,
                resource_needed: incident.resource_needed,
                reason: incident.reason,
                safe_action: incident.safe_action,
                rumour_signal: incident.rumour_signal,
                reported_text: incident.raw_text,
              }
            : null,
          history: history.slice(-8),
        }),
      },
      ASK_TIMEOUT_MS,
    )) as { ok?: boolean; text?: string };

    if (payload?.ok && typeof payload.text === 'string' && payload.text.trim().length > 0) {
      return payload.text.trim();
    }
  } catch {
    /* fall through to deterministic */
  }
  return null;
}

/** Rough check for "is this a question?", used to decide when the AI layer helps. */
export function looksLikeQuestion(text: string): boolean {
  const value = text.trim().toLowerCase();
  if (value.endsWith('?')) return true;
  return /^(what|why|how|when|where|who|which|can|could|should|is|are|do|does|did|will|would|explain|tell me)\b/.test(
    value,
  );
}
