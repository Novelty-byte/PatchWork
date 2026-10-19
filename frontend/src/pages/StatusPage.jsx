import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Check,
  CircleCheck,
  CircleHelp,
  Copy,
  FileSearch,
  Info,
  LayoutGrid,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { getReport } from "../statusApi";
import "../status.css";
import ThemeToggle from "../components/ThemeToggle.jsx";

/* ---------- helpers ---------- */
const time12 = (d) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const month = (d) => d.toLocaleString("en-GB", { month: "short" });
const fmtLong = (iso) => {
  const d = new Date(iso);
  return `${d.getDate()} ${month(d)} ${d.getFullYear()} at ${time12(d)}`;
};
const fmtShort = (iso) => {
  const d = new Date(iso);
  return `${d.getDate()} ${month(d)}, ${time12(d)}`;
};

/* ---------- shared layout ---------- */
export function Layout({ children }) {
  return (
    <div className="st-page">
      <header className="st-nav">
        <div className="st-nav-inner">
          <Link to="/" className="st-brand">
            <span className="st-mark">
              <LayoutGrid size={18} />
            </span>
            PatchWork
          </Link>
          <div className="nav-right">
            <Link to="/dashboard" className="st-link">
              Dashboard
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="st-main">{children}</main>
      <footer className="st-foot">
        <ShieldCheck size={18} />
        <span>Your report is shared only with your society manager.</span>
      </footer>
    </div>
  );
}

/* ---------- states ---------- */
function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your report">
      <div className="st-head">
        <span className="sk sk-circle" />
        <span className="sk" style={{ width: 172, height: 34 }} />
        <span className="sk" style={{ width: 236, height: 32 }} />
        <span className="sk sk-soft" style={{ width: 286, height: 18 }} />
      </div>
      <div className="st-card">
        <div className="sk-row">
          <span className="sk" style={{ width: 64, height: 28 }} />
          <span className="sk sk-soft" style={{ width: 120, height: 10 }} />
        </div>
        <span
          className="sk"
          style={{ width: 210, height: 26, marginTop: 16 }}
        />
        <span
          className="sk sk-soft"
          style={{ width: "60%", height: 16, marginTop: 14 }}
        />
        <span
          className="sk sk-soft"
          style={{ width: "40%", height: 14, marginTop: 10 }}
        />
        <span
          className="sk sk-soft"
          style={{ width: "100%", height: 42, marginTop: 18 }}
        />
        <hr className="st-hr" />
        <div className="sk-row" style={{ gap: 40 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="sk"
              style={{ width: 24, height: 24, borderRadius: 8 }}
            />
          ))}
        </div>
        <div className="st-photos" style={{ marginTop: 20 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="sk sk-soft sk-photo" />
          ))}
        </div>
      </div>
      <div className="st-actions">
        <span className="sk" style={{ height: 48 }} />
        <span className="sk sk-soft" style={{ height: 48 }} />
      </div>
    </div>
  );
}

export function NotFoundView() {
  return (
    <div className="st-center">
      <span className="st-circle">
        <FileSearch size={28} />
      </span>
      <p className="st-eyebrow">REPORT NOT FOUND</p>
      <h1>We couldn't find that report</h1>
      <p className="st-sub">
        Check the report number and try opening the link again.
      </p>
      <div className="st-info">
        <h2>Have the right report number?</h2>
        <p>
          Reports are removed after a short time to keep your society dashboard
          current. Your society manager can help if you still need an update.
        </p>
      </div>
      <Link className="btn btn-primary st-narrow" to="/">
        Back to home
      </Link>
    </div>
  );
}

function ErrorView({ onRetry }) {
  return (
    <div className="st-center">
      <span className="st-circle is-clay">
        <TriangleAlert size={28} />
      </span>
      <p className="st-eyebrow is-clay">TEMPORARILY UNAVAILABLE</p>
      <h1>We couldn't load your report</h1>
      <p className="st-sub">
        We're having trouble connecting right now. Please try again in a moment.
      </p>
      <div className="st-alert" role="alert">
        <Info size={18} />
        <div>
          <strong>No need to submit another report</strong>
          <span>
            This only affects the status page. Your report details haven't
            changed.
          </span>
        </div>
      </div>
      <button className="btn btn-primary st-narrow" onClick={onRetry}>
        <RefreshCw size={18} /> Retry
      </button>
      <Link className="btn btn-secondary st-narrow" to="/">
        Back to home
      </Link>
    </div>
  );
}

/* ---------- AI verification ---------- */
function verInfo(v) {
  const label = String((v && v.label) || "").toLowerCase();
  let key = "skipped";
  if (label === "verified") key = "verified";
  else if (label.includes("not match") || label.includes("mismatch"))
    key = "mismatch";
  else if (label.includes("unclear")) key = "unclear";
  const names = {
    verified: "Verified by AI",
    unclear: "Photo unclear",
    mismatch: "Does not match",
    skipped: "Not checked",
  };
  const icons = {
    verified: ShieldCheck,
    unclear: CircleHelp,
    mismatch: TriangleAlert,
    skipped: CircleHelp,
  };
  return { key, name: names[key], Icon: icons[key], reason: v && v.reason };
}

