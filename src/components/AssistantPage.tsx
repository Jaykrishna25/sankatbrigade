import Icon from './Icons';
import SafetyNotice from './SafetyNotice';
import SankatBrigadeAssistant from './SankatBrigadeAssistant';
import type { AssistantApi } from '../hooks/useAssistant';

/**
 * The full-screen Assistant view. Same conversation as the floating dock —
 * opening one after the other continues where the last left off.
 */
export default function AssistantPage({ api }: { api: AssistantApi }) {
  return (
    <div className="sb-grid">
      <div className="sb-section__head" style={{ marginBottom: 0 }}>
        <div>
          <p className="sb-eyebrow">Assistant</p>
          <h1 className="sb-section__title" style={{ fontSize: 'clamp(1.4rem, 1.1rem + 1.4vw, 2rem)' }}>
            SankatBrigade Assistant
          </h1>
          <p className="sb-section__sub">
            Describe an emergency in your own words and it becomes a structured incident — or ask how any
            incident was prioritised.
          </p>
        </div>
      </div>

      <SafetyNotice compact />

      <div className="sb-command-layout">
        <SankatBrigadeAssistant api={api} variant="page" />

        <div className="sb-grid">
          <div className="sb-card">
            <div className="sb-card__head">
              <h2 className="sb-card__title">
                <Icon name="check" size={17} />
                What it can do
              </h2>
            </div>
            <ul className="sb-list sb-list--do">
              <li>Turn what you type into a structured incident with an ID and a priority.</li>
              <li>Show, before you submit, how the rules would triage it.</li>
              <li>Ask only for the details that are actually missing.</li>
              <li>Re-run the triage rules whenever you add a detail, and tell you if the priority moved.</li>
              <li>Explain exactly which rule produced a priority.</li>
              <li>Answer honestly about what is verified and what is not.</li>
            </ul>
          </div>

          <div className="sb-card">
            <div className="sb-card__head">
              <h2 className="sb-card__title">
                <Icon name="close" size={17} />
                What it will not do
              </h2>
            </div>
            <ul className="sb-list sb-list--dont">
              <li>Contact police, fire, ambulance, a hospital or any government body.</li>
              <li>Diagnose anyone or give medical instructions.</li>
              <li>Call a report confirmed when nothing has been corroborated.</li>
              <li>Invent a location, a headcount or a hazard you did not mention.</li>
              <li>Send anything anywhere — the whole conversation stays in this browser.</li>
            </ul>
          </div>

          <div className="sb-card sb-card--flat">
            <div className="sb-card__head" style={{ marginBottom: 8 }}>
              <h2 className="sb-card__title">
                <Icon name="spark" size={17} />
                Try saying
              </h2>
            </div>
            <div className="sb-tag-list">
              {[
                'Two students are trapped in the flooded lab',
                'About fifty people in Hostel B need drinking water',
                'Everyone is saying the bridge collapsed',
                'Why was that marked Critical?',
              ].map((example) => (
                <button
                  key={example}
                  type="button"
                  className="sb-quick__btn"
                  onClick={() => api.send(example)}
                >
                  “{example}”
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
