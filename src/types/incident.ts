/**
 * SankatBrigade incident data model.
 *
 * Every field is either something the reporter actually supplied or something a
 * deterministic local rule derived from it. Nothing here is invented: unknown
 * values stay `null` / `'unknown'` so the UI can say "Unknown" honestly.
 */

export type Urgency = 'critical' | 'high' | 'medium' | 'low';

/** Life-safety signals. Any one of these forces final urgency to `critical`. */
export type CriticalSignal =
  | 'trapped_people'
  | 'unconscious_person'
  | 'abnormal_breathing'
  | 'severe_bleeding'
  | 'fire'
  | 'building_collapse'
  | 'electrical_hazard';

/** Serious but not automatically life-threatening signals -> `high`. */
export type RiskSignal =
  | 'blocked_access'
  | 'injury_reported'
  | 'multiple_people_exposed'
  | 'gas_or_chemical_smell'
  | 'smoke'
  | 'structural_damage'
  | 'deep_or_moving_water'
  | 'crowd_or_stampede_risk'
  | 'vehicle_accident';

export type Hazard =
  | 'fire'
  | 'smoke'
  | 'flooding'
  | 'possible_electrical_hazard'
  | 'possible_structural_collapse'
  | 'gas_or_chemical'
  | 'blocked_access'
  | 'darkness_or_power_loss'
  | 'traffic'
  | 'unknown';

export type IncidentType =
  | 'structural_hazard'
  | 'fire_hazard'
  | 'flooding'
  | 'medical_assistance'
  | 'electrical_hazard'
  | 'gas_or_chemical'
  | 'resource_request'
  | 'unverified_claim'
  | 'information_request'
  | 'other';

export type ResourceNeed =
  | 'medical_assistance'
  | 'evacuation_assistance'
  | 'drinking_water'
  | 'food'
  | 'transport'
  | 'shelter'
  | 'communication_support'
  | 'power_support'
  | 'none';

export type VerificationStatus =
  | 'unverified'
  | 'corroborating'
  | 'corroborated'
  | 'officially_confirmed';

export type LifecycleStatus =
  | 'new'
  | 'escalated'
  | 'awaiting_verification'
  | 'acknowledged'
  | 'resource_queued'
  | 'in_progress'
  | 'resolved';

export type RecommendedAction =
  | 'escalate'
  | 'verify_before_broadcast'
  | 'assign_resource'
  | 'monitor'
  | 'provide_information';

export type LocationSource =
  | 'user_typed'
  | 'browser_geolocation'
  | 'detected_in_text'
  | 'unknown';

export interface IncidentLocation {
  /** Human readable label, or 'Unknown' when the reporter gave nothing. */
  label: string;
  lat: number | null;
  lng: number | null;
  source: LocationSource;
  /** Zone id used only by the local (non-GPS) campus map. */
  zone: MapZoneId;
  /** State or union territory, when it could be resolved. Drives the region filter. */
  region: string | null;
  /** Nearest or named city from the offline India index. */
  place: string | null;
}

export interface Evidence {
  text_report: boolean;
  photo: boolean;
  /** Speech-to-text was used to dictate the report. */
  voice: boolean;
  video: boolean;
  /** A recorded or attached audio clip. */
  audio: boolean;
  /** Data URL kept in localStorage for the demo. Never uploaded anywhere. */
  photo_data_url: string | null;
  photo_name: string | null;
  /**
   * Video and audio are far too large for localStorage, so only their details
   * are stored. The playable file itself lives in memory for this session —
   * see utils/mediaStore.ts — and the UI says so rather than pretending
   * otherwise.
   */
  video_name: string | null;
  video_size_kb: number | null;
  audio_name: string | null;
  audio_seconds: number | null;
}

/**
 * Output of the on-device classifier: the chosen category, the points every
 * candidate category scored, and the exact terms that produced them.
 * Points are evidence weights, not probabilities — the UI says so.
 */
export interface Classification {
  primary: IncidentType;
  scores: { type: IncidentType; points: number }[];
  supporting_terms: string[];
}

export interface TimelineEntry {
  at: string;
  label: string;
  detail?: string;
  actor: 'system' | 'reporter' | 'operator';
}

export type MapZoneId =
  | 'science-block'
  | 'hostel-a'
  | 'hostel-b'
  | 'library'
  | 'admin-block'
  | 'canteen'
  | 'sports-ground'
  | 'main-gate'
  | 'bridge'
  | 'parking'
  | 'unmapped';

export interface Incident {
  incident_id: string;
  incident_type: IncidentType;
  classification: Classification;
  /** First guess from keyword extraction, kept for transparency. */
  urgency_candidate: Urgency;
  /** Result of the deterministic rule engine. Always wins. */
  final_urgency: Urgency;
  /** True when the rule engine overrode the extraction guess. */
  rule_override: boolean;
  location: IncidentLocation;
  people_affected: number | null;
  trapped: boolean;
  hazards: Hazard[];
  critical_signals: CriticalSignal[];
  risk_signals: RiskSignal[];
  resource_needed: ResourceNeed;
  resource_quantity: number | null;
  evidence: Evidence;
  verification_status: VerificationStatus;
  independent_reports: number;
  /** Set when the report reads as second-hand hearsay ("everyone is saying..."). */
  rumour_signal: boolean;
  reason: string;
  recommended_action: RecommendedAction;
  safe_action: string;
  lifecycle_status: LifecycleStatus;
  created_at: string;
  updated_at: string;
  raw_text: string;
  source: 'citizen_report' | 'simulated_demo';
  is_demo: boolean;
  timeline: TimelineEntry[];
}

/** Everything the keyword extractor can work out from free text. */
export interface ExtractionResult {
  incident_type: IncidentType;
  classification: Classification;
  urgency_candidate: Urgency;
  critical_signals: CriticalSignal[];
  risk_signals: RiskSignal[];
  hazards: Hazard[];
  people_affected: number | null;
  trapped: boolean;
  resource_needed: ResourceNeed;
  resource_quantity: number | null;
  rumour_signal: boolean;
  detected_location: {
    label: string;
    zone: MapZoneId;
    lat: number | null;
    lng: number | null;
    region: string | null;
    place: string | null;
  } | null;
  matched_terms: string[];
}

/** Output of the deterministic triage engine. */
export interface TriageResult {
  final_urgency: Urgency;
  rule_override: boolean;
  reason: string;
  recommended_action: RecommendedAction;
  safe_action: string;
  lifecycle_status: LifecycleStatus;
  verification_status: VerificationStatus;
  rule_trace: string[];
}
