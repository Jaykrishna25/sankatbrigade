import Icon from './Icons';

/**
 * The one message that must never be missed. Rendered on every screen.
 */
export default function SafetyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`sb-safety${compact ? ' sb-safety--compact' : ''}`} role="note">
      <Icon name="alert" size={compact ? 16 : 19} className="sb-safety__icon" />
      <div>
        <strong>For immediate life-threatening danger, contact local emergency services now.</strong>{' '}
        Do not wait for SankatBrigade. This is a student prototype for coordinating information — it is
        not an emergency service and it does not contact responders for you.
      </div>
    </div>
  );
}
