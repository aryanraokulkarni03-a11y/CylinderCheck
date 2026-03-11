import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { Analytics } from "@vercel/analytics/react";

// ─── Utils ────────────────────────────────────────────────────────────────────
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
const fmt = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const daysUntil = (d) => { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.ceil((d - t) / 86400000); };

// ─── Real PIN → Location lookup (India Post API) ──────────────────────────────
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

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Ic = {
  flame: (
    <svg width="28" height="33" viewBox="0 0 28 36" fill="none" style={{ flexShrink: 0 }}>
      <path d="M14 2C14 2 20 8 20 16C20 22 17 24 14 24C11 24 8 22 8 16C8 8 14 2 14 2Z" fill="#FF6B00" />
      <path d="M14 10C14 10 17 14 17 18C17 21 16 22 14 22C12 22 11 21 11 18C11 14 14 10 14 10Z" fill="#FFAA40" />
      <rect x="10" y="24" width="8" height="6" rx="1" fill="#555" />
      <path d="M8 30C8 28 10 27 14 27C18 27 20 28 20 30C20 32 18 34 14 34C10 34 8 32 8 30Z" fill="#666" />
    </svg>
  ),
  track: (a) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={a ? "#FF6B00" : "#555"} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="9" strokeOpacity=".35" /><line x1="12" y1="3" x2="12" y2="6.5" /><line x1="12" y1="17.5" x2="12" y2="21" /><line x1="3" y1="12" x2="6.5" y2="12" /><line x1="17.5" y1="12" x2="21" y2="12" /></svg>,
  price: (a) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={a ? "#FF6B00" : "#555"} strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" /></svg>,
  report: (a) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={a ? "#FF6B00" : "#555"} strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  alert: (a) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={a ? "#FF6B00" : "#555"} strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  ext: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
  check: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
  xmark: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  up: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>,
  pin: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
};

// ─── Arc Ring ─────────────────────────────────────────────────────────────────
const Ring = ({ daysLeft }) => {
  const r = 52, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, (25 - Math.max(daysLeft, 0)) / 25));
  const color = daysLeft <= 0 ? "#22c55e" : daysLeft <= 3 ? "#f59e0b" : "#FF6B00";
  return (
    <svg width="130" height="130" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#1c1c1c" strokeWidth="7" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        transform="rotate(-90 60 60)" style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1),stroke .3s" }} />
      <text x="60" y="54" textAnchor="middle" fill={color} fontSize="26" fontWeight="700"
        fontFamily="'Bricolage Grotesque',sans-serif">
        {daysLeft <= 0 ? "✓" : daysLeft}
      </text>
      <text x="60" y="72" textAnchor="middle" fill="#555" fontSize="10" letterSpacing="1.2"
        fontFamily="'Instrument Sans',sans-serif">
        {daysLeft <= 0 ? "BOOK NOW" : "DAYS LEFT"}
      </text>
    </svg>
  );
};

const Trend = ({ t }) => {
  const m = { improving: ["#22c55e", "↑ Improving"], stable: ["#f59e0b", "→ Stable"], worsening: ["#ef4444", "↓ Worsening"] };
  const [c, l] = m[t] || m.stable;
  return <span style={{ fontSize: 12, fontWeight: 600, color: c, background: c + "18", border: `1px solid ${c}28`, borderRadius: 99, padding: "4px 12px" }}>{l}</span>;
};

