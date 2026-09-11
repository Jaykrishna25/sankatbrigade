/**
 * Simulated demo data for the Command Center.
 *
 * These rows are NOT real incidents and the UI labels every one of them
 * "Simulated demo data". They are generated at load time by running the very
 * same deterministic extractor + triage engine that live citizen reports use,
 * so what a judge sees in the queue is produced by the real pipeline rather
 * than hand-written to look impressive.
 *
 * `created_at` is stored as "minutes ago" and converted to a real timestamp in
 * storage.ts, so the seeded queue always looks recent whenever it is opened.
 */

import type {
  Incident,
  LifecycleStatus,
  MapZoneId,
  TimelineEntry,
  VerificationStatus,
} from '../types/incident';
import { extractIncident } from '../utils/incidentExtractor';
import { runTriage } from '../utils/triageEngine';
import { LIFECYCLE_LABEL } from '../utils/labels';
import { describeCoords, simulatedCoords } from '../utils/geo';

interface DemoSeed {
  id: string;
  text: string;
  locationLabel: string;
  zone: MapZoneId;
  minutesAgo: number;
  independentReports?: number;
  lifecycle?: LifecycleStatus;
  verification?: VerificationStatus;
  hasPhoto?: boolean;
  hasVideo?: boolean;
  viaVoice?: boolean;
  operatorNote?: string;
}

const SEEDS: DemoSeed[] = [
  {
    id: 'SB-1046',
    text: 'About sixty people in Hostel A need drinking water since this morning, the tank is empty.',
    locationLabel: 'Hostel A, Block 2',
    zone: 'hostel-a',
    minutesAgo: 26,
    independentReports: 1,
  },
  {
    id: 'SB-1045',
    text: 'The approach road near the main gate is flooded and the water is rising. The route is blocked for two wheelers.',
    locationLabel: 'Main Gate approach road',
    zone: 'main-gate',
    minutesAgo: 41,
    independentReports: 2,
    hasPhoto: true,
  },
  {
    id: 'SB-1044',
    text: 'There is a fire in the canteen kitchen and heavy smoke is coming out of the shutter.',
    locationLabel: 'Canteen, Kitchen Block',
    zone: 'canteen',
    minutesAgo: 63,
    independentReports: 4,
    hasVideo: true,
    lifecycle: 'in_progress',
    operatorNote: 'Operator marked as in progress in this prototype. No service was dispatched by SankatBrigade.',
  },
  {
    id: 'SB-1043',
    text: 'A student slipped on the wet stairs near the library and is bleeding from the arm. Someone should send medical help.',
    locationLabel: 'Library, Staircase B',
    zone: 'library',
    minutesAgo: 78,
    independentReports: 1,
  },
  {
    id: 'SB-1042',
    text: 'Power cut in Hostel B since two hours, the corridor lights are off and students are using phone torches.',
    locationLabel: 'Hostel B',
    zone: 'hostel-b',
    minutesAgo: 96,
  },
  {
    id: 'SB-1041',
    text: 'The parking area was waterlogged and the exit was blocked by a fallen tree.',
    locationLabel: 'Parking, East Side',
    zone: 'parking',
    minutesAgo: 240,
    independentReports: 3,
    lifecycle: 'resolved',
    operatorNote: 'Marked resolved locally for the demo after the reporter confirmed the route was clear.',
  },
  {
    id: 'SB-1040',
    text: 'People are saying a transformer near the parking has exploded, nobody knows if it is true.',
    locationLabel: 'Near Parking, East Side',
    zone: 'parking',
    minutesAgo: 18,
  },
  {
    id: 'SB-1039',
    text: 'The canteen is shut and about twenty five people in the admin block have had no food since morning.',
    locationLabel: 'Admin Block, Ground Floor',
    zone: 'admin-block',
    minutesAgo: 132,
  },
  {
    id: 'SB-1038',
    text: 'Two students near the admin block need transport to reach the main gate, they cannot walk that far.',
    locationLabel: 'Admin Block',
    zone: 'admin-block',
    minutesAgo: 154,
  },
  {
    id: 'SB-1037',
    text: 'Four families near the sports ground need shelter tonight because their roof sheets blew off in the storm.',
    locationLabel: 'Sports Ground, North Edge',
    zone: 'sports-ground',
    minutesAgo: 175,
    independentReports: 1,
  },
  {
    id: 'SB-1036',
    text: 'There is no network signal in the science block basement and students cannot call anyone. Communication support needed.',
    locationLabel: 'Science Block, Basement',
    zone: 'science-block',
    minutesAgo: 205,
    viaVoice: true,
  },
];

