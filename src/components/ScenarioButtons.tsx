import Icon from './Icons';
import { DEMO_SCENARIOS, type DemoScenario } from '../data/demoScenarios';

interface ScenarioButtonsProps {
  onPick: (scenario: DemoScenario) => void;
}

/**
 * Three fixed demo scenarios. Each one is labelled "Simulated demo scenario"
 * so nobody can mistake it for a real report.
 */
export default function ScenarioButtons({ onPick }: ScenarioButtonsProps) {
  return (
    <div className="sb-scenarios">
      {DEMO_SCENARIOS.map((scenario) => (
        <button key={scenario.id} type="button" className="sb-scenario" onClick={() => onPick(scenario)}>
          <span className="sb-badge sb-badge--demo">
            <Icon name="spark" size={12} />
            Simulated demo scenario
          </span>
          <span className="sb-scenario__title">{scenario.title}</span>
          <span className="sb-scenario__text">“{scenario.text}”</span>
          <span className="sb-scenario__purpose">{scenario.purpose}</span>
        </button>
      ))}
    </div>
  );
}
