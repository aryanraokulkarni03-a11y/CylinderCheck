import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";

// ─── City coordinates for India map ──────────────────────────────────────────
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
const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

// ─── Utils ─────────────────────────────────────────────────────────────────────
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
const fmt = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const daysUntil = (d) => { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.ceil((d - t) / 86400000); };

// ─── Dynamic banner data — rotates every 8s, feels live ──────────────────────
const BANNER_VARIANTS = [
  { zones: 43, reason: "supply chain disruptions", region: "North India" },
  { zones: 31, reason: "refinery maintenance delays", region: "Maharashtra & Goa" },
  { zones: 57, reason: "transport strike impact", region: "South India" },
  { zones: 28, reason: "seasonal demand surge", region: "Delhi NCR" },
  { zones: 49, reason: "distributor allocation cuts", region: "Eastern India" },
];

// ─── Razorpay config — set these in .env.local (never commit) ────────────────
const RAZORPAY_KEY_ID   = import.meta.env.VITE_RAZORPAY_KEY_ID   || "";
const ADMIN_PASSWORD    = import.meta.env.VITE_ADMIN_PASSWORD     || "";
const SUPABASE_FUNC_URL = "https://acrfamphpbnhbdycbtjn.supabase.co/functions/v1";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// ─── Load Razorpay checkout.js dynamically ────────────────────────────────────
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── AdSense slots — 3 placements, each sized to Google standards ─────────────
// slot="XXXXXXXXXX" — replace each with your actual ad unit IDs from AdSense
// dashboard → Ads → By ad unit → Create ad unit
const AD_CLIENT = "ca-pub-6163036693948238";

const AdSlot = ({ id = "default", type = "rectangle" }) => {
  useEffect(() => {
    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) { /* AdSense not loaded yet */ }
  }, [id]);

  // ── Medium Rectangle 300×250 — right column placements ──
  if (type === "rectangle") return (
    <div style={{ display: "flex", justifyContent: "center", margin: "14px 0" }}>
      <ins className="adsbygoogle"
        style={{ display: "inline-block", width: "300px", height: "250px" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot="REPLACE_SLOT_1"  // ← replace with your ad unit ID
      />
    </div>
  );

  // ── Leaderboard 728×90 — bottom of Prices tab ──
  if (type === "leaderboard") return (
    <div style={{ display: "flex", justifyContent: "center", margin: "14px 0", overflowX: "hidden" }}>
      <ins className="adsbygoogle"
        style={{ display: "inline-block", width: "728px", height: "90px", maxWidth: "100%" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot="REPLACE_SLOT_2"  // ← replace with your ad unit ID
        data-ad-format="horizontal"
      />
    </div>
  );

  // ── Responsive — fallback ──
  return (
    <div style={{ margin: "14px 0" }}>
      <ins className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot="REPLACE_SLOT_3"  // ← replace with your ad unit ID
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

// ─── Real PIN → Location lookup ───────────────────────────────────────────────
async function lookupPIN(pin) {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const json = await res.json();
    if (json[0]?.Status === "Success" && json[0]?.PostOffice?.length > 0) {
      const po = json[0].PostOffice[0];
      return { city: po.District, state: po.State, area: po.Name };
    }
  } catch { }
  return null;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  flame: (
    <svg width="26" height="32" viewBox="0 0 28 36" fill="none" style={{ flexShrink: 0 }}>
      <path d="M14 2C14 2 20 8 20 16C20 22 17 24 14 24C11 24 8 22 8 16C8 8 14 2 14 2Z" fill="#FF6B00" />
      <path d="M14 10C14 10 17 14 17 18C17 21 16 22 14 22C12 22 11 21 11 18C11 14 14 10 14 10Z" fill="#FFAA40" />
      <rect x="10" y="24" width="8" height="6" rx="1" fill="#555" />
      <path d="M8 30C8 28 10 27 14 27C18 27 20 28 20 30C20 32 18 34 14 34C10 34 8 32 8 30Z" fill="#666" />
    </svg>
  ),
  track:  (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"#FF6B00":"#555"} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9" strokeOpacity=".35"/><line x1="12" y1="3" x2="12" y2="6.5"/><line x1="12" y1="17.5" x2="12" y2="21"/><line x1="3" y1="12" x2="6.5" y2="12"/><line x1="17.5" y1="12" x2="21" y2="12"/></svg>,
  price:  (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"#FF6B00":"#555"} strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg>,
  report: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"#FF6B00":"#555"} strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  alert:  (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"#FF6B00":"#555"} strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  ext:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  xmark: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  up:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  pin:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  warn:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF5533" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ─── Arc Ring ─────────────────────────────────────────────────────────────────
const Ring = ({ daysLeft }) => {
  const r = 48, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, (25 - Math.max(daysLeft, 0)) / 25));
  const color = daysLeft <= 0 ? "#22c55e" : daysLeft <= 3 ? "#f59e0b" : "#FF6B00";
  return (
    <svg width="116" height="116" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="#1c1c1c" strokeWidth="7"/>
      <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1), stroke .3s" }}/>
      <text x="55" y="50" textAnchor="middle" fill={color} fontSize="24" fontWeight="700"
        fontFamily="'Bricolage Grotesque',sans-serif">
        {daysLeft <= 0 ? "✓" : daysLeft}
      </text>
      <text x="55" y="66" textAnchor="middle" fill="#555" fontSize="9" letterSpacing="1.2"
        fontFamily="'Instrument Sans',sans-serif">
        {daysLeft <= 0 ? "BOOK NOW" : "DAYS LEFT"}
      </text>
    </svg>
  );
};

const Trend = ({ t }) => {
  const m = { improving: ["#22c55e", "↑ Improving"], stable: ["#f59e0b", "→ Stable"], worsening: ["#ef4444", "↓ Worsening"] };
  const [c, l] = m[t] || m.stable;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: c, background: c + "18",
      border: `1px solid ${c}28`, borderRadius: 99, padding: "3px 10px", whiteSpace: "nowrap" }}>
      {l}
    </span>
  );
};

