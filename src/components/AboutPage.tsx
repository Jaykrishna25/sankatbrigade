import { useState } from 'react';
import Icon from './Icons';
import SafetyNotice from './SafetyNotice';
import { runRuleSelfTest, type SelfTestResult } from '../utils/ruleSelfTest';

const FAQ = [
  {
    q: 'How is this different from asking a chatbot?',
    a: 'A chatbot returns text to one person. SankatBrigade returns a record: a structured incident object with an id, a priority produced by rules you can read, a verification state, and a place in a shared queue that other people work from. The assistant is one small part of that pipeline, not the product.',
  },
  {
    q: 'Why are safety decisions made by rules instead of a language model?',
    a: 'Because a priority has to be identical every time and explainable afterwards. The same report always produces the same urgency here, and every incident shows the exact rule that produced it. A generative model can be fluent and still be inconsistent — that is the wrong property for a life-safety decision.',
  },
  {
    q: 'How does it handle misinformation?',
    a: 'Urgency and confidence are two separate axes. A second-hand claim ("everyone is saying the bridge collapsed") is still treated as urgent if what it describes would be dangerous, but its verification state stays Unverified and it is flagged "do not broadcast as confirmed". Confidence gets reduced; urgency never does.',
  },
  {
    q: 'Why does every report start as unverified?',
    a: 'Because one report is one person’s account. Verification only moves forward when independent reports agree, or an official source confirms it. The Verification Shield shows the claim, the source, whether evidence exists, and how many independent reports there are.',
  },
  {
    q: 'There is an AI layer — does it decide anything?',
    a: 'No. When a deployment has an AI key configured on its server, the assistant may use a language model to word free-form answers more naturally. Priority, verification state and the safety instruction are always produced by the deterministic rules in the browser, before the model is ever called, and the server prompt forbids it from contradicting them. Turn the key off and every incident triages identically — the app is built to run without it, and the key never reaches the browser.',
  },
  {
    q: 'What exactly is simulated?',
    a: 'The seeded queue rows (labelled "Simulated demo data"), the three demo scenarios, the campus map, and any operator action such as changing a status or marking something confirmed. Everything else — extraction, triage, the incident record, storage — is real code running in your browser.',
  },
  {
    q: 'Does SankatBrigade contact emergency services?',
    a: 'No, and it never claims to. It has no integration with police, fire, ambulance, hospitals or any government service, and every screen says so. It structures a report so a person can act. If someone is in danger, they must contact emergency services themselves.',
  },
  {
    q: 'Where does the data go?',
    a: 'Nowhere. Reports, photos and coordinates are kept in this browser’s localStorage. There is no server, no database, no account and no API key of any kind in this project.',
  },
];

