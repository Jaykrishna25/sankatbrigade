import Icon from './Icons';
import type { LifecycleStatus, Urgency, VerificationStatus } from '../types/incident';
import { LIFECYCLE_LABEL, URGENCY_LABEL, VERIFICATION_LABEL } from '../utils/labels';

const URGENCY_CLASS: Record<Urgency, string> = {
  critical: 'sb-badge--critical',
  high: 'sb-badge--high',
  medium: 'sb-badge--medium',
  low: 'sb-badge--low',
};

export function UrgencyBadge({ urgency, withDot = true }: { urgency: Urgency; withDot?: boolean }) {
  return (
    <span className={`sb-badge ${URGENCY_CLASS[urgency]}`}>
      {withDot && <span className="sb-badge__dot" />}
      {URGENCY_LABEL[urgency]}
    </span>
  );
}

const VERIFICATION_SHORT: Record<VerificationStatus, string> = {
  unverified: 'Unverified',
  corroborating: 'Corrob.',
  corroborated: 'Corrob. ×3',
  officially_confirmed: 'Confirmed',
};

export function VerificationBadge({
  status,
  compact = false,
}: {
  status: VerificationStatus;
  compact?: boolean;
}) {
  const tone =
    status === 'unverified'
      ? 'sb-badge--high'
      : status === 'corroborating'
        ? 'sb-badge--medium'
        : 'sb-badge--ok';
  return (
    <span className={`sb-badge ${tone}`} title={VERIFICATION_LABEL[status]}>
      {!compact && <Icon name={status === 'unverified' ? 'shield' : 'shield-check'} size={12} />}
      {compact ? VERIFICATION_SHORT[status] : VERIFICATION_LABEL[status]}
    </span>
  );
}

/** Short forms used inside the compact queue table (full text stays in `title`). */
const LIFECYCLE_SHORT: Record<LifecycleStatus, string> = {
  new: 'New',
  escalated: 'Escalate',
  awaiting_verification: 'Verify',
  acknowledged: 'Acknowledged',
  resource_queued: 'Queued',
  in_progress: 'Active',
  resolved: 'Resolved',
};

export function StatusBadge({ status, compact = false }: { status: LifecycleStatus; compact?: boolean }) {
  const tone =
    status === 'escalated'
      ? 'sb-badge--critical'
      : status === 'awaiting_verification'
        ? 'sb-badge--high'
        : status === 'resolved'
          ? 'sb-badge--ok'
          : 'sb-badge--neutral';
  return (
    <span className={`sb-badge ${tone}`} title={LIFECYCLE_LABEL[status]}>
      {compact ? LIFECYCLE_SHORT[status] : LIFECYCLE_LABEL[status]}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="sb-badge sb-badge--demo">
      <Icon name="spark" size={12} />
      Simulated demo data
    </span>
  );
}
