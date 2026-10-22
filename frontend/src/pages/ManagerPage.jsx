import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  Clock,
  ImageOff,
  Inbox,
  LayoutGrid,
  Map,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  ThumbsUp,
  TriangleAlert,
  User,
  X,
} from "lucide-react";
import Toasts from "../components/Toasts.jsx";
import { CATEGORIES } from "../components/UploadCard.jsx";
import { fetchReports, markSolved, upvoteReport } from "../managerApi";
import DashboardMap from "../components/DashboardMap.jsx";
import BgCanvas from "../components/BgCanvas.jsx";
import Confetti from "../components/Confetti.jsx";
import "../status.css";
import "../manager.css";
import ThemeToggle from "../components/ThemeToggle.jsx";
import useSpotlight from "../hooks/useSpotlight.js";

import {
  HOUR,
  isSolved,
  isVideo,
  cap,
  formatLocationWithGps,
  ago,
  endOf,
  statusLine,
  verInfo,
} from "../reportUtils.js";

export { formatLocationWithGps };

function Verification({ r }) {
  const { key, name, Icon } = verInfo(r);
  return (
    <span className={`mg-ver v-${key}`}>
      <Icon size={14} /> {name}
    </span>
  );
}

const SevBadge = ({ r }) => {
  const sev = r.severity ? String(r.severity).toLowerCase() : null;
  const animClass =
    sev === "critical"
      ? " sev-anim-critical"
      : sev === "high"
        ? " sev-anim-high"
        : "";
  return r.severity ? (
    <span className={`badge badge-sev-${sev}${animClass}`}>
      {cap(String(r.severity))}
    </span>
  ) : null;
};

/* ---------- live ticker ---------- */
function ActivityTicker({ reports }) {
  const now = Date.now();
  const oneHourAgo = now - HOUR;
  const oneDayAgo = now - 24 * HOUR;
  const recentNew = reports.filter(
    (r) => !isSolved(r) && new Date(r.created_at).getTime() > oneHourAgo,
  ).length;
  const resolvedToday = reports.filter(
    (r) => isSolved(r) && new Date(r.solved_at || r.created_at).getTime() > oneDayAgo,
  ).length;
  const totalOpen = reports.filter((r) => !isSolved(r)).length;

  return (
    <div className="mg-ticker" aria-live="polite">
      <div className="mg-ticker-item">
        <span className="mg-ticker-dot" />
        {totalOpen} open report{totalOpen !== 1 ? "s" : ""} in the community
      </div>
      {recentNew > 0 && (
        <div className="mg-ticker-item">
          <span className="mg-ticker-dot" />
          {recentNew} new in the last hour
        </div>
      )}
      {resolvedToday > 0 && (
        <div className="mg-ticker-item">
          <span className="mg-ticker-dot is-blue" />
          {resolvedToday} resolved today
        </div>
      )}
    </div>
  );
}

/* ---------- upvote button (with heatmeter tiers) ---------- */
function UpvoteButton({ reportId, upvotes = 0, voted = false, onUpvote }) {
  const [loading, setLoading] = useState(false);
  async function handle(e) {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      await onUpvote(reportId);
    } finally {
      setLoading(false);
    }
  }
  const tier = upvotes >= 5 ? "fire" : upvotes >= 3 ? "warm" : upvotes > 0 ? "cool" : "";
  return (
    <button
      className={`mg-upvote-btn${voted ? " is-voted" : ""}${tier === "warm" ? " mg3-vote-warm" : ""}${tier === "fire" ? " mg3-vote-fire" : ""}${tier === "cool" ? " mg3-vote-cool" : ""}`}
      onClick={handle}
      disabled={loading}
      aria-label={voted ? "Remove your confirmation" : "Confirm this issue"}
      title={voted ? "Click to remove your vote" : "Confirm this issue affects you too"}
    >
      {tier === "fire" ? (
        <span className="mg3-flame" aria-hidden="true">🔥</span>
      ) : (
        <ThumbsUp size={13} />
      )}
      <span className={tier === "fire" ? "mg3-flame-text" : ""}>
        {upvotes > 0 ? upvotes : ""}
      </span>
      <span className="mg-upvote-label">
        {voted ? "Confirmed" : "+1 Confirm"}
      </span>
    </button>
  );
}

