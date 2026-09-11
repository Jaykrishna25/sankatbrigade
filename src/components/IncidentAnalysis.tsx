import { useEffect, useMemo, useState } from 'react';
import Icon from './Icons';
import { DemoBadge, StatusBadge, UrgencyBadge, VerificationBadge } from './Badges';
import type { Incident } from '../types/incident';
import {
  ACTION_LABEL,
  CRITICAL_SIGNAL_LABEL,
  HAZARD_LABEL,
  INCIDENT_TYPE_LABEL,
  LOCATION_SOURCE_LABEL,
  RESOURCE_LABEL,
  RISK_SIGNAL_LABEL,
  URGENCY_LABEL,
  formatTime,
  visibleHazards,
} from '../utils/labels';
import { extractIncident } from '../utils/incidentExtractor';
import { runTriage } from '../utils/triageEngine';
import { getSessionMedia } from '../utils/mediaStore';
import { formatCoords, googleMapsLink, openStreetMapLink } from '../utils/geo';

interface IncidentAnalysisProps {
  incident: Incident;
  onOpenCommand: () => void;
  onNewReport: () => void;
}

const STEPS = [
  { label: 'Reading report', note: 'Normalising the text you submitted' },
  { label: 'Extracting incident details', note: 'Keyword extraction — people, hazards, location, needs' },
  { label: 'Applying safety rules', note: 'Deterministic triage rules R1–R4' },
  { label: 'Creating incident record', note: 'Structured incident object + Command Center queue' },
];

const STEP_MS = 460;

