import { useCallback, useEffect, useMemo, useState } from "react";
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
import "../status.css";
import "../manager.css";
import ThemeToggle from "../components/ThemeToggle.jsx";

const HOUR = 3600e3;

/* ---------- helpers ---------- */
const isSolved = (r) => String(r.status).toLowerCase() === "solved";
const isVideo = (u) =>
  /\.(mp4|mov|webm)(\?|$)/i.test(u) || u.startsWith("data:video");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatLocationWithGps(r) {
  if (!r) return "Location not specified";
  let loc = r.location || "Location not specified";
  if (r.latitude && r.longitude && !loc.includes("\uD83D\uDCCD GPS:")) {
    loc = `${loc} \u00B7 \uD83D\uDCCD GPS: ${Number(r.latitude).toFixed(5)}, ${Number(r.longitude).toFixed(5)}`;
  }
  return loc;
}

function ago(iso) {
  const m = Math.max(
    1,
    Math.round((Date.now() - new Date(iso).getTime()) / 60000),
  );
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}
function endOf(r) {
  if (r.expires_at) return new Date(r.expires_at).getTime();
  if (isSolved(r) && r.solved_at)
    return new Date(r.solved_at).getTime() + 12 * HOUR;
  return null;
}
function statusLine(r) {
  if (!isSolved(r))
    return { text: "Open \u00B7 waiting for a fix", tone: "normal" };
  const end = endOf(r);
  if (!end) return { text: "Solved", tone: "solved" };
  const h = Math.max(0, Math.ceil((end - Date.now()) / HOUR));
  return { text: `Solved \u00B7 removes in ${h}h`, tone: "solved" };
}
function verInfo(r) {
  const label = String(
    (r.verification && r.verification.label) || "",
  ).toLowerCase();
  let key = "skipped";
  if (label === "verified") key = "verified";
  else if (label.includes("not match") || label.includes("mismatch"))
    key = "mismatch";
  else if (label.includes("unclear")) key = "unclear";
  const names = {
    verified: "Verified",
    unclear: "Unclear",
    mismatch: "Does not match",
    skipped: "Not checked",
  };
  const icons = {
    verified: ShieldCheck,
    unclear: CircleHelp,
    mismatch: TriangleAlert,
    skipped: CircleHelp,
  };
  return {
    key,
    name: names[key],
    Icon: icons[key],
    reason: r.verification && r.verification.reason,
  };
}

function Verification({ r }) {
  const { key, name, Icon } = verInfo(r);
  return (
    <span className={`mg-ver v-${key}`}>
      <Icon size={14} /> {name}
    </span>
  );
}
const SevBadge = ({ r }) =>
  r.severity ? (
    <span className={`badge badge-sev-${String(r.severity).toLowerCase()}`}>
      {cap(String(r.severity))}
    </span>
  ) : null;

/* ---------- upvote button ---------- */
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
  return (
    <button
      className={`mg-upvote-btn${voted ? " is-voted" : ""}`}
      onClick={handle}
      disabled={loading}
      aria-label={voted ? "Remove your confirmation" : "Confirm this issue"}
      title={
        voted
          ? "Click to remove your vote"
          : "Confirm this issue affects you too"
      }
    >
      <ThumbsUp size={13} />
      <span>{upvotes > 0 ? upvotes : ""}</span>
      <span className="mg-upvote-label">
        {voted ? "Confirmed" : "+1 Confirm"}
      </span>
    </button>
  );
}

/* ---------- report card ---------- */
function ReportCard({ r, voted, onOpen, onUpvote }) {
  const st = statusLine(r);
  const thumb = r.media_urls && r.media_urls[0];
  const upvotes = r.upvotes || 0;
  const isHighPriority = upvotes >= 3;
  return (
    <button
      className={`mg-card${isHighPriority ? " mg-card-priority" : ""}`}
      onClick={onOpen}
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
                  style={{
                    display: "inline-block",
                    marginTop: "4px",
                    color: "var(--teal)",
                    textDecoration: "underline",
                  }}
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

          {/* Community upvote in detail panel */}
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
                  {upvotes} neighbor{upvotes === 1 ? "" : "s"} confirmed this
                  issue
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

/* ---------- page ---------- */
export default function ManagerPage() {
  const [state, setState] = useState({ kind: "loading", reports: [] });
  const [tab, setTab] = useState("open");
  const [cat, setCat] = useState("all");
  const [sev, setSev] = useState("all");
  const [sort, setSort] = useState("newest");
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "map"
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  // Track which reports the current device has voted on (keyed by report id)
  const [votedIds, setVotedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pw_voted_reports") || "[]");
    } catch {
      return [];
    }
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
        (sev === "all" || String(r.severity).toLowerCase() === sev),
    );
    list.sort(
      (a, b) =>
        (sort === "newest" ? 1 : -1) *
        (new Date(b.created_at) - new Date(a.created_at)),
    );
    return list;
  }, [state.reports, tab, cat, sev, sort]);

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
      // Update upvote count in local state
      setState((s) => ({
        ...s,
        reports: s.reports.map((r) =>
          r.id === reportId ? { ...r, upvotes: result.upvotes } : r,
        ),
      }));
      // Toggle voted state
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
    <div className="st-page">
      <header className="st-nav">
        <div className="mg-bar">
          <a href="https://patch-work-app.vercel.app" className="st-brand">
            <span className="st-mark">
              <img src="/patchwork-logo.jpeg" alt="PatchWork" style={{ width: 22, height: 22, borderRadius: 4, objectFit: "cover", display: "block" }} />
            </span>
            PatchWork
          </a>
          <div className="mg-bar-right">
            <span className="badge badge-teal mg-count">{openCount} open</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => load()}
              aria-label="Refresh"
            >
              <RefreshCw size={16} /> <span className="desk-only">Refresh</span>
            </button>
            <Link className="btn btn-primary btn-sm" to="/">
              <Plus size={16} />{" "}
              <span className="desk-only">Report a problem</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mg-main">
        <div className="mg-top">
          <h1>Live community dashboard</h1>
          <p className="st-sub">
            Open reports stay here until they are solved. Solved reports
            disappear 12 hours later.
          </p>
        </div>

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
          <select
            className="mg-select"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label="Category"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {hasSeverity && (
            <select
              className="mg-select"
              value={sev}
              onChange={(e) => setSev(e.target.value)}
              aria-label="Severity"
            >
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          )}
          <select
            className="mg-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          {/* Cards / Map toggle */}
          <div className="mg-view-toggle" role="group" aria-label="View mode">
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
                  <span
                    className="sk sk-soft"
                    style={{ width: "50%", height: 14 }}
                  />
                  <span
                    className="sk sk-soft"
                    style={{ width: "60%", height: 14 }}
                  />
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
            <button
              className="btn btn-primary st-narrow"
              onClick={() => load()}
            >
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
                onClick={() => {
                  setCat("all");
                  setSev("all");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {state.kind === "ok" && visible.length > 0 && viewMode === "cards" && (
          <div className="mg-grid">
            {visible.map((r) => (
              <ReportCard
                key={r.id}
                r={r}
                voted={votedIds.includes(r.id)}
                onOpen={() => setSelected(r.id)}
                onUpvote={handleUpvote}
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
            <h2
              id="solve-title"
              className="modal-title"
              style={{ fontSize: 24 }}
            >
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
