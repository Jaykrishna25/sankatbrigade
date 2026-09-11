import Icon from './Icons';
import SafetyNotice from './SafetyNotice';

interface HeroProps {
  total: number;
  critical: number;
  resources: number;
  onReport: () => void;
  onCommand: () => void;
  onAssistant: () => void;
}

const FLOW = [
  'User emergency report',
  'Information extraction',
  'Structured incident object',
  'Deterministic safety & triage rules',
  'Verification status',
  'Safe next actions',
  'Incident ID',
  'Command Center queue',
];

export default function Hero({ total, critical, resources, onReport, onCommand, onAssistant }: HeroProps) {
  return (
    <section className="sb-hero">
      <div className="sb-hero__grid" aria-hidden="true" />
      <div className="sb-hero__inner">
        <div>
          <p className="sb-eyebrow">Hyper-local emergency information-to-action</p>
          <h1 className="sb-hero__title">
            Every Report Can <em>Save Time.</em>
          </h1>
          <p className="sb-hero__sub">
            SankatBrigade turns chaotic local emergency reports into structured information that people can act
            on — triaged by rules you can read, with unverified claims kept clearly separate from confirmed ones.
          </p>

          <div className="sb-hero__actions">
            <button type="button" className="sb-btn sb-btn--danger" onClick={onReport}>
              <Icon name="alert" size={17} />
              Report an Emergency
            </button>
            <button type="button" className="sb-btn sb-btn--ghost" onClick={onAssistant}>
              <Icon name="radio" size={17} />
              Ask the Assistant
            </button>
            <button type="button" className="sb-btn sb-btn--subtle" onClick={onCommand}>
              <Icon name="map" size={17} />
              View Command Center
            </button>
          </div>

          <SafetyNotice />

          <div className="sb-hero__stats">
            <div className="sb-stat">
              <div className="sb-stat__value">{total}</div>
              <div className="sb-stat__label">Incidents on device</div>
            </div>
            <div className="sb-stat">
              <div className="sb-stat__value" style={{ color: 'var(--critical)' }}>
                {critical}
              </div>
              <div className="sb-stat__label">Critical</div>
            </div>
            <div className="sb-stat">
              <div className="sb-stat__value">{resources}</div>
              <div className="sb-stat__label">Open resource needs</div>
            </div>
          </div>
        </div>

        <div className="sb-flow" aria-label="How a report becomes a coordinated action">
          <p className="sb-eyebrow" style={{ marginBottom: 4 }}>
            The coordination pipeline
          </p>
          {FLOW.map((step, index) => (
            <div key={step}>
              <div className="sb-flow__step">
                <span className="sb-flow__num">{index + 1}</span>
                {step}
              </div>
              {index < FLOW.length - 1 && <div className="sb-flow__arrow" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