function buildDemoIncident(seed: DemoSeed, index: number): Incident {
  const extraction = extractIncident(seed.text);
  const independent = seed.independentReports ?? 0;
  const triage = runTriage({ ...extraction, independent_reports: independent });
  const lifecycle = seed.lifecycle ?? triage.lifecycle_status;
  const verification = seed.verification ?? triage.verification_status;

  const timeline: TimelineEntry[] = [
    {
      at: String(seed.minutesAgo),
      label: 'Report received',
      detail: 'Simulated citizen report seeded for the demo.',
      actor: 'reporter',
    },
    {
      at: String(seed.minutesAgo),
      label: 'Prototype analysis complete',
      detail: `Deterministic rules set priority ${triage.final_urgency.toUpperCase()}.`,
      actor: 'system',
    },
    {
      at: String(seed.minutesAgo),
      label: `Status: ${LIFECYCLE_LABEL[lifecycle]}`,
      detail:
        seed.operatorNote ?? 'Added to the Command Center queue. No emergency service has been contacted.',
      actor: seed.operatorNote ? 'operator' : 'system',
    },
  ];

  // Simulated positions near CAMPUS_ORIGIN so the street map has something to
  // show. Labelled "Simulated demo data" everywhere, like every other demo field.
  const coords = simulatedCoords(seed.zone, index);
  const described = describeCoords(coords.lat, coords.lng);

  return {
    incident_id: seed.id,
    incident_type: extraction.incident_type,
    classification: extraction.classification,
    urgency_candidate: extraction.urgency_candidate,
    final_urgency: triage.final_urgency,
    rule_override: triage.rule_override,
    location: {
      label: seed.locationLabel,
      lat: coords.lat,
      lng: coords.lng,
      source: 'user_typed',
      zone: seed.zone,
      region: described.region,
      place: described.place,
    },
    people_affected: extraction.people_affected,
    trapped: extraction.trapped,
    hazards: extraction.hazards,
    critical_signals: extraction.critical_signals,
    risk_signals: extraction.risk_signals,
    resource_needed: extraction.resource_needed,
    resource_quantity: extraction.resource_quantity,
    evidence: {
      text_report: true,
      photo: Boolean(seed.hasPhoto),
      voice: Boolean(seed.viaVoice),
      video: Boolean(seed.hasVideo),
      audio: false,
      photo_data_url: null,
      photo_name: seed.hasPhoto ? 'simulated-evidence.jpg' : null,
      video_name: seed.hasVideo ? 'simulated-clip.mp4' : null,
      video_size_kb: seed.hasVideo ? 4820 : null,
      audio_name: null,
      audio_seconds: null,
    },
    verification_status: verification,
    independent_reports: independent,
    rumour_signal: extraction.rumour_signal,
    reason: triage.reason,
    recommended_action: triage.recommended_action,
    safe_action: triage.safe_action,
    lifecycle_status: lifecycle,
    created_at: String(seed.minutesAgo),
    updated_at: String(seed.minutesAgo),
    raw_text: seed.text,
    source: 'simulated_demo',
    is_demo: true,
    timeline,
  };
}

export const DEMO_INCIDENTS: Incident[] = SEEDS.map(buildDemoIncident);
