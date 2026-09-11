import { StatusBadge, UrgencyBadge, VerificationBadge } from './Badges';
import type { Incident } from '../types/incident';
import { INCIDENT_TYPE_LABEL, formatRelative } from '../utils/labels';

interface IncidentQueueProps {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (incidentId: string) => void;
}

/**
 * The queue, ordered Critical -> High -> Medium -> Low (and newest first inside
 * each band). Renders as a compact table on desktop and as cards on mobile, so
 * nothing is ever cut off or side-scrolled on a phone.
 */
export default function IncidentQueue({ incidents, selectedId, onSelect }: IncidentQueueProps) {
  if (incidents.length === 0) {
    return <p className="sb-empty">No incidents match the current filters.</p>;
  }

  return (
    <>
      <div className="sb-table-wrap">
        <table className="sb-table">
          <caption className="sb-visually-hidden">
            Incident queue sorted by urgency, then by newest report
          </caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Type</th>
              <th scope="col">Priority</th>
              <th scope="col">Status</th>
              <th scope="col">Location</th>
              <th scope="col">People</th>
              <th scope="col">Verification</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr
                key={incident.incident_id}
                className={incident.incident_id === selectedId ? 'is-selected' : undefined}
                onClick={() => onSelect(incident.incident_id)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(incident.incident_id);
                  }
                }}
                aria-label={`Open ${incident.incident_id}`}
              >
                <td className="sb-table__id">{incident.incident_id}</td>
                <td>{INCIDENT_TYPE_LABEL[incident.incident_type]}</td>
                <td>
                  <UrgencyBadge urgency={incident.final_urgency} />
                </td>
                <td>
                  <StatusBadge status={incident.lifecycle_status} compact />
                </td>
                <td>{incident.location.label}</td>
                <td>{incident.people_affected ?? '—'}</td>
                <td>
                  <VerificationBadge status={incident.verification_status} compact />
                </td>
                <td className="sb-table__muted">{formatRelative(incident.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sb-queue-cards">
        {incidents.map((incident) => (
          <button
            key={incident.incident_id}
            type="button"
            className={`sb-queue-card${incident.incident_id === selectedId ? ' is-selected' : ''}`}
            onClick={() => onSelect(incident.incident_id)}
          >
            <div className="sb-queue-card__top">
              <span className="sb-table__id">{incident.incident_id}</span>
              <UrgencyBadge urgency={incident.final_urgency} />
            </div>
            <div style={{ fontWeight: 650, fontSize: '0.9rem' }}>
              {INCIDENT_TYPE_LABEL[incident.incident_type]}
            </div>
            <div className="sb-queue-card__meta">
              <span>{incident.location.label}</span>
              <span>{incident.people_affected === null ? 'People: unknown' : `${incident.people_affected} people`}</span>
              <span>{formatRelative(incident.created_at)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge status={incident.lifecycle_status} />
              <VerificationBadge status={incident.verification_status} />
              {incident.is_demo && <span className="sb-badge sb-badge--demo">Simulated</span>}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
