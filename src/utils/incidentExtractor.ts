/**
 * Prototype incident analysis — deterministic keyword extraction.
 *
 * There is no AI model and no API call here. Everything below is plain string
 * matching that runs locally, offline, with no key of any kind. The UI labels
 * this honestly as "Prototype incident analysis (deterministic keyword rules)".
 *
 * Design rules:
 *   - never invent a fact the reporter did not write;
 *   - unknown stays null / 'Unknown';
 *   - a simple negation guard stops "there is no fire" from matching `fire`.
 */

import type {
  Classification,
  CriticalSignal,
  ExtractionResult,
  Hazard,
  IncidentType,
  MapZoneId,
  ResourceNeed,
  RiskSignal,
  Urgency,
} from '../types/incident';
import { resolveIndianPlace } from './geo';

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  dozen: 12,
  couple: 2,
  few: 3,
  several: 4,
};

const PEOPLE_NOUNS =
  'students?|people|persons?|residents?|children|kids|workers?|staff|families|passengers?|patients?|villagers?|men|women|girls?|boys?';

const NEGATIONS = ['no ', 'not ', "isn't ", 'without ', 'never ', 'nobody ', 'none '];

/** Words that contain a keyword but must not trigger it. */
const EXCLUSIONS: Record<string, string[]> = {
  fire: ['firefighter', 'fireman', 'fire brigade', 'fire service', 'fire station', 'fire drill', 'fire safety'],
  current: ['current situation', 'currently'],
};

function normalise(text: string): string {
  return ` ${text.toLowerCase().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ')} `;
}

/** Does `term` appear, not immediately negated and not inside an excluded phrase? */
function hasTerm(haystack: string, term: string): boolean {
  let index = haystack.indexOf(term);
  while (index !== -1) {
    const before = haystack.slice(Math.max(0, index - 14), index);
    const excluded = (EXCLUSIONS[term] ?? []).some((phrase) =>
      haystack.slice(Math.max(0, index - phrase.length), index + phrase.length).includes(phrase),
    );
    const negated = NEGATIONS.some((neg) => before.endsWith(neg));
    if (!excluded && !negated) return true;
    index = haystack.indexOf(term, index + term.length);
  }
  return false;
}

function matchAny(haystack: string, terms: string[]): string[] {
  return terms.filter((term) => hasTerm(haystack, term));
}

/**
 * Resource needs skip the negation guard on purpose: "no water", "no food" and
 * "no power" are exactly how people report a need. Negation only matters for
 * hazards ("there is no fire").
 */
function matchAnyRaw(haystack: string, terms: string[]): string[] {
  return terms.filter((term) => haystack.includes(term));
}

/* ------------------------------------------------------------------ */
/* Keyword tables                                                      */
/* ------------------------------------------------------------------ */

const CRITICAL_TERMS: Record<CriticalSignal, string[]> = {
  trapped_people: [
    'trapped',
    'stuck inside',
    'stuck in the',
    'locked inside',
    'cannot get out',
    "can't get out",
    'unable to get out',
    'buried',
    'pinned',
    'stranded inside',
    'still inside',
  ],
  unconscious_person: ['unconscious', 'unresponsive', 'not responding', 'passed out', 'fainted', 'not waking'],
  abnormal_breathing: [
    'not breathing',
    'difficulty breathing',
    'trouble breathing',
    'cannot breathe',
    "can't breathe",
    'breathless',
    'gasping',
    'choking',
    'suffocating',
  ],
  severe_bleeding: ['bleeding', 'blood loss', 'blood is not stopping', 'deep cut'],
  fire: ['fire', 'burning', 'flames', 'blaze', 'caught fire'],
  building_collapse: [
    'collapsed',
    'collapse',
    'caved in',
    'cave in',
    'wall fell',
    'roof fell',
    'building fell',
    'slab fell',
    'debris',
  ],
  electrical_hazard: [
    'electrical',
    'electric panel',
    'electrical panel',
    'live wire',
    'live wires',
    'exposed wire',
    'wires',
    'wiring',
    'transformer',
    'short circuit',
    'electric shock',
    'power line',
    'high tension',
    'switchboard',
    'electrical panels',
  ],
};

