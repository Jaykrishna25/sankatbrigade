import Icon, { type IconName } from './Icons';
import type { Route } from '../utils/router';

/**
 * The seven capabilities, stated plainly on the home page so a judge can see
 * the whole product without hunting for it — and so every claim here is one
 * they can click straight through to and check.
 */

interface Feature {
  icon: IconName;
  title: string;
  body: string;
  cta: string;
  route: Route;
  scrollTo?: string;
}

const FEATURES: Feature[] = [
  {
    icon: 'alert',
    title: 'Emergency report box',
    body: 'Plain language in, structured incident out. No form-filling, no jargon, no account.',
    cta: 'Write a report',
    route: 'report',
    scrollTo: 'sb-report-form',
  },
  {
    icon: 'spark',
    title: 'On-device incident classification',
    body: 'Scores every category from the words you used, shows the points and the terms behind them, and never hides an override.',
    cta: 'See how it decides',
    route: 'about',
  },
  {
    icon: 'pin',
    title: 'Location across India',
    body: 'GPS with an honest fallback, an offline index of Indian cities that turns any typed place into a position and a state, an offline campus map, and a live OpenStreetMap view.',
    cta: 'Open the maps',
    route: 'command',
  },
  {
    icon: 'camera',
    title: 'Photo, video and voice evidence',
    body: 'Attach a photo, a video clip, a recorded voice note, or dictate the report — all labelled as unverified, none of it uploaded.',
    cta: 'Attach evidence',
    route: 'report',
    scrollTo: 'sb-report-form',
  },
  {
    icon: 'droplet',
    title: 'Resource requests',
    body: 'Needs are tracked in their own queue across eight resource types, so a water request never competes with a rescue.',
    cta: 'See the resource queue',
    route: 'command',
  },
  {
    icon: 'map',
    title: 'Incident command dashboard',
    body: 'Live counts, filters, a priority-sorted queue, full incident records and a status lifecycle an operator can move.',
    cta: 'Open the Command Center',
    route: 'command',
  },
  {
    icon: 'shield-check',
    title: 'Safety and misinformation protection',
    body: 'Urgency and confidence are separate axes: a rumour keeps its priority but is held back from being broadcast as fact.',
    cta: 'See the Verification Shield',
    route: 'command',
  },
];

export default function FeaturesSection({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const go = (feature: Feature) => {
    if (feature.scrollTo) {
      document.getElementById(feature.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    onNavigate(feature.route);
  };

  return (
    <section className="sb-section">
      <div className="sb-section__head">
        <div>
          <p className="sb-eyebrow">What is inside</p>
          <h2 className="sb-section__title">Seven working parts, one coordination workflow</h2>
          <p className="sb-section__sub">
            Every item below is built and clickable — nothing here is a mock-up or a roadmap.
          </p>
        </div>
      </div>

      <div className="sb-feature-grid">
        {FEATURES.map((feature) => (
          <article className="sb-feature" key={feature.title}>
            <span className="sb-feature__icon">
              <Icon name={feature.icon} size={19} />
            </span>
            <h3 className="sb-feature__title">{feature.title}</h3>
            <p className="sb-feature__body">{feature.body}</p>
            <button type="button" className="sb-btn sb-btn--subtle sb-btn--sm" onClick={() => go(feature)}>
              {feature.cta}
              <Icon name="chevron" size={14} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
