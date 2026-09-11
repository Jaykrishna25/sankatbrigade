/**
 * Rule self-test.
 *
 * Fixed cases with expected outcomes, run against the real extractor and the
 * real triage engine in the browser. Because the rules are deterministic, this
 * can be run live in front of an audience and must always produce the same
 * result — including the two invariants at the end:
 *
 *   - the same report produces the same output across repeated runs;
 *   - every Critical result leads with "contact emergency responders".
 */

import { extractIncident } from './incidentExtractor';
import { runTriage } from './triageEngine';
import type { IncidentType, ResourceNeed, Urgency } from '../types/incident';

interface Expectation {
  urgency?: Urgency;
  people?: number | null;
  resource?: ResourceNeed;
  type?: IncidentType;
  trapped?: boolean;
  rumour?: boolean;
  criticalSignals?: number;
}

interface SelfTestCase {
  name: string;
  text: string;
  expect: Expectation;
}

export interface SelfTestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const CASES: SelfTestCase[] = [
  {
    name: 'Life-safety signals force Critical',
    text: 'Heavy rain has flooded the ground floor of the science building. Two students may be trapped inside the lab. Electrical panels are nearby.',
    expect: { urgency: 'critical', people: 2, trapped: true, resource: 'evacuation_assistance' },
  },
  {
    name: 'A rumour keeps its urgency, loses its confidence',
    text: 'Everyone is saying the bridge has collapsed near the campus gate.',
    expect: { urgency: 'critical', rumour: true, type: 'unverified_claim' },
  },
  {
    name: 'A need without danger stays Medium',
    text: 'About fifty people in Hostel B need drinking water.',
    expect: { urgency: 'medium', people: 50, resource: 'drinking_water', type: 'resource_request' },
  },
  {
    name: 'Negation is respected ("no fire")',
    text: 'There is no fire here, it was only a false alarm on the panel.',
    expect: { urgency: 'low', criticalSignals: 0 },
  },
  {
    name: 'A need phrased as an absence is still a need',
    text: 'The canteen is shut and about twenty five people in the admin block have no food since morning.',
    expect: { urgency: 'medium', resource: 'food', people: 25 },
  },
  {
    name: 'A power cut is not an electrical hazard',
    text: 'Power cut in Hostel B since two hours, the corridor lights are off.',
    expect: { urgency: 'medium', resource: 'power_support', criticalSignals: 0 },
  },
  {
    name: 'Smoke alone is High, not Critical',
    text: 'Smoke is coming out of the generator room near the library.',
    expect: { urgency: 'high' },
  },
  {
    name: 'An information request is Low',
    text: 'What should I do to prepare for heavy rain next week?',
    expect: { urgency: 'low', type: 'information_request' },
  },
  {
    name: 'An unresponsive person is Critical',
    text: 'A person is unconscious near the main gate and not responding.',
    expect: { urgency: 'critical', resource: 'medical_assistance', type: 'medical_assistance' },
  },
  {
    name: 'Reported bleeding is Critical',
    text: 'A student slipped near the library and is bleeding from the arm.',
    expect: { urgency: 'critical', type: 'medical_assistance' },
  },
];

export function runRuleSelfTest(): { results: SelfTestResult[]; passed: number; failed: number } {
  const results: SelfTestResult[] = [];

  for (const testCase of CASES) {
    const extraction = extractIncident(testCase.text);
    const triage = runTriage({ ...extraction, independent_reports: 0 });
    const actual: Record<keyof Expectation, unknown> = {
      urgency: triage.final_urgency,
      people: extraction.people_affected,
      resource: extraction.resource_needed,
      type: extraction.incident_type,
      trapped: extraction.trapped,
      rumour: extraction.rumour_signal,
      criticalSignals: extraction.critical_signals.length,
    };
    const mismatches = (Object.keys(testCase.expect) as (keyof Expectation)[])
      .filter((key) => actual[key] !== testCase.expect[key])
      .map((key) => `${key}: expected ${String(testCase.expect[key])}, got ${String(actual[key])}`);

    results.push({
      name: testCase.name,
      passed: mismatches.length === 0,
      detail: mismatches.length === 0 ? `${triage.final_urgency.toUpperCase()} — as expected` : mismatches.join('; '),
    });
  }

  // Invariant 1 — identical input, identical output, 50 times over.
  const sample = CASES[0].text;
  const reference = JSON.stringify(runTriage({ ...extractIncident(sample), independent_reports: 0 }));
  let stable = true;
  for (let run = 0; run < 50; run += 1) {
    if (JSON.stringify(runTriage({ ...extractIncident(sample), independent_reports: 0 })) !== reference) {
      stable = false;
      break;
    }
  }
  results.push({
    name: 'Deterministic across 50 repeated runs',
    passed: stable,
    detail: stable ? 'Same report, same priority, every time' : 'Output changed between runs',
  });

  // Invariant 2 — a Critical result always tells the user to contact responders.
  const criticalSafe = CASES.map((testCase) =>
    runTriage({ ...extractIncident(testCase.text), independent_reports: 0 }),
  )
    .filter((triage) => triage.final_urgency === 'critical')
    .every((triage) => triage.safe_action.startsWith('Contact local emergency'));
  results.push({
    name: 'Every Critical result leads with “contact emergency responders”',
    passed: criticalSafe,
    detail: criticalSafe ? 'Safety instruction present on all Critical cases' : 'A Critical case was missing it',
  });

  const passed = results.filter((result) => result.passed).length;
  return { results, passed, failed: results.length - passed };
}