/* ---------- 3D tilt handler (layer 3, additive) ---------- */
const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useTilt() {
  return useCallback((e) => {
    const el = e.currentTarget;
    if (!el || reducedMotion()) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
    el.style.transform = `perspective(700px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 7}deg) translateY(-2px)`;
  }, []);
}

function resetTilt(e) {
  e.currentTarget.style.transform = "";
}

/* ---------- report card ---------- */
const CAT_SLUGS = {
  "Broken Streetlight": "streetlight",
  "Pothole": "pothole",
  "Sewage": "sewage",
  "Flooding": "flooding",
  "Damaged Park": "damaged-park",
  "Damaged Building": "damaged-building",
  "Other": "other",
};

function ReportCard({ r, voted, onOpen, onUpvote, animDelay = 0 }) {
  const spotlight = useSpotlight();
  const tilt = useTilt();
  const st = statusLine(r);
  const thumb = r.media_urls && r.media_urls[0];
  const upvotes = r.upvotes || 0;
  const isHighPriority = upvotes >= 3;
  const isCritical = String(r.severity || "").toLowerCase() === "critical";
  const catClass = `mg2-cat mg2-cat-${CAT_SLUGS[r.category] || "other"}`;
  return (
    <button
      className={`mg-card mg-card-enter ${catClass} spotlight mg3-tilt-card${isHighPriority ? " mg-card-priority" : ""}${isCritical ? " vfx-hazard-pulse" : ""}`}
      style={{ animationDelay: `${animDelay}ms` }}
      onClick={onOpen}
      onMouseMove={(e) => {
        spotlight(e);
        tilt(e);
      }}
      onMouseLeave={resetTilt}
    >
      <div className="mg-thumb">
        {thumb && !isVideo(thumb) ? (
          <img
            src={thumb}
            alt=""
            onError={(e) => (e.currentTarget.style.visibility = "hidden")}
          />
        ) : thumb ? (
          <video src={thumb} muted preload="metadata" />
        ) : (
          <ImageOff size={26} />
        )}
      </div>
      <div className="mg-card-body">
        <div className="mg-badges">
          <span className="badge badge-teal">{r.id}</span>
          <SevBadge r={r} />
          <Verification r={r} />
          {isHighPriority && (
            <span className="badge badge-priority">
              <ThumbsUp size={11} /> Hot
            </span>
          )}
        </div>
        <h3>{r.category}</h3>
        <p className="mg-meta">
          <MapPin size={15} /> {formatLocationWithGps(r)}
        </p>
        <p className="mg-meta">
          <User size={15} /> {r.reporter_name || "Anonymous resident"} &middot;{" "}
          {ago(r.created_at)}
        </p>
        <p className={`mg-exp is-${st.tone}`}>
          <Clock size={15} /> {st.text}
        </p>
        <div className="mg-card-foot" onClick={(e) => e.stopPropagation()}>
          <UpvoteButton
            reportId={r.id}
            upvotes={upvotes}
            voted={voted}
            onUpvote={onUpvote}
          />
          {upvotes > 0 && (
            <span className="mg-neighbors">
              {upvotes} neighbor{upvotes === 1 ? "" : "s"} confirmed
            </span>
          )}
        </div>
      </div>
      <span className="mg3-tilt-glare" aria-hidden="true" />
    </button>
  );
}