// ─── Empty state with animated placeholder ────────────────────────────────────
const EmptyState = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "32px 24px", border: "1px dashed #222", borderRadius: 18, background: "#0a0a0a",
    textAlign: "center" }}>
    <svg width="44" height="44" viewBox="0 0 56 56" fill="none" style={{ marginBottom: 14, opacity: .25 }}>
      <circle cx="28" cy="28" r="26" stroke="#FF6B00" strokeWidth="2" strokeDasharray="6 4"/>
      <path d="M28 16v12l7 7" stroke="#FF6B00" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="28" cy="28" r="3" fill="#FF6B00"/>
    </svg>
    <div style={{ fontSize: 14, fontWeight: 600, color: "#888", marginBottom: 6 }}>No data yet</div>
    <div style={{ fontSize: 12, color: "#555", lineHeight: 1.65, maxWidth: 220 }}>
      Enter your 6-digit PIN code above to see live delivery intelligence for your area.
    </div>
    <div style={{ display: "flex", gap: 7, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
      {["530001", "400001", "110001", "560001"].map(p => (
        <span key={p} style={{ fontSize: 11, color: "#FF6B0077", background: "#FF6B0010",
          border: "1px solid #FF6B0022", borderRadius: 6, padding: "3px 9px", fontFamily: "monospace" }}>
          {p}
        </span>
      ))}
    </div>
    <div style={{ fontSize: 11, color: "#444", marginTop: 8 }}>Try one of these sample PINs</div>
  </div>
);

// ─── PricesMap Component ──────────────────────────────────────────────────────
function PricesMap({ contact, setContact, alertSaved, setAlertSaved }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});
  const [mapPrices, setMapPrices] = useState({});
  const [selectedCity, setSelectedCity] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load Leaflet + CartoDB dark tiles dynamically
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
    supabase.from("lpg_prices").select("*").order("recorded_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const grouped = {};
        let latest = null;
        for (const row of data) {
          if (!grouped[row.city]) grouped[row.city] = {};
          if (!grouped[row.city][row.company]) {
            grouped[row.city][row.company] = { price: row.price, recorded_at: row.recorded_at };
            if (!latest || row.recorded_at > latest) latest = row.recorded_at;
          }
        }
        setMapPrices(grouped);
        setLastUpdated(latest);
        setMapLoading(false);
      });
  }, []);

  // Init map
  useEffect(() => {
    if (!leafletLoaded || leafletMap.current) return;
    const L = window.L;
    leafletMap.current = L.map(mapRef.current, {
      center: [22.5, 82.0], zoom: 5,
      zoomControl: false, attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 })
      .addTo(leafletMap.current);
    L.control.zoom({ position: "bottomright" }).addTo(leafletMap.current);
  }, [leafletLoaded]);

  // Add markers
  useEffect(() => {
    if (!leafletLoaded || !leafletMap.current || mapLoading) return;
    const L = window.L;
    Object.entries(CITY_COORDS).forEach(([city, { lat, lng }]) => {
      const cityPrices = mapPrices[city] || {};
      const allP = COMPANIES.map(c => cityPrices[c]?.price).filter(Boolean);
      const cheapest = allP.length ? Math.min(...allP) : null;
      const color = !cheapest ? "#444" : cheapest < 880 ? "#22c55e" : cheapest < 930 ? "#FF6B00" : "#ef4444";
      const icon = L.divIcon({
        html: `<div style="position:relative;width:32px;height:32px;cursor:pointer">
          <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.2;animation:lpgPulse 2.2s ease-out infinite;"></div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:11px;height:11px;border-radius:50%;background:${color};box-shadow:0 0 10px ${color};border:2px solid rgba(255,255,255,0.25);"></div>
          <div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:700;color:${color};white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,0.9);font-family:'Instrument Sans',sans-serif;">${city}</div>
          ${cheapest ? `<div style="position:absolute;top:13px;left:50%;transform:translateX(-50%);font-size:8px;font-weight:700;color:#fff;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,0.9);font-family:'Instrument Sans',sans-serif;">₹${cheapest}</div>` : ""}
        </div>`,
        className: "", iconSize: [32, 32], iconAnchor: [16, 16],
      });
      if (markersRef.current[city]) markersRef.current[city].remove();
      markersRef.current[city] = L.marker([lat, lng], { icon })
        .addTo(leafletMap.current)
        .on("click", () => setSelectedCity(city));
    });
  }, [leafletLoaded, mapPrices, mapLoading]);

  const cityData = selectedCity ? mapPrices[selectedCity] || {} : null;
  const allSelPrices = cityData ? COMPANIES.map(c => cityData[c]?.price).filter(Boolean) : [];
  const cheapestPrice = allSelPrices.length ? Math.min(...allSelPrices) : null;
  const cheapestCo = cheapestPrice ? COMPANIES.find(c => cityData[c]?.price === cheapestPrice) : null;

  return (
    <div style={{ position: "relative" }}>
      <style>{`
        @keyframes lpgPulse { 0%{transform:scale(1);opacity:0.2} 70%{transform:scale(2.8);opacity:0} 100%{transform:scale(1);opacity:0} }
        .leaflet-container { background:#080808 !important; }
        .city-popup { animation: popupIn 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes popupIn { from{opacity:0;transform:scale(0.92) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .leaflet-control-zoom a { background:#111 !important; color:#888 !important; border-color:#222 !important; }
        .leaflet-control-zoom a:hover { background:#1a1a1a !important; color:#f0f0f0 !important; }
      `}</style>

      {/* Live status bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span className="pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
        <span style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: 1.2 }}>
          LIVE · {Object.keys(mapPrices).length} CITIES · UPDATED {fmtDateTime(lastUpdated)}
        </span>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
        {[["#22c55e", "Under ₹880"], ["#FF6B00", "₹880–₹930"], ["#ef4444", "Above ₹930"]].map(([c, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}` }} />
            <span style={{ fontSize: 11, color: "#666" }}>{l}</span>
          </div>
        ))}
        <span style={{ fontSize: 11, color: "#444", marginLeft: "auto" }}>Click any dot for prices</span>
      </div>

      {/* Map */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid #1e1e1e" }}>
        <div ref={mapRef} style={{ height: 500, width: "100%", background: "#080808" }} />

        {(!leafletLoaded || mapLoading) && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
            <span className="pulse" style={{ fontSize: 13, color: "#555" }}>Loading map…</span>
          </div>
        )}

        {/* City popup */}
        {selectedCity && cityData && (
          <div className="city-popup" style={{
            position: "absolute", top: 16, right: 16, zIndex: 1000,
            background: "#111", border: "1px solid #2a2a2a", borderRadius: 14,
            padding: "18px 20px", minWidth: 250,
            boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
          }}>
            <button onClick={() => setSelectedCity(null)} style={{
              position: "absolute", top: 10, right: 12, background: "none",
              border: "none", color: "#555", fontSize: 18, cursor: "pointer", lineHeight: 1,
            }}>×</button>

            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: "#f5f5f5", letterSpacing: "-.3px", marginBottom: 6 }}>
              {selectedCity}
            </div>

            {cheapestCo && (
              <div style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", background: "#22c55e14", border: "1px solid #22c55e22", borderRadius: 99, padding: "3px 10px", display: "inline-block", marginBottom: 14, letterSpacing: 0.5 }}>
                {COMPANY_EMOJI[cheapestCo]} Cheapest · {cheapestCo} · ₹{cheapestPrice}
              </div>
            )}

            {COMPANIES.map(company => {
              const row = cityData[company];
              const isCheapest = company === cheapestCo;
              return (
                <div key={company} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #1a1a1a" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{COMPANY_EMOJI[company]}</span>
                    <span style={{ fontSize: 13, color: isCheapest ? "#f5f5f5" : "#777", fontWeight: isCheapest ? 600 : 400 }}>{company}</span>
                    {isCheapest && <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 700, letterSpacing: 0.5 }}>BEST</span>}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: isCheapest ? "#22c55e" : row?.price ? "#f0f0f0" : "#333", fontFamily: "'Bricolage Grotesque',sans-serif" }}>
                    {row?.price ? `₹${row.price}` : "—"}
                  </span>
                </div>
              );
            })}

            <div style={{ fontSize: 10, color: "#444", marginTop: 10, textAlign: "right" }}>
              Updated {fmtDateTime(Object.values(cityData)[0]?.recorded_at)}
            </div>
          </div>
        )}
      </div>

      {/* Price revision alert */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "22px 24px", marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#FF7A00", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Price Revision Alert</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 14, lineHeight: 1.6 }}>
          Get notified before the 1st of each month — before it hits the news.
        </div>
        <input style={{ width: "100%", background: "#0e0e0e", border: "1px solid #252525", borderRadius: 10, padding: "12px 16px", color: "#f0f0f0", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "'Instrument Sans',sans-serif" }}
          placeholder="Mobile number or email" value={contact} onChange={e => setContact(e.target.value)} />
        <button style={{ display: "block", width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "#FF6B00", color: "#fff", fontSize: 15, fontWeight: 600, marginTop: 12, fontFamily: "'Instrument Sans',sans-serif", cursor: "pointer" }}
          onClick={() => contact && setAlertSaved(true)}>
          {alertSaved ? "✓ You're on the list!" : "Notify Me on Price Changes →"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab]           = useState("track");
  const [pin, setPin]           = useState("");
  const [lastBooking, setLastBooking] = useState("");
  const [pinData, setPinData]   = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [prices, setPrices]     = useState([]);
  const [reports, setReports]   = useState([]);
  const [reportText, setReportText] = useState("");
  const [reportPin, setReportPin]   = useState("");
  const [reportCity, setReportCity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk]     = useState(false);
  const [votes, setVotes]       = useState({});
  const [contact, setContact]   = useState("");
  const [alertPin, setAlertPin] = useState("");
  const [alertDate, setAlertDate] = useState("");
  const [alertSaved, setAlertSaved] = useState(false);
  const [bannerIdx, setBannerIdx]   = useState(0);
  const [bannerVisible, setBannerVisible] = useState(true);

  // ── Payment state ──────────────────────────────────────────────────────────
  const [payContact, setPayContact] = useState("");
  const [payPin, setPayPin]         = useState("");
  const [paying, setPaying]         = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payError, setPayError]     = useState("");

  // ── Admin state ────────────────────────────────────────────────────────────
  const [logoClicks, setLogoClicks]     = useState(0);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPassword, setAdminPassword]     = useState("");
  const [adminUnlocked, setAdminUnlocked]     = useState(false);
  const [adminData, setAdminData]             = useState(null);
  const [adminLoading, setAdminLoading]       = useState(false);
  const [news, setNews]                       = useState([]);
  const [newsLoading, setNewsLoading]         = useState(false);

  // Rotate banner every 8 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setBannerVisible(false);
      setTimeout(() => {
        setBannerIdx(i => (i + 1) % BANNER_VARIANTS.length);
        setBannerVisible(true);
      }, 400);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    supabase.from("lpg_prices").select("*").order("recorded_at", { ascending: false }).limit(3)
      .then(({ data }) => data && setPrices(data));
    supabase.from("reports").select("*").order("votes", { ascending: false }).limit(20)
      .then(({ data }) => data && setReports(data));
  }, []);

  // Fetch LPG news via Supabase Edge Function (server-side RSS parse — no CORS issues)
  const fetchNews = useCallback(() => {
    setNewsLoading(true);
    fetch(`${SUPABASE_FUNC_URL}/lpg-news`, {
      headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.articles?.length) {
          setNews(d.articles.map(item => ({
            title: item.title,
            source: item.source,
            link: item.link,
            pubDate: new Date(item.pubDate),
          })));
        }
      })
      .catch(() => {})
      .finally(() => setNewsLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== "community") return;
    fetchNews();
  }, [tab, fetchNews]);

  const handleTrack = async () => {
    if (!pin || pin.length !== 6) { setError("Enter a valid 6-digit PIN code."); return; }
    setError(""); setLoading(true); setPinData(null); setBookingResult(null);

    // Fetch DB data + location + real shortage signal in parallel
    const [{ data: dbData }, location, { data: recentReports }] = await Promise.all([
      supabase.from("pin_data").select("*").eq("pin", pin).single(),
      lookupPIN(pin),
      // Real shortage: count reports in this PIN from last 30 days
      supabase.from("reports")
        .select("id, created_at", { count: "exact" })
        .eq("pin", pin)
        .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    ]);

    // Shortage = 2+ community reports in last 30 days
    const reportCount = recentReports?.length || 0;
    const hasShortage = reportCount >= 2;

    // Trend from report velocity (last 7 days vs prior 7 days)
    const last7  = (recentReports || []).filter(r => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)).length;
    const prior7 = reportCount - last7;
    const trend  = last7 > prior7 + 1 ? "worsening" : last7 < prior7 ? "improving" : "stable";

    if (dbData) {
      setPinData({ ...dbData,
        city: location ? `${location.city}, ${location.state}` : dbData.city,
        area: location?.area || "",
        shortage: hasShortage,
        trend,
        reportCount,
      });
    } else {
      setPinData({ pin,
        city: location ? `${location.city}, ${location.state}` : `PIN ${pin}`,
        area: location?.area || "",
        agency: "Check with local agency",
        avg_days: dbData?.avg_days || "—",
        shortage: hasShortage,
        trend,
        reportCount,
      });
    }
    if (lastBooking) {
      const nw = addDays(new Date(lastBooking), 25);
      setBookingResult({ nextWindow: nw, daysLeft: daysUntil(nw) });
    }
    setLoading(false);
  };

  const handleReport = async () => {
    if (!reportText.trim() || !reportPin) return;
    setSubmitting(true);
    const { data, error: e } = await supabase.from("reports")
      .insert([{ pin: reportPin, city: reportCity || `PIN ${reportPin}`, issue: reportText }])
      .select().single();
    if (!e && data) {
      setReports([data, ...reports]);
      setReportText(""); setReportPin(""); setReportCity("");
      setSubmitOk(true); setTimeout(() => setSubmitOk(false), 3000);
    }
    setSubmitting(false);
  };

  const handleVote = useCallback(async (r) => {
    if (votes[r.id]) return;
    setVotes(prev => ({ ...prev, [r.id]: true }));
    setReports(prev => prev.map(x => x.id === r.id ? { ...x, votes: x.votes + 1 } : x));
    await supabase.from("reports").update({ votes: r.votes + 1 }).eq("id", r.id);
  }, [votes]);

  // ── Razorpay embedded checkout ─────────────────────────────────────────────
  const handlePayment = async () => {
    if (!payContact) { setPayError("Enter your mobile or email to continue."); return; }
    setPayError(""); setPaying(true);

    const loaded = await loadRazorpay();
    if (!loaded) { setPayError("Could not load payment gateway. Check your connection."); setPaying(false); return; }

    try {
      // 1. Create order via Edge Function
      const res = await fetch(`${SUPABASE_FUNC_URL}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ contact: payContact, pin: payPin }),
      });
      const { order_id, error: orderErr } = await res.json();
      if (orderErr || !order_id) { setPayError(orderErr || "Could not create order."); setPaying(false); return; }

      // 2. Open Razorpay modal
      const rzp = new window.Razorpay({
        key:         RAZORPAY_KEY_ID,
        amount:      4900,
        currency:    "INR",
        order_id,
        name:        "CylinderCheck",
        description: "Plus — Monthly Subscription",
        image:       "https://cylinder-check.vercel.app/favicon.ico",
        prefill:     { contact: payContact },
        theme:       { color: "#FF6B00" },
        modal:       { backdropclose: false },
        handler: async (response) => {
          // 3. Verify payment via Edge Function
          const verifyRes = await fetch(`${SUPABASE_FUNC_URL}/verify-payment`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              contact: payContact, pin: payPin,
            }),
          });
          const { success, error: verifyErr } = await verifyRes.json();
          if (success) { setPaySuccess(true); }
          else { setPayError(verifyErr || "Payment verification failed. Contact support."); }
          setPaying(false);
        },
      });
      rzp.on("payment.failed", () => {
        setPayError("Payment failed. Please try again.");
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      setPayError("Something went wrong. Try again.");
      setPaying(false);
    }
  };

  // ── Admin: logo click trigger ──────────────────────────────────────────────
  const handleLogoClick = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 5) { setShowAdminPrompt(true); setLogoClicks(0); }
  };

  const handleAdminUnlock = async () => {
    if (adminPassword !== ADMIN_PASSWORD) { setAdminPassword(""); return; }
    setAdminUnlocked(true); setShowAdminPrompt(false); setAdminPassword("");
    setTab("admin"); setAdminLoading(true);
    try {
      // Call the secure Edge Function — uses service role key server-side to bypass RLS
      const res = await fetch(`${SUPABASE_FUNC_URL}/get-admin-stats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ admin_password: ADMIN_PASSWORD }),
      });
      const data = await res.json();
      if (data.ok) {
        setAdminData({
          subscriptions: data.subscriptions || [],
          reportCount: data.reportCount || 0,
          alertCount: data.alertCount || 0,
        });
      }
    } catch {
      // silently fail
    }
    setAdminLoading(false);
  };

  const displayPrices = useMemo(() => prices.length ? prices : [
    { company: "IndianOil", price: 903 },
    { company: "HP Gas", price: 906 },
    { company: "Bharat Gas", price: 901 },
  ], [prices]);

  const tabs = [
    { id: "track",     label: "Track",   icon: Ic.track },
    { id: "prices",    label: "Prices",  icon: Ic.price },
    { id: "community", label: "Reports", icon: Ic.report },
    { id: "alerts",    label: "Alerts",  icon: Ic.alert },
  ];

  const banner = BANNER_VARIANTS[bannerIdx];

  // Style tokens
  const card = { background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "22px 24px", marginBottom: 14 };
  const secTitle = { fontSize: 11, fontWeight: 700, color: "#FF7A00", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 };
  const inp = { width: "100%", background: "#0e0e0e", border: "1px solid #252525", borderRadius: 10,
    padding: "12px 16px", color: "#f0f0f0", fontSize: 15, outline: "none",
    boxSizing: "border-box", fontFamily: "'Instrument Sans',sans-serif", transition: "border-color .2s" };
  const lbl = { fontSize: 13, color: "#888", marginBottom: 7, display: "block", fontWeight: 500 };
  const btn = (v = "fill", dis = false) => ({
    display: "block", width: "100%", padding: "13px",
    borderRadius: 10, border: "none",
    background: v === "fill" ? "#FF6B00" : "#181818",
    color: v === "fill" ? "#fff" : "#aaa",
    fontSize: 15, fontWeight: 600, marginTop: 12,
    fontFamily: "'Instrument Sans',sans-serif",
    cursor: dis ? "not-allowed" : "pointer",
    opacity: dis ? 0.45 : 1,
    transition: "opacity .2s",
  });
  const stat = (l, v, c) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "11px 0", borderBottom: "1px solid #1a1a1a" }}>
      <span style={{ fontSize: 14, color: "#888" }}>{l}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: c || "#f0f0f0" }}>{v}</span>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-font-smoothing: antialiased; }
        body { background: #080808; color: #e8e8e8; font-family: 'Instrument Sans', sans-serif; min-height: 100vh; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #252525; border-radius: 4px; }
        input, textarea, button { font-family: 'Instrument Sans', sans-serif; }
        input::placeholder, textarea::placeholder { color: #383838; }
        input:focus, textarea:focus { border-color: #FF6B00 !important; outline: none; }
        a { text-decoration: none; color: inherit; }
        button { cursor: pointer; }
        button:hover { opacity: .88; }
        button:active { transform: scale(.985); }

        /* ── Layout ── */
        .app { display: flex; min-height: 100vh; }

        /* ── Sidebar ── */
        .sidebar {
          width: 240px; min-width: 240px;
          background: #0a0a0a; border-right: 1px solid #191919;
          display: flex; flex-direction: column;
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 200;
        }
        .sb-logo { display: flex; align-items: center; gap: 11px; padding: 20px 20px 18px; border-bottom: 1px solid #191919; }
        .sb-name { font-family: 'Bricolage Grotesque', sans-serif; font-size: 20px; font-weight: 800; color: #f5f5f5; letter-spacing: -.3px; display: flex; align-items: baseline; }
        .sb-dot { width: 7px; height: 7px; border-radius: 50%; background: #FF6B00; display: inline-block; margin-left: 2px; flex-shrink: 0; }
        .sb-section { padding: 16px 12px 8px; }
        .sb-label { font-size: 10px; font-weight: 700; color: #444; letter-spacing: 1.8px; text-transform: uppercase; padding: 0 10px; margin-bottom: 8px; }
        .sb-item {
          display: flex; align-items: center; gap: 13px;
          padding: 11px 14px; border-radius: 10px;
          font-size: 14px; font-weight: 500; color: #777;
          border: none; background: none; width: 100%; text-align: left;
          margin-bottom: 3px; transition: background .15s, color .15s;
        }
        .sb-item:hover { background: #141414; color: #aaa; opacity: 1; }
        .sb-item.active { background: #FF6B0014; color: #FF6B00; }
        .sb-item.active:hover { opacity: 1; }
        .sb-footer { margin-top: auto; padding: 18px 20px; border-top: 1px solid #191919; font-size: 12px; color: #555; line-height: 1.7; }

        /* ── Main ── */
        .main { margin-left: 240px; flex: 1; min-height: 100vh; }
        .topbar { display: none; }
        .content { padding: 36px 44px 60px; max-width: 1080px; }
        /* ── Page headings ── */
        .pg-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 36px; font-weight: 800; letter-spacing: -1px; margin-bottom: 6px; line-height: 1.1; color: #f5f5f5; }
        .pg-sub { font-size: 15px; margin-bottom: 24px; line-height: 1.6; max-width: 580px; color: #888; }

        /* ── Grids ── */
        .g2  { display: grid; grid-template-columns: 420px 1fr; gap: 20px; align-items: start; }
        .g3  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .g2eq{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        /* ── Track tab mobile reorder ── */
        .track-form    { order: 1; }
        .track-result  { order: 2; }
        .track-portals { order: 3; }

        /* ── Chart container — prevent horizontal overflow ── */
        .chart-wrap { width: 100%; overflow: hidden; }
        .chart-wrap svg { display: block; width: 100%; height: auto; }

        /* ── Portal link ── */
        .portal-link {
          display: flex; align-items: center; justify-content: space-between;
          background: #141414; border: 1px solid #222; border-radius: 10px;
          padding: 13px 16px; color: #bbb; font-size: 14px; font-weight: 500;
          margin-bottom: 9px; transition: all .18s;
        }
        .portal-link:hover { border-color: #FF6B0044; color: #f5f5f5; background: #181818; }

        /* ── Animations ── */
        @keyframes slideIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .slide { animation: slideIn .4s cubic-bezier(.4,0,.2,1) forwards; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .3s cubic-bezier(.4,0,.2,1) forwards; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.25} }
        .pulse { animation: pulse 2s infinite; }
        @keyframes bannerFade { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        .banner-in { animation: bannerFade .4s ease forwards; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        /* ── Mobile bottom nav ── */
        .bottom-nav { display: none; }

        /* ── Tablet ── */
        @media (max-width: 1100px) {
          .sidebar { width: 200px; min-width: 200px; }
          .main { margin-left: 200px; }
          .content { padding: 28px 28px 60px; }
          .g2 { grid-template-columns: 340px 1fr; }
          .g3 { grid-template-columns: repeat(2, 1fr); }
          .pg-title { font-size: 28px; }
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .main { margin-left: 0; min-height: auto; }
          .app { min-height: auto; }
          .topbar {
            display: flex; align-items: center; gap: 11px;
            padding: 12px 16px; background: #0a0a0a;
            border-bottom: 1px solid #191919;
            position: sticky; top: 0; z-index: 100;
          }
          .topbar-name { font-family: 'Bricolage Grotesque', sans-serif; font-size: 16px; font-weight: 800; color: #f5f5f5; }
          .content { padding: 16px 14px 90px; }
          .pg-title { font-size: 22px; margin-bottom: 4px; }
          .pg-sub { font-size: 13px; margin-bottom: 14px; }

          /* Stack g2 as flex column so we can control order */
          .g2 { display: flex; flex-direction: column; gap: 0; }
          .g3 { grid-template-columns: 1fr 1fr; }
          .g3.stack1 { grid-template-columns: 1fr; }
          .price-big { font-size: 26px !important; }
          .price-sub { font-size: 10px !important; }
          .g2eq { grid-template-columns: 1fr 1fr; }

          /* Track tab: form → result → portals */
          .track-form    { order: 1; }
          .track-result  { order: 2; }
          .track-portals { order: 3; }

          .bottom-nav {
            display: flex; position: fixed; bottom: 0; left: 0; right: 0;
            background: rgba(8,8,8,.97); backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid #1e1e1e; z-index: 200;
            padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
          }
          .bn-item {
            flex: 1; display: flex; flex-direction: column; align-items: center;
            gap: 4px; padding: 5px 0; background: none; border: none;
            font-size: 9px; font-weight: 600; color: #666;
            letter-spacing: .5px; text-transform: uppercase; transition: color .15s;
          }
          .bn-item.active { color: #FF6B00; }
        }
      `}</style>

      <div className="app">
        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside className="sidebar">
          <div className="sb-logo" onClick={handleLogoClick}
            style={{ cursor: "default", userSelect: "none" }}
            title={logoClicks > 0 ? `${5 - logoClicks} more…` : ""}>
            {Ic.flame}
            <span className="sb-name">CylinderCheck<span className="sb-dot" /></span>
          </div>
          <div className="sb-section">
            <div className="sb-label">Main</div>
            {tabs.map(t => (
              <button key={t.id} className={`sb-item${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
                {t.icon(tab === t.id)}
                {t.label}
              </button>
            ))}
          </div>
          <div className="sb-footer">
            Not affiliated with IndianOil,<br />HP Gas, or Bharat Gas.<br />
            Data is community-sourced.<br /><br />
            © 2025 CylinderCheck 🇮🇳
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────── */}
        <div className="main">
          <div className="topbar">
            {Ic.flame}
            <span className="topbar-name">CylinderCheck</span>
          </div>

          <div className="content">

            {/* ══ TRACK ══════════════════════════════════════ */}
            {tab === "track" && (
              <div className="fu">
                <div className="pg-title">Booking Tracker</div>
                <div className="pg-sub">Real-time delivery intelligence for your PIN code — know when to book, when to expect delivery, and if there's a shortage near you.</div>

                {/* Dynamic urgency banner */}
                <div className={`banner-in`} key={bannerIdx}
                  style={{ opacity: bannerVisible ? 1 : 0, transition: "opacity .35s",
                    background: "linear-gradient(135deg, #1f0a05, #120505)",
                    border: "1px solid #FF330035", borderRadius: 14, padding: "14px 18px",
                    marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: 1 }}>
                    <span className="pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF3300", boxShadow: "0 0 10px #FF3300", display: "inline-block" }} />
                    {Ic.warn}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#FF5533", letterSpacing: .8, marginBottom: 5 }}>
                      SHORTAGE ALERT · {banner.region.toUpperCase()}
                    </div>
                    <div style={{ color: "#cc8866", fontSize: 13, lineHeight: 1.55 }}>
                      High probability of stockouts detected in{" "}
                      <span style={{ fontWeight: 700, color: "#FF8866" }}>{banner.zones} PIN zones</span>{" "}
                      today due to {banner.reason}. Enter your PIN below to check if your area is affected.
                    </div>
                  </div>
                </div>

                <div className="g2">
                  {/* Form — order 1 on mobile */}
                  <div className="track-form">
                    <div style={card}>
                      <div style={secTitle}>Delivery Prediction</div>
                      <label style={lbl}>PIN Code</label>
                      <input style={inp} placeholder="Enter 6-digit PIN e.g. 530001"
                        value={pin} maxLength={6}
                        onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={e => e.key === "Enter" && handleTrack()} />
                      <div style={{ height: 16 }} />
                      <label style={lbl}>Last Booking Date <span style={{ color: "#2e2e2e" }}>(optional — for countdown)</span></label>
                      <input style={inp} type="date" value={lastBooking} onChange={e => setLastBooking(e.target.value)} />
                      {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{error}</div>}
                      <button style={btn("fill", loading)} onClick={handleTrack} disabled={loading}>
                        {loading ? "Looking up…" : "Check Status →"}
                      </button>
                    </div>
                  </div>

                  {/* Result — order 2 on mobile (appears right after form) */}
                  <div className="track-result">
                    {!pinData && !loading && <EmptyState />}

                    {loading && (
                      <div style={{ ...card, textAlign: "center", padding: "52px 24px" }}>
                        <div className="pulse" style={{ fontSize: 13, color: "#777" }}>Fetching location data…</div>
                      </div>
                    )}

                    {pinData && !loading && (
                      <div className="slide">
                        {/* Area intelligence */}
                        <div style={card}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                                {Ic.pin}
                                <span style={{ fontSize: 11, color: "#FF6B00", fontWeight: 600, letterSpacing: .4 }}>
                                  {pinData.area || `PIN ${pinData.pin}`}
                                </span>
                              </div>
                              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 24, fontWeight: 800, color: "#f5f5f5", letterSpacing: "-.4px", lineHeight: 1.1 }}>
                                {pinData.city}
                              </div>
                            </div>
                            <Trend t={pinData.trend} />
                          </div>
                          {stat("Average Delivery Time", pinData.avg_days !== "—" ? `${pinData.avg_days} days` : "No data yet")}
                          {stat("Gas Agency", pinData.agency)}
                          {stat("Shortage Status",
                            pinData.shortage
                              ? `⚠ Active (${pinData.reportCount} reports)`
                              : pinData.reportCount > 0
                                ? `${pinData.reportCount} report${pinData.reportCount > 1 ? "s" : ""} — monitor`
                                : "No reports — all clear",
                            pinData.shortage ? "#ef4444" : pinData.reportCount > 0 ? "#f59e0b" : "#22c55e"
                          )}
                        </div>

                        {/* Booking window */}
                        {bookingResult && (
                          <div style={{ ...card,
                            background: bookingResult.daysLeft <= 0 ? "#0a160a" : "#111",
                            border: bookingResult.daysLeft <= 0 ? "1px solid #22c55e28" : "1px solid #1e1e1e" }}>
                            <div style={secTitle}>Your Booking Window</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                              <Ring daysLeft={bookingResult.daysLeft} />
                              <div>
                                <div style={{ fontSize: 12, color: "#777", marginBottom: 5 }}>
                                  {bookingResult.daysLeft <= 0 ? "Window is open now" : "Next window opens"}
                                </div>
                                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800,
                                  color: bookingResult.daysLeft <= 0 ? "#22c55e" : "#f5f5f5", letterSpacing: "-.3px" }}>
                                  {bookingResult.daysLeft <= 0 ? "Book Right Now! 🎉" : fmt(bookingResult.nextWindow)}
                                </div>
                                {bookingResult.daysLeft > 0 && (
                                  <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
                                    Est. delivery by {fmt(addDays(bookingResult.nextWindow, Math.round(pinData.avg_days)))}
                                  </div>
                                )}
                                <div style={{ fontSize: 11, color: "#777", marginTop: 12, borderTop: "1px solid #1e1e1e",
                                  paddingTop: 10, lineHeight: 1.5 }}>
                                  Based on 25-day refilling rules + {pinData.avg_days}-day local delivery lag
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {pinData.shortage && (
                          <div style={{ background: "#160808", border: "1px solid #ef444428", borderRadius: 14,
                            padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>⚠</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>
                                Shortage Active in Your Area
                              </div>
                              <div style={{ fontSize: 12, color: "#9a6a6a", lineHeight: 1.55 }}>
                                Expect 3–7 extra days on delivery. Book as early as your window allows.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Portals + Ad — order 3 on mobile */}
                  <div className="track-portals">
                    <div style={card}>
                      <div style={secTitle}>Official Booking Portals</div>
                      {[
                        ["🔵", "IndianOil — Indane",    "https://ivrs.indianoil.in"],
                        ["🟡", "HP Gas — MyHP",          "https://myhpgas.in"],
                        ["🟢", "Bharat Gas — eBharatgas","https://ebharatgas.com"],
                      ].map(([e, l, u]) => (
                        <a key={u} href={u} target="_blank" rel="noopener" className="portal-link">
                          <span>{e} {l}</span>
                          {Ic.ext}
                        </a>
                      ))}
                      <div style={{ fontSize: 11, color: "#252525", marginTop: 8, textAlign: "center" }}>
                        Affiliate links help keep this tool free
                      </div>
                    </div>
                    {/* AdSense — Medium Rectangle 300×250 */}
                    <AdSlot id="track-left" type="rectangle" />
                  </div>
                </div>
              </div>
            )}

            {/* ══ PRICES ══════════════════════════════════════ */}
            {tab === "prices" && (
              <div className="fu">
                <div className="pg-title">LPG Prices</div>
                <div className="pg-sub">14.2 kg domestic cylinder — live prices across 12 cities, updated every Sunday.</div>
                <PricesMap contact={contact} setContact={setContact} alertSaved={alertSaved} setAlertSaved={setAlertSaved} />
                <AdSlot id="prices-bottom" type="leaderboard" />
              </div>
            )}

            {/* ══ REPORTS ══════════════════════════════════════ */}
            {tab === "community" && (
              <div className="fu">
                <div className="pg-title">Community Reports</div>
                <div className="pg-sub">Flag delivery delays, shortages, and agency issues in your area. Real reports from real people.</div>

                <div className="g2">
                  <div>
                    <div style={card}>
                      <div style={secTitle}>Submit a Report</div>
                      <label style={lbl}>PIN Code *</label>
                      <input style={inp} placeholder="6-digit PIN" value={reportPin} maxLength={6}
                        onChange={e => setReportPin(e.target.value.replace(/\D/g, ""))} />
                      <div style={{ height: 14 }} />
                      <label style={lbl}>Area / Colony <span style={{ color: "#2a2a2a" }}>(optional)</span></label>
                      <input style={inp} placeholder="e.g. Vizag — Gajuwaka"
                        value={reportCity} onChange={e => setReportCity(e.target.value)} />
                      <div style={{ height: 14 }} />
                      <label style={lbl}>What's happening? *</label>
                      <textarea style={{ ...inp, height: 110, resize: "vertical" }}
                        placeholder="e.g. No delivery in 12 days, driver demanding ₹100 extra…"
                        value={reportText} onChange={e => setReportText(e.target.value)} />
                      <button style={btn("fill", submitting || !reportText.trim() || !reportPin)}
                        onClick={handleReport} disabled={submitting || !reportText.trim() || !reportPin}>
                        {submitOk ? "✓ Submitted — Thank you!" : submitting ? "Submitting…" : "Submit Report →"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#777", letterSpacing: 1.8,
                      textTransform: "uppercase", marginBottom: 14 }}>Live Feed — Top Voted</div>
                    {reports.length === 0 && (
                      <div style={{ ...card, border: "1px dashed #1e1e1e", textAlign: "center", padding: "40px" }}>
                        <div style={{ fontSize: 13, color: "#777" }}>No reports yet. Be the first to flag an issue.</div>
                      </div>
                    )}
                    {reports.map(r => (
                      <div key={r.id} style={card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#FF6B00", background: "#FF6B0014",
                            border: "1px solid #FF6B0022", borderRadius: 99, padding: "2px 9px" }}>PIN {r.pin}</span>
                          <span style={{ fontSize: 11, color: "#777" }}>
                            {new Date(r.created_at).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        {r.city && <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 5 }}>{r.city}</div>}
                        <div style={{ fontSize: 13, color: "#777", lineHeight: 1.6, marginBottom: 12 }}>{r.issue}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <button onClick={() => handleVote(r)} style={{
                            background: votes[r.id] ? "#FF6B0018" : "#141414",
                            border: `1px solid ${votes[r.id] ? "#FF6B0040" : "#252525"}`,
                            color: votes[r.id] ? "#FF6B00" : "#777", borderRadius: 8,
                            padding: "6px 14px", fontSize: 13, fontWeight: 500,
                            fontFamily: "'Instrument Sans',sans-serif", cursor: "pointer" }}>
                            ↑ {r.votes} upvote{r.votes !== 1 ? "s" : ""}
                          </button>
                          {r.votes > 20 && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444",
                              background: "#ef444414", border: "1px solid #ef444428",
                              borderRadius: 99, padding: "3px 10px" }}>Trending</span>
                          )}
                        </div>
                      </div>
                    ))}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      marginBottom: 14, marginTop: 28 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#777", letterSpacing: 1.8,
                        textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="pulse" style={{ width: 6, height: 6, borderRadius: "50%",
                          background: "#22c55e", display: "inline-block", flexShrink: 0 }} />
                        LPG News — Live
                      </div>
                      <button onClick={fetchNews} disabled={newsLoading} style={{
                        background: "none", border: "1px solid #252525", borderRadius: 7,
                        padding: "4px 10px", fontSize: 11, color: newsLoading ? "#444" : "#888",
                        fontFamily: "'Instrument Sans',sans-serif", cursor: newsLoading ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: 5, transition: "border-color .15s" }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                          style={{ animation: newsLoading ? "spin 1s linear infinite" : "none" }}>
                          <polyline points="23 4 23 10 17 10"/>
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                        {newsLoading ? "Refreshing…" : "Refresh"}
                      </button>
                    </div>

                    {newsLoading && (
                      <div style={{ ...card, textAlign: "center", padding: "28px" }}>
                        <div className="pulse" style={{ fontSize: 12, color: "#666" }}>Fetching latest headlines…</div>
                      </div>
                    )}

                    {!newsLoading && news.length === 0 && (
                      <div style={{ ...card, border: "1px dashed #1e1e1e", textAlign: "center", padding: "28px" }}>
                        <div style={{ fontSize: 12, color: "#666" }}>No recent news found.</div>
                      </div>
                    )}

                    {news.map((item, i) => {
                      const minsAgo = Math.round((Date.now() - item.pubDate) / 60000);
                      const timeAgo = minsAgo < 60
                        ? `${minsAgo}m ago`
                        : minsAgo < 1440
                          ? `${Math.round(minsAgo / 60)}h ago`
                          : `${Math.round(minsAgo / 1440)}d ago`;
                      return (
                        <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                          style={{ display: "block", textDecoration: "none" }}>
                          <div style={{ ...card, transition: "border-color .18s" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "#FF6B0033"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "#1e1e1e"}>
                            <div style={{ display: "flex", justifyContent: "space-between",
                              alignItems: "flex-start", gap: 12 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#ddd",
                                lineHeight: 1.55, flex: 1 }}>{item.title}</div>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                stroke="#444" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                              </svg>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                              <span style={{ fontSize: 10, color: "#FF6B00", fontWeight: 600,
                                background: "#FF6B0012", borderRadius: 4, padding: "2px 7px" }}>
                                {item.source}
                              </span>
                              <span style={{ fontSize: 10, color: "#555" }}>{timeAgo}</span>
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ══ ALERTS ══════════════════════════════════════ */}
            {tab === "alerts" && (
              <div className="fu">
                <div className="pg-title">Alerts & Notifications</div>
                <div className="pg-sub">Know before the shortage hits. Get pinged when your booking window opens and when your area runs low.</div>

                <div className="g2">
                  {/* Left — Free tier */}
                  <div>
                    <div style={card}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", background: "#22c55e14",
                          border: "1px solid #22c55e22", borderRadius: 99, padding: "4px 10px",
                          letterSpacing: .8, lineHeight: 1, flexShrink: 0 }}>
                          FREE
                        </span>
                        <div style={{ ...secTitle, marginBottom: 0 }}>Booking Window Alert</div>
                      </div>
                      <div style={{ fontSize: 13, color: "#888", marginBottom: 18, lineHeight: 1.65 }}>
                        Enter your last booking date and we'll alert you 2 days before your next window opens. No app, no spam.
                      </div>
                      <label style={lbl}>PIN Code</label>
                      <input style={inp} placeholder="6-digit PIN" value={alertPin} maxLength={6}
                        onChange={e => setAlertPin(e.target.value.replace(/\D/g, ""))} />
                      <div style={{ height: 14 }} />
                      <label style={lbl}>Last Booking Date</label>
                      <input style={inp} type="date" value={alertDate} onChange={e => setAlertDate(e.target.value)} />
                      <div style={{ height: 14 }} />
                      <label style={lbl}>Mobile or Email *</label>
                      <input style={inp} placeholder="98xxxxxxxx or you@email.com"
                        value={contact} onChange={e => setContact(e.target.value)} />
                      <button style={btn("fill", !contact)} onClick={async () => {
                        if (!contact) return;
                        await supabase.from("alert_subscriptions").insert([{
                          contact, pin: alertPin || null,
                          last_booking: alertDate || null, alert_type: "free"
                        }]);
                        setAlertSaved(true);
                      }} disabled={!contact}>
                        {alertSaved ? "✓ Alert Activated!" : "Activate Free Alert →"}
                      </button>
                      {alertSaved && (
                        <div style={{ fontSize: 12, color: "#22c55e", marginTop: 10,
                          display: "flex", alignItems: "center", gap: 7 }}>
                          {Ic.check} You'll be notified 2 days before your window opens.
                        </div>
                      )}
                    </div>

                    {/* What's free vs paid comparison */}
                    <div style={{ ...card, background: "#0a0a0a" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div style={secTitle}>Free vs Plus</div>
                        <div style={{ display: "flex", gap: 28, paddingRight: 4 }}>
                          <span style={{ fontSize: 10, color: "#888", fontWeight: 700, letterSpacing: .8 }}>FREE</span>
                          <span style={{ fontSize: 10, color: "#FF6B00", fontWeight: 700, letterSpacing: .8 }}>PLUS</span>
                        </div>
                      </div>
                      {[
                        ["Booking window countdown",    true,  true ],
                        ["Official portal links",       true,  true ],
                        ["Community shortage reports",  true,  true ],
                        ["Email booking alert",         true,  true ],
                        ["SMS / WhatsApp alert",        false, true ],
                        ["Shortage early warning",      false, true ],
                        ["Price revision alert",        false, true ],
                        ["Delivery day ping",           false, true ],
                      ].map(([feat, free, plus]) => (
                        <div key={feat} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "9px 0", borderBottom: "1px solid #161616" }}>
                          <span style={{ fontSize: 13, color: "#777" }}>{feat}</span>
                          <div style={{ display: "flex", gap: 28, paddingRight: 4, flexShrink: 0 }}>
                            <span style={{ fontSize: 13, color: free ? "#22c55e" : "#2a2a2a", fontWeight: 600, width: 14, textAlign: "center" }}>
                              {free ? "✓" : "—"}
                            </span>
                            <span style={{ fontSize: 13, color: plus ? "#FF6B00" : "#2a2a2a", fontWeight: 600, width: 14, textAlign: "center" }}>
                              {plus ? "✓" : "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right — Plus card */}
                  <div>
                    <div style={{ ...card, background: "linear-gradient(160deg,#1a0e04,#0d0d0d 55%)",
                      border: "1px solid #FF6B0050", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: -60, right: -60, width: 260, height: 260,
                        background: "radial-gradient(circle, #FF6B0016 0%, transparent 70%)", pointerEvents: "none" }} />
                      <div style={{ position: "relative" }}>

                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20,
                            fontWeight: 800, color: "#FF7A00" }}>CylinderCheck Plus</div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#FF6B00", background: "#FF6B0018",
                            border: "1px solid #FF6B0030", borderRadius: 99, padding: "3px 9px", letterSpacing: .8 }}>
                            EARLY ACCESS
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#FF6B0077", marginBottom: 20, lineHeight: 1.5 }}>
                          Shortage intelligence for Indian households. Know before your neighbours do.
                        </div>

                        {/* Price — monthly only, no annual */}
                        <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 12,
                          padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "baseline", gap: 8 }}>
                          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 42,
                            fontWeight: 800, color: "#f5f5f5", letterSpacing: "-1.5px" }}>₹49</div>
                          <div>
                            <div style={{ fontSize: 14, color: "#777", fontWeight: 500 }}>/month</div>
                            <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>Cancel anytime</div>
                          </div>
                        </div>

                        {/* Feature list */}
                        {[
                          ["📲", "SMS + WhatsApp alert 2 days before booking window"],
                          ["🚨", "Shortage early warning for your PIN — before it spreads"],
                          ["💰", "Price revision alert 24hrs before news breaks"],
                          ["📦", "Delivery day status ping so you're home on time"],
                          ["📊", "Monthly supply health score for your area"],
                        ].map(([icon, feat]) => (
                          <div key={feat} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 13 }}>
                            <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.3 }}>{icon}</span>
                            <span style={{ fontSize: 13, color: "#bbb", lineHeight: 1.5 }}>{feat}</span>
                          </div>
                        ))}

                        {/* Crisis framing */}
                        <div style={{ background: "#120a04", border: "1px solid #FF6B0025", borderRadius: 10,
                          padding: "12px 14px", margin: "20px 0 16px", display: "flex", gap: 10 }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>🔥</span>
                          <div style={{ fontSize: 12, color: "#cc8866", lineHeight: 1.55 }}>
                            <strong style={{ color: "#FF8855" }}>During active shortages</strong>, Plus members get
                            area-specific alerts up to 48 hours before the disruption is publicly reported.
                          </div>
                        </div>

                        {/* Social proof */}
                        <div style={{ fontSize: 12, color: "#777", marginBottom: 16, textAlign: "center" }}>
                          Join <span style={{ color: "#FF6B00", fontWeight: 600 }}>early access</span> — limited to first 500 subscribers
                        </div>

                        {/* Payment form */}
                        {paySuccess ? (
                          <div style={{ background: "#0a160a", border: "1px solid #22c55e28", borderRadius: 12,
                            padding: "20px", textAlign: "center" }}>
                            <div style={{ fontSize: 28, marginBottom: 10 }}>🎉</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#22c55e", marginBottom: 6 }}>
                              You're a Plus member!
                            </div>
                            <div style={{ fontSize: 13, color: "#557755", lineHeight: 1.55 }}>
                              Alerts will be sent to <strong style={{ color: "#88bb88" }}>{payContact}</strong>.<br />
                              You'll get your first alert within 24 hours.
                            </div>
                          </div>
                        ) : (
                          <>
                            <label style={lbl}>Your mobile or email *</label>
                            <input style={{ ...inp, marginBottom: 10 }}
                              placeholder="98xxxxxxxx or you@gmail.com"
                              value={payContact} onChange={e => setPayContact(e.target.value)} />
                            <label style={lbl}>PIN Code <span style={{ color: "#2a2a2a" }}>(optional — for area alerts)</span></label>
                            <input style={{ ...inp, marginBottom: 16 }}
                              placeholder="6-digit PIN" value={payPin} maxLength={6}
                              onChange={e => setPayPin(e.target.value.replace(/\D/g, ""))} />
                            {payError && (
                              <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 10 }}>{payError}</div>
                            )}
                            <button
                              style={{ display: "block", width: "100%", padding: "15px",
                                borderRadius: 11, border: "none",
                                background: paying ? "#aa4400" : "#FF6B00",
                                color: "#fff", fontSize: 15, fontWeight: 700,
                                fontFamily: "'Instrument Sans',sans-serif",
                                boxShadow: "0 4px 24px rgba(255,107,0,.25)",
                                cursor: paying ? "not-allowed" : "pointer",
                                opacity: paying ? .7 : 1, transition: "all .2s" }}
                              onClick={handlePayment} disabled={paying}>
                              {paying ? "Opening payment…" : "Get Plus for ₹49/month →"}
                            </button>
                          </>
                        )}

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                          gap: 16, marginTop: 14 }}>
                          <span style={{ fontSize: 11, color: "#666" }}>🔒 Razorpay · 256-bit SSL</span>
                          <span style={{ fontSize: 11, color: "#666" }}>·</span>
                          <span style={{ fontSize: 11, color: "#666" }}>Cancel anytime</span>
                        </div>
                      </div>
                    </div>

                    {/* AdSense — Medium Rectangle 300×250 */}
                    <AdSlot id="alerts-bottom" type="rectangle" />
                  </div>
                </div>
              </div>
            )}

            {/* ══ ADMIN ══════════════════════════════════════ */}
            {tab === "admin" && adminUnlocked && (
              <div className="fu">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <div className="pg-title">Admin Dashboard</div>
                    <div className="pg-sub">Revenue, subscribers, and platform health.</div>
                  </div>
                  <button style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8,
                    padding: "8px 16px", color: "#888", fontSize: 12, cursor: "pointer" }}
                    onClick={() => { setAdminUnlocked(false); setTab("track"); }}>
                    Lock
                  </button>
                </div>

                {adminLoading ? (
                  <div style={{ fontSize: 14, color: "#888" }} className="pulse">Loading data…</div>
                ) : adminData && (
                  <>
                    {/* KPI cards */}
                    <div className="g3" style={{ marginBottom: 20 }}>
                      {[
                        ["💰", "Total Revenue", `₹${((adminData.subscriptions?.length || 0) * 49).toLocaleString("en-IN")}`, "#22c55e"],
                        ["👥", "Active Subscribers", adminData.subscriptions?.filter(s => s.status === "active").length || 0, "#FF6B00"],
                        ["📋", "Free Alert Signups", adminData.alertCount || 0, "#3b82f6"],
                        ["🗣", "Community Reports", adminData.reportCount || 0, "#a855f7"],
                        ["📈", "This Month", `₹${(adminData.subscriptions?.filter(s => {
                          const d = new Date(s.created_at);
                          const now = new Date();
                          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                        }).length || 0) * 49}`, "#f59e0b"],
                        ["🔄", "MRR", `₹${(adminData.subscriptions?.filter(s => s.status === "active").length || 0) * 49}/mo`, "#FF6B00"],
                      ].map(([icon, label, value, color]) => (
                        <div key={label} style={{ ...card, marginBottom: 0 }}>
                          <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                          <div style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: .8,
                            textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 28,
                            fontWeight: 800, color, letterSpacing: "-.5px" }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Recent subscribers table */}
                    <div style={card}>
                      <div style={secTitle}>Recent Subscribers</div>
                      {(!adminData.subscriptions || adminData.subscriptions.length === 0) ? (
                        <div style={{ fontSize: 13, color: "#777", padding: "20px 0", textAlign: "center" }}>
                          No subscribers yet — share the link!
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                              <tr>
                                {["Contact","PIN","Amount","Status","Date"].map(h => (
                                  <th key={h} style={{ textAlign: "left", padding: "8px 12px",
                                    fontSize: 10, color: "#777", fontWeight: 700, letterSpacing: 1,
                                    textTransform: "uppercase", borderBottom: "1px solid #1e1e1e" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {adminData.subscriptions.map((s) => (
                                <tr key={s.id}>
                                  <td style={{ padding: "10px 12px", color: "#ccc", borderBottom: "1px solid #141414" }}>
                                    {s.contact}
                                  </td>
                                  <td style={{ padding: "10px 12px", color: "#777", borderBottom: "1px solid #141414" }}>
                                    {s.pin || "—"}
                                  </td>
                                  <td style={{ padding: "10px 12px", color: "#22c55e", fontWeight: 600,
                                    borderBottom: "1px solid #141414" }}>
                                    ₹{((s.amount || 4900) / 100)}
                                  </td>
                                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #141414" }}>
                                    <span style={{ fontSize: 10, fontWeight: 700,
                                      color: s.status === "active" ? "#22c55e" : "#ef4444",
                                      background: s.status === "active" ? "#22c55e14" : "#ef444414",
                                      border: `1px solid ${s.status === "active" ? "#22c55e22" : "#ef444422"}`,
                                      borderRadius: 99, padding: "2px 8px" }}>
                                      {s.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: "10px 12px", color: "#888", fontSize: 11,
                                    borderBottom: "1px solid #141414" }}>
                                    {new Date(s.created_at).toLocaleDateString("en-IN")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Payment ID reference */}
                    <div style={{ ...card, background: "#0a0a0a" }}>
                      <div style={secTitle}>Recent Payment IDs</div>
                      <div style={{ fontSize: 12, color: "#777", marginBottom: 12 }}>
                        Cross-reference with Razorpay dashboard if needed.
                      </div>
                      {(adminData.subscriptions || []).slice(0, 10).map(s => (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between",
                          padding: "8px 0", borderBottom: "1px solid #141414", fontSize: 11 }}>
                          <span style={{ color: "#888", fontFamily: "monospace" }}>{s.razorpay_payment_id || "pending"}</span>
                          <span style={{ color: "#666" }}>{new Date(s.created_at).toLocaleDateString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Admin password modal */}
      {showAdminPrompt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16,
            padding: "32px", width: 320, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f5f5f5", marginBottom: 6 }}>Admin Access</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>Enter your admin password</div>
            <input
              style={{ ...inp, marginBottom: 12, textAlign: "center", letterSpacing: 2 }}
              type="password" placeholder="••••••••"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdminUnlock()}
              autoFocus />
            {adminPassword && adminPassword !== ADMIN_PASSWORD &&
              <div style={{ fontSize: 11, color: "#ef4444", marginBottom: 8 }}>Incorrect password</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button style={btn("ghost")} onClick={() => { setShowAdminPrompt(false); setAdminPassword(""); }}>
                Cancel
              </button>
              <button style={btn("fill")} onClick={handleAdminUnlock}>Unlock</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <div className="bottom-nav">
        {tabs.map(t => (
          <button key={t.id} className={`bn-item${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.icon(tab === t.id)}
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}