const RISK_TERMS: Record<RiskSignal, string[]> = {
  blocked_access: [
    'blocked',
    'exit is blocked',
    'road closed',
    'path blocked',
    'landslide',
    'tree fell',
    'tree has fallen',
    'cannot reach',
    'no way out',
  ],
  injury_reported: ['injured', 'injury', 'hurt', 'wounded', 'fracture', 'broken leg', 'broken arm', 'burn', 'burnt'],
  multiple_people_exposed: [],
  gas_or_chemical_smell: ['gas leak', 'smell of gas', 'gas smell', 'lpg', 'cylinder leak', 'chemical', 'fumes', 'toxic', 'ammonia'],
  smoke: ['smoke', 'smoky', 'burning smell'],
  structural_damage: ['crack', 'cracks', 'wall damaged', 'ceiling damaged', 'roof damaged', 'tilting', 'leaning'],
  deep_or_moving_water: [
    'water is rising',
    'rising water',
    'water rising',
    'waist deep',
    'knee deep',
    'chest deep',
    'strong current',
    'swept away',
    'overflowing',
  ],
  crowd_or_stampede_risk: ['stampede', 'crowd is pushing', 'crowd panic', 'panic', 'rush of people'],
  vehicle_accident: ['accident', 'collision', 'crash', 'vehicle hit', 'bike fell', 'car hit'],
};

const FLOOD_TERMS = [
  'flood',
  'flooded',
  'flooding',
  'waterlogged',
  'waterlogging',
  'water logging',
  'water logged',
  'inundated',
  'water has entered',
  'water inside',
  'submerged',
];

const POWER_OUTAGE_TERMS = ['power cut', 'no power', 'no electricity', 'power outage', 'power failure', 'blackout', 'lights are off', 'light gone'];

const RUMOUR_TERMS = [
  'everyone is saying',
  'people are saying',
  'they are saying',
  'saying that',
  'someone said',
  'it is being said',
  'rumour',
  'rumor',
  'forwarded',
  'forward message',
  'viral',
  'on whatsapp',
  'allegedly',
  'apparently',
  'news is spreading',
  'i am hearing',
  'heard that',
];

const FIRST_HAND_TERMS = ['i can see', 'i saw', 'i am at', 'we are at', 'in front of me', 'right now here', 'i am standing'];

const RESOURCE_TERMS: { need: ResourceNeed; terms: string[] }[] = [
  {
    need: 'medical_assistance',
    terms: ['ambulance', 'medical help', 'medical assistance', 'first aid', 'doctor', 'hospital', 'paramedic', 'stretcher'],
  },
  {
    need: 'evacuation_assistance',
    terms: ['evacuate', 'evacuation', 'rescue', 'need to be moved', 'shift them out', 'get them out'],
  },
  {
    need: 'drinking_water',
    terms: ['drinking water', 'water needed', 'need water', 'need drinking water', 'no water', 'water supply', 'water tanker'],
  },
  { need: 'food', terms: ['food', 'meals', 'ration', 'nothing to eat', 'hungry'] },
  { need: 'shelter', terms: ['shelter', 'nowhere to stay', 'no place to stay', 'tents', 'temporary accommodation'] },
  { need: 'power_support', terms: POWER_OUTAGE_TERMS.concat(['generator', 'inverter', 'power backup']) },
  { need: 'transport', terms: ['transport', 'vehicle needed', 'bus', 'need a ride', 'stranded without transport'] },
  {
    need: 'communication_support',
    terms: ['no signal', 'network down', 'no network', 'phone not working', 'cannot call', 'communication support'],
  },
];

const INFORMATION_TERMS = [
  'what should',
  'how do i',
  'how can i',
  'where can i',
  'who do i',
  'is it safe',
  'can you tell',
  'please guide',
  'what is the',
  'need information',
];