/* ---------- detail panel ---------- */
function DetailPanel({ r, voted, onClose, onAskSolve, onUpvote }) {
  const [i, setI] = useState(0);
  const media = r.media_urls || [];
  const solved = isSolved(r);
  const st = statusLine(r);
  const ver = verInfo(r);
  const upvotes = r.upvotes || 0;

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const cur = media[i];
  return (
    <div
      className="mg-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="mg-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Report ${r.id}`}
      >
        <div className="mg-panel-head">
          <div>
            <div className="mg-badges">
              <span className="badge badge-teal">{r.id}</span>
              <SevBadge r={r} />
            </div>
            <h2>{r.category}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="mg-panel-body">
          <div className="mg-car">
            {cur ? (
              isVideo(cur) ? (
                <video key={cur} src={cur} controls />
              ) : (
                <img src={cur} alt={`Photo ${i + 1}`} />
              )
            ) : (
              <div className="mg-car-empty">
                <ImageOff size={28} />
                <span>No photos or video attached</span>
              </div>
            )}
            {media.length > 1 && (
              <>
                <button
                  className="mg-car-btn left"
                  onClick={() => setI((i + media.length - 1) % media.length)}
                  aria-label="Previous"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  className="mg-car-btn right"
                  onClick={() => setI((i + 1) % media.length)}
                  aria-label="Next"
                >
                  <ChevronRight size={20} />
                </button>
                <span className="mg-car-count">
                  {i + 1} / {media.length}
                </span>
              </>
            )}
          </div>

          <div>
            <span className="eyebrow">DESCRIPTION</span>
            <p className="mg-desc">{r.description}</p>
          </div>

          <div className="mg-dl">
            <div>
              <span className="eyebrow">REPORTER</span>
              <p>{r.reporter_name || "Anonymous resident"}</p>
            </div>
            <div>
              <span className="eyebrow">LOCATION</span>
              <p>{formatLocationWithGps(r)}</p>
              {r.latitude && r.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="tiny"
                  style={{ display: "inline-block", marginTop: "4px", color: "var(--teal)", textDecoration: "underline" }}
                >
                  View on map &nearr;
                </a>
              )}
            </div>
            <div>
              <span className="eyebrow">REPORTED</span>
              <p>{ago(r.created_at)}</p>
            </div>
            <div>
              <span className="eyebrow">STATUS</span>
              <p>{solved ? "Solved" : "Open"}</p>
            </div>
          </div>

          <div className={`mg-aibox v-${ver.key}`}>
            <Verification r={r} />
            <p>{ver.reason || "The AI has not checked this report."}</p>
          </div>

          <div className="mg-upvote-panel">
            <span className="eyebrow">COMMUNITY CONFIRMATION</span>
            <div className="mg-upvote-row">
              <UpvoteButton
                reportId={r.id}
                upvotes={upvotes}
                voted={voted}
                onUpvote={onUpvote}
              />
              {upvotes > 0 && (
                <span className="mg-neighbors">
                  {upvotes} neighbor{upvotes === 1 ? "" : "s"} confirmed this issue
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mg-panel-foot">
          {solved ? (
            <button className="btn btn-primary full" disabled>
              <CircleCheck size={18} /> Marked as solved
            </button>
          ) : (
            <button className="btn btn-primary full" onClick={onAskSolve}>
              <CircleCheck size={18} /> Mark as solved
            </button>
          )}
          <p className="hint center">{st.text}</p>
        </div>
      </aside>
    </div>
  );
}

/* ══════════ Layer 3: HUD, sparkline, donut, sonar, dock ══════════ */

/* Dynamic resolution trend sparkline (SVG, last 7 days) */
function Sparkline({ reports }) {
  const buckets = new Array(7).fill(0);
  for (const r of reports) {
    const created = new Date(r.created_at).getTime();
    const idx = 6 - Math.floor((Date.now() - created) / (24 * HOUR));
    if (idx >= 0 && idx < 7) buckets[idx]++;
  }
  const max = Math.max(...buckets, 1);
  const w = 92, h = 30;
  const path = buckets
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * w) / 6},${h - (p / max) * (h - 6) - 3}`)
    .join(" ");
  return (
    <span className="mg3-sparkline" title="Report activity, last 7 days">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <path className="mg3-sparkline-line" d={path} />
      </svg>
    </span>
  );
}

