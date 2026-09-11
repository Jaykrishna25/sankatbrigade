/**
 * Turns a citizen report into a structured Incident, and re-runs the same
 * pipeline whenever new information arrives (from the assistant, or from an
 * operator in the Command Center).
 *
 *   raw report -> extractIncident() -> runTriage() -> Incident
 */

import type {
  ExtractionResult,
  Incident,
  IncidentLocation,
  LifecycleStatus,
  MapZoneId,
  ResourceNeed,
  TimelineEntry,
  VerificationStatus,
} from '../types/incident';
import { extractIncident } from './incidentExtractor';
import { runTriage } from './triageEngine';
import { nextIncidentId } from './storage';
import { LIFECYCLE_LABEL, RESOURCE_LABEL, VERIFICATION_LABEL } from './labels';
import { setSessionMedia } from './mediaStore';
import { describeCoords, resolveIndianPlace } from './geo';

export interface ReportInput {
  text: string;
  locationLabel: string;
  coords: { lat: number; lng: number } | null;
  photoDataUrl: string | null;
  photoName: string | null;
  usedVoice: boolean;
  /** Session-only media: the blob URL plus the details worth storing. */
  video: { url: string; name: string; sizeKb: number } | null;
  audio: { url: string; name: string; seconds: number } | null;
  /** Explicit resource request from the form; 'auto' leaves it to extraction. */
  resourceNeed: ResourceNeed | 'auto';
  resourceQuantity: number | null;
}

const ZONE_FROM_LABEL: { match: RegExp; zone: MapZoneId }[] = [
  { match: /science|lab/i, zone: 'science-block' },
  { match: /hostel\s*b/i, zone: 'hostel-b' },
  { match: /hostel/i, zone: 'hostel-a' },
  { match: /librar/i, zone: 'library' },
  { match: /admin|office/i, zone: 'admin-block' },
  { match: /canteen|mess|cafeteria/i, zone: 'canteen' },
  { match: /ground|field|playground/i, zone: 'sports-ground' },
  { match: /gate|entrance/i, zone: 'main-gate' },
  { match: /bridge|flyover/i, zone: 'bridge' },
  { match: /parking/i, zone: 'parking' },
];

function zoneForLabel(label: string): MapZoneId {
  const found = ZONE_FROM_LABEL.find((entry) => entry.match.test(label));
  return found ? found.zone : 'unmapped';
}

/**
 * Work out where an incident is, from anywhere in India.
 *
 * Order of trust: the coordinates the browser returned, then what the reporter
 * typed, then a place named in the report text. A typed city is resolved
 * against the offline India index to attach an approximate position and a
 * state, so a report from any city still appears on the map and in the region
 * filter. Nothing is invented: with none of the three, this stays 'Unknown'.
 */
function buildLocation(
  input: ReportInput,
  detected: ExtractionResult['detected_location'],
): IncidentLocation {
  const typed = input.locationLabel.trim();
  const typedPlace = typed.length > 0 ? resolveIndianPlace(typed) : null;
  const fromCoords = input.coords ? describeCoords(input.coords.lat, input.coords.lng) : null;

  const lat = input.coords?.lat ?? typedPlace?.lat ?? detected?.lat ?? null;
  const lng = input.coords?.lng ?? typedPlace?.lng ?? detected?.lng ?? null;
  const region = typedPlace?.region ?? fromCoords?.region ?? detected?.region ?? null;
  const place = typedPlace?.place ?? fromCoords?.place ?? detected?.place ?? null;

  if (typed.length > 0) {
    return {
      label: typedPlace?.label ?? typed,
      lat,
      lng,
      source: input.coords ? 'browser_geolocation' : 'user_typed',
      zone: detected?.zone ?? zoneForLabel(typed),
      region,
      place,
    };
  }

  if (input.coords && fromCoords) {
    return {
      label: fromCoords.label,
      lat: input.coords.lat,
      lng: input.coords.lng,
      source: 'browser_geolocation',
      zone: detected?.zone ?? 'unmapped',
      region,
      place,
    };
  }

  if (detected) {
    return {
      label: detected.label,
      lat: detected.lat,
      lng: detected.lng,
      source: 'detected_in_text',
      zone: detected.zone,
      region: detected.region,
      place: detected.place,
    };
  }

  return { label: 'Unknown', lat: null, lng: null, source: 'unknown', zone: 'unmapped', region: null, place: null };
}

