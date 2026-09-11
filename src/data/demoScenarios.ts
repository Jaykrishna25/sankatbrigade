/**
 * The three reliable demo scenarios used on stage.
 *
 * Every one of these is clearly labelled "Simulated demo scenario" in the UI.
 * They are ordinary text: they run through exactly the same extraction and
 * triage code as anything a judge types by hand.
 */

export interface DemoScenario {
  id: string;
  title: string;
  /** What the scenario is meant to prove during a demo. */
  purpose: string;
  text: string;
  locationHint: string;
  expected: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'campus-flash-flood',
    title: 'Campus Flash Flood',
    purpose: 'Life-safety signals force a Critical priority',
    text: 'Heavy rain has flooded the ground floor of the science building. Two students may be trapped inside the lab. Electrical panels are nearby.',
    locationHint: 'Science Block, Ground Floor',
    expected: 'Expected result: CRITICAL — possible trapped people plus a possible electrical hazard.',
  },
  {
    id: 'bridge-rumour',
    title: 'Unverified Bridge Rumour',
    purpose: 'Low confidence never lowers urgency — it changes what you may broadcast',
    text: 'Everyone is saying the bridge has collapsed near the campus gate.',
    locationHint: 'Bridge near Main Gate',
    expected:
      'Expected result: CRITICAL urgency (a collapse was reported) with Unverified confidence, flagged “do not broadcast as confirmed”.',
  },
  {
    id: 'water-request',
    title: 'Water Resource Request',
    purpose: 'A need without danger becomes a coordinated resource request, not an alarm',
    text: 'About fifty people in Hostel B need drinking water.',
    locationHint: 'Hostel B',
    expected: 'Expected result: MEDIUM — drinking water request queued for about 50 people.',
  },
];