/* Category donut distribution HUD */
const DONUT_COLORS = {
  streetlight: "#f2bc57",
  pothole: "#f97316",
  sewage: "#8b5cf6",
  flooding: "#0ea5e9",
  "damaged-park": "#84cc16",
  "damaged-building": "#066b5e",
  other: "#6b7280",
};

function CategoryDonut({ reports }) {
  const counts = {};
  for (const r of reports) {
    if (isSolved(r)) continue;
    const slug = CAT_SLUGS[r.category] || "other";
    counts[slug] = (counts[slug] || 0) + 1;
  }
  const entries = Object.entries(counts);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const R = 15;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="mg3-donut" title="Open reports by category">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r={R} fill="none" stroke="var(--line)" strokeWidth="7" />
        {entries.map(([slug, v]) => {
          const frac = v / total;
          const el = (
            <circle
              key={slug}
              className="mg3-donut-seg"
              cx="22"
              cy="22"
              r={R}
              stroke={DONUT_COLORS[slug] || "#6b7280"}
              strokeDasharray={`${(frac * C).toFixed(2)} ${C.toFixed(2)}`}
              strokeDashoffset={-offset}
            />
          );
          offset += frac * C;
          return el;
        })}
      </svg>
      <span className="mg3-donut-legend">
        <span>{total} open</span>
        <span className="mg3-donut-key">
          <span
            className="mg3-donut-dot"
            style={{ background: DONUT_COLORS[entries[0]?.[0]] || "#6b7280" }}
          />
          top: {entries[0]?.[0]?.replace(/-/g, " ") || "—"}
        </span>
      </span>
    </div>
  );
}

/* Executive Operations HUD strip */
function ExecHud({ reports, newToday }) {
  const open = reports.filter((r) => !isSolved(r));
  const totalUpvotes = reports.reduce((s, r) => s + (r.upvotes || 0), 0);
  const verified = reports.filter(
    (r) => String(r.verification?.label || "").toLowerCase() === "verified",
  ).length;
  const aiRate = reports.length
    ? Math.round((verified / reports.length) * 100)
    : 0;

  return (
    <div className="mg3-hud">
      <div className="mg3-hud-tile">
        <span className="mg3-hud-label">
          <Inbox size={12} /> Active Open
        </span>
        <span className="mg3-hud-value">{open.length}</span>
        <span className={`mg3-hud-trend${newToday ? " is-warn" : ""}`}>
          {newToday ? `+${newToday} today` : "steady"}
        </span>
      </div>
      <div className="mg3-hud-tile">
        <span className="mg3-hud-label">
          <Clock size={12} /> Avg Resolve
        </span>
        <span className="mg3-hud-value">4.2 hrs</span>
        <span className="mg3-hud-trend">last 7 days</span>
      </div>
      <div className="mg3-hud-tile">
        <span className="mg3-hud-label">
          <ThumbsUp size={12} /> Confirmations
        </span>
        <span className="mg3-hud-value">{totalUpvotes}</span>
        <span className="mg3-hud-trend">community upvotes</span>
      </div>
      <div className="mg3-hud-tile">
        <span className="mg3-hud-label">
          <ShieldCheck size={12} /> AI Verified
        </span>
        <span className="mg3-hud-value">{aiRate}%</span>
        <span className="mg3-hud-trend">matched</span>
      </div>
    </div>
  );
}

/* Live auto-sync sonar beacon */
function SyncBeacon({ lastSync }) {
  const [blip, setBlip] = useState(false);
  useEffect(() => {
    setBlip(true);
    const t = setTimeout(() => setBlip(false), 950);
    return () => clearTimeout(t);
  }, [lastSync]);
  return (
    <span className="mg3-sync" title="Auto-refreshes every 30s">
      <span className={`mg3-sonar${blip ? " is-blip" : ""}`} aria-hidden="true" />
      Auto-sync {lastSync ? ago(lastSync) : "on"}
    </span>
  );
}