export function analyseReport(input: ReportInput): Incident {
  const extracted = extractIncident(input.text);

  // An explicit choice in the form always beats what the words implied.
  const resourceOverridden = input.resourceNeed !== 'auto';
  const extraction = {
    ...extracted,
    resource_needed: resourceOverridden ? (input.resourceNeed as ResourceNeed) : extracted.resource_needed,
    resource_quantity:
      input.resourceQuantity ?? (resourceOverridden ? extracted.people_affected : extracted.resource_quantity),
    people_affected: extracted.people_affected ?? input.resourceQuantity ?? null,
  };

  const triage = runTriage({ ...extraction, independent_reports: 0 });
  const now = new Date().toISOString();
  const location = buildLocation(input, extraction.detected_location);

  const timeline: TimelineEntry[] = [
    { at: now, label: 'Report received', detail: 'Citizen report submitted through SankatBrigade.', actor: 'reporter' },
    {
      at: now,
      label: 'Prototype analysis complete',
      detail: `Deterministic rules set priority ${triage.final_urgency.toUpperCase()}.`,
      actor: 'system',
    },
    {
      at: now,
      label: `Status: ${LIFECYCLE_LABEL[triage.lifecycle_status]}`,
      detail: 'Added to the SankatBrigade Command Center queue. No emergency service has been contacted.',
      actor: 'system',
    },
  ];

  if (resourceOverridden) {
    timeline.splice(1, 0, {
      at: now,
      label: 'Resource request stated by reporter',
      detail: `${RESOURCE_LABEL[input.resourceNeed as ResourceNeed]}${
        input.resourceQuantity ? ` for about ${input.resourceQuantity} people` : ''
      }. Chosen in the form, so it overrides what the text implied.`,
      actor: 'reporter',
    });
  }

  const incidentId = nextIncidentId();
  if (input.video) setSessionMedia(incidentId, 'video', input.video.url);
  if (input.audio) setSessionMedia(incidentId, 'audio', input.audio.url);

  return {
    incident_id: incidentId,
    incident_type: extraction.incident_type,
    classification: extraction.classification,
    urgency_candidate: extraction.urgency_candidate,
    final_urgency: triage.final_urgency,
    rule_override: triage.rule_override,
    location,
    people_affected: extraction.people_affected,
    trapped: extraction.trapped,
    hazards: extraction.hazards,
    critical_signals: extraction.critical_signals,
    risk_signals: extraction.risk_signals,
    resource_needed: extraction.resource_needed,
    resource_quantity: extraction.resource_quantity,
    evidence: {
      text_report: input.text.trim().length > 0,
      photo: Boolean(input.photoDataUrl),
      voice: input.usedVoice,
      video: Boolean(input.video),
      audio: Boolean(input.audio),
      photo_data_url: input.photoDataUrl,
      photo_name: input.photoName,
      video_name: input.video?.name ?? null,
      video_size_kb: input.video?.sizeKb ?? null,
      audio_name: input.audio?.name ?? null,
      audio_seconds: input.audio?.seconds ?? null,
    },
    verification_status: triage.verification_status,
    independent_reports: 0,
    rumour_signal: extraction.rumour_signal,
    reason: triage.reason,
    recommended_action: triage.recommended_action,
    safe_action: triage.safe_action,
    lifecycle_status: triage.lifecycle_status,
    created_at: now,
    updated_at: now,
    raw_text: input.text.trim(),
    source: 'citizen_report',
    is_demo: false,
    timeline,
  };
}

/**
 * Fold extra information (typically an assistant answer) into an existing
 * incident and re-run the whole deterministic pipeline on the combined text.
 * The incident id, creation time and evidence are preserved.
 */
