import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X, MapPin, Search, Navigation, Check, Loader2 } from "lucide-react";

// Modern custom SVG marker for Leaflet
const createPinIcon = () =>
  L.divIcon({
    className: "pw-map-pin",
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        background: #066b5e;
        border: 2.5px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: #ffffff;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });

export default function MapPinModal({ initialCoords, onConfirm, onClose }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [coords, setCoords] = useState(
    initialCoords || { lat: 24.8607, lng: 67.0011 } // Default fallback coordinates
  );
  const [address, setAddress] = useState(initialCoords?.address || "");
  const [geocoding, setGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locating, setLocating] = useState(false);

  // Reverse geocode lat/lng to human address
  const fetchAddress = async (lat, lng) => {
    setGeocoding(true);
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
          setAddress(parts.join(", "));
        } else if (data.display_name) {
          setAddress(data.display_name.split(",").slice(0, 3).join(","));
        } else {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      }
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setGeocoding(false);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const startLat = coords.lat;
    const startLng = coords.lng;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: initialCoords ? 16 : 14,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Custom Draggable Marker
    const marker = L.marker([startLat, startLng], {
      icon: createPinIcon(),
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    // Marker drag event
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setCoords({ lat: pos.lat, lng: pos.lng });
      fetchAddress(pos.lat, pos.lng);
    });

    // Map click event
    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      fetchAddress(e.latlng.lat, e.latlng.lng);
    });

    // Invalidate map size after modal animation
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    // Initial address fetch if none provided
    if (!initialCoords?.address) {
      fetchAddress(startLat, startLng);
    }

    // Try detecting user position if no initial coords were passed
    if (!initialCoords && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });
          map.setView([lat, lng], 16);
          marker.setLatLng([lat, lng]);
          fetchAddress(lat, lng);
        },
        () => {
          /* ignore permission decline */
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, []);

  // Center on current device location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setSearchError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setSearchError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
        fetchAddress(lat, lng);
      },
      (err) => {
        setLocating(false);
        setSearchError("Location access denied or unavailable: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Search vicinity via Nominatim
  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q
        )}&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setCoords({ lat, lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
        setAddress(data[0].display_name.split(",").slice(0, 3).join(","));
      } else {
        setSearchError("No location results found for '" + q + "'.");
      }
    } catch {
      setSearchError("Search service unavailable. Please drag the pin directly.");
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      lat: coords.lat,
      lng: coords.lng,
      address: address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
    });
    onClose();
  };

  return (
    <div
      className="mg-overlay map-modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="map-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Pick location on map"
      >
        <div className="map-modal-head">
          <div className="map-modal-title">
            <span className="icon-tile sm">
              <MapPin size={18} />
            </span>
            <div>
              <h3>Pin Issue Location</h3>
              <p className="muted tiny">
                Click anywhere or drag the pin to the exact spot
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close map">
            <X size={20} />
          </button>
        </div>

        {/* Search & Locate Controls */}
        <div className="map-modal-toolbar">
          <form className="map-search-form" onSubmit={handleSearch}>
            <Search size={16} className="map-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search street, block, or landmark..."
              aria-label="Search map location"
            />
            <button
              type="submit"
              className="btn btn-secondary btn-xs"
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          <button
            type="button"
            className="btn btn-secondary btn-xs map-locate-btn"
            onClick={handleLocateMe}
            disabled={locating}
            title="Center on my device GPS"
          >
            {locating ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Navigation size={14} />
            )}
            <span>{locating ? "Locating..." : "My Location"}</span>
          </button>
        </div>

        {searchError && <p className="map-search-error">{searchError}</p>}

        {/* Leaflet Container */}
        <div className="map-wrapper">
          <div ref={mapContainerRef} className="map-container" />
          <div className="map-helper-tip">
            💡 Tap map or drag the pin to set the exact spot
          </div>
        </div>

        {/* Selected Location Summary & Actions */}
        <div className="map-modal-foot">
          <div className="map-pin-info">
            <div className="map-pin-coords">
              <MapPin size={15} />
              <span>
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
              {geocoding && <span className="muted tiny">(detecting...)</span>}
            </div>
            <p className="map-pin-address">
              {address || "Pin placed on map"}
            </p>
          </div>

          <div className="map-modal-btns">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleConfirm}
            >
              <Check size={16} /> Confirm Spot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