export default function AboutPage() {
  const [selfTest, setSelfTest] = useState<{ results: SelfTestResult[]; passed: number; failed: number } | null>(
    null,
  );

  return (
    <div className="sb-grid">
      <div className="sb-section__head" style={{ marginBottom: 0 }}>
        <div>
          <p className="sb-eyebrow">About</p>
          <h1 className="sb-section__title" style={{ fontSize: 'clamp(1.4rem, 1.1rem + 1.4vw, 2rem)' }}>
            What SankatBrigade is — and what it is not
          </h1>
          <p className="sb-section__sub">From emergency reports to coordinated action.</p>
        </div>
      </div>

      <SafetyNotice />

      <div className="sb-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="sb-card">
          <div className="sb-card__head">
            <h2 className="sb-card__title">
              <Icon name="check" size={18} />
              What it does
            </h2>
          </div>
          <ul className="sb-list sb-list--do">
            <li>Takes a plain-language report from anyone nearby.</li>
            <li>Extracts people, hazards, location and needs with local keyword rules.</li>
            <li>Applies a deterministic, readable triage rule set and shows the rule it used.</li>
            <li>Keeps unverified claims visibly separate from corroborated ones.</li>
            <li>Gives one concrete, low-risk next action.</li>
            <li>Puts a structured record in a shared responder-style queue.</li>
          </ul>
        </div>

        <div className="sb-card">
          <div className="sb-card__head">
            <h2 className="sb-card__title">
              <Icon name="close" size={18} />
              What it does not do
            </h2>
          </div>
          <ul className="sb-list sb-list--dont">
            <li>It does not contact police, fire, ambulance, hospitals or government.</li>
            <li>It does not replace an emergency service or a helpline.</li>
            <li>It does not diagnose anyone or give medical instructions.</li>
            <li>It does not track responders or show live GPS positions.</li>
            <li>It does not treat a report as true because it sounds confident.</li>
            <li>It does not send your data anywhere — there is no server.</li>
          </ul>
        </div>
      </div>

      <div className="sb-card">
        <div className="sb-card__head">
          <h2 className="sb-card__title">
            <Icon name="spark" size={18} />
            How the triage engine decides
          </h2>
          <span className="sb-badge sb-badge--neutral">First matching rule wins</span>
        </div>
        <div className="sb-steps">
          <div className="sb-step is-done">
            <span className="sb-step__icon">R1</span>
            <span>
              <span className="sb-step__label">Critical</span>
              <span className="sb-step__note" style={{ display: 'block' }}>
                Any reported life-safety signal: trapped people, unresponsive person, breathing difficulty,
                bleeding, fire, building collapse, electrical hazard.
              </span>
            </span>
          </div>
          <div className="sb-step is-done">
            <span className="sb-step__icon">R2</span>
            <span>
              <span className="sb-step__label">High</span>
              <span className="sb-step__note" style={{ display: 'block' }}>
                Serious risk without a life-safety signal: blocked access, injury, smoke, gas smell, rising
                water, structural damage, or ten or more people exposed.
              </span>
            </span>
          </div>
          <div className="sb-step is-done">
            <span className="sb-step__icon">R3</span>
            <span>
              <span className="sb-step__label">Medium</span>
              <span className="sb-step__note" style={{ display: 'block' }}>
                A resource request — water, food, shelter, transport, power, communication — with no reported
                danger.
              </span>
            </span>
          </div>
          <div className="sb-step is-done">
            <span className="sb-step__icon">R4</span>
            <span>
              <span className="sb-step__label">Low</span>
              <span className="sb-step__note" style={{ display: 'block' }}>
                Everything else: information and awareness reports.
              </span>
            </span>
          </div>
        </div>
        <p className="sb-hint">
          Keyword extraction produces a first guess. The rule set is allowed to override it, and every incident
          shows both values so the override is visible rather than hidden.
        </p>
      </div>

      <div className="sb-card">
        <div className="sb-card__head">
          <div>
            <h2 className="sb-card__title">
              <Icon name="shield-check" size={18} />
              Rule self-test
            </h2>
            <p className="sb-card__sub">
              Twelve fixed checks run against the real extractor and the real triage engine, right here in
              your browser. Because the rules are deterministic, the result is always the same.
            </p>
          </div>
          <button type="button" className="sb-btn sb-btn--primary sb-btn--sm" onClick={() => setSelfTest(runRuleSelfTest())}>
            <Icon name="spark" size={15} />
            {selfTest ? 'Run again' : 'Run self-test'}
          </button>
        </div>

        {selfTest ? (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <span className={`sb-badge ${selfTest.failed === 0 ? 'sb-badge--ok' : 'sb-badge--critical'}`}>
                {selfTest.passed} passed
              </span>
              {selfTest.failed > 0 && <span className="sb-badge sb-badge--critical">{selfTest.failed} failed</span>}
            </div>
            <div className="sb-steps">
              {selfTest.results.map((result) => (
                <div className={`sb-step ${result.passed ? 'is-done' : 'is-active'}`} key={result.name}>
                  <span
                    className="sb-step__icon"
                    style={
                      result.passed
                        ? undefined
                        : { background: 'var(--critical-soft)', color: 'var(--critical)' }
                    }
                  >
                    <Icon name={result.passed ? 'check' : 'close'} size={14} />
                  </span>
                  <span>
                    <span className="sb-step__label">{result.name}</span>
                    <span className="sb-step__note" style={{ display: 'block' }}>
                      {result.detail}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="sb-hint">
            Nothing is cached or pre-computed — pressing the button executes the same functions a live report
            goes through.
          </p>
        )}
      </div>

      <div className="sb-card">
        <div className="sb-card__head">
          <h2 className="sb-card__title">
            <Icon name="info" size={18} />
            Simulated, honestly labelled
          </h2>
        </div>
        <ul className="sb-list">
          <li>Seeded queue rows are marked “Simulated demo data”.</li>
          <li>The three demo scenarios are marked “Simulated demo scenario”.</li>
          <li>The campus map is marked “Prototype map — simulated locations”, with no GPS tracking.</li>
          <li>Operator actions (status changes, verification changes) are local demo actions only.</li>
          <li>Uploaded photos are labelled “User-submitted evidence — not independently verified”.</li>
          <li>Incident analysis is labelled “Prototype incident analysis — deterministic keyword rules”.</li>
        </ul>
      </div>

      <div className="sb-card">
        <div className="sb-card__head">
          <h2 className="sb-card__title">
            <Icon name="bolt" size={18} />
            How it is built
          </h2>
        </div>
        <div className="sb-tag-list">
          {['React', 'Vite', 'TypeScript', 'Plain CSS', 'CSS + SVG animation', 'localStorage', 'Service worker PWA', 'Static hosting'].map(
            (tech) => (
              <span className="sb-tag" key={tech}>
                {tech}
              </span>
            ),
          )}
        </div>
        <p className="sb-prose" style={{ marginTop: 12 }}>
          No database, no authentication, and <strong>no key of any kind in the frontend</strong> — so the whole
          thing deploys as static files to Cloudflare Pages or GitHub Pages and keeps working with the network
          off. An optional AI language layer can be switched on per deployment; its key lives in a server-side
          proxy and never reaches the browser, and the deterministic rules decide priority either way.
        </p>
      </div>

      <div className="sb-card">
        <div className="sb-card__head">
          <h2 className="sb-card__title">
            <Icon name="users" size={18} />
            Questions judges usually ask
          </h2>
        </div>
        {FAQ.map((item) => (
          <details className="sb-faq" key={item.q}>
            <summary>{item.q}</summary>
            <div className="sb-faq__body">{item.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
