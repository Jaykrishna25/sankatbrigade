import type { Incident, MapZoneId, Urgency } from '../types/incident';
import { URGENCY_LABEL, ZONE_LABEL } from '../utils/labels';

/**
 * Prototype map.
 *
 * A hand-drawn SVG sketch of a campus with simulated markers. It is NOT a real
 * map, there is no GPS tracking and no responder is being followed. Markers are
 * placed by matching the reported location text to a zone.
 */

interface PrototypeMapProps {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (incidentId: string) => void;
}

const ZONE_POINT: Record<MapZoneId, { x: number; y: number }> = {
  'science-block': { x: 132, y: 116 },
  library: { x: 308, y: 100 },
  'admin-block': { x: 488, y: 114 },
  'hostel-a': { x: 674, y: 104 },
  'hostel-b': { x: 674, y: 234 },
  canteen: { x: 304, y: 224 },
  parking: { x: 480, y: 244 },
  'sports-ground': { x: 178, y: 330 },
  'main-gate': { x: 434, y: 408 },
  bridge: { x: 650, y: 366 },
  unmapped: { x: 748, y: 420 },
};

const URGENCY_COLOR: Record<Urgency, string> = {
  critical: '#ff4d5e',
  high: '#ffa53a',
  medium: '#52a5ff',
  low: '#93a5c7',
};

export default function PrototypeMap({ incidents, selectedId, onSelect }: PrototypeMapProps) {
  // Spread several incidents in one zone so markers never sit exactly on top.
  const perZone = new Map<MapZoneId, number>();
  const markers = incidents.map((incident) => {
    const zone = incident.location.zone ?? 'unmapped';
    const index = perZone.get(zone) ?? 0;
    perZone.set(zone, index + 1);
    const base = ZONE_POINT[zone] ?? ZONE_POINT.unmapped;
    const angle = index * 1.9;
    return {
      incident,
      x: base.x + (index === 0 ? 0 : Math.cos(angle) * 22),
      y: base.y + (index === 0 ? 0 : Math.sin(angle) * 18),
    };
  });

  return (
    <div>
      <div className="sb-map">
        <svg
          className="sb-map__svg"
          viewBox="0 0 800 460"
          role="img"
          aria-label="Prototype campus map with simulated incident markers"
        >
          <defs>
            <pattern id="sb-map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="rgba(126,160,222,0.12)" strokeWidth="1" />
            </pattern>
            <linearGradient id="sb-building" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(126,160,222,0.2)" />
              <stop offset="1" stopColor="rgba(126,160,222,0.08)" />
            </linearGradient>
          </defs>

          <rect width="800" height="460" fill="url(#sb-map-grid)" />

          {/* roads */}
          <g stroke="rgba(126,160,222,0.22)" strokeWidth="16" strokeLinecap="round" fill="none">
            <path d="M40 300 H760" />
            <path d="M434 300 V440" />
            <path d="M400 40 V300" />
          </g>
          <g stroke="rgba(126,160,222,0.35)" strokeWidth="1.4" strokeDasharray="10 12" fill="none">
            <path d="M40 300 H760" />
            <path d="M434 300 V440" />
            <path d="M400 40 V300" />
          </g>

          {/* buildings */}
          {(
            [
              { zone: 'science-block', x: 58, y: 62, w: 148, h: 108 },
              { zone: 'library', x: 248, y: 58, w: 120, h: 84 },
              { zone: 'admin-block', x: 420, y: 62, w: 136, h: 104 },
              { zone: 'hostel-a', x: 608, y: 58, w: 132, h: 92 },
              { zone: 'hostel-b', x: 608, y: 188, w: 132, h: 92 },
              { zone: 'canteen', x: 248, y: 188, w: 112, h: 72 },
              { zone: 'parking', x: 420, y: 208, w: 120, h: 72 },
            ] as { zone: MapZoneId; x: number; y: number; w: number; h: number }[]
          ).map((building) => (
            <g key={building.zone}>
              <rect
                x={building.x}
                y={building.y}
                width={building.w}
                height={building.h}
                rx="10"
                fill="url(#sb-building)"
                stroke="rgba(126,160,222,0.3)"
              />
              <text
                x={building.x + 10}
                y={building.y + 22}
                fill="var(--text-faint)"
                fontSize="12"
                fontWeight="600"
              >
                {ZONE_LABEL[building.zone]}
              </text>
            </g>
          ))}

          {/* sports ground */}
          <ellipse cx="178" cy="330" rx="112" ry="58" fill="rgba(53,200,143,0.1)" stroke="rgba(53,200,143,0.3)" />
          <text x="118" y="334" fill="var(--text-faint)" fontSize="12" fontWeight="600">
            Sports Ground
          </text>

          {/* gate + bridge */}
          <rect x="386" y="392" width="96" height="34" rx="8" fill="rgba(126,160,222,0.16)" stroke="rgba(126,160,222,0.3)" />
          <text x="396" y="414" fill="var(--text-faint)" fontSize="12" fontWeight="600">
            Main Gate
          </text>
          <rect x="566" y="350" width="176" height="32" rx="8" fill="rgba(126,160,222,0.12)" stroke="rgba(126,160,222,0.26)" />
          <text x="578" y="371" fill="var(--text-faint)" fontSize="12" fontWeight="600">
            Bridge / Approach Rd
          </text>

          {/* markers */}
          {markers.map(({ incident, x, y }) => {
            const colour = URGENCY_COLOR[incident.final_urgency];
            const selected = incident.incident_id === selectedId;
            return (
              <g
                key={incident.incident_id}
                className="sb-map__marker"
                onClick={() => onSelect(incident.incident_id)}
                role="button"
                tabIndex={0}
                aria-label={`${incident.incident_id}, ${URGENCY_LABEL[incident.final_urgency]}, ${incident.location.label}`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(incident.incident_id);
                  }
                }}
              >
                {incident.final_urgency === 'critical' && (
                  <circle className="sb-map__ping" cx={x} cy={y} r="6" fill="none" stroke={colour} strokeWidth="2" />
                )}
                <circle cx={x} cy={y} r={selected ? 11 : 8} fill={colour} opacity={0.28} />
                <circle cx={x} cy={y} r={selected ? 6.5 : 5} fill={colour} stroke="#0a1122" strokeWidth="1.4" />
                {selected && (
                  <text x={x + 12} y={y + 4} fill="var(--text)" fontSize="12" fontWeight="700">
                    {incident.incident_id}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <span className="sb-map__note">Prototype map — simulated locations, no GPS tracking</span>
      </div>

      <div className="sb-map__legend">
        <span>
          <i className="sb-map__swatch" style={{ background: URGENCY_COLOR.critical }} /> Critical
        </span>
        <span>
          <i className="sb-map__swatch" style={{ background: URGENCY_COLOR.high }} /> High
        </span>
        <span>
          <i className="sb-map__swatch" style={{ background: URGENCY_COLOR.medium }} /> Medium
        </span>
        <span>
          <i className="sb-map__swatch" style={{ background: URGENCY_COLOR.low }} /> Low
        </span>
        <span>Markers are placed by matching reported location text to a zone.</span>
      </div>
    </div>
  );
}
