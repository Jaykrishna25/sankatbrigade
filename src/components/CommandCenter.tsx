import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icons';
import IncidentQueue from './IncidentQueue';
import ResourceQueue from './ResourceQueue';
import VerificationShield from './VerificationShield';
import PrototypeMap from './PrototypeMap';
import StreetMap from './StreetMap';
import SafetyNotice from './SafetyNotice';
import { DemoBadge, StatusBadge, UrgencyBadge, VerificationBadge } from './Badges';
import type {
  Incident,
  IncidentType,
  LifecycleStatus,
  Urgency,
  VerificationStatus,
} from '../types/incident';
import {
  ACTION_LABEL,
  CRITICAL_SIGNAL_LABEL,
  HAZARD_LABEL,
  INCIDENT_TYPE_LABEL,
  LIFECYCLE_LABEL,
  LIFECYCLE_ORDER,
  LOCATION_SOURCE_LABEL,
  RESOURCE_LABEL,
  RISK_SIGNAL_LABEL,
  URGENCY_LABEL,
  URGENCY_ORDER,
  URGENCY_RANK,
  VERIFICATION_LABEL,
  formatRelative,
  formatTime,
  visibleHazards,
} from '../utils/labels';
import { addIndependentReport, setLifecycle, setVerification } from '../utils/incidentFactory';
import { getSessionMedia } from '../utils/mediaStore';
import { formatCoords, googleMapsLink, openStreetMapLink } from '../utils/geo';

interface CommandCenterProps {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (incidentId: string | null) => void;
  onUpdateIncident: (incident: Incident) => void;
  onResetDemo: () => void;
}

const VERIFICATION_OPTIONS: VerificationStatus[] = [
  'unverified',
  'corroborating',
  'corroborated',
  'officially_confirmed',
];

