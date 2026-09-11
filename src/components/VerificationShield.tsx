import Icon from './Icons';
import type { Incident, VerificationStatus } from '../types/incident';
import { VERIFICATION_HELP, VERIFICATION_LABEL } from '../utils/labels';

/**
 * Verification Shield.
 *
 * Keeps "how dangerous" and "how certain" apart. A report can be Critical and
 * Unverified at the same time, and the shield is what stops an unverified claim
 * from being passed on as a confirmed fact.
 */

interface VerificationShieldProps {
  incident: Incident;
  onSetVerification: (status: VerificationStatus) => void;
  onAddIndependentReport: () => void;
}

const STATES: VerificationStatus[] = ['unverified', 'corroborating', 'corroborated', 'officially_confirmed'];

export default function VerificationShield({
  incident,
  onSetVerification,
  onAddIndependentReport,
}: VerificationShieldProps) {
  const claim = incident.raw_text.length > 190 ? `${incident.raw_text.slice(0, 190)}…` : incident.raw_text;
  const activeIndex = STATES.indexOf(incident.verification_status);

  return (
    <div className="sb-card">
      <div className="sb-card__head">
        <h3 className="sb-card__title">
          <Icon name="shield-check" size={18} />
          Verification Shield
        </h3>
        <span className="sb-badge sb-badge--neutral">{incident.incident_id}</span>
      </div>

      <div className="sb-shield">
        <div className="sb-shield__states">
          {STATES.map((state, index) => (
            <div
              key={state}
              className={`sb-shield__state${index === activeIndex ? ' is-active' : ''}${
                index === activeIndex && state === 'unverified' ? ' is-warn' : ''
              }${index === activeIndex && (state === 'corroborated' || state === 'officially_confirmed') ? ' is-ok' : ''}`}
            >
              <strong>{VERIFICATION_LABEL[state]}</strong>
              {index === activeIndex ? 'Current state' : `Step ${index + 1}`}
            </div>
          ))}
        </div>

        <div className="sb-shield__claim">
          <div className="sb-callout__title">Claim under review</div>
          <div style={{ fontSize: '0.9rem', marginBottom: 10 }}>“{claim}”</div>
          <div className="sb-shield__row">
            <span>Source</span>
            <span>{incident.is_demo ? 'Simulated citizen report' : 'User report'}</span>
          </div>
          <div className="sb-shield__row">
            <span>Evidence</span>
            <span>
              {incident.evidence.photo
                ? 'Photo available — user-submitted, not independently verified'
                : 'No photo available'}
            </span>
          </div>
          <div className="sb-shield__row">
            <span>Independent reports</span>
            <span>{incident.independent_reports}</span>
          </div>
          <div className="sb-shield__row">
            <span>Status</span>
            <span>
              {incident.verification_status === 'unverified'
                ? 'Awaiting verification'
                : VERIFICATION_LABEL[incident.verification_status]}
            </span>
          </div>
          <div className="sb-shield__row">
            <span>Broadcast rule</span>
            <span style={{ color: incident.verification_status === 'unverified' ? 'var(--high)' : 'var(--ok)' }}>
              {incident.verification_status === 'unverified' || incident.verification_status === 'corroborating'
                ? 'Do not broadcast as confirmed.'
                : 'May be shared with the verification state attached.'}
            </span>
          </div>
        </div>

        {incident.rumour_signal && (
          <div className="sb-safety sb-safety--compact">
            <Icon name="alert" size={16} className="sb-safety__icon" />
            <div>
              <strong>Second-hand claim.</strong> This report is worded as something the reporter heard rather
              than saw. Urgency was <em>not</em> reduced for that — confidence was. Verify before repeating it.
            </div>
          </div>
        )}

        <p className="sb-hint">{VERIFICATION_HELP[incident.verification_status]}</p>

        <div className="sb-btn-row">
          <button type="button" className="sb-btn sb-btn--ghost sb-btn--sm" onClick={onAddIndependentReport}>
            <Icon name="users" size={15} />
            Log an independent report
          </button>
          <button
            type="button"
            className="sb-btn sb-btn--subtle sb-btn--sm"
            onClick={() => onSetVerification('officially_confirmed')}
            disabled={incident.verification_status === 'officially_confirmed'}
          >
            <Icon name="check" size={15} />
            Mark officially confirmed
          </button>
          <button
            type="button"
            className="sb-btn sb-btn--subtle sb-btn--sm"
            onClick={() => onSetVerification('unverified')}
            disabled={incident.verification_status === 'unverified'}
          >
            <Icon name="refresh" size={15} />
            Reset to unverified
          </button>
        </div>
        <p className="sb-hint">
          These controls are local demo actions. In a real deployment, “Officially Confirmed” would require an
          authorised source — a single operator click would never be enough.
        </p>
      </div>
    </div>
  );
}