/* ---------- main report view ---------- */
function ReportView({ report }) {
  const [copied, setCopied] = useState(false);
  const solved = String(report.status).toLowerCase() === "solved";
  const photos = Array.isArray(report.media_urls) ? report.media_urls : [];

  let solvedNote = "Solved. This report will be removed soon";
  if (solved) {
    const end = report.expires_at
      ? new Date(report.expires_at).getTime()
      : report.solved_at
        ? new Date(report.solved_at).getTime() + 12 * 3600e3
        : null;
    if (end) {
      const h = Math.ceil((end - Date.now()) / 3600e3);
      solvedNote =
        h > 0
          ? `Solved. This report will be removed in ${h} hour${h === 1 ? "" : "s"}`
          : "Solved. This report is being removed";
    }
  }
  const ver =
    report.verification && report.verification.label
      ? verInfo(report.verification)
      : null;

  const steps = [
    { label: "Reported", done: true, note: fmtShort(report.created_at) },
    {
      label: "Manager notified",
      done: true,
      note: fmtShort(report.notified_at || report.created_at),
    },
    {
      label: "Solved",
      done: solved,
      note: solved
        ? report.solved_at
          ? fmtShort(report.solved_at)
          : "Solved"
        : "Awaiting update",
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <>
      <div className="st-head">
        <span className="st-circle">
          <Check size={30} />
        </span>
        <div className="st-idpill">
          <span>REPORT {report.id}</span>
          <button
            className="st-copy"
            onClick={copy}
            aria-label="Copy report number"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <h1>{solved ? "Report solved" : "Report recorded"}</h1>
        <p className="st-sub">
          {solved
            ? "Your society manager has resolved this report."
            : "Your society manager has been alerted."}
        </p>
      </div>

      <section className="st-card">
        <div className="st-card-top">
          <span className={`st-badge ${solved ? "is-solved" : "is-open"}`}>
            <i /> {solved ? "Solved" : "Open"}
          </span>
          <span className="st-tag">NEIGHBORHOOD REPORT</span>
        </div>
        <h2 className="st-title">{report.category}</h2>
        <p className="st-loc">
          <MapPin size={16} /> {report.location}
        </p>
        <p className="st-created">Created {fmtLong(report.created_at)}</p>

        {ver && (
          <div className={`st-verify v-${ver.key}`}>
            <span className={`mg-ver v-${ver.key}`}>
              <ver.Icon size={14} /> {ver.name}
            </span>
            {ver.reason && <p>{ver.reason}</p>}
          </div>
        )}

        {solved ? (
          <div className="st-note is-solved">
            <CircleCheck size={18} /> {solvedNote}
          </div>
        ) : (
          <div className="st-note">
            <Info size={18} /> Your report stays on the dashboard until it is
            solved
          </div>
        )}

        <hr className="st-hr" />
        <h3 className="st-sec">Report progress</h3>
        <ol className="st-timeline">
          {steps.map((s, i) => (
            <li
              key={s.label}
              className={`${s.done ? "is-done" : ""} ${i < 2 && steps[i + 1].done ? "line-done" : ""}`}
            >
              <span className="st-node">
                {s.done ? <Check size={14} strokeWidth={3} /> : <i />}
              </span>
              <strong>{s.label}</strong>
              <span>{s.note}</span>
            </li>
          ))}
        </ol>

        {photos.length > 0 && (
          <>
            <div className="st-photos-head">
              <h3 className="st-sec">Attached photos</h3>
              <span>
                {photos.length} photo{photos.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="st-photos">
              {photos.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open photo ${i + 1}`}
                >
                  <img
                    src={src}
                    alt={`Report photo ${i + 1}`}
                    onError={(e) =>
                      (e.currentTarget.style.visibility = "hidden")
                    }
                  />
                </a>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="st-actions">
        <Link className="btn btn-primary" to="/">
          <Plus size={18} /> Report another problem
        </Link>
        <Link className="btn btn-secondary" to="/">
          Back to home
        </Link>
      </div>
    </>
  );
}

/* ---------- page ---------- */
export default function StatusPage() {
  const { id } = useParams();
  const [state, setState] = useState({ kind: "loading" });

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setState({ kind: "loading" });
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const report = await getReport(id);
          setState({ kind: "ok", report });
          return;
        } catch (e) {
          if (e.kind === "ratelimit" && attempt < 3) {
            if (!quiet) setState({ kind: "loading", waiting: true });
            await new Promise((r) =>
              setTimeout(r, Math.min(e.retryAfter || 6, 15) * 1000),
            );
            continue;
          }
          if (!quiet)
            setState({ kind: e.kind === "notfound" ? "notfound" : "error" });
          return;
        }
      }
    },
    [id],
  );

  useEffect(() => {
    document.title = "Report status – PatchWork";
    load();
  }, [load]);

  // While the report is open, quietly check every 30s so "Solved" shows up by itself.
  const stillOpen =
    state.kind === "ok" &&
    String(state.report.status).toLowerCase() !== "solved";
  useEffect(() => {
    if (!stillOpen) return;
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [stillOpen, load]);

  return (
    <Layout>
      {state.kind === "loading" && (
        <>
          {state.waiting && (
            <p
              className="st-sub"
              style={{ margin: "0 auto 16px", textAlign: "center" }}
            >
              Lots of people are using PatchWork right now. Trying again...
            </p>
          )}
          <Skeleton />
        </>
      )}
      {state.kind === "notfound" && <NotFoundView />}
      {state.kind === "error" && <ErrorView onRetry={() => load()} />}
      {state.kind === "ok" && <ReportView report={state.report} />}
    </Layout>
  );
}
