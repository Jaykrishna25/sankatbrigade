import type {
  CriticalSignal,
  Hazard,
  IncidentType,
  LifecycleStatus,
  LocationSource,
  MapZoneId,
  RecommendedAction,
  ResourceNeed,
  RiskSignal,
  Urgency,
  VerificationStatus,
} from '../types/incident';

/** Single source of truth for every machine slug -> human label in the UI. */

export const URGENCY_LABEL: Record<Urgency, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const URGENCY_ORDER: Urgency[] = ['critical', 'high', 'medium', 'low'];

export const URGENCY_RANK: Record<Urgency, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  structural_hazard: 'Structural / Rescue',
  fire_hazard: 'Fire',
  flooding: 'Flooding',
  medical_assistance: 'Medical assistance',
  electrical_hazard: 'Electrical hazard',
  gas_or_chemical: 'Gas / chemical hazard',
  resource_request: 'Resource request',
  unverified_claim: 'Unverified claim',
  information_request: 'Information request',
  other: 'Other / Unclassified',
};

export const RESOURCE_LABEL: Record<ResourceNeed, string> = {
  medical_assistance: 'Medical assistance',
  evacuation_assistance: 'Evacuation assistance',
  drinking_water: 'Drinking water',
  food: 'Food',
  transport: 'Transport',
  shelter: 'Shelter',
  communication_support: 'Communication support',
  power_support: 'Power-related support',
  none: 'No resource requested',
};

export const RESOURCE_ICON: Record<ResourceNeed, string> = {
  medical_assistance: 'medical',
  evacuation_assistance: 'evacuation',
  drinking_water: 'water',
  food: 'food',
  transport: 'transport',
  shelter: 'shelter',
  communication_support: 'comms',
  power_support: 'power',
  none: 'none',
};

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  unverified: 'Unverified',
  corroborating: 'Corroborating',
  corroborated: 'Corroborated',
  officially_confirmed: 'Officially Confirmed',
};

export const VERIFICATION_HELP: Record<VerificationStatus, string> = {
  unverified: 'A single report. Nothing has been independently checked. Do not broadcast as confirmed.',
  corroborating: 'More than one independent report describes the same situation. Still not confirmed.',
  corroborated: 'Several independent reports agree. Treat as likely, still not officially confirmed.',
  officially_confirmed:
    'Marked as confirmed by an operator in this prototype. In a real deployment this state would require an official source.',
};

export const LIFECYCLE_LABEL: Record<LifecycleStatus, string> = {
  new: 'New',
  escalated: 'Escalation required',
  awaiting_verification: 'Awaiting verification',
  acknowledged: 'Acknowledged',
  resource_queued: 'Resource queued',
  in_progress: 'In progress',
  resolved: 'Resolved',
};

export const LIFECYCLE_ORDER: LifecycleStatus[] = [
  'new',
  'escalated',
  'awaiting_verification',
  'acknowledged',
  'resource_queued',
  'in_progress',
  'resolved',
];

export const ACTION_LABEL: Record<RecommendedAction, string> = {
  escalate: 'Escalate to responders',
  verify_before_broadcast: 'Verify before broadcasting',
  assign_resource: 'Assign resource',
  monitor: 'Monitor',
  provide_information: 'Provide information',
};

export const HAZARD_LABEL: Record<Hazard, string> = {
  fire: 'Fire',
  smoke: 'Smoke',
  flooding: 'Flooding',
  possible_electrical_hazard: 'Possible electrical hazard',
  possible_structural_collapse: 'Possible structural collapse',
  gas_or_chemical: 'Possible gas or chemical hazard',
  blocked_access: 'Blocked access',
  darkness_or_power_loss: 'Power loss / darkness',
  traffic: 'Traffic hazard',
  unknown: 'Unknown',
};

export const CRITICAL_SIGNAL_LABEL: Record<CriticalSignal, string> = {
  trapped_people: 'Possible trapped people',
  unconscious_person: 'Person reported unresponsive',
  abnormal_breathing: 'Reported breathing difficulty',
  severe_bleeding: 'Reported bleeding',
  fire: 'Fire reported',
  building_collapse: 'Possible building collapse',
  electrical_hazard: 'Possible electrical hazard',
};

export const RISK_SIGNAL_LABEL: Record<RiskSignal, string> = {
  blocked_access: 'Blocked access or exit',
  injury_reported: 'Injury reported',
  multiple_people_exposed: 'Multiple people exposed',
  gas_or_chemical_smell: 'Gas or chemical smell reported',
  smoke: 'Smoke reported',
  structural_damage: 'Structural damage reported',
  deep_or_moving_water: 'Deep or rising water reported',
  crowd_or_stampede_risk: 'Crowd pressure reported',
  vehicle_accident: 'Vehicle accident reported',
};

export const LOCATION_SOURCE_LABEL: Record<LocationSource, string> = {
  user_typed: 'Typed by reporter',
  browser_geolocation: 'Browser geolocation (approximate)',
  detected_in_text: 'Detected in report text',
  unknown: 'Not provided',
};

export const ZONE_LABEL: Record<MapZoneId, string> = {
  'science-block': 'Science Block',
  'hostel-a': 'Hostel A',
  'hostel-b': 'Hostel B',
  library: 'Library',
  'admin-block': 'Admin Block',
  canteen: 'Canteen',
  'sports-ground': 'Sports Ground',
  'main-gate': 'Main Gate',
  bridge: 'Bridge / Approach Road',
  parking: 'Parking',
  unmapped: 'Unmapped location',
};

/**
 * Hazards that are already described by a signal chip, so the UI does not show
 * "Possible electrical hazard" twice in the same row.
 */
const HAZARD_COVERED_BY: Partial<Record<Hazard, (CriticalSignal | RiskSignal)[]>> = {
  fire: ['fire'],
  smoke: ['smoke'],
  possible_electrical_hazard: ['electrical_hazard'],
  possible_structural_collapse: ['building_collapse', 'structural_damage'],
  gas_or_chemical: ['gas_or_chemical_smell'],
  blocked_access: ['blocked_access'],
  traffic: ['vehicle_accident'],
};

export function visibleHazards(incident: {
  hazards: Hazard[];
  critical_signals: CriticalSignal[];
  risk_signals: RiskSignal[];
}): Hazard[] {
  const shown = new Set<string>([...incident.critical_signals, ...incident.risk_signals]);
  return incident.hazards.filter((hazard) => {
    if (hazard === 'unknown') return false;
    const covered = HAZARD_COVERED_BY[hazard];
    return !covered || !covered.some((signal) => shown.has(signal));
  });
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "12 Sep, 14:32" style short timestamp. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}
