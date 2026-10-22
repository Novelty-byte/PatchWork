/**
 * CategoryIllustration — animated SVG micro-illustrations per category.
 * Pure SVG + CSS (no canvas), honors prefers-reduced-motion via CSS.
 */
const STROKE = "currentColor";

function BrokenStreetlight() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="rp3-lamp-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#f2bc57" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f2bc57" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M24 6v22" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 6c8 0 12 4 12 10" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />
      <circle className="rp3-ill-flicker" cx="36" cy="19" r="9" fill="url(#rp3-lamp-glow)" />
      <path className="rp3-ill-flicker" d="M33 19h6M36 16v6" stroke="#f2bc57" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 42h12" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Pothole() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M8 30c2-8 8-12 16-12s14 4 16 12c-4 5-10 7-16 7s-12-2-16-7z"
        stroke={STROKE}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path className="rp3-ill-hatch" d="M14 26l4 4M22 24l4 5M30 26l3 4" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" />
      <path className="rp3-ill-warn" d="M24 8l4 7h-8z" fill="#f2bc57" stroke="#f2bc57" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

function Sewage() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle className="rp3-ill-ring" cx="24" cy="24" r="16" stroke={STROKE} strokeWidth="2" />
      <circle className="rp3-ill-ring rp3-ill-ring-2" cx="24" cy="24" r="10" stroke={STROKE} strokeWidth="2" />
      <circle className="rp3-ill-ring rp3-ill-ring-3" cx="24" cy="24" r="4.5" stroke={STROKE} strokeWidth="2" />
    </svg>
  );
}

function Flooding() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path className="rp3-ill-wave" d="M6 28c3-3 6-3 9 0s6 3 9 0 6-3 9 0 6 3 9 0" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round" />
      <path className="rp3-ill-wave rp3-ill-wave-2" d="M6 35c3-3 6-3 9 0s6 3 9 0 6-3 9 0 6 3 9 0" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      <path d="M18 20V10h3v10M27 20V10h3v10" stroke={STROKE} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function DamagedPark() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 40V22" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />
      <path className="rp3-ill-leaf" d="M24 24c-9 0-13-5-13-12 8 0 13 4 13 12z" fill="#84cc16" opacity="0.8" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <path className="rp3-ill-leaf rp3-ill-leaf-2" d="M24 20c7-2 10-6 10-12-7 1-10 5-10 12z" fill="#22c55e" opacity="0.6" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 40h20" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function DamagedBuilding() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="10" y="12" width="28" height="28" stroke={STROKE} strokeWidth="2.2" strokeLinejoin="round" />
      <path className="rp3-ill-grid" d="M10 20h28M10 28h28M18 12v28M26 12v28M34 12v28" stroke={STROKE} strokeWidth="1.4" />
      <path className="rp3-ill-crack" d="M20 12l3 6-4 5 5 4" stroke="#f2bc57" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Other() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="15" stroke={STROKE} strokeWidth="2.2" />
      <path d="M24 17v8" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="30" r="1.6" fill={STROKE} />
    </svg>
  );
}

const MAP = {
  "Broken Streetlight": BrokenStreetlight,
  Pothole: Pothole,
  Sewage: Sewage,
  Flooding: Flooding,
  "Damaged Park": DamagedPark,
  "Damaged Building": DamagedBuilding,
  Other: Other,
};

export default function CategoryIllustration({ category }) {
  const Cmp = MAP[category] || Other;
  return <Cmp />;
}
