import { CircleHelp, ShieldCheck, TriangleAlert } from "lucide-react";

export const HOUR = 3600e3;

export const isSolved = (r) => {
  if (!r) return false;
  const status = typeof r === "string" ? r : r.status;
  return String(status || "").toLowerCase() === "solved";
};

export const isVideo = (u) =>
  /\.(mp4|mov|webm)(\?|$)/i.test(u) || (typeof u === "string" && u.startsWith("data:video"));

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

export function formatLocationWithGps(r) {
  if (!r) return "Location not specified";
  let loc = r.location || "Location not specified";
  if (r.latitude && r.longitude && !loc.includes("\uD83D\uDCCD GPS:")) {
    loc = `${loc} \u00B7 \uD83D\uDCCD GPS: ${Number(r.latitude).toFixed(5)}, ${Number(r.longitude).toFixed(5)}`;
  }
  return loc;
}

export function ago(iso) {
  if (!iso) return "";
  const m = Math.max(
    1,
    Math.round((Date.now() - new Date(iso).getTime()) / 60000),
  );
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

export const time12 = (d) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export const month = (d) => d.toLocaleString("en-GB", { month: "short" });

export const fmtLong = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${month(d)} ${d.getFullYear()} at ${time12(d)}`;
};

export const fmtShort = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${month(d)}, ${time12(d)}`;
};

export function endOf(r) {
  if (!r) return null;
  if (r.expires_at) return new Date(r.expires_at).getTime();
  if (isSolved(r) && r.solved_at) {
    return new Date(r.solved_at).getTime() + 12 * HOUR;
  }
  return null;
}

export function statusLine(r) {
  if (!isSolved(r)) {
    return { text: "Open \u00B7 waiting for a fix", tone: "normal" };
  }
  const end = endOf(r);
  if (!end) return { text: "Solved", tone: "solved" };
  const h = Math.max(0, Math.ceil((end - Date.now()) / HOUR));
  return { text: `Solved \u00B7 removes in ${h}h`, tone: "solved" };
}

export function verInfo(vOrReport) {
  const v = vOrReport?.verification || vOrReport;
  const label = String((v && v.label) || "").toLowerCase();
  let key = "skipped";
  if (label === "verified") key = "verified";
  else if (label.includes("not match") || label.includes("mismatch")) key = "mismatch";
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
    reason: v && v.reason,
  };
}
