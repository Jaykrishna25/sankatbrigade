import { useCallback, useEffect, useRef, useState } from 'react';
import type { Incident, Urgency } from '../types/incident';
import { extractIncident } from '../utils/incidentExtractor';
import { runTriage } from '../utils/triageEngine';
import { reanalyseWithDetail } from '../utils/incidentFactory';
import {
  CRITICAL_SIGNAL_LABEL,
  RESOURCE_LABEL,
  RISK_SIGNAL_LABEL,
  URGENCY_LABEL,
  VERIFICATION_LABEL,
  formatTime,
} from '../utils/labels';
import type { Route } from '../utils/router';
import { askAi, looksLikeQuestion, probeAi, type AiStatus } from '../utils/aiClient';

/**
 * The SankatBrigade Assistant's brain, kept in one hook so the same
 * conversation appears in the floating dock, on the full Assistant screen and
 * beside an incident — one history, one state, three places to see it.
 *
 * It has two modes:
 *   guidance mode (no incident yet) — explains the product, helps someone
 *     describe an emergency, previews how the rules would triage it, and can
 *     submit it as a real report;
 *   incident mode (bound to SB-xxxx) — explains that incident, asks only for
 *     the fields still missing, and re-runs the deterministic rules on any new
 *     detail.
 *
 * It is deterministic in both modes. It never claims a responder was contacted,
 * never diagnoses anyone and never states a fact the reporter did not give.
 */

export type AssistantActionKind = 'submit_report' | 'open_command' | 'open_report' | 'clear';

export interface AssistantAction {
  label: string;
  kind: AssistantActionKind;
}

export interface AssistantMessage {
  id: string;
  role: 'bot' | 'user' | 'system';
  text: string;
  at: string;
  actions?: AssistantAction[];
  /** True when the wording came from the optional AI layer rather than the rules. */
  viaAi?: boolean;
}

type QuestionKey = 'location' | 'people' | 'hazards' | 'resource';

interface Question {
  key: QuestionKey;
  text: string;
  chips: string[];
}

export interface AssistantApi {
  messages: AssistantMessage[];
  chips: string[];
  placeholder: string;
  mode: 'guidance' | 'incident';
  incidentId: string | null;
  /** Whether this deployment has a server-side AI layer configured. */
  ai: AiStatus;
  thinking: boolean;
  send: (text: string) => void;
  runAction: (action: AssistantAction) => void;
  clear: () => void;
}

interface UseAssistantOptions {
  incident: Incident | null;
  onUpdateIncident: (incident: Incident) => void;
  onCreateReport: (text: string) => void;
  onNavigate: (route: Route) => void;
  /** Unbind from the current incident so a fresh conversation starts clean. */
  onDetach: () => void;
}

let seed = 0;
function message(
  role: AssistantMessage['role'],
  text: string,
  actions?: AssistantAction[],
  viaAi = false,
): AssistantMessage {
  seed += 1;
  return { id: `am${seed}`, role, text, at: new Date().toISOString(), actions, viaAi };
}

const DONT_KNOW = [
  'i do not know',
  "i don't know",
  'dont know',
  'not sure',
  'no idea',
  'unknown',
  'nothing right now',
  'no hazard i can see',
];

const SAFETY_LINE =
  'Reports stay unverified until they are corroborated by an independent report or an official source. ' +
  'SankatBrigade has not contacted police, fire, ambulance or any government service.';

/** The next missing field on an incident, in coordination priority order. */
function nextQuestion(incident: Incident, skipped: QuestionKey[]): Question | null {
  const missing: Question[] = [];
  if (incident.location.label === 'Unknown') {
    missing.push({
      key: 'location',
      text: 'Where is this happening? A building, floor or landmark is enough.',
      chips: ['Science Block', 'Hostel B', 'Main Gate', 'I do not know'],
    });
  }
  if (incident.people_affected === null) {
    missing.push({
      key: 'people',
      text: 'How many people are affected, as far as you can see? An estimate is fine.',
      chips: ['1', '2', 'About 10', 'I do not know'],
    });
  }
  if (incident.hazards.every((hazard) => hazard === 'unknown')) {
    missing.push({
      key: 'hazards',
      text: 'Is there any hazard near the people — fire, smoke, water, exposed wires or gas?',
      chips: ['Water is rising', 'Exposed wires', 'Smoke', 'No hazard I can see'],
    });
  }
  if (incident.resource_needed === 'none') {
    missing.push({
      key: 'resource',
      text: 'Is anything needed right now — medical help, evacuation, drinking water, food or shelter?',
      chips: ['Medical help', 'Evacuation', 'Drinking water', 'Nothing right now'],
    });
  }
  return missing.find((item) => !skipped.includes(item.key)) ?? null;
}