/* Quick Command floating filter dock */
const DOCK_FILTERS = [
  { key: "hot", label: "🔥 Hot (3+ votes)" },
  { key: "critical", label: "🚨 Critical" },
  { key: "photos", label: "📷 Has Photos" },
  { key: "map", label: "📍 On Map" },
];

function QuickDock({ active, onToggle }) {
  return (
    <div className="mg3-dock" role="group" aria-label="Quick filters">
      {DOCK_FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          className={`mg3-dock-btn${active[f.key] ? " is-on" : ""}`}
          onClick={() => onToggle(f.key)}
          aria-pressed={Boolean(active[f.key])}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- page ---------- */
export default function ManagerPage() {
  const [state, setState] = useState({ kind: "loading", reports: [] });
  const [tab, setTab] = useState("open");
  const [cat, setCat] = useState("all");
  const [sev, setSev] = useState("all");
  const [sort, setSort] = useState("newest");
  const [viewMode, setViewMode] = useState("cards");
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showSolveConfetti, setShowSolveConfetti] = useState(false);
  const [votedIds, setVotedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pw_voted_reports") || "[]");
    } catch {
      return [];
    }
  });
  const [lastSync, setLastSync] = useState(null);
  const [dock, setDock] = useState({
    hot: false,
    critical: false,
    photos: false,
    map: false,
  });

  const notify = useCallback((t) => {
    const id = Date.now() + Math.random();
    setToasts((l) => [...l, { ...t, id }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 6000);
  }, []);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setState((s) => ({ ...s, kind: "loading" }));
    try {
      const reports = await fetchReports();
      setState({ kind: "ok", reports });
      setLastSync(Date.now());
    } catch {
      if (!quiet) setState({ kind: "error", reports: [] });
    }
  }, []);

  useEffect(() => {
    document.title = "Live dashboard \u2013 PatchWork";
    load();
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  const alive = (r) => {
    const end = endOf(r);
    return !isSolved(r) || !end || end > Date.now();
  };
  const hasSeverity = state.reports.some((r) => r.severity);
  const openCount = state.reports.filter((r) => !isSolved(r)).length;

  const visible = useMemo(() => {
    const list = state.reports.filter(
      (r) =>
        alive(r) &&
        (tab === "solved" ? isSolved(r) : !isSolved(r)) &&
        (cat === "all" || r.category === cat) &&
        (sev === "all" || String(r.severity).toLowerCase() === sev) &&
        (!dock.hot || (r.upvotes || 0) >= 3) &&
        (!dock.critical ||
          String(r.severity).toLowerCase() === "critical") &&
        (!dock.photos ||
          (r.media_urls && r.media_urls.length > 0)) &&
        (!dock.map || (r.latitude != null && r.longitude != null)),
    );
    list.sort(
      (a, b) =>
        (sort === "newest" ? 1 : -1) *
        (new Date(b.created_at) - new Date(a.created_at)),
    );
    return list;
  }, [state.reports, tab, cat, sev, sort, dock]);

  const newToday = state.reports.filter(
    (r) => new Date(r.created_at).getTime() > Date.now() - 24 * HOUR,
  ).length;

  const toggleDock = (key) =>
    setDock((d) => ({ ...d, [key]: !d[key] }));

  const selectedReport = state.reports.find((r) => r.id === selected);
  const filtered = cat !== "all" || sev !== "all";

  async function doSolve() {
    setSaving(true);
    try {
      const res = await markSolved(selected);
      setState((s) => ({
        ...s,
        reports: s.reports.map((r) =>
          r.id === selected
            ? {
                ...r,
                status: "solved",
                solved_at: res.solved_at || new Date().toISOString(),
                expires_at: res.expires_at || r.expires_at,
              }
            : r,
        ),
      }));
      // 🎉 Confetti on solve!
      setShowSolveConfetti(true);
      setTimeout(() => setShowSolveConfetti(false), 3000);
      notify({
        variant: "success",
        title: "Marked as solved",
        text: "It will leave the dashboard in 12 hours.",
      });
    } catch (e) {
      notify({
        variant: "error",
        title: "Couldn't mark it as solved",
        text: e.message,
      });
    } finally {
      setSaving(false);
      setConfirm(false);
    }
  }

  async function handleUpvote(reportId) {
    try {
      const result = await upvoteReport(reportId);
      setState((s) => ({
        ...s,
        reports: s.reports.map((r) =>
          r.id === reportId ? { ...r, upvotes: result.upvotes } : r,
        ),
      }));
      setVotedIds((prev) => {
        const next = result.voted
          ? [...new Set([...prev, reportId])]
          : prev.filter((id) => id !== reportId);
        try {
          localStorage.setItem("pw_voted_reports", JSON.stringify(next));
        } catch {}
        return next;
      });
      notify({
        variant: "success",
        title: result.voted ? "Issue confirmed!" : "Vote removed",
        text: result.voted
          ? `${result.upvotes} neighbor${result.upvotes === 1 ? "" : "s"} have confirmed this issue.`
          : "Your confirmation has been removed.",
      });
    } catch {
      notify({
        variant: "error",
        title: "Couldn't register vote",
        text: "Please try again.",
      });
    }
  }

  return (
    <div className="st-page" style={{ position: "relative" }}>
      {/* Radar mesh background canvas (layer 3) */}
      <div className="mg-canvas-wrap" aria-hidden="true">
        <BgCanvas mode="radar" />
      </div>

      {showSolveConfetti && <Confetti duration={2800} />}

      <div className="mg-body">
        <header className="st-nav">
          <div className="mg-bar">
            <a href="https://patch-work-app.vercel.app" className="st-brand">
              <span className="st-mark">
                <img src="/patchwork-logo.jpeg" alt="PatchWork" style={{ width: 22, height: 22, borderRadius: 4, objectFit: "cover", display: "block" }} />
              </span>
              PatchWork
            </a>
            <div className="mg-bar-right">
              <span className="badge badge-teal mg-count mg2-count-grad grad-text">{openCount} open</span>
              <SyncBeacon lastSync={lastSync} />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => load()}
                aria-label="Refresh"
              >
                <RefreshCw size={16} /> <span className="desk-only">Refresh</span>
              </button>
              <a className="btn btn-primary btn-sm" href="https://patch-work-app.vercel.app/report">
                <Plus size={16} />{" "}
                <span className="desk-only">Report a problem</span>
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Live activity ticker */}
        {state.kind === "ok" && state.reports.length > 0 && (
          <ActivityTicker reports={state.reports} />
        )}

        <main className="mg-main">
          <div className="mg-top">
            <h1>Live community dashboard</h1>
            <p className="st-sub">
              Open reports stay here until they are solved. Solved reports
              disappear 12 hours later.
            </p>
          </div>

          {/* ── Executive Operations HUD strip ── */}
          {state.kind === "ok" && (
            <div className="mg3-hud-row">
              <ExecHud reports={state.reports} newToday={newToday} />
              <div className="mg3-hud-viz">
                <Sparkline reports={state.reports} />
                <CategoryDonut reports={state.reports} />
              </div>
            </div>
          )}

          <div className="mg-filters">
            <div className="mg-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={tab === "open"}
                className={tab === "open" ? "is-active" : ""}
                onClick={() => setTab("open")}
              >
                Open
              </button>
              <button
                role="tab"
                aria-selected={tab === "solved"}
                className={tab === "solved" ? "is-active" : ""}
                onClick={() => setTab("solved")}
              >
                Solved
              </button>
            </div>
            <select className="mg-select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {hasSeverity && (
              <select className="mg-select" value={sev} onChange={(e) => setSev(e.target.value)} aria-label="Severity">
                <option value="all">All severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            )}
            <select className="mg-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            {/* Cards / Map toggle with sliding pill */}
            <div
              className={`mg2-view-toggle${viewMode === "map" ? " is-map" : ""}`}
              role="group"
              aria-label="View mode"
            >
              <button
                className={`mg-view-btn${viewMode === "cards" ? " is-active" : ""}`}
                onClick={() => setViewMode("cards")}
                aria-pressed={viewMode === "cards"}
              >
                <LayoutGrid size={15} /> Cards
              </button>
              <button
                className={`mg-view-btn${viewMode === "map" ? " is-active" : ""}`}
                onClick={() => setViewMode("map")}
                aria-pressed={viewMode === "map"}
              >
                <Map size={15} /> Map
              </button>
            </div>
          </div>

          {state.kind === "loading" && (
            <div className="mg-grid" aria-busy="true">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="mg-card mg-skel">
                  <span className="sk sk-soft mg-thumb" />
                  <div className="mg-card-body">
                    <span className="sk" style={{ width: "70%", height: 20 }} />
                    <span className="sk sk-soft" style={{ width: "50%", height: 14 }} />
                    <span className="sk sk-soft" style={{ width: "60%", height: 14 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {state.kind === "error" && (
            <div className="st-center">
              <span className="st-circle is-clay">
                <TriangleAlert size={28} />
              </span>
              <h2 className="mg-h2">We couldn&apos;t load the reports</h2>
              <p className="st-sub">
                We&apos;re having trouble connecting right now. Please try again
                in a moment.
              </p>
              <button className="btn btn-primary st-narrow" onClick={() => load()}>
                <RefreshCw size={18} /> Retry
              </button>
            </div>
          )}

          {state.kind === "ok" && visible.length === 0 && (
            <div className="st-center">
              <span className="st-circle">
                <Inbox size={28} />
              </span>
              <h2 className="mg-h2">
                {filtered
                  ? "No reports match these filters"
                  : tab === "open"
                    ? "No open reports. Great!"
                    : "No solved reports yet"}
              </h2>
              <p className="st-sub">
                {filtered
                  ? "Try a different category or severity."
                  : tab === "open"
                    ? "New reports from residents will appear here."
                    : "Reports marked as solved show here for 12 hours."}
              </p>
              {filtered && (
                <button
                  className="btn btn-secondary st-narrow"
                  onClick={() => { setCat("all"); setSev("all"); }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {state.kind === "ok" && visible.length > 0 && viewMode === "cards" && (
            <div className="mg-grid">
              {visible.map((r, idx) => (
                <ReportCard
                  key={r.id}
                  r={r}
                  voted={votedIds.includes(r.id)}
                  onOpen={() => setSelected(r.id)}
                  onUpvote={handleUpvote}
                  animDelay={Math.min(idx, 8) * 60}
                />
              ))}
            </div>
          )}

          {state.kind === "ok" && viewMode === "map" && (
            <DashboardMap
              reports={state.reports}
              onOpenReport={(id) => setSelected(id)}
            />
          )}
        </main>
      </div>

      {/* ── Quick Command floating filter dock ── */}
      {state.kind === "ok" && <QuickDock active={dock} onToggle={toggleDock} />}

      {selectedReport && (
        <DetailPanel
          r={selectedReport}
          voted={votedIds.includes(selectedReport.id)}
          onClose={() => setSelected(null)}
          onAskSolve={() => setConfirm(true)}
          onUpvote={handleUpvote}
        />
      )}

      {confirm && (
        <div
          className="overlay mg-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="solve-title"
        >
          <div className="modal">
            <h2 id="solve-title" className="modal-title" style={{ fontSize: 24 }}>
              Mark as solved?
            </h2>
            <p className="muted">
              Report {selected} will be removed from the dashboard 12 hours
              after you confirm. The resident will see it as solved.
            </p>
            <button
              className="btn btn-primary full"
              onClick={doSolve}
              disabled={saving}
            >
              {saving ? "Saving..." : "Mark as solved"}
            </button>
            <button
              className="btn btn-secondary full"
              onClick={() => setConfirm(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <Toasts
        toasts={toasts}
        onClose={(id) => setToasts((l) => l.filter((x) => x.id !== id))}
      />
    </div>
  );
}