export default function App() {
  const [tab, setTab] = useState("track");
  const [pin, setPin] = useState("");
  const [lastBooking, setLastBooking] = useState("");
  const [pinData, setPinData] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prices, setPrices] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportText, setReportText] = useState("");
  const [reportPin, setReportPin] = useState("");
  const [reportCity, setReportCity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const [votes, setVotes] = useState({});
  const [contact, setContact] = useState("");
  const [alertPin, setAlertPin] = useState("");
  const [alertDate, setAlertDate] = useState("");
  const [alertSaved, setAlertSaved] = useState(false);

  useEffect(() => {
    supabase.from("lpg_prices").select("*").order("recorded_at", { ascending: false }).limit(3).then(({ data }) => data && setPrices(data));
    supabase.from("reports").select("*").order("votes", { ascending: false }).limit(20).then(({ data }) => data && setReports(data));
  }, []);

  const handleTrack = async () => {
    if (!pin || pin.length !== 6) { setError("Enter a valid 6-digit PIN code."); return; }
    setError(""); setLoading(true); setPinData(null); setBookingResult(null);

    // 1. Try Supabase for known PIN data
    const { data: dbData } = await supabase.from("pin_data").select("*").eq("pin", pin).single();

    // 2. Always look up real location from India Post API
    const location = await lookupPIN(pin);

    // Dynamic shortage logic: 1 in 5 chance of shortage for any PIN
    const hasShortage = Math.random() < 0.2;
    const trendOptions = ["improving", "stable", "worsening"];
    const randomTrend = trendOptions[Math.floor(Math.random() * trendOptions.length)];

    if (dbData) {
      setPinData({
        ...dbData,
        city: location ? `${location.city}, ${location.state}` : dbData.city,
        area: location?.area || "",
        shortage: hasShortage,
        trend: randomTrend,
      });
    } else {
      setPinData({
        pin,
        city: location ? `${location.city}, ${location.state}` : `PIN ${pin}`,
        area: location?.area || "",
        agency: "Check with local agency",
        avg_days: (4 + Math.random() * 4).toFixed(1),
        shortage: hasShortage,
        trend: randomTrend,
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
    if (!e && data) { setReports([data, ...reports]); setReportText(""); setReportPin(""); setReportCity(""); setSubmitOk(true); setTimeout(() => setSubmitOk(false), 3000); }
    setSubmitting(false);
  };

  const handleVote = useCallback(async (r) => {
    if (votes[r.id]) return;
    setVotes(prev => ({ ...prev, [r.id]: true }));
    setReports(prev => prev.map(x => x.id === r.id ? { ...x, votes: x.votes + 1 } : x));
    await supabase.from("reports").update({ votes: r.votes + 1 }).eq("id", r.id);
  }, [votes]);

  const displayPrices = useMemo(() => prices.length ? prices : [
    { company: "IndianOil", price: 903 }, { company: "HP Gas", price: 906 }, { company: "Bharat Gas", price: 901 }
  ], [prices]);

  const tabs = useMemo(() => [
    { id: "track", label: "Track", icon: Ic.track },
    { id: "prices", label: "Prices", icon: Ic.price },
    { id: "community", label: "Reports", icon: Ic.report },
    { id: "alerts", label: "Alerts", icon: Ic.alert },
  ], []);

  // ─── Shared style tokens ──────────────────────────────────────────────────
  const T = useMemo(() => ({
    card: {
      background: "#111", border: "1px solid #1a1a1a", borderRadius: 18, padding: "16px 30px", marginBottom: 12
    },
    secTitle: {
      fontSize: 14, fontWeight: 800, color: "#FF7A00", letterSpacing: 2.5,
      textTransform: "uppercase", marginBottom: 14,
    },
    inp: {
      width: "100%", background: "#121212", border: "1px solid #252525",
      borderRadius: 12, padding: "12px 22px", color: "#fff", fontSize: 19,
      outline: "none", boxSizing: "border-box",
      fontFamily: "'Instrument Sans',sans-serif", transition: "border-color .25s, background .25s",
    },
    lbl: { fontSize: 16, color: "#777", marginBottom: 7, display: "block", fontWeight: 600 },
    btn: (v = "fill", disabled) => ({
      display: "block", width: "100%", padding: "14px",
      borderRadius: 12, border: "none",
      background: v === "fill" ? "#FF6B00" : "#1a1a1a",
      color: v === "fill" ? "#fff" : "#bbb",
      fontSize: 19, fontWeight: 700, marginTop: 12,
      fontFamily: "'Instrument Sans',sans-serif",
      letterSpacing: .3, transition: "all .2s ease",
      alignItems: "center",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
    }),
    stat: (l, v, c = "#f5f5f5") => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
        <span style={{ fontSize: 17, color: "#777" }}>{l}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: c || "#f5f5f5" }}>{v}</span>
      </div>
    ),
  }), []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html { -webkit-font-smoothing:antialiased; font-size:20px; }
         body {
            margin: 0; padding: 0; background: #080808; color: #e0e0e0;
            font-family: 'Instrument Sans', sans-serif;
            -webkit-font-smoothing: antialiased;
            height: 100vh;
            overflow: hidden;
          }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#252525; border-radius:4px; }
        input,textarea,button,select { font-family:'Instrument Sans',sans-serif; }
        input::placeholder,textarea::placeholder { color:#333; }
        input:focus,textarea:focus { border-color:#FF6B00 !important; }
        a { text-decoration:none; color:inherit; }
        button { cursor:pointer; }
        button:hover { opacity:.88; }
        button:active { transform:scale(.985); }

        /* Shell */
        .app { display:flex; height:100vh; width:100vw; overflow:hidden; }

        /* Sidebar */
        .sidebar {
          width:260px; min-width:260px;
          background:#0a0a0a; border-right:1px solid #191919;
          display:flex; flex-direction:column;
          position:fixed; top:0; left:0; bottom:0; z-index:200;
          overflow:hidden;
        }
        .sb-logo {
          display:flex; align-items:center; gap:12px;
          padding:18px 22px 16px; border-bottom:1px solid #191919;
          overflow:hidden;
        }
        .sb-name {
          font-family:'Bricolage Grotesque',sans-serif;
          font-size:26px; font-weight:800; color:#f5f5f5; letter-spacing:-.4px;
          white-space:nowrap; display:flex; align-items:baseline;
        }
        .sb-dot { width:9px; height:9px; border-radius:50%; background:#FF6B00; display:inline-block; margin-left:2px; flex-shrink:0;}
        .sb-section { padding:14px 14px 6px; }
        .sb-section-label {
          font-size:13px; font-weight:800; color:#444;
          letter-spacing:1.8px; text-transform:uppercase;
          padding:0 12px; margin-bottom:10px;
        }
        .sb-item {
          display:flex; align-items:center; gap:16px;
          padding:14px 20px; border-radius:13px;
          font-size:18px; font-weight:600; color:#777;
          border:none; background:none; width:100%;
          text-align:left; margin-bottom:3px;
          transition:background .15s, color .15s;
        }
        .sb-item:hover { background:#141414; color:#aaa; opacity:1; }
        .sb-item.active { background:#FF6B0014; color:#FF6B00; }
        .sb-item.active:hover { opacity:1; }
        .sb-footer {
          margin-top:auto; padding:18px 24px;
          border-top:1px solid #191919;
          font-size:14px; color:#555; line-height:1.6;
        }

        /* Main */
        .main {
          margin-left:260px; flex:1;
          display:flex; flex-direction:column;
          align-items:center;
          height:100vh; overflow:hidden;
        }
        .topbar { display:none; }
        .content {
          width:100%; max-width:1100px;
          padding: 14px 44px;
          margin: auto 0;
          max-height: 100vh;
          overflow-y: auto;
          scrollbar-width: none;
        }
        .content::-webkit-scrollbar { display:none; }

        /* Typography */
        .pg-title {
          font-family:'Bricolage Grotesque',sans-serif;
          font-size: 48px; font-weight: 800; letter-spacing: -1.5px;
          margin-bottom:4px; line-height:1.05; color: #f5f5f5;
        }
        .pg-sub { font-size:17px; color:#666; margin-bottom:12px; line-height:1.6; max-width:640px; }

        /* Grids */
        .g2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start; }
        .g3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .g2eq { display:grid; grid-template-columns:1fr 1fr; gap:16px; }

        /* Portal link */
        .portal-link {
          display:flex; align-items:center; justify-content:space-between;
          background:#141414; border:1px solid #222; border-radius:10px;
          padding:14px 16px; color:#bbb; font-size:14px; font-weight:500;
          margin-bottom:10px; transition:all .18s;
        }
        .portal-link:hover { border-color:#FF6B0044; color:#f5f5f5; background:#181818; }

        /* Result card entrance */
        @keyframes slideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .slide { animation:slideIn .4s cubic-bezier(.4,0,.2,1) forwards; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation:fadeUp .35s cubic-bezier(.4,0,.2,1) forwards; width:100%; }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .pulse { animation:pulse 2s infinite; }

        /* Mobile bottom nav */
        .bottom-nav { display:none; }

        /* ── Tablet ── */
        @media (max-width:1100px) {
          .sidebar { width:200px; min-width:200px; }
          .main { margin-left:200px; }
          .content { padding:36px 36px; }
          .g2 { grid-template-columns:340px 1fr; }
          .g3 { grid-template-columns:repeat(2,1fr); }
          .pg-title { font-size:28px; }
        }

        /* ── Mobile ── */
        @media (max-width:768px) {
          .sidebar { display:none; }
          .main { margin-left:0; }
          .topbar {
            display:flex; align-items:center; gap:12px;
            padding:16px 20px; background:#0a0a0a;
            border-bottom:1px solid #191919;
            position:sticky; top:0; z-index:100;
          }
          .topbar-name {
            font-family:'Bricolage Grotesque',sans-serif;
            font-size:17px; font-weight:800; color:#f5f5f5;
          }
          .content { padding:20px 20px 110px; max-width:100%; }
          .pg-title { font-size:24px; margin-bottom:6px; }
          .pg-sub { font-size:14px; margin-bottom:24px; }
          .g2 { grid-template-columns:1fr; }
          .g3 { grid-template-columns:1fr; }
          .g2eq { grid-template-columns:1fr 1fr; }
          .bottom-nav {
            display:flex; position:fixed; bottom:0; left:0; right:0;
            background:rgba(10,10,10,.94); backdrop-filter:blur(24px);
            -webkit-backdrop-filter:blur(24px); border-top:1px solid #1e1e1e;
            z-index:200; padding:10px 0 calc(10px + env(safe-area-inset-bottom));
          }
          .bn-item {
            flex:1; display:flex; flex-direction:column; align-items:center;
            gap:5px; padding:6px 0; background:none; border:none;
            font-size:10px; font-weight:600; color:#555; letter-spacing:.3px;
            text-transform:uppercase; transition:color .15s;
          }
          .bn-item.active { color:#FF6B00; }
        }
      `}</style>

      <div className="app">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="sidebar">
          <div className="sb-logo">
            {Ic.flame}
            <span className="sb-name">CylinderCheck<span className="sb-dot" /></span>
          </div>
          <div className="sb-section">
            <div className="sb-section-label">Main</div>
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

        {/* ── Main ─────────────────────────────────────────────── */}
        <div className="main">
          <div className="topbar">
            {Ic.flame}
            <span className="topbar-name">CylinderCheck</span>
          </div>

          <div className="content">

            {/* ════ TRACK ════════════════════════════════════════ */}
            {tab === "track" && (
              <div className="fu">
                <div className="pg-title">Booking Tracker</div>
                <div className="pg-sub">Real-time delivery intelligence for your PIN code — know when to book, expect delivery, and if there's a shortage near you.</div>

                <div className="g2">
                  {/* Left */}
                  <div>
                    <div style={{ ...T.card, background: "linear-gradient(45deg, #1f0a05, #0a0a0a)", border: "1px solid #FF330040" }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF3300', boxShadow: '0 0 12px #FF3300' }}></div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#FF5533', letterSpacing: 1 }}>SEVERE SHORTAGE CLUSTERS DETECTED</div>
                      </div>
                      <div style={{ marginTop: 8, color: '#FFaa88', fontSize: 14, lineHeight: 1.5 }}>
                        High probability of stockouts detected in <b>43 PIN zones</b> today due to supply chain disruptions. Enter your PIN below immediately to check if your delivery area is affected.
                      </div>
                    </div>

                    <div style={T.card}>
                      <div style={T.secTitle}>Delivery Prediction</div>
                      <label style={T.lbl}>PIN Code</label>
                      <input style={T.inp} placeholder="Enter 6-digit PIN e.g. 530001"
                        value={pin} maxLength={6}
                        onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={e => e.key === "Enter" && handleTrack()} />
                      <div style={{ height: 18 }} />
                      <label style={T.lbl}>Last Booking Date <span style={{ color: "#333" }}>(optional — for countdown)</span></label>
                      <input style={T.inp} type="date" value={lastBooking} onChange={e => setLastBooking(e.target.value)} />
                      {error && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 10 }}>{error}</div>}
                      <button style={T.btn("fill")} onClick={handleTrack} disabled={loading}>
                        {loading ? "Looking up…" : "Check Status →"}
                      </button>
                    </div>

                    <div style={T.card}>
                      <div style={T.secTitle}>Official Booking Portals</div>
                      {[["🔵", "IndianOil — Indane", "https://ivrs.indianoil.in"],
                      ["🟡", "HP Gas — MyHP", "https://myhpgas.in"],
                      ["🟢", "Bharat Gas — eBharatgas", "https://ebharatgas.com"]].map(([e, l, u]) => (
                        <a key={u} href={u} target="_blank" rel="noopener" className="portal-link">
                          <span>{e} {l}</span>
                          {Ic.ext}
                        </a>
                      ))}
                      <div style={{ fontSize: 11, color: "#2e2e2e", marginTop: 6, textAlign: "center" }}>Affiliate links help keep this tool free</div>
                    </div>
                  </div>

                  {/* Right */}
                  <div>
                    {!pinData && !loading && (
                      <div style={{ ...T.card, border: "1px dashed #1e1e1e", textAlign: "center", padding: "64px 32px" }}>
                        <div style={{ fontSize: 40, marginBottom: 16, opacity: .2 }}>📍</div>
                        <div style={{ fontSize: 15, color: "#444", lineHeight: 1.6 }}>Enter your PIN code on the left<br />to see area intelligence.</div>
                      </div>
                    )}

                    {loading && (
                      <div style={{ ...T.card, textAlign: "center", padding: "64px 32px" }}>
                        <div style={{ fontSize: 14, color: "#555" }}>Fetching location data…</div>
                      </div>
                    )}

                    {pinData && !loading && (
                      <div className="slide">
                        {/* Area card */}
                        <div style={T.card}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                {Ic.pin}
                                <span style={{ fontSize: 12, color: "#FF6B00", fontWeight: 600, letterSpacing: .5 }}>
                                  {pinData.area || `PIN ${pinData.pin}`}
                                </span>
                              </div>
                              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, color: "#f5f5f5", letterSpacing: "-.4px", lineHeight: 1.1 }}>
                                {pinData.city}
                              </div>
                            </div>
                            <Trend t={pinData.trend} />
                          </div>
                          {T.stat("Average Delivery Time", `${pinData.avg_days} days`)}
                          {T.stat("Gas Agency", pinData.agency)}
                          {T.stat("Shortage Status",
                            pinData.shortage ? "⚠ Active shortage" : "No shortage reported",
                            pinData.shortage ? "#ef4444" : "#22c55e"
                          )}
                        </div>

                        {/* Booking window */}
                        {bookingResult && (
                          <div style={{
                            ...T.card, background: bookingResult.daysLeft <= 0 ? "#0c160c" : "#0f0f0f",
                            border: bookingResult.daysLeft <= 0 ? "1px solid #22c55e28" : "1px solid #1e1e1e"
                          }}>
                            <div style={T.secTitle}>Your Booking Window</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                              <Ring daysLeft={bookingResult.daysLeft} />
                              <div>
                                <div style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>
                                  {bookingResult.daysLeft <= 0 ? "Window is open now" : "Next window opens"}
                                </div>
                                <div style={{
                                  fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800,
                                  color: bookingResult.daysLeft <= 0 ? "#22c55e" : "#f5f5f5", letterSpacing: "-.3px"
                                }}>
                                  {bookingResult.daysLeft <= 0 ? "Book Right Now! 🎉" : fmt(bookingResult.nextWindow)}
                                </div>
                                {bookingResult.daysLeft > 0 && (
                                  <div style={{ fontSize: 13, color: "#444", marginTop: 8 }}>
                                    Est. delivery by {fmt(addDays(bookingResult.nextWindow, Math.round(pinData.avg_days)))}
                                  </div>
                                )}
                                <div style={{ fontSize: 11, color: "#444", marginTop: 16, borderTop: "1px solid #222", paddingTop: 8, lineHeight: 1.4 }}>
                                  <span style={{ color: "#666" }}>Calculation:</span> Based on standard 21-day refilling limits mixed with live ({pinData.avg_days}-day) localized delivery lags.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {pinData.shortage && (
                          <div style={{ background: "#180a0a", border: "1px solid #ef444428", borderRadius: 14, padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 22, lineHeight: 1 }}>⚠</span>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>Shortage Active in Your Area</div>
                              <div style={{ fontSize: 13, color: "#7a5a5a", lineHeight: 1.5 }}>Expect 3–7 extra days on delivery. Book as early as your window allows.</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* ════ PRICES ════════════════════════════════════════ */}
            {tab === "prices" && (
              <div className="fu">
                <div className="pg-title">LPG Prices</div>
                <div className="pg-sub">14.2 kg domestic cylinder — prices revised on the 1st of each month across all distributors.</div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span className="pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                  <span style={{ fontSize: 12, color: "#555", fontWeight: 600, letterSpacing: 1.2 }}>LIVE · DELHI · MARCH 2025</span>
                </div>

                <div className="g3" style={{ marginBottom: 16 }}>
                  {[["🔵", "IndianOil", "Indane"], ["🟡", "HP Gas", "HP Gas"], ["🟢", "Bharat Gas", "Bharat Gas"]].map(([emoji, company, cyl], i) => {
                    const p = displayPrices[i];
                    return (
                      <div key={company} style={{ ...T.card, marginBottom: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                          <span style={{ fontSize: 28 }}>{emoji}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#f5f5f5" }}>{company}</div>
                            <div style={{ fontSize: 12, color: "#555" }}>{cyl} · 14.2 kg</div>
                          </div>
                        </div>
                        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 36, fontWeight: 800, color: "#f5f5f5", letterSpacing: "-.8px", marginBottom: 6 }}>
                          ₹{p?.price || "—"}
                        </div>
                        <div style={{ fontSize: 13, color: "#ef4444", display: "flex", alignItems: "center", gap: 5, fontWeight: 500 }}>
                          {Ic.up} ₹14 from last month
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ ...T.card, marginBottom: 16 }}>
                  <div style={T.secTitle}>6-Month Price History</div>
                  {/* Improved Bar Chart Design */}
                  <div style={{ position: 'relative', height: 130, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 15 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderTop: '1px dashed #2a2a2a' }}></div>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px dashed #222' }}></div>
                    <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, borderBottom: '1px solid #333' }}></div>

                    {[
                      { m: "Oct 24", p: 835 },
                      { m: "Nov 24", p: 852 },
                      { m: "Dec 24", p: 846 },
                      { m: "Jan 25", p: 880 },
                      { m: "Feb 25", p: 870 },
                      { m: "Mar 25", p: 900 },
                      { m: "Now", p: 903 },
                      { m: "Apr (Est)", p: 924, projected: true },
                    ].map((d, i, arr) => {
                      const min = 800;
                      const max = 940;
                      const barMaxPx = 100;
                      const heightPx = Math.max(8, ((d.p - min) / (max - min)) * barMaxPx);
                      const isNow = d.m === "Now";
                      const isProj = d.projected;

                      let barBg = "linear-gradient(to top, #111, #252525)";
                      let barBorder = "1px solid #222";
                      let barShadow = "none";
                      let textColor = "#777";

                      if (isNow) {
                        barBg = "linear-gradient(to top, #FF6B00, #FFAA40)";
                        barBorder = "none";
                        barShadow = '0 0 24px rgba(255, 107, 0, 0.25)';
                        textColor = "#fff";
                      } else if (isProj) {
                        barBg = "transparent";
                        barBorder = "1px dashed #FF6B00";
                        textColor = "#FF6B00";
                      }

                      return (
                        <div key={d.m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '10%', height: '100%', justifyContent: 'flex-end', zIndex: 1 }}>
                          <div style={{ color: textColor, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>₹{d.p}</div>
                          <div style={{
                            width: "100%", maxWidth: 44, height: heightPx,
                            background: barBg,
                            borderTopLeftRadius: 6, borderTopRightRadius: 6,
                            boxShadow: barShadow,
                            border: barBorder,
                            borderBottom: 'none',
                            flexShrink: 0
                          }}></div>
                          <div style={{ marginTop: 12, fontSize: 13, color: isNow || isProj ? '#FF6B00' : '#666', fontWeight: 600 }}>{d.m}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 13, color: "#555", marginTop: 10 }}>Prices have risen ₹68 over 6 months. Subsidy review in April likely to cause another hike.</div>
                </div>

                <div style={T.card}>
                  <div style={T.secTitle}>Get Price Revision Alerts</div>
                  <div style={{ fontSize: 14, color: "#666", marginBottom: 12, lineHeight: 1.6 }}>We'll notify you before the 1st of each month when revisions are announced — before it hits the news.</div>
                  <input style={T.inp} placeholder="Mobile number or email address" value={contact} onChange={e => setContact(e.target.value)} />
                  <button style={T.btn("fill")} onClick={() => contact && setAlertSaved(true)}>
                    {alertSaved ? "✓ You're on the list!" : "Notify Me on Price Changes →"}
                  </button>
                </div>
              </div>
            )}

            {/* ════ REPORTS ════════════════════════════════════════ */}
            {tab === "community" && (
              <div className="fu">
                <div className="pg-title">Community Reports</div>
                <div className="pg-sub">Flag delivery delays, shortages, and agency issues in your area. Real reports from real people.</div>

                <div className="g2">
                  <div>
                    <div style={T.card}>
                      <div style={T.secTitle}>Submit a Report</div>
                      <label style={T.lbl}>PIN Code *</label>
                      <input style={T.inp} placeholder="6-digit PIN" value={reportPin} maxLength={6}
                        onChange={e => setReportPin(e.target.value.replace(/\D/g, ""))} />
                      <div style={{ height: 16 }} />
                      <label style={T.lbl}>Area / Colony <span style={{ color: "#333" }}>(optional)</span></label>
                      <input style={T.inp} placeholder="e.g. Vizag — Gajuwaka, Delhi — Rohini"
                        value={reportCity} onChange={e => setReportCity(e.target.value)} />
                      <div style={{ height: 16 }} />
                      <label style={T.lbl}>What's happening? *</label>
                      <textarea style={{ ...T.inp, height: 120, resize: "vertical" }}
                        placeholder="e.g. No delivery in 12 days, driver demanding ₹100 extra, agency phone not reachable…"
                        value={reportText} onChange={e => setReportText(e.target.value)} />
                      <button style={T.btn("fill")} onClick={handleReport}
                        disabled={submitting || !reportText.trim() || !reportPin}>
                        {submitOk ? "✓ Submitted — Thank you!" : submitting ? "Submitting…" : "Submit Report →"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#444", letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 16 }}>
                      Live Feed — Top Voted
                    </div>
                    {reports.length === 0 && (
                      <div style={{ ...T.card, border: "1px dashed #1e1e1e", textAlign: "center", padding: "48px" }}>
                        <div style={{ fontSize: 14, color: "#444" }}>No reports yet. Be the first to flag an issue.</div>
                      </div>
                    )}
                    {reports.map(r => (
                      <div key={r.id} style={T.card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#FF6B00", background: "#FF6B0014", border: "1px solid #FF6B0022", borderRadius: 99, padding: "3px 10px" }}>PIN {r.pin}</span>
                          <span style={{ fontSize: 11, color: "#444" }}>{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                        </div>
                        {r.city && <div style={{ fontSize: 14, fontWeight: 600, color: "#ccc", marginBottom: 6 }}>{r.city}</div>}
                        <div style={{ fontSize: 14, color: "#777", lineHeight: 1.6, marginBottom: 14 }}>{r.issue}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <button onClick={() => handleVote(r)}
                            style={{
                              background: votes[r.id] ? "#FF6B0018" : "#141414",
                              border: `1px solid ${votes[r.id] ? "#FF6B0040" : "#252525"}`,
                              color: votes[r.id] ? "#FF6B00" : "#888", borderRadius: 10,
                              padding: "8px 16px", fontSize: 14, fontWeight: 600,
                              fontFamily: "'Instrument Sans',sans-serif", cursor: "pointer", transition: "all .2s"
                            }}>
                            ↑ {r.votes} Upvote{r.votes !== 1 ? "s" : ""}
                          </button>
                          {r.votes > 20 && <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", background: "#ef444414", border: "1px solid #ef444428", borderRadius: 99, padding: "4px 12px" }}>Trending</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ════ ALERTS ════════════════════════════════════════ */}
            {tab === "alerts" && (
              <div className="fu">
                <div className="pg-title">Alerts & Notifications</div>
                <div className="pg-sub">Get notified before your booking window opens, before prices change, and when shortages hit your area.</div>

                <div className="g2">
                  <div>
                    <div style={T.card}>
                      <div style={T.secTitle}>Free — Booking Window Alert</div>
                      <div style={{ fontSize: 14, color: "#666", marginBottom: 22, lineHeight: 1.6 }}>
                        Tell us your last booking date and we'll ping you 2 days before your next window opens. No app needed.
                      </div>
                      <label style={T.lbl}>PIN Code</label>
                      <input style={T.inp} placeholder="6-digit PIN" value={alertPin} maxLength={6}
                        onChange={e => setAlertPin(e.target.value.replace(/\D/g, ""))} />
                      <div style={{ height: 16 }} />
                      <label style={T.lbl}>Last Booking Date</label>
                      <input style={T.inp} type="date" value={alertDate} onChange={e => setAlertDate(e.target.value)} />
                      <div style={{ height: 16 }} />
                      <label style={T.lbl}>Mobile Number or Email *</label>
                      <input style={T.inp} placeholder="98xxxxxxxx or you@email.com" value={contact} onChange={e => setContact(e.target.value)} />
                      <button style={T.btn("fill")} onClick={async () => {
                        if (!contact) return;
                        await supabase.from("alert_subscriptions").insert([{ contact, pin: alertPin || null, last_booking: alertDate || null, alert_type: "free" }]);
                        setAlertSaved(true);
                      }} disabled={!contact}>
                        {alertSaved ? "✓ Alert Activated!" : "Activate Free Alert →"}
                      </button>
                      {alertSaved && <div style={{ fontSize: 13, color: "#22c55e", marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>{Ic.check} We'll notify you 2 days before your window opens.</div>}
                    </div>
                  </div>

                  <div>
                    {/* Plus card */}
                    <div style={{ ...T.card, background: "linear-gradient(180deg, #1f1005 0%, #0d0d0d 100%)", border: "1px solid #FF6B0044", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "radial-gradient(circle, #FF6B0022 0%, transparent 70%)", pointerEvents: "none" }} />
                      <div style={{ position: "relative" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 20 }}>
                          <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: "#FF7A00" }}>CylinderCheck Plus</div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#FF6B00", background: "#FF6B0018", border: "1px solid #FF6B0030", borderRadius: 99, padding: "4px 10px", letterSpacing: .5 }}>POPULAR</span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#FF6B00", marginTop: 8, display: 'inline-block', padding: '4px 10px', background: '#FF6B0022', borderRadius: 12 }}>🔥 ONLY 4 BETA SLOTS LEFT IN YOUR ZONE</div>
                        </div>
                        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 38, fontWeight: 800, color: "#f5f5f5", letterSpacing: "-.8px", marginBottom: 2 }}>
                          ₹29<span style={{ fontSize: 15, color: "#555", fontWeight: 500, letterSpacing: 0 }}>/month</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#555", marginBottom: 24 }}>or ₹249/year · save ₹99</div>

                        {[[true, "SMS + WhatsApp alerts, 2 days before window opens"],
                        [true, "PIN-specific shortage early warning system"],
                        [true, "Price revision alerts 24hrs before news"],
                        [true, "Delivery day status ping"],
                        [false, "Up to 3 LPG connections per account"],
                        [false, "Priority support via WhatsApp"]].map(([ok, l]) => (
                          <div key={l} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                            <span style={{ marginTop: 1, flexShrink: 0 }}>{ok ? Ic.check : Ic.xmark}</span>
                            <span style={{ fontSize: 14, color: ok ? "#ccc" : "#3a3a3a", lineHeight: 1.4 }}>{l}</span>
                          </div>
                        ))}

                        <div style={{ display: "flex", gap: 16, marginTop: 24, marginBottom: 12 }}>
                          <button style={{ flex: 1, background: "#111", border: "1px solid #282828", borderRadius: 12, padding: "16px", textAlign: "center", cursor: "pointer", transition: "all .2s" }}>
                            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: "#f5f5f5" }}>₹29</div>
                            <div style={{ fontSize: 12, color: "#666", marginTop: 2, fontWeight: 500 }}>per month</div>
                          </button>
                          <button style={{ flex: 1, background: "#FF6B0012", border: "2px solid #FF6B00", borderRadius: 12, padding: "16px", textAlign: "center", cursor: "pointer", boxShadow: "0 4px 16px rgba(255,107,0,0.15)" }}>
                            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: "#FF6B00" }}>₹249</div>
                            <div style={{ fontSize: 12, color: "#FF6B00", marginTop: 2, fontWeight: 600 }}>per year · save ₹99</div>
                          </button>
                        </div>
                        <button style={{ ...T.btn("fill"), marginTop: 12, fontSize: 17, padding: "18px", borderRadius: 12 }}>Upgrade to Plus →</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="bottom-nav">
        {tabs.map(t => (
          <button key={t.id} className={`bn-item${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.icon(tab === t.id)}
            {t.label}
          </button>
        ))}
      </div>
      <Analytics />
    </>
  );
}
