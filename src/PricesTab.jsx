import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

// City coordinates on India map
const CITY_COORDS = {
  Delhi:     { lat: 28.6139, lng: 77.2090 },
  Mumbai:    { lat: 19.0760, lng: 72.8777 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Chennai:   { lat: 13.0827, lng: 80.2707 },
  Pune:      { lat: 18.5204, lng: 73.8567 },
  Kolkata:   { lat: 22.5726, lng: 88.3639 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Vizag:     { lat: 17.6868, lng: 83.2185 },
  Jaipur:    { lat: 26.9124, lng: 75.7873 },
  Lucknow:   { lat: 26.8467, lng: 80.9462 },
  Patna:     { lat: 25.5941, lng: 85.1376 },
};

const COMPANIES = ["IndianOil", "HP Gas", "Bharat Gas"];
const COMPANY_EMOJI = { IndianOil: "🔵", "HP Gas": "🟡", "Bharat Gas": "🟢" };

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function PricesTab() {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});
  const [prices, setPrices] = useState({});
  const [selectedCity, setSelectedCity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load Leaflet dynamically
  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return; }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Fetch prices from Supabase
  useEffect(() => {
    supabase
      .from("lpg_prices")
      .select("*")
      .order("recorded_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        // Build: { city: { company: { price, recorded_at } } }
        const grouped = {};
        let latest = null;
        for (const row of data) {
          if (!grouped[row.city]) grouped[row.city] = {};
          if (!grouped[row.city][row.company]) {
            grouped[row.city][row.company] = { price: row.price, recorded_at: row.recorded_at };
            if (!latest || row.recorded_at > latest) latest = row.recorded_at;
          }
        }
        setPrices(grouped);
        setLastUpdated(latest);
        setLoading(false);
      });
  }, []);

  // Init map once Leaflet is loaded
  useEffect(() => {
    if (!leafletLoaded || leafletMap.current) return;
    const L = window.L;

    leafletMap.current = L.map(mapRef.current, {
      center: [22.5, 82.5],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(leafletMap.current);

    L.control.zoom({ position: "bottomright" }).addTo(leafletMap.current);

  }, [leafletLoaded]);

  // Add/update markers when prices load
  useEffect(() => {
    if (!leafletLoaded || !leafletMap.current || loading) return;
    const L = window.L;

    Object.entries(CITY_COORDS).forEach(([city, { lat, lng }]) => {
      const cityPrices = prices[city] || {};
      const allPrices = COMPANIES.map(c => cityPrices[c]?.price).filter(Boolean);
      const cheapestPrice = allPrices.length ? Math.min(...allPrices) : null;
      const cheapestCo = cheapestPrice
        ? COMPANIES.find(c => cityPrices[c]?.price === cheapestPrice)
        : null;

      // Color based on cheapest price
      const color = !cheapestPrice ? "#555"
        : cheapestPrice < 880 ? "#22c55e"
        : cheapestPrice < 930 ? "#FF6B00"
        : "#ef4444";

      const pulseHtml = `
        <div style="position:relative;width:28px;height:28px;cursor:pointer">
          <div style="
            position:absolute;inset:0;border-radius:50%;
            background:${color};opacity:0.25;
            animation:lpgPulse 2s ease-out infinite;
          "></div>
          <div style="
            position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
            width:12px;height:12px;border-radius:50%;
            background:${color};
            box-shadow:0 0 8px ${color};
            border:2px solid rgba(255,255,255,0.3);
          "></div>
          <div style="
            position:absolute;top:-20px;left:50%;transform:translateX(-50%);
            font-size:9px;font-weight:700;color:${color};
            white-space:nowrap;letter-spacing:0.5px;
            text-shadow:0 1px 3px rgba(0,0,0,0.8);
          ">${city}</div>
          ${cheapestPrice ? `<div style="
            position:absolute;top:14px;left:50%;transform:translateX(-50%);
            font-size:8px;font-weight:700;color:#fff;
            white-space:nowrap;
            text-shadow:0 1px 3px rgba(0,0,0,0.9);
          ">₹${cheapestPrice}</div>` : ""}
        </div>
      `;

      const icon = L.divIcon({
        html: pulseHtml,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (markersRef.current[city]) {
        markersRef.current[city].remove();
      }

      const marker = L.marker([lat, lng], { icon })
        .addTo(leafletMap.current)
        .on("click", () => setSelectedCity(city));

      markersRef.current[city] = marker;
    });
  }, [leafletLoaded, prices, loading]);

  const cityData = selectedCity ? prices[selectedCity] || {} : null;
  const allSelectedPrices = cityData
    ? COMPANIES.map(c => cityData[c]?.price).filter(Boolean)
    : [];
  const cheapestPrice = allSelectedPrices.length ? Math.min(...allSelectedPrices) : null;
  const cheapestCo = cheapestPrice
    ? COMPANIES.find(c => cityData[c]?.price === cheapestPrice)
    : null;

  return (
    <div style={{ position: "relative" }}>
      <style>{`
        @keyframes lpgPulse {
          0% { transform: scale(1); opacity: 0.25; }
          70% { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        .leaflet-container { background: #080808 !important; }
        .city-popup {
          animation: popupIn 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        @keyframes popupIn {
          from { opacity:0; transform:scale(0.9) translateY(6px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", background: "#22c55e",
            display: "inline-block", animation: "lpgPulse 2s infinite"
          }} />
          <span style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: 1.2 }}>
            LIVE · {Object.keys(prices).length} CITIES · UPDATED {lastUpdated ? fmt(lastUpdated) : "—"}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#555" }}>
          Click any city dot to see all prices
          &nbsp;·&nbsp;
          <span style={{ color: "#22c55e" }}>● under ₹880</span>
          &nbsp;
          <span style={{ color: "#FF6B00" }}>● ₹880–930</span>
          &nbsp;
          <span style={{ color: "#ef4444" }}>● above ₹930</span>
        </div>
      </div>

      {/* Map container */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid #1e1e1e" }}>
        <div ref={mapRef} style={{ height: 480, width: "100%", background: "#080808" }} />

        {!leafletLoaded && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "#0a0a0a", fontSize: 13, color: "#555"
          }}>
            Loading map…
          </div>
        )}

        {/* City popup */}
        {selectedCity && cityData && (
          <div className="city-popup" style={{
            position: "absolute", top: 16, right: 16, zIndex: 1000,
            background: "#111", border: "1px solid #2a2a2a",
            borderRadius: 14, padding: "18px 20px", minWidth: 240,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}>
            {/* Close */}
            <button onClick={() => setSelectedCity(null)} style={{
              position: "absolute", top: 10, right: 10,
              background: "none", border: "none", color: "#555",
              fontSize: 16, cursor: "pointer", lineHeight: 1, padding: 2
            }}>×</button>

            {/* City name */}
            <div style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 20, fontWeight: 800, color: "#f5f5f5",
              letterSpacing: "-0.3px", marginBottom: 4
            }}>{selectedCity}</div>

            {/* Cheapest badge */}
            {cheapestCo && (
              <div style={{
                fontSize: 10, fontWeight: 700, color: "#22c55e",
                background: "#22c55e14", border: "1px solid #22c55e22",
                borderRadius: 99, padding: "2px 9px", display: "inline-block",
                marginBottom: 14, letterSpacing: 0.5
              }}>
                {COMPANY_EMOJI[cheapestCo]} Cheapest: {cheapestCo} @ ₹{cheapestPrice}
              </div>
            )}

            {/* Company prices */}
            {COMPANIES.map(company => {
              const row = cityData[company];
              const isCheapest = company === cheapestCo;
              return (
                <div key={company} style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", padding: "9px 0",
                  borderBottom: "1px solid #1a1a1a",
                  background: isCheapest ? "transparent" : "transparent"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{COMPANY_EMOJI[company]}</span>
                    <span style={{
                      fontSize: 13, color: isCheapest ? "#f5f5f5" : "#888",
                      fontWeight: isCheapest ? 600 : 400
                    }}>{company}</span>
                    {isCheapest && (
                      <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 700 }}>BEST</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 15, fontWeight: 700,
                    color: isCheapest ? "#22c55e" : row?.price ? "#f0f0f0" : "#333",
                    fontFamily: "'Bricolage Grotesque', sans-serif"
                  }}>
                    {row?.price ? `₹${row.price}` : "—"}
                  </span>
                </div>
              );
            })}

            {/* Last updated */}
            <div style={{ fontSize: 10, color: "#444", marginTop: 10, textAlign: "right" }}>
              Updated {fmt(Object.values(cityData)[0]?.recorded_at)}
            </div>
          </div>
        )}
      </div>

      {/* Price revision alert */}
      <div style={{
        background: "#111", border: "1px solid #1e1e1e",
        borderRadius: 16, padding: "22px 24px", marginTop: 16
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: "#FF7A00",
          letterSpacing: 2, textTransform: "uppercase", marginBottom: 8
        }}>Price Revision Alert</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 14, lineHeight: 1.6 }}>
          Get notified before the 1st of each month — before it hits the news.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={{
              flex: 1, background: "#0e0e0e", border: "1px solid #252525",
              borderRadius: 10, padding: "12px 16px", color: "#f0f0f0",
              fontSize: 14, outline: "none", fontFamily: "inherit"
            }}
            placeholder="Mobile number or email"
          />
          <button style={{
            background: "#FF6B00", color: "#fff", border: "none",
            borderRadius: 10, padding: "12px 20px", fontSize: 14,
            fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            fontFamily: "inherit"
          }}>
            Notify Me →
          </button>
        </div>
      </div>
    </div>
  );
}
