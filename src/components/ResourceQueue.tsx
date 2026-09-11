import { useState } from 'react';
import Icon, { type IconName } from './Icons';
import { StatusBadge, UrgencyBadge } from './Badges';
import type { Incident, ResourceNeed } from '../types/incident';
import { RESOURCE_LABEL, URGENCY_RANK, formatRelative } from '../utils/labels';

interface ResourceQueueProps {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (incidentId: string) => void;
}

const TRACKED: { need: ResourceNeed; icon: IconName }[] = [
  { need: 'medical_assistance', icon: 'medical' },
  { need: 'evacuation_assistance', icon: 'users' },
  { need: 'drinking_water', icon: 'droplet' },
  { need: 'food', icon: 'food' },
  { need: 'transport', icon: 'bus' },
  { need: 'shelter', icon: 'home' },
  { need: 'communication_support', icon: 'wifi' },
  { need: 'power_support', icon: 'plug' },
];

export default function ResourceQueue({ incidents, selectedId, onSelect }: ResourceQueueProps) {
  const [filter, setFilter] = useState<ResourceNeed | 'all'>('all');

  const requests = incidents
    .filter((incident) => incident.resource_needed !== 'none')
    .sort((a, b) => URGENCY_RANK[a.final_urgency] - URGENCY_RANK[b.final_urgency]);

  const visible = filter === 'all' ? requests : requests.filter((incident) => incident.resource_needed === filter);

  return (
    <div className="sb-card">
      <div className="sb-card__head">
        <div>
          <h3 className="sb-card__title">
            <Icon name="list" size={18} />
            Resource queue
          </h3>
          <p className="sb-card__sub">
            Needs are tracked separately from alarms, so a water request never competes with a rescue for
            attention.
          </p>
        </div>
        {filter !== 'all' && (
          <button type="button" className="sb-btn sb-btn--subtle sb-btn--sm" onClick={() => setFilter('all')}>
            Show all needs
          </button>
        )}
      </div>

      <div className="sb-resource-tiles">
        {TRACKED.map(({ need, icon }) => {
          const forNeed = requests.filter((incident) => incident.resource_needed === need);
          const open = forNeed.filter((incident) => incident.lifecycle_status !== 'resolved');
          const people = open.reduce((total, incident) => total + (incident.resource_quantity ?? 0), 0);
          return (
            <button
              key={need}
              type="button"
              className={`sb-resource-tile${filter === need ? ' is-active' : ''}${forNeed.length === 0 ? ' is-empty' : ''}`}
              onClick={() => setFilter((current) => (current === need ? 'all' : need))}
              aria-pressed={filter === need}
            >
              <span className="sb-resource-tile__name">
                <Icon name={icon} size={15} />
                {RESOURCE_LABEL[need]}
              </span>
              <span className="sb-resource-tile__count">{open.length}</span>
              <span className="sb-resource-tile__note">
                {forNeed.length === 0
                  ? 'No open requests'
                  : [
                      people > 0 ? `${people} ${people === 1 ? 'person' : 'people'}` : null,
                      forNeed.length > open.length ? `${forNeed.length - open.length} resolved` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Open request'}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="sb-empty">No resource requests match this filter.</p>
      ) : (
        <div className="sb-resource-cards">
          {visible.map((incident) => (
            <article
              key={incident.incident_id}
              className="sb-resource-card"
              style={
                incident.incident_id === selectedId
                  ? { borderColor: 'var(--accent)', boxShadow: 'inset 3px 0 0 var(--accent)' }
                  : undefined
              }
            >
              <div className="sb-resource-card__head">
                <span className="sb-resource-card__need">{RESOURCE_LABEL[incident.resource_needed]}</span>
                <UrgencyBadge urgency={incident.final_urgency} withDot={false} />
              </div>
              <div className="sb-resource-card__meta">
                <span>
                  <strong>{incident.resource_quantity ?? 'Unknown'}</strong>{' '}
                  {incident.resource_quantity === null
                    ? 'number of people'
                    : incident.resource_quantity === 1
                      ? 'person affected'
                      : 'people affected'}
                </span>
                <span>{incident.location.label}</span>
                <span>
                  {incident.incident_id} · reported {formatRelative(incident.created_at)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusBadge status={incident.lifecycle_status} />
                {incident.is_demo && <span className="sb-badge sb-badge--demo">Simulated</span>}
              </div>
              <button
                type="button"
                className="sb-btn sb-btn--ghost sb-btn--sm"
                onClick={() => onSelect(incident.incident_id)}
              >
                Open incident
                <Icon name="chevron" size={14} />
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
