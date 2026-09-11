import Icon from './Icons';
import SafetyNotice from './SafetyNotice';

/**
 * Resources screen — the honest, useful, non-simulated part of the product:
 * how to reach real help, and how to write a report that is actually usable.
 * No medical instructions are given anywhere on this page.
 */

const NUMBERS = [
  { number: '112', label: 'All-in-one emergency number (India)' },
  { number: '101', label: 'Fire services' },
  { number: '102 / 108', label: 'Ambulance / emergency response (varies by state)' },
  { number: '100', label: 'Police' },
  { number: '1091', label: 'Women helpline' },
  { number: '1098', label: 'Childline' },
];

export default function ResourcesPage() {
  return (
    <div className="sb-grid">
      <div className="sb-section__head" style={{ marginBottom: 0 }}>
        <div>
          <p className="sb-eyebrow">Resources</p>
          <h1 className="sb-section__title" style={{ fontSize: 'clamp(1.4rem, 1.1rem + 1.4vw, 2rem)' }}>
            Reach real help, and report well
          </h1>
          <p className="sb-section__sub">
            SankatBrigade organises information. These are the people who actually respond.
          </p>
        </div>
      </div>

      <SafetyNotice />

      <div className="sb-card">
        <div className="sb-card__head">
          <h2 className="sb-card__title">
            <Icon name="radio" size={18} />
            Emergency numbers
          </h2>
          <span className="sb-badge sb-badge--neutral">Confirm your local numbers</span>
        </div>
        <div className="sb-contact-grid">
          {NUMBERS.map((entry) => (
            <div className="sb-contact" key={entry.number}>
              <div className="sb-contact__num">{entry.number}</div>
              <div className="sb-contact__label">{entry.label}</div>
            </div>
          ))}
        </div>
        <p className="sb-hint">
          These are widely used numbers in India and coverage varies by state and service. Save the numbers your
          own campus, hostel warden, security desk and local control room actually use — a number that works
          where you are beats a national one that routes you around.
        </p>
      </div>

      <div className="sb-card">
        <div className="sb-card__head">
          <h2 className="sb-card__title">
            <Icon name="list" size={18} />
            What makes a report usable
          </h2>
        </div>
        <p className="sb-prose">
          A responder can only act on what they can locate and size. A report with these four things is worth
          more than five paragraphs without them.
        </p>
        <ul className="sb-list" style={{ marginTop: 12 }}>
          <li>
            <strong>Where</strong> — building, floor, landmark, gate number. “Science Block, ground floor” beats
            “near college”.
          </li>
          <li>
            <strong>How many people</strong> — an estimate is fine. “About 50” is useful; “a lot” is not.
          </li>
          <li>
            <strong>What the hazard is</strong> — water, fire, smoke, wires, gas, debris, blocked exit.
          </li>
          <li>
            <strong>What is needed</strong> — medical help, evacuation, drinking water, food, shelter, transport.
          </li>
          <li>
            <strong>What you saw yourself</strong> — say so, and say when you only heard it from someone else.
          </li>
        </ul>
      </div>

      <div className="sb-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="sb-card">
          <div className="sb-card__head">
            <h2 className="sb-card__title">
              <Icon name="droplet" size={18} />
              Flooding and water
            </h2>
          </div>
          <ul className="sb-list sb-list--dont">
            <li>Do not walk or drive through moving water — depth and current are hard to judge.</li>
            <li>Do not enter floodwater near panels, switchboards, transformers or fallen wires.</li>
            <li>Do not use a lift during flooding or a power failure.</li>
          </ul>
          <ul className="sb-list sb-list--do" style={{ marginTop: 10 }}>
            <li>Move to a higher floor and stay reachable by phone if you can.</li>
            <li>Tell someone where you are before the network gets busy.</li>
          </ul>
        </div>

        <div className="sb-card">
          <div className="sb-card__head">
            <h2 className="sb-card__title">
              <Icon name="bolt" size={18} />
              Fire, smoke and electricity
            </h2>
          </div>
          <ul className="sb-list sb-list--dont">
            <li>Do not re-enter a building for belongings.</li>
            <li>Do not touch wires, panels or a person in contact with a live source.</li>
            <li>Do not attempt an unassisted rescue — you become the second casualty.</li>
          </ul>
          <ul className="sb-list sb-list--do" style={{ marginTop: 10 }}>
            <li>Move away from smoke, stay upwind, and use stairs.</li>
            <li>Call fire services first, then report here so others can see it.</li>
          </ul>
        </div>

        <div className="sb-card">
          <div className="sb-card__head">
            <h2 className="sb-card__title">
              <Icon name="shield" size={18} />
              Rumours and forwards
            </h2>
          </div>
          <ul className="sb-list">
            <li>Ask one question before forwarding: did anyone actually see this?</li>
            <li>Say “reported” and “unverified” when you pass something on.</li>
            <li>A screenshot is not a source. Neither is “everyone is saying”.</li>
            <li>Correcting a rumour you spread is worth more than staying quiet.</li>
          </ul>
        </div>
      </div>

      <div className="sb-card">
        <div className="sb-card__head">
          <h2 className="sb-card__title">
            <Icon name="install" size={18} />
            Using SankatBrigade offline
          </h2>
        </div>
        <p className="sb-prose">
          SankatBrigade can be installed to your home screen. Once installed, the app shell and the incidents
          already stored on your device open without a connection.{' '}
          <strong>
            Limited prototype access is available offline. Real-time coordination requires connectivity.
          </strong>{' '}
          Nothing in this prototype reaches an emergency service, online or offline.
        </p>
      </div>
    </div>
  );
}
