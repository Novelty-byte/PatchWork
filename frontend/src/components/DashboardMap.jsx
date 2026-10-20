/**
 * DashboardMap – plain Leaflet map for the community dashboard.
 * Single combined useEffect to avoid React Strict-Mode double-init issues.
 */
import { useEffect, useRef, useState } from "react";
import L from "leaflet";

// Fix Leaflet's broken default icon paths when bundled by Vite
// (safe to call multiple times – delete is a no-op if prop doesn't exist)
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
} catch (_) { /* ignore */ }

const SEV_COLOR = {
  critical: "#dc2626",
  high:     "#ea580c",
  medium:   "#0d9488",
  low:      "#6b7280",
};

function makePinSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 9.5 14 22 14 22S28 23.5 28 14C28 6.268 21.732 0 14 0z"
          fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="#fff"/>
  </svg>`;
}

function pinIcon(r) {
  const color = SEV_COLOR[String(r.severity || "").toLowerCase()] || "#0d9488";
  return L.divIcon({
    html: makePinSvg(color),
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -38],
  });
}

function popupHtml(r) {
  const thumb = r.media_urls && r.media_urls[0];
  const isVid = thumb && /\.(mp4|mov|webm)/i.test(thumb);
  const locShort = (r.location || "").split(" \u00B7")[0].trim();
  return `<div class="map-popup">
    ${thumb && !isVid ? `<img src="${thumb}" class="map-popup-img" onerror="this.style.display='none'">` : ""}
    <div class="map-popup-body">
      <span class="map-popup-id">${r.id}</span>
      <strong class="map-popup-cat">${r.category || "Report"}</strong>
      <p class="map-popup-loc">${locShort}</p>
      <button class="map-popup-btn" data-id="${r.id}">View full report &rarr;</button>
    </div>
  </div>`;
}

export default function DashboardMap({ reports, onOpenReport }) {
  const containerRef = useRef(null);
  const [noGps, setNoGps] = useState(false);

  // Only open reports that have GPS
  const mappable = reports.filter(
    (r) =>
      String(r.status).toLowerCase() !== "solved" &&
      r.latitude != null &&
      r.longitude != null,
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // --- init map ---
    const map = L.map(el, { zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // --- add markers ---
    if (mappable.length === 0) {
      setNoGps(true);
      map.setView([20, 0], 2);
    } else {
      setNoGps(false);
      const markers = mappable.map((r) => {
        const m = L.marker([r.latitude, r.longitude], { icon: pinIcon(r) })
          .addTo(map)
          .bindPopup(popupHtml(r), { maxWidth: 240, className: "map-popup-wrap" });

        m.on("popupopen", () => {
          const btn = m.getPopup().getElement()?.querySelector(".map-popup-btn");
          if (btn) {
            btn.onclick = () => { m.closePopup(); onOpenReport(r.id); };
          }
        });
        return m;
      });

      // Fly to the latest report on open
      const latest = mappable[0];
      map.setView([latest.latitude, latest.longitude], 15);

      // Off-screen arrows: update on every moveend
      function updateArrows() {
        // Remove old arrows
        el.querySelectorAll(".map-arrow").forEach((a) => a.remove());

        const bounds = map.getBounds();
        const center = map.getCenter();
        const shown = new Set();

        mappable.forEach((r) => {
          if (bounds.contains([r.latitude, r.longitude])) return;
          const dlat = r.latitude - center.lat;
          const dlng = r.longitude - center.lng;
          const angleDeg = Math.atan2(dlng, dlat) * (180 / Math.PI);
          const sector = Math.round(angleDeg / 45) * 45;
          if (shown.has(sector)) return;
          shown.add(sector);

          const rad = (sector * Math.PI) / 180;
          const cx = 50 + 42 * Math.sin(rad);
          const cy = 50 - 42 * Math.cos(rad);

          const arrow = document.createElement("button");
          arrow.className = "map-arrow";
          arrow.style.left = `${cx}%`;
          arrow.style.top = `${cy}%`;
          arrow.style.transform = `translate(-50%,-50%) rotate(${sector}deg)`;
          arrow.innerHTML = "&#9650;";
          arrow.title = "Pan to off-screen report";
          arrow.onclick = () => map.panTo([r.latitude, r.longitude]);
          el.appendChild(arrow);
        });
      }

      map.on("moveend", updateArrows);
      // Initial arrows after a brief delay to let map settle
      setTimeout(updateArrows, 400);
    }

    // --- cleanup ---
    return () => {
      map.remove();
    };
    // Re-run when the set of report IDs changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappable.map((r) => r.id).join(",")]);

  return (
    <div className="mg-map-wrap">
      <div ref={containerRef} className="mg-map-container" />
      {noGps && (
        <div className="mg-map-nogps">
          <span>No GPS coordinates on open reports yet.</span>
          <span className="hint">Use the GPS picker when submitting a report.</span>
        </div>
      )}
    </div>
  );
}
