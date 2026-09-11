/**
 * SankatBrigade deterministic triage engine.
 *
 * This is the safety-critical part of the product and it is intentionally NOT a
 * language model. It is a small, readable, fully auditable rule set: the same
 * report always produces the same priority, and every decision comes with the
 * exact rule that produced it (`rule_trace`), which the UI shows to the user.
 *
 * Rule order (first match wins):
 *   R1  any reported critical life-safety signal        -> CRITICAL
 *   R2  any serious risk signal / 10+ people exposed    -> HIGH
 *   R3  a resource request with no life-safety signal   -> MEDIUM
 *   R4  everything else                                 -> LOW
 *
 * Two independent axes, never mixed:
 *   urgency      = how dangerous the *claim* is if true  (safety)
 *   verification = how much we trust the claim right now (confidence)
 * A low-confidence report is never de-prioritised for being low-confidence.
 */

import type {
  CriticalSignal,
  ExtractionResult,
  Hazard,
  LifecycleStatus,
  RecommendedAction,
  ResourceNeed,
  RiskSignal,
  TriageResult,
  Urgency,
  VerificationStatus,
} from '../types/incident';
import { HAZARD_LABEL, RESOURCE_LABEL, RISK_SIGNAL_LABEL } from './labels';

export interface TriageInput extends ExtractionResult {
  independent_reports?: number;
  officially_confirmed?: boolean;
}

const CRITICAL_PHRASE: Record<CriticalSignal, (people: number | null) => string> = {
  trapped_people: (people) =>
    people && people > 0
      ? `${people} ${people === 1 ? 'person was' : 'people were'} reported as possibly trapped`
      : 'people were reported as possibly trapped',
  unconscious_person: () => 'a person was reported as unresponsive',
  abnormal_breathing: () => 'breathing difficulty was reported',
  severe_bleeding: () => 'bleeding was reported',
  fire: () => 'a fire was reported',
  building_collapse: () => 'a possible structural collapse was reported',
  electrical_hazard: () => 'a possible electrical hazard was reported',
};

/** Non-medical, non-diagnostic safety guidance tied to what was reported. */
const CRITICAL_GUIDANCE: Record<CriticalSignal, string> = {
  trapped_people: 'Do not attempt an unassisted rescue.',
  unconscious_person: 'Ask for emergency medical help now and stay with the person if it is safe to do so.',
  abnormal_breathing: 'Ask for emergency medical help now and keep the area around the person clear.',
  severe_bleeding: 'Ask for emergency medical help now.',
  fire: 'Move away from smoke and flames, stay upwind, and do not re-enter the building.',
  building_collapse: 'Stay clear of damaged structures and debris.',
  electrical_hazard: 'Do not touch wires, panels or switchboards.',
};

const RISK_GUIDANCE: Partial<Record<RiskSignal, string>> = {
  gas_or_chemical_smell: 'Move away from the smell, avoid flames and sparks, and do not operate switches.',
  smoke: 'Move away from the smoke and stay upwind.',
  deep_or_moving_water: 'Do not walk or drive through moving water.',
  blocked_access: 'Do not force a blocked exit or route.',
  structural_damage: 'Stay clear of the damaged structure.',
  injury_reported: 'Ask for medical help if anyone is hurt.',
  crowd_or_stampede_risk: 'Move to the edge of the crowd and avoid pushing towards exits.',
  vehicle_accident: 'Keep clear of the carriageway and switch on hazard lights if you are in a vehicle.',
  multiple_people_exposed: 'Keep people together and away from the reported hazard.',
};

const CONTACT_LINE = 'Contact local emergency or campus responders immediately.';

