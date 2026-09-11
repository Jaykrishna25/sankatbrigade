import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Cinematic intro loader.
 *
 * Storyboard (≈3.6s, skippable, once per browser session):
 *   1 dark navy city night, rain, a distant red beacon
 *   2 a rescue worker waits at the top of the frame
 *   3 the ladder extends down
 *   4 the worker climbs down towards a stranded person
 *   5 contact — the person is reached
 *   6 both rise as the ladder retracts
 *   7 the rungs become glowing UI lines and stair-like shapes
 *   8 the shapes slide away to reveal the SankatBrigade interface
 *
 * Everything is CSS + inline SVG. If anything fails, the safety timer below
 * still calls onDone, so the user is never stuck behind the animation.
 */

const FULL_DURATION_MS = 3800;
const REDUCED_DURATION_MS = 950;

interface IntroLoaderProps {
  onDone: () => void;
}

/** Deterministic pseudo-random so the rain looks scattered but never re-renders differently. */
function seeded(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export default function IntroLoader({ onDone }: IntroLoaderProps) {
  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);
  const skipRef = useRef<HTMLButtonElement>(null);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      onDoneRef.current();
    };
    const timer = window.setTimeout(finish, reduced ? REDUCED_DURATION_MS : FULL_DURATION_MS);
    skipRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [reduced]);

  const skip = () => {
    setLeaving(true);
    window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      onDoneRef.current();
    }, 220);
  };

  const rain = useMemo(
    () =>
      Array.from({ length: 64 }, (_, index) => ({
        x: Math.round(seeded(index, 1) * 1200),
        delay: (seeded(index, 2) * 1.05).toFixed(2),
        length: 10 + Math.round(seeded(index, 3) * 16),
        opacity: 0.22 + seeded(index, 4) * 0.42,
      })),
    [],
  );

  const rungs = useMemo(() => [64, 116, 168, 220, 272, 324, 376, 428], []);

  /* Two layers of campus/city silhouette, generated once and never re-randomised. */
  const skyline = useMemo(() => {
    const back: { x: number; y: number; w: number; h: number; windows: { x: number; y: number; opacity: number }[] }[] =
      [];
    let x = -40;
    let index = 0;
    while (x < 1220) {
      const w = 58 + Math.round(seeded(index, 11) * 64);
      const h = 78 + Math.round(seeded(index, 12) * 76);
      const y = 640 - h - 44;
      const windows: { x: number; y: number; opacity: number }[] = [];
      const columns = Math.max(1, Math.floor(w / 26));
      for (let c = 0; c < columns; c += 1) {
        const rows = 1 + Math.floor(seeded(index * 7 + c, 13) * 3);
        for (let r = 0; r < rows; r += 1) {
          if (seeded(index * 13 + c * 3 + r, 14) < 0.45) continue;
          windows.push({
            x: x + 12 + c * 24,
            y: y + 16 + r * 20,
            opacity: 0.22 + seeded(index + c + r, 15) * 0.45,
          });
        }
      }
      back.push({ x, y, w, h: h + 44, windows });
      x += w + 12;
      index += 1;
    }

    const front: { x: number; y: number; w: number; h: number }[] = [];
    x = -60;
    index = 0;
    while (x < 1220) {
      const w = 74 + Math.round(seeded(index, 21) * 82);
      const h = 42 + Math.round(seeded(index, 22) * 52);
      front.push({ x, y: 640 - h, w, h });
      x += w + 16;
      index += 1;
    }
    return { back, front };
  }, []);

  if (reduced) {
    return (
      <div className="sb-intro sb-intro--reduced" role="status" aria-label="SankatBrigade is loading">
        <div className="sb-intro__still">
          <svg width="76" height="76" viewBox="0 0 512 512" aria-hidden="true">
            <path
              d="M256 54 L404 112 V264 c0 92 -62 152 -148 194 C170 416 108 356 108 264 V112 Z"
              fill="none"
              stroke="#6fa2ff"
              strokeWidth="26"
              strokeLinejoin="round"
            />
            <rect x="176" y="183" width="160" height="26" rx="13" fill="#e8eefc" />
            <rect x="176" y="243" width="160" height="26" rx="13" fill="#e8eefc" opacity="0.85" />
            <rect x="190" y="303" width="132" height="26" rx="13" fill="#ff5a5f" />
          </svg>
          <div className="sb-intro__wordmark" style={{ animation: 'none', opacity: 1 }}>
            SANKAT<span>BRIGADE</span>
          </div>
          <div className="sb-intro__tagline" style={{ animation: 'none', opacity: 1 }}>
            From emergency reports to coordinated action.
          </div>
        </div>
        <button type="button" className="sb-intro__skip" onClick={skip} ref={skipRef}>
          Skip intro
        </button>
      </div>
    );
  }

  return (
    <div
      className={`sb-intro${leaving ? ' is-leaving' : ''}`}
      role="status"
      aria-label="SankatBrigade intro animation. Press Escape to skip."
    >
      <svg
        className="sb-intro__stage sb-intro__scene"
        viewBox="0 0 1200 640"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sb-sky-2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0c1426" />
            <stop offset="0.55" stopColor="#0a1122" />
            <stop offset="1" stopColor="#060a14" />
          </linearGradient>
          <linearGradient id="sb-rail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9fc0ff" />
            <stop offset="1" stopColor="#4c74bd" />
          </linearGradient>
          <radialGradient id="sb-beacon-grad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ff5a5f" stopOpacity="0.85" />
            <stop offset="1" stopColor="#ff5a5f" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sb-city-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#16264a" />
            <stop offset="1" stopColor="#0c1730" />
          </linearGradient>
          <linearGradient id="sb-city-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1428" />
            <stop offset="1" stopColor="#070c18" />
          </linearGradient>
        </defs>

        {/* night sky */}
        <rect width="1200" height="640" fill="url(#sb-sky-2)" />

        {/* distant emergency beacon glow */}
        <circle cx="912" cy="486" r="190" fill="url(#sb-beacon-grad)" className="sb-beacon__glow" />

        {/* campus / city silhouette, two layers */}
        {skyline.back.map((building, index) => (
          <g key={`b-${index}`}>
            <rect
              x={building.x}
              y={building.y}
              width={building.w}
              height={building.h}
              fill="url(#sb-city-back)"
            />
            {building.windows.map((win, wi) => (
              <rect
                key={`bw-${index}-${wi}`}
                x={win.x}
                y={win.y}
                width="5"
                height="7"
                fill="#ffcf8a"
                opacity={win.opacity}
              />
            ))}
          </g>
        ))}
        {skyline.front.map((building, index) => (
          <rect
            key={`f-${index}`}
            x={building.x}
            y={building.y}
            width={building.w}
            height={building.h}
            fill="url(#sb-city-front)"
          />
        ))}

        {/* wet ground */}
        <rect x="0" y="598" width="1200" height="42" fill="#6fa2ff" opacity="0.05" />

        {/* rain */}
        <g className="sb-rain">
          {rain.map((drop, index) => (
            <line
              key={`r-${index}`}
              x1={drop.x}
              y1={-24}
              x2={drop.x - 7}
              y2={-24 + drop.length}
              style={{ animationDelay: `${drop.delay}s`, opacity: drop.opacity }}
            />
          ))}
        </g>

        {/* emergency beacon with sound-wave rings */}
        <g>
          <rect x="904" y="566" width="16" height="24" rx="3" fill="#1b2b4d" />
          <circle cx="912" cy="560" r="7" fill="#ff5a5f" />
          {[0, 1, 2].map((index) => (
            <circle
              key={`wave-${index}`}
              className="sb-wave"
              cx="912"
              cy="560"
              r="20"
              fill="none"
              stroke="#ff5a5f"
              strokeWidth="1.8"
            />
          ))}
        </g>

        {/* the ladder, extending from the top of the frame */}
        <g className="sb-ladder">
          <rect x="583" y="0" width="7" height="472" rx="3.5" fill="url(#sb-rail)" />
          <rect x="611" y="0" width="7" height="472" rx="3.5" fill="url(#sb-rail)" />
          {rungs.map((y) => (
            <rect key={`rung-${y}`} x="583" y={y} width="35" height="5" rx="2.5" fill="#cddffd" opacity="0.92" />
          ))}
        </g>

        {/* the rungs become glowing UI lines */}
        <g>
          {rungs.map((y, index) => (
            <rect
              key={`ui-${y}`}
              className="sb-uiline"
              x="90"
              y={y + 1}
              width="1020"
              height="3"
              rx="1.5"
              fill="#6fa2ff"
              style={{ animationDelay: `${(2.44 + index * 0.045).toFixed(2)}s` }}
            />
          ))}
        </g>

        {/* the stranded person */}
        <g transform="translate(596 474)">
          <g className="sb-person">
            <ellipse cx="0" cy="27" rx="27" ry="5" fill="#060a14" opacity="0.55" />
            <circle cx="0" cy="-16" r="8" fill="#f0d9c2" />
            <path
              d="M-9 -8 h18 a6 6 0 0 1 6 6 v14 a4 4 0 0 1 -4 4 h-22 a4 4 0 0 1 -4 -4 v-14 a6 6 0 0 1 6 -6 z"
              fill="#9fb6e4"
            />
            <path d="M-9 -4 q-9 -10 -4 -16" stroke="#9fb6e4" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M9 -4 q9 -10 4 -16" stroke="#9fb6e4" strokeWidth="4" strokeLinecap="round" fill="none" />
            <rect x="-8" y="14" width="6" height="13" rx="3" fill="#7f96c6" />
            <rect x="2" y="14" width="6" height="13" rx="3" fill="#7f96c6" />
          </g>
        </g>

        {/* the moment of contact */}
        <circle
          className="sb-rescue-ring"
          cx="598"
          cy="462"
          r="24"
          fill="none"
          stroke="#8fe3c0"
          strokeWidth="2.5"
        />

        {/* the rescue worker */}
        <g transform="translate(601 96)">
          <g className="sb-worker">
            <g className="sb-worker__sway">
              <rect className="sb-leg--a" x="-7" y="12" width="6" height="18" rx="3" fill="#2f4a80" />
              <rect className="sb-leg--b" x="1" y="12" width="6" height="18" rx="3" fill="#3a5894" />
              <rect x="-9" y="-10" width="18" height="24" rx="7" fill="#e4ecff" />
              <rect x="-9" y="-1" width="18" height="4" fill="#ff9f2e" opacity="0.9" />
              <rect x="-9" y="6" width="18" height="3" fill="#6fa2ff" opacity="0.85" />
              <path d="M-9 -6 q-9 2 -12 8" stroke="#e4ecff" strokeWidth="4.4" strokeLinecap="round" fill="none" />
              <path d="M9 -6 q9 2 12 8" stroke="#e4ecff" strokeWidth="4.4" strokeLinecap="round" fill="none" />
              <circle cx="0" cy="-17" r="7" fill="#f0d9c2" />
              <path d="M-10 -18 a10 10 0 0 1 20 0 z" fill="#ff5a5f" />
              <rect x="-12" y="-19" width="24" height="3.4" rx="1.7" fill="#ff8a3d" />
            </g>
          </g>
        </g>
      </svg>

      {/* glowing emergency grid wash */}
      <div className="sb-intro__gridwash" aria-hidden="true" />

      {/* stair-like shapes that slide away to reveal the app */}
      <div className="sb-intro__reveal" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={`bar-${index}`}
            className="sb-intro__bar"
            style={{ animationDelay: `${(2.98 + index * 0.055).toFixed(2)}s` }}
          />
        ))}
      </div>

      <div className="sb-intro__caption">
        <div className="sb-intro__wordmark">
          SANKAT<span>BRIGADE</span>
        </div>
        <div className="sb-intro__tagline">From emergency reports to coordinated action.</div>
      </div>

      <button type="button" className="sb-intro__skip" onClick={skip} ref={skipRef}>
        Skip intro
      </button>
    </div>
  );
}