export default function CommandCenter({
  incidents,
  selectedId,
  onSelect,
  onUpdateIncident,
  onResetDemo,
}: CommandCenterProps) {
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | 'all'>('all');
  const [verificationFilter, setVerificationFilter] = useState<VerificationStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<IncidentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<LifecycleStatus | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [mapView, setMapView] = useState<'campus' | 'street'>('campus');
  const [mapNote, setMapNote] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...incidents].sort((a, b) => {
        const byUrgency = URGENCY_RANK[a.final_urgency] - URGENCY_RANK[b.final_urgency];
        if (byUrgency !== 0) return byUrgency;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [incidents],
  );

  const filtered = useMemo(
    () =>
      sorted.filter((incident) => {
        if (urgencyFilter !== 'all' && incident.final_urgency !== urgencyFilter) return false;
        if (verificationFilter !== 'all' && incident.verification_status !== verificationFilter) return false;
        if (typeFilter !== 'all' && incident.incident_type !== typeFilter) return false;
        if (statusFilter !== 'all' && incident.lifecycle_status !== statusFilter) return false;
        if (regionFilter !== 'all' && (incident.location.region ?? 'Unknown region') !== regionFilter) return false;
        return true;
      }),
    [sorted, urgencyFilter, verificationFilter, typeFilter, statusFilter, regionFilter],
  );

  /** Every state or union territory currently represented in the queue. */
  const regionsPresent = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.location.region ?? 'Unknown region'))).sort(),
    [incidents],
  );

  const selected = incidents.find((incident) => incident.incident_id === selectedId) ?? null;

  // On stacked (mobile/tablet) layouts the detail panel sits below the queue,
  // so bring it into view when an incident is opened.
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedId) return;
    if (window.innerWidth > 1180) return;
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedId]);

  const stats = useMemo(() => {
    const critical = incidents.filter((incident) => incident.final_urgency === 'critical').length;
    const awaiting = incidents.filter(
      (incident) => incident.verification_status === 'unverified' && incident.lifecycle_status !== 'resolved',
    ).length;
    const resources = incidents.filter(
      (incident) => incident.resource_needed !== 'none' && incident.lifecycle_status !== 'resolved',
    ).length;
    const resolved = incidents.filter((incident) => incident.lifecycle_status === 'resolved').length;
    return { total: incidents.length, critical, awaiting, resources, resolved };
  }, [incidents]);

  const typesPresent = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.incident_type))),
    [incidents],
  );

  const activeFilters =
    urgencyFilter !== 'all' ||
    verificationFilter !== 'all' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    regionFilter !== 'all';

  const resetFilters = () => {
    setUrgencyFilter('all');
    setVerificationFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setRegionFilter('all');
  };

  return (
    <div className="sb-grid">
      <div className="sb-section__head" style={{ marginBottom: 0 }}>
        <div>
          <p className="sb-eyebrow">Responder view</p>
          <h1 className="sb-section__title" style={{ fontSize: 'clamp(1.4rem, 1.1rem + 1.4vw, 2rem)' }}>
            SANKATBRIGADE COMMAND CENTER
          </h1>
          <p className="sb-section__sub">
            Every incident below came from the same deterministic pipeline. Nothing here has been dispatched:
            this is a coordination view for people, not an emergency service.
          </p>
        </div>
        <button type="button" className="sb-btn sb-btn--subtle sb-btn--sm" onClick={onResetDemo}>
          <Icon name="refresh" size={15} />
          Reset demo data
        </button>
      </div>

      <SafetyNotice compact />

      {/* ---------- summary ---------- */}
      <div className="sb-summary">
        <div className="sb-summary__card">
          <div className="sb-summary__label">
            <Icon name="list" size={14} />
            Total incidents
          </div>
          <div className="sb-summary__value">{stats.total}</div>
          <div className="sb-summary__foot">
            Across {regionsPresent.length} state{regionsPresent.length === 1 ? '' : 's'} · stored on this device
          </div>
        </div>
        <div className="sb-summary__card is-critical">
          <div className="sb-summary__label">
            <Icon name="alert" size={14} />
            Critical
          </div>
          <div className="sb-summary__value" style={{ color: 'var(--critical)' }}>
            {stats.critical}
          </div>
          <div className="sb-summary__foot">Reported life-safety signal present</div>
        </div>
        <div className="sb-summary__card is-warn">
          <div className="sb-summary__label">
            <Icon name="shield" size={14} />
            Awaiting verification
          </div>
          <div className="sb-summary__value" style={{ color: 'var(--high)' }}>
            {stats.awaiting}
          </div>
          <div className="sb-summary__foot">Do not broadcast as confirmed</div>
        </div>
        <div className="sb-summary__card">
          <div className="sb-summary__label">
            <Icon name="droplet" size={14} />
            Resource requests
          </div>
          <div className="sb-summary__value">{stats.resources}</div>
          <div className="sb-summary__foot">Open needs in the resource queue</div>
        </div>
        <div className="sb-summary__card is-ok">
          <div className="sb-summary__label">
            <Icon name="check" size={14} />
            Resolved
          </div>
          <div className="sb-summary__value" style={{ color: 'var(--ok)' }}>
            {stats.resolved}
          </div>
          <div className="sb-summary__foot">Closed locally in this demo</div>
        </div>
      </div>

      {/* ---------- filters ---------- */}
      <div className="sb-card sb-card--flat">
        <div className="sb-card__head" style={{ marginBottom: 10 }}>
          <h2 className="sb-card__title">
            <Icon name="filter" size={17} />
            Filters
          </h2>
          {activeFilters && (
            <button type="button" className="sb-btn sb-btn--subtle sb-btn--sm" onClick={resetFilters}>
              Clear filters
            </button>
          )}
        </div>
        <div className="sb-filters">
          <div>
            <label className="sb-label" htmlFor="sb-filter-urgency">
              Urgency
            </label>
            <select
              id="sb-filter-urgency"
              className="sb-select"
              value={urgencyFilter}
              onChange={(event) => setUrgencyFilter(event.target.value as Urgency | 'all')}
            >
              <option value="all">All urgencies</option>
              {URGENCY_ORDER.map((urgency) => (
                <option key={urgency} value={urgency}>
                  {URGENCY_LABEL[urgency]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="sb-label" htmlFor="sb-filter-verification">
              Verification
            </label>
            <select
              id="sb-filter-verification"
              className="sb-select"
              value={verificationFilter}
              onChange={(event) => setVerificationFilter(event.target.value as VerificationStatus | 'all')}
            >
              <option value="all">All verification states</option>
              {VERIFICATION_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {VERIFICATION_LABEL[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="sb-label" htmlFor="sb-filter-type">
              Incident type
            </label>
            <select
              id="sb-filter-type"
              className="sb-select"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as IncidentType | 'all')}
            >
              <option value="all">All types</option>
              {typesPresent.map((type) => (
                <option key={type} value={type}>
                  {INCIDENT_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="sb-label" htmlFor="sb-filter-region">
              State / region
            </label>
            <select
              id="sb-filter-region"
              className="sb-select"
              value={regionFilter}
              onChange={(event) => setRegionFilter(event.target.value)}
            >
              <option value="all">All of India</option>
              {regionsPresent.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="sb-label" htmlFor="sb-filter-status">
              Lifecycle status
            </label>
            <select
              id="sb-filter-status"
              className="sb-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as LifecycleStatus | 'all')}
            >
              <option value="all">All statuses</option>
              {LIFECYCLE_ORDER.map((status) => (
                <option key={status} value={status}>
                  {LIFECYCLE_LABEL[status]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ---------- queue + detail ---------- */}
      <div className="sb-command-layout">
        <div className="sb-card">
          <div className="sb-card__head">
            <div>
              <h2 className="sb-card__title">
                <Icon name="list" size={17} />
                Incident queue
              </h2>
              <p className="sb-card__sub">
                Sorted Critical → High → Medium → Low, newest first inside each band.
              </p>
            </div>
            <span className="sb-badge sb-badge--neutral">
              {filtered.length} of {incidents.length} shown
            </span>
          </div>
          <IncidentQueue incidents={filtered} selectedId={selectedId} onSelect={onSelect} />
        </div>

        <div className="sb-card" ref={detailRef}>
          {selected ? (
            <IncidentDetail
              incident={selected}
              onUpdateIncident={onUpdateIncident}
              onClose={() => onSelect(null)}
            />
          ) : (
            <>
              <div className="sb-card__head">
                <h2 className="sb-card__title">
                  <Icon name="info" size={17} />
                  Incident detail
                </h2>
              </div>
              <p className="sb-empty">
                Select an incident from the queue, the map or the resource queue to see the full structured
                record.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ---------- maps ---------- */}
      <div className="sb-card">
        <div className="sb-card__head">
          <div>
            <h2 className="sb-card__title">
              <Icon name="map" size={17} />
              {mapView === 'campus' ? 'Campus map' : 'Street map'}
            </h2>
            <p className="sb-card__sub">
              {mapView === 'campus'
                ? 'Zones drawn from reported location text. Works with no connection. No live GPS, no responder tracking.'
                : 'Real OpenStreetMap tiles, plotted from the coordinates on each incident. Needs a connection; falls back to the campus map.'}
            </p>
          </div>
          <div className="sb-segmented" role="group" aria-label="Map view">
            <button
              type="button"
              className={mapView === 'campus' ? 'is-active' : undefined}
              onClick={() => setMapView('campus')}
              aria-pressed={mapView === 'campus'}
            >
              Campus map
              <span className="sb-segmented__note">offline</span>
            </button>
            <button
              type="button"
              className={mapView === 'street' ? 'is-active' : undefined}
              onClick={() => setMapView('street')}
              aria-pressed={mapView === 'street'}
            >
              Street map
              <span className="sb-segmented__note">live</span>
            </button>
          </div>
        </div>

        {mapView === 'campus' ? (
          <>
            <PrototypeMap incidents={filtered} selectedId={selectedId} onSelect={onSelect} />
            <p className="sb-hint">
              Positions are approximate zones, not GPS fixes. Switch to the street map to see incidents at their
              reported coordinates.
            </p>
          </>
        ) : (
          <StreetMap
            incidents={filtered}
            selectedId={selectedId}
            onSelect={onSelect}
            onUnavailable={() => {
              setMapView('campus');
              setMapNote(
                'The street map could not load (no connection or the tile service is unreachable), so the offline campus map is shown instead.',
              );
            }}
          />
        )}
        {mapNote && <p className="sb-hint sb-hint--warn">{mapNote}</p>}
      </div>

      {/* ---------- verification + resources ---------- */}
      {selected && (
        <VerificationShield
          incident={selected}
          onSetVerification={(status) => onUpdateIncident(setVerification(selected, status))}
          onAddIndependentReport={() => onUpdateIncident(addIndependentReport(selected))}
        />
      )}

      <ResourceQueue incidents={incidents} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Incident detail panel                                               */
/* ------------------------------------------------------------------ */

function IncidentDetail({
  incident,
  onUpdateIncident,
  onClose,
}: {
  incident: Incident;
  onUpdateIncident: (incident: Incident) => void;
  onClose: () => void;
}) {
  const videoUrl = getSessionMedia(incident.incident_id, 'video');
  const audioUrl = getSessionMedia(incident.incident_id, 'audio');

  return (
    <div>
      <div className="sb-card__head">
        <div>
          <h2 className="sb-card__title" style={{ fontFamily: 'var(--mono)' }}>
            {incident.incident_id}
          </h2>
          <p className="sb-card__sub">
            {INCIDENT_TYPE_LABEL[incident.incident_type]} · logged {formatTime(incident.created_at)} (
            {formatRelative(incident.created_at)})
          </p>
        </div>
        <button type="button" className="sb-icon-btn" onClick={onClose} aria-label="Close incident detail">
          <Icon name="close" size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <UrgencyBadge urgency={incident.final_urgency} />
        <StatusBadge status={incident.lifecycle_status} />
        <VerificationBadge status={incident.verification_status} />
        {incident.is_demo && <DemoBadge />}
      </div>

      <div className="sb-detail__section">
        <div className="sb-callout__title">Reported text</div>
        <p style={{ fontSize: '0.9rem' }}>“{incident.raw_text}”</p>
      </div>

      <div className="sb-detail__section">
        <div className="sb-kv">
          <div className="sb-kv__item">
            <div className="sb-kv__key">Location</div>
            <div className="sb-kv__value">{incident.location.label}</div>
            <div className="sb-step__note">
              {LOCATION_SOURCE_LABEL[incident.location.source]}
              {incident.location.region ? ` · ${incident.location.region}` : ''}
            </div>
            {typeof incident.location.lat === 'number' && typeof incident.location.lng === 'number' && (
              <div className="sb-step__note" style={{ marginTop: 4 }}>
                {formatCoords(incident.location.lat, incident.location.lng)}
                {incident.is_demo ? ' (simulated)' : ''}
                <br />
                <a
                  href={googleMapsLink(incident.location.lat, incident.location.lng)}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Google Maps
                </a>
                {' · '}
                <a
                  href={openStreetMapLink(incident.location.lat, incident.location.lng)}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  OpenStreetMap
                </a>
              </div>
            )}
          </div>
          <div className="sb-kv__item">
            <div className="sb-kv__key">People affected</div>
            <div className={`sb-kv__value${incident.people_affected === null ? ' sb-kv__value--muted' : ''}`}>
              {incident.people_affected ?? 'Unknown'}
            </div>
          </div>
          <div className="sb-kv__item">
            <div className="sb-kv__key">Resource needed</div>
            <div className={`sb-kv__value${incident.resource_needed === 'none' ? ' sb-kv__value--muted' : ''}`}>
              {RESOURCE_LABEL[incident.resource_needed]}
            </div>
          </div>
          <div className="sb-kv__item">
            <div className="sb-kv__key">Priority path</div>
            <div className="sb-kv__value">
              {URGENCY_LABEL[incident.urgency_candidate]} → {URGENCY_LABEL[incident.final_urgency]}
            </div>
            <div className="sb-step__note">
              {incident.rule_override ? 'Rule override applied' : 'No override needed'}
            </div>
          </div>
        </div>
      </div>

      <div className="sb-detail__section">
        <div className="sb-callout__title">Hazards and signals</div>
        <div className="sb-tag-list" style={{ marginTop: 8 }}>
          {incident.critical_signals.map((signal) => (
            <span key={signal} className="sb-tag" style={{ color: 'var(--critical)' }}>
              <Icon name="alert" size={13} />
              {CRITICAL_SIGNAL_LABEL[signal]}
            </span>
          ))}
          {incident.risk_signals.map((signal) => (
            <span key={signal} className="sb-tag" style={{ color: 'var(--high)' }}>
              <Icon name="flag" size={13} />
              {RISK_SIGNAL_LABEL[signal]}
            </span>
          ))}
          {visibleHazards(incident).map((hazard) => (
            <span key={hazard} className="sb-tag">
              {HAZARD_LABEL[hazard]}
            </span>
          ))}
          {incident.critical_signals.length === 0 &&
            incident.risk_signals.length === 0 &&
            visibleHazards(incident).length === 0 && (
              <span className="sb-tag sb-kv__value--muted">No hazard detected in the report text</span>
            )}
        </div>
      </div>

      <div className="sb-detail__section">
        <div className="sb-callout__title">Evidence</div>
        <div className="sb-tag-list" style={{ margin: '8px 0' }}>
          {incident.evidence.text_report && <span className="sb-tag">Text report</span>}
          {incident.evidence.photo && <span className="sb-tag">Photo</span>}
          {incident.evidence.video && <span className="sb-tag">Video</span>}
          {incident.evidence.audio && <span className="sb-tag">Voice note</span>}
          {incident.evidence.voice && <span className="sb-tag">Dictated</span>}
        </div>

        {incident.evidence.photo && incident.evidence.photo_data_url && (
          <div className="sb-evidence" style={{ marginTop: 8 }}>
            <img
              className="sb-evidence__img"
              src={incident.evidence.photo_data_url}
              alt={`Evidence submitted with ${incident.incident_id}`}
            />
            <div className="sb-evidence__meta">
              <div className="sb-evidence__name">{incident.evidence.photo_name ?? 'Attached photo'}</div>
              <div>User-submitted evidence — not independently verified.</div>
            </div>
          </div>
        )}

        {incident.evidence.video && (
          <div className="sb-evidence sb-evidence--media" style={{ marginTop: 8 }}>
            {videoUrl ? (
              <video className="sb-evidence__video" src={videoUrl} controls preload="metadata" />
            ) : (
              <span className="sb-evidence__img" style={{ display: 'grid', placeItems: 'center' }}>
                <Icon name="camera" size={20} />
              </span>
            )}
            <div className="sb-evidence__meta">
              <div className="sb-evidence__name">{incident.evidence.video_name ?? 'Attached video'}</div>
              <div>
                {incident.evidence.video_size_kb
                  ? `${(incident.evidence.video_size_kb / 1024).toFixed(1)} MB · `
                  : ''}
                User-submitted evidence — not independently verified.
              </div>
              {!videoUrl && (
                <div className="sb-hint">
                  {incident.is_demo
                    ? 'Simulated demo evidence — no file exists for demo rows.'
                    : 'The clip was attached in an earlier session. Video is never uploaded and is too large to store, so only its details were kept.'}
                </div>
              )}
            </div>
          </div>
        )}

        {incident.evidence.audio && (
          <div className="sb-evidence sb-evidence--media" style={{ marginTop: 8 }}>
            <div className="sb-evidence__meta" style={{ flex: 1 }}>
              <div className="sb-evidence__name">{incident.evidence.audio_name ?? 'Voice note'}</div>
              {audioUrl ? (
                <audio className="sb-evidence__audio" src={audioUrl} controls preload="metadata" />
              ) : (
                <div className="sb-hint">
                  Recorded in an earlier session. Audio is never uploaded and is not stored, so only its
                  details were kept.
                </div>
              )}
              <div>
                {incident.evidence.audio_seconds ? `${incident.evidence.audio_seconds}s · ` : ''}
                User-submitted evidence — not independently verified.
              </div>
            </div>
          </div>
        )}

        {!incident.evidence.photo && !incident.evidence.video && !incident.evidence.audio && (
          <p className="sb-hint" style={{ marginTop: 6 }}>
            Text report only — no photo, video or voice note attached.
            {incident.evidence.voice ? ' The report was dictated with speech-to-text.' : ''}
          </p>
        )}
      </div>

      <div className="sb-detail__section">
        <div className="sb-callout sb-callout--why" style={{ marginTop: 0 }}>
          <div className="sb-callout__title">Why this priority?</div>
          <div className="sb-callout__body">{incident.reason}</div>
        </div>
        <div className={`sb-callout sb-callout--action is-${incident.final_urgency}`}>
          <div className="sb-callout__title">Suggested safe action</div>
          <div className="sb-callout__body">{incident.safe_action}</div>
        </div>
        <p className="sb-hint">Recommended coordination action: {ACTION_LABEL[incident.recommended_action]}.</p>
      </div>

      <div className="sb-detail__section">
        <label className="sb-label" htmlFor={`sb-status-${incident.incident_id}`}>
          Update status (local demo only)
        </label>
        <select
          id={`sb-status-${incident.incident_id}`}
          className="sb-select"
          value={incident.lifecycle_status}
          onChange={(event) => onUpdateIncident(setLifecycle(incident, event.target.value as LifecycleStatus))}
        >
          {LIFECYCLE_ORDER.map((status) => (
            <option key={status} value={status}>
              {LIFECYCLE_LABEL[status]}
            </option>
          ))}
        </select>
        <p className="sb-hint">
          Changing the status updates this device only. No message, dispatch or notification leaves the browser.
        </p>
      </div>

      <div className="sb-detail__section">
        <div className="sb-callout__title">Status lifecycle</div>
        <ul className="sb-timeline" style={{ marginTop: 10 }}>
          {incident.timeline.map((entry, index) => (
            <li className="sb-timeline__item" key={`${entry.at}-${index}`}>
              <div className="sb-timeline__label">{entry.label}</div>
              {entry.detail && <div className="sb-timeline__detail">{entry.detail}</div>}
              <div className="sb-timeline__time">
                {formatTime(entry.at)} · {entry.actor}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
