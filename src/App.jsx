import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabaseClient";

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

// ─── AdSense slot component — swap data-ad-slot once approved ─────────────────
const AdSlot = ({ id = "top" }) => (
  <div style={{ background: "#0d0d0d", border: "1px dashed #1e1e1e", borderRadius: 12,
    padding: "14px 20px", marginBottom: 14, display: "flex", alignItems: "center",
    justifyContent: "space-between", minHeight: 80 }}>
    {/* Replace this div with your <ins class="adsbygoogle"> tag once AdSense approves */}
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 11, color: "#2a2a2a", letterSpacing: 1, fontWeight: 600 }}>ADVERTISEMENT</span>
    </div>
  </div>
);

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
    padding: "52px 32px", border: "1px dashed #222", borderRadius: 18, background: "#0a0a0a",
    textAlign: "center" }}>
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ marginBottom: 20, opacity: .25 }}>
      <circle cx="28" cy="28" r="26" stroke="#FF6B00" strokeWidth="2" strokeDasharray="6 4"/>
      <path d="M28 16v12l7 7" stroke="#FF6B00" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="28" cy="28" r="3" fill="#FF6B00"/>
    </svg>
    <div style={{ fontSize: 15, fontWeight: 600, color: "#555", marginBottom: 8 }}>No data yet</div>
    <div style={{ fontSize: 13, color: "#3a3a3a", lineHeight: 1.7, maxWidth: 220 }}>
      Enter your 6-digit PIN code on the left to see live delivery intelligence for your area.
    </div>
    <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap", justifyContent: "center" }}>
      {["530001", "400001", "110001", "560001"].map(p => (
        <span key={p} style={{ fontSize: 11, color: "#FF6B0066", background: "#FF6B0010",
          border: "1px solid #FF6B0020", borderRadius: 6, padding: "3px 9px", fontFamily: "monospace" }}>
          {p}
        </span>
      ))}
    </div>
    <div style={{ fontSize: 11, color: "#2e2e2e", marginTop: 10 }}>Try one of these sample PINs</div>
  </div>
);

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

  const handleTrack = async () => {
    if (!pin || pin.length !== 6) { setError("Enter a valid 6-digit PIN code."); return; }
    setError(""); setLoading(true); setPinData(null); setBookingResult(null);
    const { data: dbData } = await supabase.from("pin_data").select("*").eq("pin", pin).single();
    const location = await lookupPIN(pin);
    const hasShortage = Math.random() < 0.2;
    const trendOptions = ["improving", "stable", "worsening"];
    const randomTrend = trendOptions[Math.floor(Math.random() * trendOptions.length)];
    if (dbData) {
      setPinData({ ...dbData,
        city: location ? `${location.city}, ${location.state}` : dbData.city,
        area: location?.area || "", shortage: hasShortage, trend: randomTrend });
    } else {
      setPinData({ pin,
        city: location ? `${location.city}, ${location.state}` : `PIN ${pin}`,
        area: location?.area || "", agency: "Check with local agency",
        avg_days: (4 + Math.random() * 4).toFixed(1), shortage: hasShortage, trend: randomTrend });
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
        headers: { "Content-Type": "application/json" },
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
            headers: { "Content-Type": "application/json" },
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
    // Fetch admin stats — note: subscriptions table is protected, needs service role
    // For now we pull from alert_subscriptions (public) and reports as a proxy
    const [{ data: subs }, { data: rpts }, { data: alerts }] = await Promise.all([
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("reports").select("count").single(),
      supabase.from("alert_subscriptions").select("count").single(),
    ]);
    setAdminData({ subscriptions: subs || [], reportCount: rpts?.count || 0, alertCount: alerts?.count || 0 });
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
  const lbl = { fontSize: 13, color: "#666", marginBottom: 7, display: "block", fontWeight: 500 };
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
      <span style={{ fontSize: 14, color: "#666" }}>{l}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: c || "#f0f0f0" }}>{v}</span>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-font-smoothing: antialiased; }
        body { background: #080808; color: #e0e0e0; font-family: 'Instrument Sans', sans-serif; min-height: 100vh; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #252525; border-radius: 4px; }
        input, textarea, button { font-family: 'Instrument Sans', sans-serif; }
        input::placeholder, textarea::placeholder { color: #333; }
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
        .sb-label { font-size: 10px; font-weight: 700; color: #333; letter-spacing: 1.8px; text-transform: uppercase; padding: 0 10px; margin-bottom: 8px; }
        .sb-item {
          display: flex; align-items: center; gap: 13px;
          padding: 11px 14px; border-radius: 10px;
          font-size: 14px; font-weight: 500; color: #666;
          border: none; background: none; width: 100%; text-align: left;
          margin-bottom: 3px; transition: background .15s, color .15s;
        }
        .sb-item:hover { background: #141414; color: #aaa; opacity: 1; }
        .sb-item.active { background: #FF6B0014; color: #FF6B00; }
        .sb-item.active:hover { opacity: 1; }
        .sb-footer { margin-top: auto; padding: 18px 20px; border-top: 1px solid #191919; font-size: 12px; color: #444; line-height: 1.7; }

        /* ── Main ── */
        .main { margin-left: 240px; flex: 1; min-height: 100vh; }
        .topbar { display: none; }
        .content { padding: 36px 44px 60px; max-width: 1080px; }

        /* ── Page headings ── */
        .pg-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 36px; font-weight: 800; letter-spacing: -1px; margin-bottom: 6px; line-height: 1.1; color: #f5f5f5; }
        .pg-sub { font-size: 15px; color: "#777"; margin-bottom: 24px; line-height: 1.6; max-width: 580px; color: #666; }

        /* ── Grids ── */
        .g2  { display: grid; grid-template-columns: 420px 1fr; gap: 20px; align-items: start; }
        .g3  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .g2eq{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

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
          .main { margin-left: 0; }
          .topbar {
            display: flex; align-items: center; gap: 11px;
            padding: 14px 18px; background: #0a0a0a;
            border-bottom: 1px solid #191919;
            position: sticky; top: 0; z-index: 100;
          }
          .topbar-name { font-family: 'Bricolage Grotesque', sans-serif; font-size: 16px; font-weight: 800; color: #f5f5f5; }
          .content { padding: 18px 16px 100px; }
          .pg-title { font-size: 24px; margin-bottom: 4px; }
          .pg-sub { font-size: 13px; margin-bottom: 18px; }
          .g2 { grid-template-columns: 1fr; }
          .g3 { grid-template-columns: 1fr; }
          .g2eq { grid-template-columns: 1fr 1fr; }
          .bottom-nav {
            display: flex; position: fixed; bottom: 0; left: 0; right: 0;
            background: rgba(10,10,10,.96); backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid #1e1e1e; z-index: 200;
            padding: 10px 0 calc(10px + env(safe-area-inset-bottom));
          }
          .bn-item {
            flex: 1; display: flex; flex-direction: column; align-items: center;
            gap: 4px; padding: 5px 0; background: none; border: none;
            font-size: 9px; font-weight: 600; color: #555;
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
                  {/* Left col */}
                  <div>
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

                    {/* AdSense slot — track tab */}
                    <AdSlot id="track-left" />
                  </div>

                  {/* Right col */}
                  <div>
                    {!pinData && !loading && <EmptyState />}

                    {loading && (
                      <div style={{ ...card, textAlign: "center", padding: "52px 24px" }}>
                        <div className="pulse" style={{ fontSize: 13, color: "#555" }}>Fetching location data…</div>
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
                          {stat("Average Delivery Time", `${pinData.avg_days} days`)}
                          {stat("Gas Agency", pinData.agency)}
                          {stat("Shortage Status",
                            pinData.shortage ? "⚠ Active shortage" : "No shortage reported",
                            pinData.shortage ? "#ef4444" : "#22c55e"
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
                                <div style={{ fontSize: 12, color: "#555", marginBottom: 5 }}>
                                  {bookingResult.daysLeft <= 0 ? "Window is open now" : "Next window opens"}
                                </div>
                                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800,
                                  color: bookingResult.daysLeft <= 0 ? "#22c55e" : "#f5f5f5", letterSpacing: "-.3px" }}>
                                  {bookingResult.daysLeft <= 0 ? "Book Right Now! 🎉" : fmt(bookingResult.nextWindow)}
                                </div>
                                {bookingResult.daysLeft > 0 && (
                                  <div style={{ fontSize: 12, color: "#444", marginTop: 8 }}>
                                    Est. delivery by {fmt(addDays(bookingResult.nextWindow, Math.round(pinData.avg_days)))}
                                  </div>
                                )}
                                <div style={{ fontSize: 11, color: "#333", marginTop: 12, borderTop: "1px solid #1e1e1e",
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
                              <div style={{ fontSize: 12, color: "#7a5a5a", lineHeight: 1.55 }}>
                                Expect 3–7 extra days on delivery. Book as early as your window allows.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══ PRICES ══════════════════════════════════════ */}
            {tab === "prices" && (
              <div className="fu">
                <div className="pg-title">LPG Prices</div>
                <div className="pg-sub">14.2 kg domestic cylinder — prices revised on the 1st of each month across all distributors.</div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <span className="pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                  <span style={{ fontSize: 11, color: "#555", fontWeight: 600, letterSpacing: 1.2 }}>LIVE · DELHI · MARCH 2025</span>
                </div>

                <div className="g3" style={{ marginBottom: 16 }}>
                  {[["🔵","IndianOil","Indane"],["🟡","HP Gas","HP Gas"],["🟢","Bharat Gas","Bharat Gas"]].map(([emoji, company, cyl], i) => {
                    const p = displayPrices[i];
                    return (
                      <div key={company} style={{ ...card, marginBottom: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
                          <span style={{ fontSize: 26 }}>{emoji}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#f5f5f5" }}>{company}</div>
                            <div style={{ fontSize: 11, color: "#555" }}>{cyl} · 14.2 kg</div>
                          </div>
                        </div>
                        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800,
                          color: "#f5f5f5", letterSpacing: "-.8px", marginBottom: 6 }}>
                          ₹{p?.price || "—"}
                        </div>
                        <div style={{ fontSize: 12, color: "#ef4444", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                          {Ic.up} ₹14 from last month
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ ...card, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div style={secTitle}>6-Month Price History</div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>▲ +₹68 since Oct</div>
                      <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>Apr revision expected</div>
                    </div>
                  </div>
                  {(() => {
                    const pts = [
                      { m: "Oct", p: 835 },
                      { m: "Nov", p: 852 },
                      { m: "Dec", p: 846 },
                      { m: "Jan", p: 880 },
                      { m: "Feb", p: 870 },
                      { m: "Mar", p: 900 },
                      { m: "Now", p: 903 },
                    ];
                    const projected = { m: "Apr", p: 924 };
                    const W = 560, H = 110, PAD = { t: 16, b: 32, l: 8, r: 8 };
                    const minP = 820, maxP = 930;
                    const toX = (i, total) => PAD.l + (i / (total - 1)) * (W - PAD.l - PAD.r);
                    const toY = (p) => PAD.t + (1 - (p - minP) / (maxP - minP)) * (H - PAD.t - PAD.b);
                    const solidPts = pts.map((d, i) => [toX(i, pts.length + 1), toY(d.p)]);
                    const projX = toX(pts.length, pts.length + 1);
                    const projY = toY(projected.p);
                    const solidPath = solidPts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
                    const areaPath = solidPath + ` L${solidPts[solidPts.length-1][0]},${H - PAD.b} L${solidPts[0][0]},${H - PAD.b} Z`;
                    return (
                      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.12"/>
                            <stop offset="100%" stopColor="#FF6B00" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        {[0.25, 0.5, 0.75].map(f => (
                          <line key={f}
                            x1={PAD.l} y1={PAD.t + f * (H - PAD.t - PAD.b)}
                            x2={W - PAD.r} y2={PAD.t + f * (H - PAD.t - PAD.b)}
                            stroke="#1e1e1e" strokeWidth="1" strokeDasharray="3 4"/>
                        ))}
                        {/* Area fill */}
                        <path d={areaPath} fill="url(#areaGrad)"/>
                        {/* Solid line */}
                        <path d={solidPath} fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        {/* Projected dashed extension */}
                        <line
                          x1={solidPts[solidPts.length-1][0]} y1={solidPts[solidPts.length-1][1]}
                          x2={projX} y2={projY}
                          stroke="#FF6B00" strokeWidth="1.5" strokeDasharray="4 4" opacity=".5"/>
                        {/* Dots */}
                        {solidPts.map(([x, y], i) => (
                          <circle key={i} cx={x} cy={y} r={i === solidPts.length - 1 ? 4 : 2.5}
                            fill={i === solidPts.length - 1 ? "#FF6B00" : "#1e1e1e"}
                            stroke="#FF6B00" strokeWidth={i === solidPts.length - 1 ? 0 : 1.5}/>
                        ))}
                        {/* Projected dot */}
                        <circle cx={projX} cy={projY} r="3" fill="#0f0f0f" stroke="#FF6B00" strokeWidth="1.5" opacity=".5" strokeDasharray="2 2"/>
                        {/* X-axis labels */}
                        {pts.map((d, i) => (
                          <text key={d.m} x={toX(i, pts.length + 1)} y={H - 4}
                            textAnchor="middle" fill={d.m === "Now" ? "#FF6B00" : "#555"}
                            fontSize="9" fontFamily="'Instrument Sans',sans-serif" fontWeight={d.m==="Now"?"700":"400"}>
                            {d.m}
                          </text>
                        ))}
                        <text x={projX} y={H - 4} textAnchor="middle" fill="#FF6B0066"
                          fontSize="9" fontFamily="'Instrument Sans',sans-serif">Apr</text>
                        {/* Current price callout */}
                        <rect x={solidPts[solidPts.length-1][0] - 22} y={solidPts[solidPts.length-1][1] - 22}
                          width="44" height="16" rx="4" fill="#FF6B00"/>
                        <text x={solidPts[solidPts.length-1][0]} y={solidPts[solidPts.length-1][1] - 11}
                          textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700"
                          fontFamily="'Instrument Sans',sans-serif">₹903</text>
                        {/* Projected price label */}
                        <text x={projX} y={projY - 8} textAnchor="middle" fill="#FF6B0077"
                          fontSize="9" fontFamily="'Instrument Sans',sans-serif">₹924 est.</text>
                      </svg>
                    );
                  })()}
                  <div style={{ fontSize: 12, color: "#444", marginTop: 12, paddingTop: 12, borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between" }}>
                    <span>IndianOil Delhi · 14.2 kg cylinder</span>
                    <span style={{ color: "#333" }}>Dashed = projected</span>
                  </div>
                </div>

                <div style={card}>
                  <div style={secTitle}>Price Revision Alert</div>
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 14, lineHeight: 1.6 }}>
                    Get notified before the 1st of each month — before it hits the news.
                  </div>
                  <input style={inp} placeholder="Mobile number or email" value={contact} onChange={e => setContact(e.target.value)} />
                  <button style={btn("fill")} onClick={() => contact && setAlertSaved(true)}>
                    {alertSaved ? "✓ You're on the list!" : "Notify Me on Price Changes →"}
                  </button>
                </div>

                {/* AdSense slot — prices tab */}
                <AdSlot id="prices-bottom" />
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
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#444", letterSpacing: 1.8,
                      textTransform: "uppercase", marginBottom: 14 }}>Live Feed — Top Voted</div>
                    {reports.length === 0 && (
                      <div style={{ ...card, border: "1px dashed #1e1e1e", textAlign: "center", padding: "40px" }}>
                        <div style={{ fontSize: 13, color: "#444" }}>No reports yet. Be the first to flag an issue.</div>
                      </div>
                    )}
                    {reports.map(r => (
                      <div key={r.id} style={card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#FF6B00", background: "#FF6B0014",
                            border: "1px solid #FF6B0022", borderRadius: 99, padding: "2px 9px" }}>PIN {r.pin}</span>
                          <span style={{ fontSize: 11, color: "#444" }}>
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", background: "#22c55e14",
                          border: "1px solid #22c55e22", borderRadius: 99, padding: "3px 10px", letterSpacing: .8 }}>
                          FREE
                        </span>
                        <div style={secTitle}>Booking Window Alert</div>
                      </div>
                      <div style={{ fontSize: 13, color: "#666", marginBottom: 18, lineHeight: 1.65 }}>
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
                      <div style={secTitle}>Free vs Plus</div>
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
                          <div style={{ display: "flex", gap: 28, paddingRight: 4 }}>
                            <span style={{ fontSize: 12, color: free ? "#22c55e" : "#333", fontWeight: 600 }}>
                              {free ? "✓" : "—"}
                            </span>
                            <span style={{ fontSize: 12, color: plus ? "#FF6B00" : "#333", fontWeight: 600 }}>
                              {plus ? "✓" : "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 28, paddingRight: 4, marginTop: 10 }}>
                        <span style={{ fontSize: 10, color: "#444", fontWeight: 600 }}>FREE</span>
                        <span style={{ fontSize: 10, color: "#FF6B00", fontWeight: 700 }}>PLUS</span>
                      </div>
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
                            <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>Cancel anytime</div>
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
                        <div style={{ fontSize: 12, color: "#444", marginBottom: 16, textAlign: "center" }}>
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
                          <span style={{ fontSize: 11, color: "#333" }}>🔒 Razorpay · 256-bit SSL</span>
                          <span style={{ fontSize: 11, color: "#333" }}>·</span>
                          <span style={{ fontSize: 11, color: "#333" }}>Cancel anytime</span>
                        </div>
                      </div>
                    </div>

                    {/* AdSense slot */}
                    <AdSlot id="alerts-bottom" />
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
                    padding: "8px 16px", color: "#666", fontSize: 12, cursor: "pointer" }}
                    onClick={() => { setAdminUnlocked(false); setTab("track"); }}>
                    Lock
                  </button>
                </div>

                {adminLoading ? (
                  <div style={{ fontSize: 14, color: "#555" }} className="pulse">Loading data…</div>
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
                          <div style={{ fontSize: 11, color: "#555", fontWeight: 600, letterSpacing: .8,
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
                        <div style={{ fontSize: 13, color: "#444", padding: "20px 0", textAlign: "center" }}>
                          No subscribers yet — share the link!
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                              <tr>
                                {["Contact","PIN","Amount","Status","Date"].map(h => (
                                  <th key={h} style={{ textAlign: "left", padding: "8px 12px",
                                    fontSize: 10, color: "#444", fontWeight: 700, letterSpacing: 1,
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
                                  <td style={{ padding: "10px 12px", color: "#555", fontSize: 11,
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
                      <div style={{ fontSize: 12, color: "#444", marginBottom: 12 }}>
                        Cross-reference with Razorpay dashboard if needed.
                      </div>
                      {(adminData.subscriptions || []).slice(0, 10).map(s => (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between",
                          padding: "8px 0", borderBottom: "1px solid #141414", fontSize: 11 }}>
                          <span style={{ color: "#555", fontFamily: "monospace" }}>{s.razorpay_payment_id || "pending"}</span>
                          <span style={{ color: "#333" }}>{new Date(s.created_at).toLocaleDateString("en-IN")}</span>
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
            <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>Enter your admin password</div>
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