export function runTriage(input: TriageInput): TriageResult {
  const trace: string[] = [];
  const independentReports = input.independent_reports ?? 0;

  let finalUrgency: Urgency;
  let reason: string;
  let safeAction: string;

  if (input.critical_signals.length > 0) {
    /* ---- R1 ------------------------------------------------------- */
    finalUrgency = 'critical';
    trace.push(
      `R1 CRITICAL — reported life-safety signal(s): ${input.critical_signals.join(', ')}. ` +
        'Any single critical signal forces Critical, regardless of the keyword-extraction guess.',
    );
    const phrases = input.critical_signals.map((signal) => CRITICAL_PHRASE[signal](input.people_affected));
    reason = `${capitalise(joinPhrases(phrases))}. A reported life-safety signal always sets urgency to Critical.`;
    const guidance = Array.from(new Set(input.critical_signals.map((signal) => CRITICAL_GUIDANCE[signal])));
    // Flood + electricity together get the explicit combined warning.
    if (input.hazards.includes('flooding') && input.critical_signals.includes('electrical_hazard')) {
      guidance.unshift('Do not enter floodwater near electrical infrastructure.');
    }
    safeAction = [CONTACT_LINE, ...guidance].join(' ');
  } else if (input.risk_signals.length > 0 || hazardsOfConcern(input).length > 0) {
    /* ---- R2 ------------------------------------------------------- */
    finalUrgency = 'high';
    const concerns = hazardsOfConcern(input);
    trace.push(
      `R2 HIGH — no critical life-safety signal, but risk signal(s)/hazard(s) present: ${[
        ...input.risk_signals,
        ...concerns,
      ].join(', ')}.`,
    );
    const phrases =
      input.risk_signals.length > 0
        ? input.risk_signals.map((signal) => `${RISK_SIGNAL_LABEL[signal].toLowerCase()}`)
        : concerns.map((hazard) => `${HAZARD_LABEL[hazard].toLowerCase()} was reported`);
    reason = `${capitalise(joinPhrases(phrases))}. No life-safety signal was reported, so this is High rather than Critical.`;
    const guidance = Array.from(
      new Set(input.risk_signals.map((signal) => RISK_GUIDANCE[signal]).filter(Boolean) as string[]),
    );
    safeAction = [
      'Keep a safe distance from the reported hazard.',
      ...guidance,
      'Contact local responders immediately if the situation worsens or anyone is hurt.',
    ].join(' ');
  } else if (input.resource_needed !== 'none') {
    /* ---- R3 ------------------------------------------------------- */
    finalUrgency = 'medium';
    trace.push(
      `R3 MEDIUM — resource request (${input.resource_needed}) with no reported life-safety or risk signal.`,
    );
    reason = `${resourcePhrase(input.resource_needed, input.resource_quantity)} No life-threatening condition was reported, so this is queued as a resource request.`;
    safeAction =
      'No life-threatening signal was reported. The request has been queued in the resource queue. ' +
      'If the situation changes and anyone is in danger, contact emergency services directly.';
  } else {
    /* ---- R4 ------------------------------------------------------- */
    finalUrgency = 'low';
    trace.push('R4 LOW — no critical signal, no risk signal and no resource request detected in the report text.');
    reason =
      'No hazard, injury or resource need was detected in the report text. The report is logged for awareness only.';
    safeAction =
      'No urgent hazard was detected in this report. If anything changes, submit an updated report, ' +
      'or contact emergency services directly if anyone is in danger.';
  }

  const ruleOverride = finalUrgency !== input.urgency_candidate;
  if (ruleOverride) {
    trace.push(
      `Rule override — keyword extraction suggested ${input.urgency_candidate.toUpperCase()}, ` +
        `the deterministic rule set set ${finalUrgency.toUpperCase()}. The rule set always wins.`,
    );
  }

  /* ---- verification (confidence, not danger) ---------------------- */
  let verificationStatus: VerificationStatus = 'unverified';
  if (input.officially_confirmed) verificationStatus = 'officially_confirmed';
  else if (independentReports >= 3) verificationStatus = 'corroborated';
  else if (independentReports >= 1) verificationStatus = 'corroborating';

  if (input.rumour_signal) {
    trace.push(
      'Verification — the report is worded as second-hand information, so it stays Unverified and is flagged ' +
        '"do not broadcast as confirmed". Confidence is reduced; urgency is not.',
    );
    reason +=
      ' The report is second-hand and uncorroborated, so confidence stays Unverified — urgency is not reduced because of low confidence.';
  } else {
    trace.push(
      `Verification — ${independentReports} independent report(s) on record, so status is ` +
        `${verificationStatus.replace('_', ' ')}. Every new citizen report starts as Unverified.`,
    );
  }

  /* ---- recommended action + lifecycle ----------------------------- */
  let recommendedAction: RecommendedAction;
  if (finalUrgency === 'critical') recommendedAction = 'escalate';
  else if (input.rumour_signal) recommendedAction = 'verify_before_broadcast';
  else if (input.resource_needed !== 'none') recommendedAction = 'assign_resource';
  else if (finalUrgency === 'high') recommendedAction = 'monitor';
  else recommendedAction = 'provide_information';

  let lifecycleStatus: LifecycleStatus;
  if (finalUrgency === 'critical') lifecycleStatus = 'escalated';
  else if (input.rumour_signal) lifecycleStatus = 'awaiting_verification';
  else if (finalUrgency === 'high') lifecycleStatus = 'acknowledged';
  else if (input.resource_needed !== 'none') lifecycleStatus = 'resource_queued';
  else lifecycleStatus = 'new';

  return {
    final_urgency: finalUrgency,
    rule_override: ruleOverride,
    reason,
    recommended_action: recommendedAction,
    safe_action: safeAction,
    lifecycle_status: lifecycleStatus,
    verification_status: verificationStatus,
    rule_trace: trace,
  };
}

/**
 * Hazards that raise urgency on their own, even with no other signal — a
 * reported flood or gas smell is a High coordination item even if the reporter
 * mentioned nothing else. A power cut is not.
 */
function hazardsOfConcern(input: TriageInput): Hazard[] {
  return input.hazards.filter(
    (hazard) => hazard !== 'unknown' && hazard !== 'darkness_or_power_loss' && hazard !== 'traffic',
  );
}

function resourcePhrase(need: ResourceNeed, quantity: number | null): string {
  const label = RESOURCE_LABEL[need].toLowerCase();
  if (quantity && quantity > 0) {
    return `A request for ${label} was reported for about ${quantity} ${quantity === 1 ? 'person' : 'people'}.`;
  }
  return `A request for ${label} was reported.`;
}

function joinPhrases(phrases: string[]): string {
  if (phrases.length === 0) return '';
  if (phrases.length === 1) return phrases[0];
  return `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
