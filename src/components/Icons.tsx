/**
 * Small original icon set drawn as inline SVG paths.
 * No icon library, no network request, works offline.
 */

export type IconName =
  | 'alert'
  | 'shield'
  | 'shield-check'
  | 'map'
  | 'radio'
  | 'camera'
  | 'mic'
  | 'pin'
  | 'send'
  | 'check'
  | 'chevron'
  | 'menu'
  | 'close'
  | 'sun'
  | 'moon'
  | 'bolt'
  | 'droplet'
  | 'food'
  | 'bus'
  | 'home'
  | 'wifi'
  | 'plug'
  | 'medical'
  | 'users'
  | 'clock'
  | 'filter'
  | 'refresh'
  | 'install'
  | 'info'
  | 'flag'
  | 'search'
  | 'list'
  | 'spark';

const PATHS: Record<IconName, string[]> = {
  alert: ['M12 3.2 21.4 20H2.6z', 'M12 9.5v4.6', 'M12 17.2v.01'],
  shield: ['M12 3.2 19.6 6v6.2c0 4.9-3.3 7.5-7.6 8.8-4.3-1.3-7.6-3.9-7.6-8.8V6z'],
  'shield-check': ['M12 3.2 19.6 6v6.2c0 4.9-3.3 7.5-7.6 8.8-4.3-1.3-7.6-3.9-7.6-8.8V6z', 'M8.6 12.2l2.4 2.4 4.4-4.6'],
  map: ['M9 4.2 3.4 6.3v13.5L9 17.7l6 2.1 5.6-2.1V4.2L15 6.3z', 'M9 4.2v13.5', 'M15 6.3v13.5'],
  radio: [
    'M12 10.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z',
    'M8.8 8.8a4.6 4.6 0 0 0 0 6.4',
    'M15.2 8.8a4.6 4.6 0 0 1 0 6.4',
    'M6.2 6.2a8.2 8.2 0 0 0 0 11.6',
    'M17.8 6.2a8.2 8.2 0 0 1 0 11.6',
  ],
  camera: ['M4 8.4h3.2l1.5-2.2h6.6l1.5 2.2H20v10.4H4z', 'M12 16.3a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2z'],
  mic: ['M12 3.2a2.8 2.8 0 0 1 2.8 2.8v5a2.8 2.8 0 1 1-5.6 0V6A2.8 2.8 0 0 1 12 3.2z', 'M5.4 11a6.6 6.6 0 0 0 13.2 0', 'M12 17.6v3.2'],
  pin: ['M12 21s6.8-6.4 6.8-10.8a6.8 6.8 0 1 0-13.6 0C5.2 14.6 12 21 12 21z', 'M12 12.6a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8z'],
  send: ['M21 3.6 3.4 10.8l7.1 2.9 2.9 7.1z', 'M21 3.6 10.5 13.7'],
  check: ['M4.4 12.6 9.6 18 19.8 6.4'],
  chevron: ['M9.4 5.4 16 12l-6.6 6.6'],
  menu: ['M3.6 7h16.8', 'M3.6 12h16.8', 'M3.6 17h16.8'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  sun: [
    'M12 16.6a4.6 4.6 0 1 0 0-9.2 4.6 4.6 0 0 0 0 9.2z',
    'M12 2.6v2.2',
    'M12 19.2v2.2',
    'M2.6 12h2.2',
    'M19.2 12h2.2',
    'M5.4 5.4 7 7',
    'M17 17l1.6 1.6',
    'M18.6 5.4 17 7',
    'M7 17l-1.6 1.6',
  ],
  moon: ['M20 14.4A8.4 8.4 0 0 1 9.6 4 8.4 8.4 0 1 0 20 14.4z'],
  bolt: ['M13.4 2.6 5.6 13.4h5.4l-1 8 8.4-11.6h-5.6z'],
  droplet: ['M12 3.2s6.4 6.6 6.4 10.4a6.4 6.4 0 1 1-12.8 0C5.6 9.8 12 3.2 12 3.2z'],
  food: ['M4.2 12.2h15.6a7.8 7.8 0 0 1-15.6 0z', 'M9 5.2v3', 'M12 4.2v4', 'M15 5.2v3', 'M3.4 20.4h17.2'],
  bus: ['M5 5.2h14v10.6H5z', 'M5 10.4h14', 'M8 19.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z', 'M16 19.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z'],
  home: ['M4 11 12 4.2 20 11v9.4H4z', 'M9.6 20.4v-5.6h4.8v5.6'],
  wifi: ['M4 9.6a12 12 0 0 1 16 0', 'M7 13a7.6 7.6 0 0 1 10 0', 'M10 16.4a3.2 3.2 0 0 1 4 0', 'M12 19.6v.01'],
  plug: ['M9 3.4v5.2', 'M15 3.4v5.2', 'M6.2 8.6h11.6v3.2a5.8 5.8 0 0 1-11.6 0z', 'M12 17.6v3.2'],
  medical: ['M10 3.6h4v6.4h6.4v4H14v6.4h-4V14H3.6v-4H10z'],
  users: [
    'M9 11.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8z',
    'M2.8 20.4c0-3.4 2.8-6 6.2-6s6.2 2.6 6.2 6',
    'M16.4 5.2a3.4 3.4 0 0 1 0 6.6',
    'M17.6 14.8c2.2.7 3.6 2.7 3.6 5.6',
  ],
  clock: ['M12 20.8a8.8 8.8 0 1 0 0-17.6 8.8 8.8 0 0 0 0 17.6z', 'M12 7.2V12l3.2 2'],
  filter: ['M3.4 5.2h17.2l-6.6 7.6v6.2l-4 1.8v-8z'],
  refresh: ['M20 12a8 8 0 1 1-2.6-5.9', 'M20.4 3.6v4.8h-4.8'],
  install: ['M12 3.4v11.4', 'M7.2 10.6 12 15.4l4.8-4.8', 'M4 20.4h16'],
  info: ['M12 20.8a8.8 8.8 0 1 0 0-17.6 8.8 8.8 0 0 0 0 17.6z', 'M12 11v5.4', 'M12 7.8v.01'],
  flag: ['M6 3.2v17.6', 'M6 4.4h11.6l-2.6 4 2.6 4H6z'],
  search: ['M11 18.4a7.4 7.4 0 1 0 0-14.8 7.4 7.4 0 0 0 0 14.8z', 'M16.6 16.6 21 21'],
  list: ['M4 6.4h16', 'M4 12h16', 'M4 17.6h10'],
  spark: ['M12 3.2l1.9 5.1 5.1 1.9-5.1 1.9L12 17.2l-1.9-5.1L5 10.2l5.1-1.9z'],
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export default function Icon({ name, size = 18, className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name].map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}

/** The SankatBrigade mark, used in the header and the footer. */
export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sb-brand-grad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#7fb0ff" />
          <stop offset="1" stopColor="#3b6fd4" />
        </linearGradient>
      </defs>
      <path
        d="M256 54 L404 112 V264 c0 92 -62 152 -148 194 C170 416 108 356 108 264 V112 Z"
        fill="none"
        stroke="url(#sb-brand-grad)"
        strokeWidth="26"
        strokeLinejoin="round"
      />
      <rect x="176" y="183" width="160" height="26" rx="13" fill="currentColor" />
      <rect x="176" y="243" width="160" height="26" rx="13" fill="currentColor" opacity="0.72" />
      <rect x="190" y="303" width="132" height="26" rx="13" fill="#ff5a5f" />
    </svg>
  );
}