const LOCATION_HINTS: { terms: string[]; label: string; zone: MapZoneId }[] = [
  { terms: ['science block', 'science building', 'science lab', 'laboratory', ' lab '], label: 'Science Block', zone: 'science-block' },
  { terms: ['hostel b', 'b hostel', 'boys hostel b'], label: 'Hostel B', zone: 'hostel-b' },
  { terms: ['hostel a', 'a hostel', 'girls hostel'], label: 'Hostel A', zone: 'hostel-a' },
  { terms: ['hostel'], label: 'Hostel Block', zone: 'hostel-a' },
  { terms: ['library'], label: 'Library', zone: 'library' },
  { terms: ['admin block', 'administration', 'office block'], label: 'Admin Block', zone: 'admin-block' },
  { terms: ['canteen', 'mess hall', 'cafeteria'], label: 'Canteen', zone: 'canteen' },
  { terms: ['sports ground', 'playground', 'cricket ground', 'football ground'], label: 'Sports Ground', zone: 'sports-ground' },
  { terms: ['campus gate', 'main gate', 'entrance gate'], label: 'Main Gate', zone: 'main-gate' },
  { terms: ['bridge', 'flyover'], label: 'Bridge / Approach Road', zone: 'bridge' },
  { terms: ['parking', 'car park'], label: 'Parking', zone: 'parking' },
];

/* ------------------------------------------------------------------ */
/* Extraction                                                          */
/* ------------------------------------------------------------------ */

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};
const UNITS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

/** "twenty five people" / "thirty-two students" -> "25 people" / "32 students". */
function foldCompoundNumbers(text: string): string {
  const pattern = new RegExp(`\\b(${Object.keys(TENS).join('|')})[\\s-](${Object.keys(UNITS).join('|')})\\b`, 'g');
  return text.replace(pattern, (_match, tens: string, units: string) => String(TENS[tens] + UNITS[units]));
}