export default function IncidentAnalysis({ incident, onOpenCommand, onNewReport }: IncidentAnalysisProps) {
  const [step, setStep] = useState(0);
  const done = step >= STEPS.length;

  useEffect(() => {
    setStep(0);
    let current = 0;
    const timer = window.setInterval(() => {
      current += 1;
      setStep(current);
      if (current > STEPS.length) window.clearInterval(timer);
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [incident.incident_id]);

  const trace = useMemo(() => {
    const extraction = extractIncident(incident.raw_text);
    return runTriage({
      ...extraction,
      people_affected: incident.people_affected,
      independent_reports: incident.independent_reports,
      officially_confirmed: incident.verification_status === 'officially_confirmed',
    }).rule_trace;
  }, [incident.raw_text, incident.people_affected, incident.independent_reports, incident.verification_status]);

  const structured = useMemo(
    () =>
      JSON.stringify(
        {
          incident_id: incident.incident_id,
          incident_type: incident.incident_type,
          urgency_candidate: incident.urgency_candidate,
          final_urgency: incident.final_urgency,
          location: {
            label: incident.location.label,
            lat: incident.location.lat,
            lng: incident.location.lng,
          },
          people_affected: incident.people_affected,
          trapped: incident.trapped,
          hazards: incident.hazards,
          resource_needed: incident.resource_needed,
          evidence: {
            text_report: incident.evidence.text_report,
            photo: incident.evidence.photo,
            voice: incident.evidence.voice,
          },
          verification_status: incident.verification_status,
          reason: incident.reason,
          recommended_action: incident.recommended_action,
          lifecycle_status: incident.lifecycle_status,
          created_at: incident.created_at,
        },
        null,
        2,
      ),
    [incident],
  );

  const evidenceLabel = [
    incident.evidence.text_report ? 'Text report' : null,
    incident.evidence.photo ? 'Photo' : null,
    incident.evidence.video ? 'Video' : null,
    incident.evidence.audio ? 'Voice note' : null,
    incident.evidence.voice ? 'Dictated' : null,
  ]
    .filter(Boolean)
    .join(' + ');

  const topScore = Math.max(1, incident.classification.scores[0]?.points ?? 1);
  const videoUrl = getSessionMedia(incident.incident_id, 'video');
  const audioUrl = getSessionMedia(incident.incident_id, 'audio');

  return (
    <div className="sb-grid">
      <div className="sb-card">
        <div className="sb-card__head">
          <h2 className="sb-card__title">
            <Icon name="spark" size={18} />
            Prototype incident analysis
          </h2>
          <span className="sb-badge sb-badge--neutral">Deterministic keyword rules — no AI model</span>
        </div>
        <div className="sb-steps" aria-live="polite">
          {STEPS.map((item, index) => (
            <div
              key={item.label}
              className={`sb-step${index < step ? ' is-done' : ''}${index === step ? ' is-active' : ''}`}
            >
              <span className="sb-step__icon">
                {index < step ? <Icon name="check" size={14} /> : <span className="sb-spinner" />}
              </span>
              <span>
                <span className="sb-step__label">{item.label}</span>
                <span className="sb-step__note" style={{ display: 'block' }}>
                  {item.note}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {done && (
        <div className="sb-card sb-fade-up">
          <div className="sb-urgency-bar" aria-hidden="true" />
          <div className="sb-result-head">
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <UrgencyBadge urgency={incident.final_urgency} />
                <StatusBadge status={incident.lifecycle_status} />
                <VerificationBadge status={incident.verification_status} />
                {incident.is_demo && <DemoBadge />}
              </div>
              <div className="sb-result-id" style={{ marginTop: 8 }}>
                {incident.incident_id}
              </div>
              <div className="sb-card__sub">
                {URGENCY_LABEL[incident.final_urgency].toUpperCase()} INCIDENT ·{' '}
                {INCIDENT_TYPE_LABEL[incident.incident_type]} · logged {formatTime(incident.created_at)}
              </div>
            </div>
            <div className="sb-btn-row">
              <button type="button" className="sb-btn sb-btn--primary sb-btn--sm" onClick={onOpenCommand}>
                <Icon name="map" size={16} />
                Open in Command Center
              </button>
              <button type="button" className="sb-btn sb-btn--ghost sb-btn--sm" onClick={onNewReport}>
                <Icon name="send" size={16} />
                Submit Another Report
              </button>
            </div>
          </div>

          <div className="sb-kv">
            <div className="sb-kv__item">
              <div className="sb-kv__key">Incident type</div>
              <div className="sb-kv__value">{INCIDENT_TYPE_LABEL[incident.incident_type]}</div>
            </div>
            <div className="sb-kv__item">
              <div className="sb-kv__key">Location</div>
              <div className={`sb-kv__value${incident.location.label === 'Unknown' ? ' sb-kv__value--muted' : ''}`}>
                {incident.location.label}
              </div>
              <div className="sb-step__note">
                {LOCATION_SOURCE_LABEL[incident.location.source]}
                {incident.location.region ? ` · ${incident.location.region}` : ''}
              </div>
              {typeof incident.location.lat === 'number' && typeof incident.location.lng === 'number' && (
                <div className="sb-step__note" style={{ marginTop: 4 }}>
                  {formatCoords(incident.location.lat, incident.location.lng)}
                  <br />
                  <a
                    href={googleMapsLink(incident.location.lat, incident.location.lng)}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Google Maps
                  </a>
                  {' · '}
                  <a
                    href={openStreetMapLink(incident.location.lat, incident.location.lng)}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    OpenStreetMap
                  </a>
                </div>
              )}
            </div>
            <div className="sb-kv__item">
              <div className="sb-kv__key">People potentially affected</div>
              <div className={`sb-kv__value${incident.people_affected === null ? ' sb-kv__value--muted' : ''}`}>
                {incident.people_affected ?? 'Unknown'}
              </div>
              {incident.trapped && <div className="sb-step__note">Reported as possibly trapped</div>}
            </div>
            <div className="sb-kv__item">
              <div className="sb-kv__key">Resource needed</div>
              <div className={`sb-kv__value${incident.resource_needed === 'none' ? ' sb-kv__value--muted' : ''}`}>
                {RESOURCE_LABEL[incident.resource_needed]}
              </div>
            </div>
            <div className="sb-kv__item">
              <div className="sb-kv__key">Evidence</div>
              <div className="sb-kv__value">{evidenceLabel || 'None'}</div>
              {incident.evidence.photo && (
                <div className="sb-step__note">User-submitted evidence — not independently verified.</div>
              )}
            </div>
            <div className="sb-kv__item">
              <div className="sb-kv__key">Priority path</div>
              <div className="sb-kv__value">
                {URGENCY_LABEL[incident.urgency_candidate]} → {URGENCY_LABEL[incident.final_urgency]}
              </div>
              <div className="sb-step__note">
                {incident.rule_override
                  ? 'Deterministic rule overrode the keyword guess'
                  : 'Keyword guess and rule agreed'}
              </div>
            </div>
          </div>

          <div className="sb-callout">
            <div className="sb-callout__title">Category scores — on-device classifier</div>
            <div className="sb-scores">
              {incident.classification.scores.slice(0, 3).map((score, index) => (
                <div className="sb-score" key={score.type}>
                  <div className="sb-score__head">
                    <span>
                      {INCIDENT_TYPE_LABEL[score.type]}
                      {index === 0 && <span className="sb-score__tag">chosen</span>}
                    </span>
                    <span>{score.points} pts</span>
                  </div>
                  <div className="sb-score__track">
                    <div
                      className={`sb-score__fill${index === 0 ? ' is-primary' : ''}`}
                      style={{ width: `${Math.max(6, (score.points / topScore) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="sb-hint">
              {incident.classification.supporting_terms.length > 0 ? (
                <>
                  Points come from what was actually detected:{' '}
                  <strong>{incident.classification.supporting_terms.join(', ')}</strong>.{' '}
                </>
              ) : (
                'No category signal was detected in the report text. '
              )}
              They are evidence weights, not probabilities — highest total wins, and a tie goes to the category
              that changes what a responder does first.
            </p>
          </div>

          {(videoUrl || audioUrl) && (
            <div className="sb-callout">
              <div className="sb-callout__title">Attached evidence</div>
              <div className="sb-media-row">
                {videoUrl && <video className="sb-evidence__video" src={videoUrl} controls preload="metadata" />}
                {audioUrl && <audio className="sb-evidence__audio" src={audioUrl} controls preload="metadata" />}
              </div>
              <p className="sb-hint">
                User-submitted evidence — not independently verified. Playable for this browser session only;
                nothing is uploaded.
              </p>
            </div>
          )}

          <div className="sb-callout sb-callout--why">
            <div className="sb-callout__title">Why this priority?</div>
            <div className="sb-callout__body">{incident.reason}</div>
          </div>

          <div className={`sb-callout sb-callout--action is-${incident.final_urgency}`}>
            <div className="sb-callout__title">Immediate safe action</div>
            <div className="sb-callout__body">{incident.safe_action}</div>
          </div>

          {(incident.critical_signals.length > 0 || incident.risk_signals.length > 0 || incident.hazards.length > 0) && (
            <div className="sb-callout">
              <div className="sb-callout__title">Reported hazards and signals</div>
              <div className="sb-tag-list" style={{ marginTop: 6 }}>
                {incident.critical_signals.map((signal) => (
                  <span key={signal} className="sb-tag" style={{ color: 'var(--critical)' }}>
                    <Icon name="alert" size={13} />
                    {CRITICAL_SIGNAL_LABEL[signal]}
                  </span>
                ))}
                {incident.risk_signals.map((signal) => (
                  <span key={signal} className="sb-tag" style={{ color: 'var(--high)' }}>
                    <Icon name="flag" size={13} />
                    {RISK_SIGNAL_LABEL[signal]}
                  </span>
                ))}
                {visibleHazards(incident).map((hazard) => (
                  <span key={hazard} className="sb-tag">
                    {HAZARD_LABEL[hazard]}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="sb-callout">
            <div className="sb-callout__title">Recommended coordination action</div>
            <div className="sb-callout__body">
              {ACTION_LABEL[incident.recommended_action]}. SankatBrigade has <strong>not</strong> contacted police,
              fire, ambulance, hospital or any government service. It has added a structured record to the
              Command Center queue so a person can act on it.
            </div>
          </div>

          <details className="sb-trace">
            <summary>Show the exact rules that produced this priority</summary>
            <div className="sb-trace__body">
              {trace.map((line, index) => (
                <div className="sb-trace__line" key={index}>
                  {line}
                </div>
              ))}
              <div className="sb-trace__line">
                Recomputed live from the stored report text, so what you see is the code that ran.
              </div>
            </div>
          </details>

          <details className="sb-trace">
            <summary>Show the structured incident object</summary>
            <div className="sb-trace__body">
              <pre className="sb-json">{structured}</pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
