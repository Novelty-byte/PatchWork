import { useState } from "react";
import { MapPin, Navigation, Map, X, Loader2, CheckCircle2 } from "lucide-react";
import MapPinModal from "./MapPinModal.jsx";

export default function GpsLocationPicker({ location, onChange, notify }) {
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(false);

  // Retrieve current location via Browser Geolocation API
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      notify?.({
        variant: "warning",
        title: "Geolocation unavailable",
        text: "Your browser does not support GPS location. You can choose to find it on the map instead.",
      });
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok) {
            const data = await res.json();
            const a = data.address || {};
            const parts = [
              a.road || a.pedestrian || a.suburb || a.neighbourhood,
              a.city_district || a.quarter || a.residential,
              a.city || a.town || a.village,
            ].filter(Boolean);
            if (parts.length > 0) {
              address = parts.join(", ");
            } else if (data.display_name) {
              address = data.display_name.split(",").slice(0, 3).join(",");
            }
          }
        } catch {
          // Coordinate fallback
        }

        const newLoc = { lat, lng, address };
        onChange(newLoc);
        setLoading(false);
        notify?.({
          variant: "success",
          title: "Location retrieved",
          text: `Pinned at ${lat.toFixed(4)}, ${lng.toFixed(4)}${
            address ? ` (${address})` : ""
          }`,
        });
      },
      (err) => {
        setLoading(false);
        let msg = "Could not access location. Please check browser permissions.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission was denied. You can pick your spot on the map instead.";
        }
        notify?.({
          variant: "warning",
          title: "Location check",
          text: msg,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="gps-box">
      <div className="gps-box-head">
        <div className="gps-box-title">
          <span className="icon-tile sm">
            <MapPin size={16} />
          </span>
          <div>
            <strong>GPS Location</strong>
            <span className="muted tiny">Optional · Pinpoint issue spot</span>
          </div>
        </div>
        {location && (
          <span className="badge badge-teal badge-sm">
            <CheckCircle2 size={12} /> Pinned
          </span>
        )}
      </div>

      {!location ? (
        <div className="gps-actions-grid">
          <button
            type="button"
            className="btn btn-secondary btn-sm gps-btn"
            onClick={handleGetCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <Navigation size={15} />
            )}
            <span>{loading ? "Detecting..." : "Use current location"}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm gps-btn"
            onClick={() => setShowMap(true)}
          >
            <Map size={15} />
            <span>Find on map</span>
          </button>
        </div>
      ) : (
        <div className="gps-pinned-card">
          <div className="gps-pinned-details">
            <div className="gps-coords-row">
              <span className="loc-live-dot" />
              <strong>
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </strong>
            </div>
            {location.address && (
              <p className="gps-address-text">{location.address}</p>
            )}
            <span className="gps-attached-hint">
              GPS coordinates will be appended to your report
            </span>
          </div>

          <div className="gps-pinned-buttons">
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => setShowMap(true)}
            >
              Change on map
            </button>
            <button
              type="button"
              className="icon-btn-sm"
              onClick={() => onChange(null)}
              aria-label="Remove GPS location"
              title="Remove GPS location"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {showMap && (
        <MapPinModal
          initialCoords={location}
          onConfirm={(loc) => {
            onChange(loc);
            notify?.({
              variant: "success",
              title: "Spot pinned on map",
              text: `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}${
                loc.address ? ` · ${loc.address}` : ""
              }`,
            });
          }}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}