function extractPeopleCount(rawText: string): number | null {
  const text = foldCompoundNumbers(rawText);
  // Longest words first so "seventeen" is never matched as "seven".
  const words = Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(\\d{1,4}|${words.join('|')})\\s+(?:more\\s+)?(?:${PEOPLE_NOUNS})`, 'g');
  let best: number | null = null;
  let match = pattern.exec(text);
  while (match) {
    const token = match[1];
    const value = /^\d+$/.test(token) ? Number(token) : NUMBER_WORDS[token];
    if (typeof value === 'number' && Number.isFinite(value)) {
      best = best === null ? value : Math.max(best, value);
    }
    match = pattern.exec(text);
  }
  if (best === null) {
    // "a person is trapped" / "someone is stuck"
    if (/\b(a|one)\s+(person|student|man|woman|child)\b/.test(text) || / someone /.test(text)) best = 1;
  }
  return best;
}

/**
 * Where is this happening? Local campus landmarks are checked first because a
 * report from inside the campus is the more specific answer; anything else is
 * resolved against the offline India place index, so a report from any city or
 * state in the country still lands somewhere real.
 */
function detectLocation(text: string): ExtractionResult['detected_location'] {
  const cityMatch = resolveIndianPlace(text, { fromFreeText: true });

  for (const hint of LOCATION_HINTS) {
    if (hint.terms.some((term) => text.includes(term))) {
      const groundFloor = /ground floor/.test(text);
      const firstFloor = /first floor/.test(text);
      const suffix = groundFloor ? ', Ground Floor' : firstFloor ? ', First Floor' : '';
      const label = `${hint.label}${suffix}`;
      return {
        // A campus landmark plus a city name keeps both: "Science Block, Ground Floor, Surat".
        label: cityMatch?.place ? `${label}, ${cityMatch.place}` : label,
        zone: hint.zone,
        lat: cityMatch?.lat ?? null,
        lng: cityMatch?.lng ?? null,
        region: cityMatch?.region ?? null,
        place: cityMatch?.place ?? null,
      };
    }
  }

  if (cityMatch) {
    return {
      label: cityMatch.label,
      zone: 'unmapped',
      lat: cityMatch.lat,
      lng: cityMatch.lng,
      region: cityMatch.region,
      place: cityMatch.place,
    };
  }

  return null;
}

export function extractIncident(rawText: string): ExtractionResult {
  const text = normalise(rawText);
  const matched: string[] = [];

  const powerOutage = matchAnyRaw(text, POWER_OUTAGE_TERMS).length > 0;

  const criticalSignals: CriticalSignal[] = [];
  (Object.keys(CRITICAL_TERMS) as CriticalSignal[]).forEach((signal) => {
    let hits = matchAny(text, CRITICAL_TERMS[signal]);
    // A plain power cut is not an electrical hazard: only specific electrical
    // wording (panels, live wires, transformers) counts.
    if (signal === 'electrical_hazard' && powerOutage) {
      hits = hits.filter((term) => term !== 'electrical');
    }
    if (hits.length > 0) {
      criticalSignals.push(signal);
      matched.push(...hits);
    }
  });

  const peopleAffected = extractPeopleCount(text);

  const riskSignals: RiskSignal[] = [];
  (Object.keys(RISK_TERMS) as RiskSignal[]).forEach((signal) => {
    const hits = matchAny(text, RISK_TERMS[signal]);
    if (hits.length > 0) {
      riskSignals.push(signal);
      matched.push(...hits);
    }
  });
  const floodHits = matchAny(text, FLOOD_TERMS);
  if (floodHits.length > 0) matched.push(...floodHits);

  // "Multiple people exposed" only counts when there is something to be exposed
  // TO. Fifty people needing drinking water is a resource request, not a hazard,
  // and must not be escalated to High by headcount alone.
  const hazardPresent = criticalSignals.length > 0 || riskSignals.length > 0 || floodHits.length > 0;
  if (
    peopleAffected !== null &&
    peopleAffected >= 10 &&
    hazardPresent &&
    !riskSignals.includes('multiple_people_exposed')
  ) {
    riskSignals.push('multiple_people_exposed');
  }

  const hazards: Hazard[] = [];
  const addHazard = (hazard: Hazard) => {
    if (!hazards.includes(hazard)) hazards.push(hazard);
  };
  if (criticalSignals.includes('fire')) addHazard('fire');
  if (riskSignals.includes('smoke')) addHazard('smoke');
  if (floodHits.length > 0 || riskSignals.includes('deep_or_moving_water')) addHazard('flooding');
  if (criticalSignals.includes('electrical_hazard')) addHazard('possible_electrical_hazard');
  if (criticalSignals.includes('building_collapse') || riskSignals.includes('structural_damage')) {
    addHazard('possible_structural_collapse');
  }
  if (riskSignals.includes('gas_or_chemical_smell')) addHazard('gas_or_chemical');
  if (riskSignals.includes('blocked_access')) addHazard('blocked_access');
  if (powerOutage) addHazard('darkness_or_power_loss');
  if (riskSignals.includes('vehicle_accident')) addHazard('traffic');
  if (hazards.length === 0) addHazard('unknown');

  // Resource need — first match wins, table is ordered by coordination priority.
  let resourceNeeded: ResourceNeed = 'none';
  for (const entry of RESOURCE_TERMS) {
    const hits = matchAnyRaw(text, entry.terms);
    if (hits.length > 0) {
      resourceNeeded = entry.need;
      matched.push(...hits);
      break;
    }
  }
  if (resourceNeeded === 'none' && criticalSignals.includes('trapped_people')) {
    resourceNeeded = 'evacuation_assistance';
  }
  if (
    resourceNeeded === 'none' &&
    (criticalSignals.includes('severe_bleeding') ||
      criticalSignals.includes('unconscious_person') ||
      criticalSignals.includes('abnormal_breathing'))
  ) {
    resourceNeeded = 'medical_assistance';
  }

  const rumourHits = matchAny(text, RUMOUR_TERMS);
  const firstHand = matchAny(text, FIRST_HAND_TERMS).length > 0;
  const rumourSignal = rumourHits.length > 0 && !firstHand;
  if (rumourHits.length > 0) matched.push(...rumourHits);

  const informationOnly =
    matchAny(text, INFORMATION_TERMS).length > 0 &&
    criticalSignals.length === 0 &&
    riskSignals.length === 0 &&
    resourceNeeded === 'none';

  const detectedLocation = detectLocation(text);

  const classification = classify({
    criticalSignals,
    riskSignals,
    hazards,
    resourceNeeded,
    rumourSignal,
    informationOnly,
    matched,
  });
  const incidentType = classification.primary;

  return {
    incident_type: incidentType,
    classification,
    urgency_candidate: candidateUrgency(incidentType),
    critical_signals: criticalSignals,
    risk_signals: riskSignals,
    hazards,
    people_affected: peopleAffected,
    trapped: criticalSignals.includes('trapped_people'),
    resource_needed: resourceNeeded,
    resource_quantity: peopleAffected,
    rumour_signal: rumourSignal,
    detected_location: detectedLocation,
    matched_terms: Array.from(new Set(matched)),
  };
}

/**
 * On-device incident classifier.
 *
 * Every detected signal contributes fixed points to one category. The category
 * with the most points wins; ties are broken by CATEGORY_PRIORITY, which puts
 * the categories that change what a responder does first. There is no model and
 * no probability here — the points are evidence weights, and the UI shows both
 * the scores and the terms that produced them, so a judge can audit any result
 * in about five seconds.
 */
const CATEGORY_PRIORITY: IncidentType[] = [
  'unverified_claim',
  'fire_hazard',
  'structural_hazard',
  'medical_assistance',
  'electrical_hazard',
  'gas_or_chemical',
  'flooding',
  'resource_request',
  'information_request',
  'other',
];

function classify(input: {
  criticalSignals: CriticalSignal[];
  riskSignals: RiskSignal[];
  hazards: Hazard[];
  resourceNeeded: ResourceNeed;
  rumourSignal: boolean;
  informationOnly: boolean;
  matched: string[];
}): Classification {
  const { criticalSignals, riskSignals, hazards, resourceNeeded, rumourSignal, informationOnly } = input;

  const points = new Map<IncidentType, number>();
  const supporting: string[] = [];
  const add = (type: IncidentType, value: number, because: string) => {
    points.set(type, (points.get(type) ?? 0) + value);
    if (!supporting.includes(because)) supporting.push(because);
  };

  // A second-hand claim is classified by how it must be handled (verify first),
  // not by what it claims. The urgency rules still run on the claim itself.
  if (rumourSignal) add('unverified_claim', 6, 'second-hand wording');
  if (criticalSignals.includes('fire')) add('fire_hazard', 5, 'fire');
  if (criticalSignals.includes('building_collapse')) add('structural_hazard', 5, 'possible collapse');
  if (criticalSignals.includes('trapped_people')) add('structural_hazard', 4, 'possible trapped people');
  if (riskSignals.includes('structural_damage')) add('structural_hazard', 2, 'structural damage');
  if (criticalSignals.includes('severe_bleeding')) add('medical_assistance', 5, 'bleeding');
  if (criticalSignals.includes('unconscious_person')) add('medical_assistance', 5, 'unresponsive person');
  if (criticalSignals.includes('abnormal_breathing')) add('medical_assistance', 5, 'breathing difficulty');
  if (riskSignals.includes('injury_reported')) add('medical_assistance', 2, 'injury');
  if (resourceNeeded === 'medical_assistance') add('medical_assistance', 3, 'medical help requested');
  if (criticalSignals.includes('electrical_hazard')) add('electrical_hazard', 4, 'electrical hazard');
  if (riskSignals.includes('gas_or_chemical_smell')) add('gas_or_chemical', 4, 'gas or chemical smell');
  if (hazards.includes('flooding')) add('flooding', 3, 'flooding');
  if (riskSignals.includes('deep_or_moving_water')) add('flooding', 2, 'deep or rising water');
  if (resourceNeeded !== 'none' && resourceNeeded !== 'medical_assistance') {
    add('resource_request', 3, `${resourceNeeded.replace(/_/g, ' ')} requested`);
  }
  if (informationOnly) add('information_request', 4, 'question wording');
  riskSignals
    .filter(
      (signal) =>
        !['structural_damage', 'injury_reported', 'deep_or_moving_water', 'gas_or_chemical_smell'].includes(
          signal,
        ),
    )
    .forEach((signal) => add('other', 1, signal.replace(/_/g, ' ')));

  const scores = CATEGORY_PRIORITY.filter((type) => (points.get(type) ?? 0) > 0)
    .map((type) => ({ type, points: points.get(type) as number }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return CATEGORY_PRIORITY.indexOf(a.type) - CATEGORY_PRIORITY.indexOf(b.type);
    });

  return {
    primary: scores[0]?.type ?? 'other',
    scores: scores.length > 0 ? scores : [{ type: 'other', points: 0 }],
    supporting_terms: supporting,
  };
}

/**
 * First-pass guess from the extracted type alone. The deterministic rule engine
 * in triageEngine.ts is allowed to override this, and the UI shows when it did.
 */
function candidateUrgency(type: IncidentType): Urgency {
  switch (type) {
    case 'fire_hazard':
    case 'structural_hazard':
    case 'medical_assistance':
      return 'high';
    case 'electrical_hazard':
    case 'flooding':
    case 'resource_request':
      return 'medium';
    case 'unverified_claim':
    case 'information_request':
    case 'other':
    default:
      return 'low';
  }
}
