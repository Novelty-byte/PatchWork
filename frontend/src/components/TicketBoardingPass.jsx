import { MapPin, Clock3 } from "lucide-react";
import { fmtLong } from "../reportUtils.js";

/* Tiny deterministic pseudo-QR mockup (decorative, aria-hidden) */
function qrCells(seedStr) {
  let seed = 7;
  for (const ch of String(seedStr)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    return seed / 4294967296;
  };
  const size = 7;
  const cells = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const corner =
        (x < 2 && y < 2) || (x > size - 3 && y < 2) || (x < 2 && y > size - 3);
      cells.push(corner || rand() > 0.5);
    }
  }
  return cells;
}

export default function TicketBoardingPass({
  ticketId,
  gpsLocation,
  timestamp,
}) {
  const cells = qrCells(ticketId || "PW");
  const lat = gpsLocation?.lat != null ? Number(gpsLocation.lat).toFixed(5) : null;
  const lng = gpsLocation?.lng != null ? Number(gpsLocation.lng).toFixed(5) : null;

  return (
    <div className="rp3-ticket" role="group" aria-label={`Ticket for report ${ticketId}`}>
      <div className="rp3-ticket-meta">
        <span className="eyebrow">PATCHWORK COMMUNITY TICKET</span>
        <span className="rp3-ticket-id">{ticketId}</span>
        <span>
          <Clock3 size={11} style={{ verticalAlign: -1 }} /> {fmtLong(timestamp)}
        </span>
        {lat && lng && (
          <span className="rp3-ticket-gps">
            <MapPin size={10} /> {lat}, {lng}
          </span>
        )}
      </div>
      <svg className="rp3-ticket-qr" viewBox="0 0 35 35" aria-hidden="true">
        {qrCells(ticketId || "PW").map((on, i) => {
          const x = i % 7;
          const y = Math.floor(i / 7);
          return on ? (
            <rect key={i} x={x * 5} y={y * 5} width="4.4" height="4.4" fill="currentColor" />
          ) : null;
        })}
      </svg>
      <span className="rp3-ticket-watermark" aria-hidden="true">
        {(String(ticketId || "").split("-")[0] || "PW")}
      </span>
      <span className="rp3-stamp-badge">Logged</span>
    </div>
  );
}