/** What the deterministic rules would make of some free text, before anything is stored. */
function previewOf(text: string): { urgency: Urgency; summary: string; actionable: boolean } {
  const extraction = extractIncident(text);
  const triage = runTriage({ ...extraction, independent_reports: 0 });
  const parts = [
    ...extraction.critical_signals.map((signal) => CRITICAL_SIGNAL_LABEL[signal].toLowerCase()),
    ...extraction.risk_signals.map((signal) => RISK_SIGNAL_LABEL[signal].toLowerCase()),
  ];
  if (extraction.resource_needed !== 'none') {
    parts.push(`${RESOURCE_LABEL[extraction.resource_needed].toLowerCase()} needed`);
  }
  if (extraction.people_affected !== null) {
    parts.push(`${extraction.people_affected} ${extraction.people_affected === 1 ? 'person' : 'people'} affected`);
  }
  const actionable =
    extraction.critical_signals.length > 0 ||
    extraction.risk_signals.length > 0 ||
    extraction.resource_needed !== 'none' ||
    extraction.hazards.some((hazard) => hazard !== 'unknown');

  return {
    urgency: triage.final_urgency,
    summary: parts.length > 0 ? parts.join(', ') : 'no hazard, injury or resource need detected',
    actionable,
  };
}

export function useAssistant({
  incident,
  onUpdateIncident,
  onCreateReport,
  onNavigate,
  onDetach,
}: UseAssistantOptions): AssistantApi {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [skipped, setSkipped] = useState<QuestionKey[]>([]);
  const [ai, setAi] = useState<AiStatus>({ enabled: false, provider: null });
  const [thinking, setThinking] = useState(false);
  const boundTo = useRef<string | null>(null);
  const draft = useRef('');

  // Ask this deployment once whether it has an AI layer. No key is involved on
  // this side: if the endpoint is absent, the assistant simply stays rule-only.
  useEffect(() => {
    let cancelled = false;
    probeAi().then((status) => {
      if (!cancelled) setAi(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const push = useCallback((entry: AssistantMessage) => {
    setMessages((current) => [...current, entry]);
  }, []);

  const openGuidance = useCallback(() => {
    draft.current = '';
    setSkipped([]);
    setMessages([
      message(
        'bot',
        'I am the SankatBrigade Assistant. Tell me what is happening in your own words and I will structure ' +
          'it into an incident record — priority, hazards, people affected and one safe next action.',
      ),
      message('system', SAFETY_LINE),
      message(
        'bot',
        'If anyone is in immediate danger, contact local emergency services first. Then describe the situation ' +
          'here so other people can see it. What is happening?',
      ),
    ]);
  }, []);

  /* Rebuild the conversation whenever the assistant switches subject. */
  useEffect(() => {
    if (!incident) {
      if (boundTo.current !== null || messages.length === 0) {
        boundTo.current = null;
        openGuidance();
      }
      return;
    }
    if (boundTo.current === incident.incident_id) return;
    boundTo.current = incident.incident_id;
    draft.current = '';
    setSkipped([]);
    const opening: AssistantMessage[] = [
      message(
        'bot',
        `Your report has been added as ${incident.incident_id} and marked ${URGENCY_LABEL[incident.final_urgency]}. ${incident.reason}${
          incident.final_urgency === 'critical'
            ? ' Please contact local emergency responders immediately and stay out of the affected area.'
            : ''
        }`,
      ),
      message('system', SAFETY_LINE),
    ];
    const first = nextQuestion(incident, []);
    opening.push(
      first
        ? message('bot', first.text)
        : message(
            'bot',
            'I have every field I can extract from your report. Ask me why this priority was set, what is safe ' +
              'to do now, or open the Command Center.',
            [{ label: 'Open the Command Center', kind: 'open_command' }],
          ),
    );
    setMessages(opening);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident?.incident_id, incident === null]);

  /** Fixed questions the assistant answers the same way every time. */
  const answerIntent = useCallback(
    (raw: string): AssistantMessage | null => {
      const value = raw.toLowerCase();

      if (/(what|who) (is|are) sankat|about (this|the) (site|app|project)|how does this work/.test(value)) {
        return message(
          'bot',
          'SankatBrigade turns local emergency reports into structured incidents. Your words go through keyword ' +
            'extraction, then a deterministic rule set decides the priority, then the incident joins a shared ' +
            'Command Center queue with a verification state. It is a student prototype — it organises ' +
            'information, it does not respond to emergencies.',
          [{ label: 'Open the Command Center', kind: 'open_command' }],
        );
      }

      if (/(did you|have you).*(call|contact|inform|send|alert)|police|ambulance|fire (service|brigade)|\b112\b|\b100\b|\b101\b/.test(value)) {
        return message(
          'bot',
          'No. SankatBrigade has not contacted police, fire services, ambulance, a hospital or any government ' +
            'body, and it cannot. It structures your report so a person can act on it. If anyone is in danger, ' +
            'contact local emergency services yourself now.',
        );
      }

      if (/how (do|should) i (write|make|give)|good report|what (should|do) i include|what details/.test(value)) {
        return message(
          'bot',
          'Four things make a report usable: where it is (building, floor, landmark), how many people are ' +
            'affected, what the hazard is (fire, water, wires, gas, debris, blocked exit), and what is needed ' +
            '(medical help, evacuation, water, food, shelter). Say what you saw yourself, and say when you only ' +
            'heard it from someone else.',
        );
      }

      if (/injur|wound|bleed|medicine|treat|diagnos|first aid|cpr|how do i help him|how do i help her/.test(value)) {
        return message(
          'bot',
          'I cannot give medical advice or assess anyone’s condition — I am a deterministic prototype, not a ' +
            'clinician. If someone is hurt, ask for emergency medical help now and stay with them if it is safe ' +
            'to do so.',
        );
      }

      if (/command (centre|center)|queue|dashboard|show me the (map|incidents)/.test(value)) {
        return message('bot', 'The Command Center holds every incident on this device, sorted Critical first.', [
          { label: 'Open the Command Center', kind: 'open_command' },
        ]);
      }

      if (incident) {
        if (/(incident )?id|number|reference/.test(value)) {
          return message(
            'bot',
            `This report is ${incident.incident_id}, logged at ${formatTime(incident.created_at)}. Quote that id in the Command Center.`,
          );
        }
        if (/confirm|verified|true|real|sure\?/.test(value)) {
          return message(
            'bot',
            `Verification is currently "${VERIFICATION_LABEL[incident.verification_status]}". ${
              incident.verification_status === 'unverified'
                ? 'That means one report and nothing independently checked — please do not share it as confirmed.'
                : 'It is still not an official confirmation.'
            }`,
          );
        }
        if (/why.*(priority|critical|high|medium|low)|reason/.test(value)) {
          return message('bot', `${incident.reason} You can see the exact rule under "Show the exact rules that produced this priority".`);
        }
        if (/what (should|do) i do|safe|next step|advice/.test(value)) {
          return message('bot', incident.safe_action);
        }
        if (/status|queue/.test(value)) {
          return message(
            'bot',
            `${incident.incident_id} is in the Command Center queue with priority ${URGENCY_LABEL[incident.final_urgency]} and resource need "${RESOURCE_LABEL[incident.resource_needed]}". A person still has to act on it.`,
            [{ label: 'Open the Command Center', kind: 'open_command' }],
          );
        }
      } else {
        if (/confirm|verified|unverified|rumour|rumor|misinformation|fake/.test(value)) {
          return message(
            'bot',
            'Every report starts as Unverified, however urgent it is. Confidence only rises when independent ' +
              'reports agree or an official source confirms it. A report we doubt is never given a lower priority ' +
              'for being doubted — it is marked "do not broadcast as confirmed" instead.',
          );
        }
        if (/what (should|do) i do|safe|next step|advice|emergency/.test(value)) {
          return message(
            'bot',
            'If anyone is in immediate danger, contact local emergency services now — SankatBrigade cannot do ' +
              'that for you. Keep clear of the hazard, do not enter floodwater near electrical infrastructure, ' +
              'and do not attempt an unassisted rescue. Then describe the situation here so it can be coordinated.',
          );
        }
      }

      return null;
    },
    [incident],
  );

  const send = useCallback(
    (rawInput: string) => {
      const input = rawInput.trim();
      if (!input) return;
      push(message('user', input));

      const intent = answerIntent(input);
      if (intent) {
        window.setTimeout(() => push(intent), 220);
        return;
      }

      /* ---------- optional AI language layer ----------
         Only for free-form questions the fixed answers do not cover, and only
         for wording. Priority, verification and the safety line are already
         decided by the rules before this runs, and the prompt on the server
         forbids the model from contradicting them. Any failure falls through
         to the deterministic path below. */
      if (ai.enabled && looksLikeQuestion(input)) {
        setThinking(true);
        askAi({
          question: input,
          incident,
          history: messages
            .filter((entry) => entry.role !== 'system')
            .map((entry) => ({ role: entry.role === 'bot' ? 'bot' : 'user', text: entry.text })),
        })
          .then((answer) => {
            setThinking(false);
            if (answer) {
              push(message('bot', answer, undefined, true));
            } else {
              push(
                message(
                  'bot',
                  incident
                    ? `I could not reach the language layer just now, so here is the rule-based answer. ${incident.reason} ${incident.safe_action}`
                    : 'I could not reach the language layer just now. Describe what is happening and I will still structure it with the deterministic rules.',
                ),
              );
            }
          })
          .catch(() => setThinking(false));
        return;
      }

      /* ---------- guidance mode: no incident yet ---------- */
      if (!incident) {
        draft.current = `${draft.current} ${input}`.trim();
        const preview = previewOf(draft.current);
        window.setTimeout(() => {
          if (preview.actionable) {
            push(
              message(
                'bot',
                `Under the current rules that reads as ${URGENCY_LABEL[preview.urgency].toUpperCase()} — ${preview.summary}. ` +
                  'Nothing has been submitted yet. Submit it and I will create the incident record, add it to the ' +
                  'Command Center queue and show you the exact rule behind the priority.',
                [
                  { label: 'Submit this as a report', kind: 'submit_report' },
                  { label: 'Start over', kind: 'clear' },
                ],
              ),
            );
          } else {
            push(
              message(
                'bot',
                'I could not detect a hazard, an injury or a resource need in that yet. Tell me what is happening, ' +
                  'where it is, and whether anyone is hurt, trapped or needs something — or submit it as it stands ' +
                  'and it will be logged as a low-priority information report.',
                [
                  { label: 'Submit it as it stands', kind: 'submit_report' },
                  { label: 'Start over', kind: 'clear' },
                ],
              ),
            );
          }
        }, 240);
        return;
      }

      /* ---------- incident mode ---------- */
      const question = nextQuestion(incident, skipped);
      if (!question) {
        const updated = reanalyseWithDetail(incident, input);
        onUpdateIncident(updated);
        window.setTimeout(
          () =>
            push(
              message(
                'bot',
                `Added to ${updated.incident_id} and the rules were re-run. Priority stays ${URGENCY_LABEL[updated.final_urgency]}. ` +
                  'You can also ask why this priority was set, or what is safe to do now.',
              ),
            ),
          240,
        );
        return;
      }

      if (DONT_KNOW.some((phrase) => input.toLowerCase().includes(phrase))) {
        const nextSkipped = [...skipped, question.key];
        setSkipped(nextSkipped);
        const follow = nextQuestion(incident, nextSkipped);
        window.setTimeout(() => {
          push(
            message(
              'bot',
              'That is fine — the field stays "Unknown" rather than being guessed. Nothing is invented in the ' +
                'incident record.',
            ),
          );
          if (follow) push(message('bot', follow.text));
        }, 240);
        return;
      }

      const overrides: { locationLabel?: string; peopleAffected?: number } = {};
      if (question.key === 'location') overrides.locationLabel = input;
      if (question.key === 'people') {
        const match = input.match(/\d{1,4}/);
        if (match) overrides.peopleAffected = Number(match[0]);
      }

      const before = incident.final_urgency;
      const updated = reanalyseWithDetail(incident, input, overrides);
      onUpdateIncident(updated);

      const changed = updated.final_urgency !== before;
      const follow = nextQuestion(updated, skipped);
      window.setTimeout(() => {
        push(
          message(
            'bot',
            changed
              ? `Updated ${updated.incident_id}. That detail changed the priority from ${URGENCY_LABEL[before]} to ${URGENCY_LABEL[updated.final_urgency]}. ${updated.reason}`
              : `Updated ${updated.incident_id}. Priority stays ${URGENCY_LABEL[updated.final_urgency]}.`,
          ),
        );
        if (follow) push(message('bot', follow.text));
        else push(message('bot', updated.safe_action, [{ label: 'Open the Command Center', kind: 'open_command' }]));
      }, 260);
    },
    [ai.enabled, answerIntent, incident, messages, onUpdateIncident, push, skipped],
  );

  const clear = useCallback(() => {
    boundTo.current = null;
    onDetach();
    openGuidance();
  }, [onDetach, openGuidance]);

  const runAction = useCallback(
    (action: AssistantAction) => {
      switch (action.kind) {
        case 'submit_report': {
          const text = draft.current.trim();
          if (text.length === 0) return;
          onCreateReport(text);
          break;
        }
        case 'open_command':
          onNavigate('command');
          break;
        case 'open_report':
          onNavigate('report');
          break;
        case 'clear':
          clear();
          break;
      }
    },
    [clear, onCreateReport, onNavigate],
  );

  const question = incident ? nextQuestion(incident, skipped) : null;
  const chips = incident
    ? question
      ? question.chips
      : ['Why this priority?', 'Is this confirmed?', 'Did you contact anyone?', 'What should I do now?']
    : ['What is SankatBrigade?', 'How do I write a good report?', 'Did you contact anyone?', 'Open the Command Center'];

  return {
    messages,
    chips,
    placeholder: incident
      ? question
        ? 'Answer, or ask a question…'
        : 'Ask about this incident…'
      : 'Describe what is happening…',
    mode: incident ? 'incident' : 'guidance',
    incidentId: incident?.incident_id ?? null,
    ai,
    thinking,
    send,
    runAction,
    clear,
  };
}