export function reanalyseWithDetail(
  incident: Incident,
  addedText: string,
  overrides?: { locationLabel?: string; peopleAffected?: number },
): Incident {
  const combined = `${incident.raw_text} ${addedText}`.trim();
  const extraction = extractIncident(combined);

  const peopleAffected = overrides?.peopleAffected ?? extraction.people_affected ?? incident.people_affected;
  const triage = runTriage({
    ...extraction,
    people_affected: peopleAffected,
    resource_quantity: peopleAffected ?? extraction.resource_quantity,
    independent_reports: incident.independent_reports,
    officially_confirmed: incident.verification_status === 'officially_confirmed',
  });

  const now = new Date().toISOString();
  const locationLabel = overrides?.locationLabel?.trim();
  const answeredPlace = locationLabel ? resolveIndianPlace(locationLabel) : null;
  const location: IncidentLocation =
    locationLabel && locationLabel.length > 0
      ? {
          label: answeredPlace?.label ?? locationLabel,
          lat: incident.location.lat ?? answeredPlace?.lat ?? extraction.detected_location?.lat ?? null,
          lng: incident.location.lng ?? answeredPlace?.lng ?? extraction.detected_location?.lng ?? null,
          source: 'user_typed',
          zone: extraction.detected_location?.zone ?? zoneForLabel(locationLabel),
          region: answeredPlace?.region ?? extraction.detected_location?.region ?? incident.location.region,
          place: answeredPlace?.place ?? extraction.detected_location?.place ?? incident.location.place,
        }
      : incident.location.label === 'Unknown' && extraction.detected_location
        ? {
            label: extraction.detected_location.label,
            lat: extraction.detected_location.lat,
            lng: extraction.detected_location.lng,
            source: 'detected_in_text',
            zone: extraction.detected_location.zone,
            region: extraction.detected_location.region,
            place: extraction.detected_location.place,
          }
        : incident.location;

  const urgencyChanged = triage.final_urgency !== incident.final_urgency;
  const timeline: TimelineEntry[] = [
    ...incident.timeline,
    {
      at: now,
      label: 'Report updated by reporter',
      detail: urgencyChanged
        ? `New detail added. Priority re-evaluated: ${incident.final_urgency.toUpperCase()} -> ${triage.final_urgency.toUpperCase()}.`
        : 'New detail added. Priority re-evaluated with no change.',
      actor: 'reporter',
    },
  ];

  return {
    ...incident,
    incident_type: extraction.incident_type,
    classification: extraction.classification,
    urgency_candidate: extraction.urgency_candidate,
    final_urgency: triage.final_urgency,
    rule_override: triage.rule_override,
    location,
    people_affected: peopleAffected,
    trapped: extraction.trapped,
    hazards: extraction.hazards,
    critical_signals: extraction.critical_signals,
    risk_signals: extraction.risk_signals,
    resource_needed: extraction.resource_needed,
    resource_quantity: peopleAffected ?? extraction.resource_quantity,
    rumour_signal: extraction.rumour_signal,
    reason: triage.reason,
    recommended_action: triage.recommended_action,
    safe_action: triage.safe_action,
    lifecycle_status:
      incident.lifecycle_status === 'resolved' ? incident.lifecycle_status : triage.lifecycle_status,
    verification_status:
      incident.verification_status === 'officially_confirmed'
        ? incident.verification_status
        : triage.verification_status,
    updated_at: now,
    raw_text: combined,
    timeline,
  };
}

/** Operator action: move an incident along its lifecycle (demo only). */
export function setLifecycle(incident: Incident, status: LifecycleStatus): Incident {
  const now = new Date().toISOString();
  return {
    ...incident,
    lifecycle_status: status,
    updated_at: now,
    timeline: [
      ...incident.timeline,
      {
        at: now,
        label: `Status changed to ${LIFECYCLE_LABEL[status]}`,
        detail: 'Local demo action by a Command Center operator. Nothing was dispatched.',
        actor: 'operator',
      },
    ],
  };
}

/** Operator action: adjust the verification state (demo only). */
export function setVerification(incident: Incident, status: VerificationStatus): Incident {
  const now = new Date().toISOString();
  const independent =
    status === 'corroborated'
      ? Math.max(incident.independent_reports, 3)
      : status === 'corroborating'
        ? Math.max(incident.independent_reports, 1)
        : incident.independent_reports;
  return {
    ...incident,
    verification_status: status,
    independent_reports: independent,
    updated_at: now,
    timeline: [
      ...incident.timeline,
      {
        at: now,
        label: `Verification set to ${VERIFICATION_LABEL[status]}`,
        detail: 'Local demo action. In a real deployment this would require an independent or official source.',
        actor: 'operator',
      },
    ],
  };
}

/** Operator action: log another independent report of the same incident. */
export function addIndependentReport(incident: Incident): Incident {
  const count = incident.independent_reports + 1;
  const status: VerificationStatus =
    incident.verification_status === 'officially_confirmed'
      ? 'officially_confirmed'
      : count >= 3
        ? 'corroborated'
        : 'corroborating';
  const now = new Date().toISOString();
  return {
    ...incident,
    independent_reports: count,
    verification_status: status,
    updated_at: now,
    timeline: [
      ...incident.timeline,
      {
        at: now,
        label: 'Independent report logged',
        detail: `${count} independent report(s) now describe this situation. Verification: ${VERIFICATION_LABEL[status]}.`,
        actor: 'operator',
      },
    ],
  };
}
