import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";
import { getTheme, toggleTheme } from "./theme.js";

// ─── Constants ───────────────────────────────────────────────────────────────
const CITY_COORDS = {
  Delhi: { lat: 28.6139, lng: 77.2090 },
  Mumbai: { lat: 19.0760, lng: 72.8777 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Vizag: { lat: 17.6868, lng: 83.2185 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Patna: { lat: 25.5941, lng: 85.1376 },
};
const COMPANIES = ["IndianOil", "HP Gas", "Bharat Gas"];
const COMPANY_EMOJI = { IndianOil: "🔵", "HP Gas": "🟡", "Bharat Gas": "🟢" };

// ─── Utils ────────────────────────────────────────────────────────────────────
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
const fmt = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const daysUntil = (d) => { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.ceil((d - t) / 86400000); };
const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

// ─── Env ──────────────────────────────────────────────────────────────────────
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "";
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SUPABASE_FUNC_URL = `${(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "")}/functions/v1`;

// ─── Load Razorpay ────────────────────────────────────────────────────────────
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ─── PIN lookup ───────────────────────────────────────────────────────────────
async function lookupPIN(pin) {
  try {
    const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const j = await r.json();
    if (j[0]?.Status === "Success" && j[0]?.PostOffice?.length > 0) {
      const po = j[0].PostOffice[0];
      return { city: po.District, state: po.State, area: po.Name };
    }
  } catch { /* ignore */ }
  return null;
}

// ─── AdSense ──────────────────────────────────────────────────────────────────
const AD_CLIENT = "ca-pub-6163036693948238";
function AdSlot({ id = "default", type = "rectangle" }) {
  useEffect(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* not loaded */ }
  }, [id]);
  if (type === "rectangle") return (
    <div className="ad-slot-rectangle">
      <ins className="adsbygoogle" style={{ display: "inline-block", width: "300px", height: "250px" }}
        data-ad-client={AD_CLIENT} data-ad-slot="REPLACE_SLOT_1" />
    </div>
  );
  if (type === "leaderboard") return (
    <div className="ad-slot-leaderboard">
      <ins className="adsbygoogle" style={{ display: "inline-block", width: "728px", height: "90px", maxWidth: "100%" }}
        data-ad-client={AD_CLIENT} data-ad-slot="REPLACE_SLOT_2" data-ad-format="horizontal" />
    </div>
  );
  return (
    <div className="ad-slot-responsive">
      <ins className="adsbygoogle" style={{ display: "block" }}
        data-ad-client={AD_CLIENT} data-ad-slot="REPLACE_SLOT_3"
        data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
}

// ─── Icons — all currentColor; CSS drives active/inactive tint ───────────────
const IcFlame = (
  <svg width="26" height="32" viewBox="0 0 28 36" fill="none" className="flex-none">
    <path d="M14 2C14 2 20 8 20 16C20 22 17 24 14 24C11 24 8 22 8 16C8 8 14 2 14 2Z" fill="#FF6B00" />
    <path d="M14 10C14 10 17 14 17 18C17 21 16 22 14 22C12 22 11 21 11 18C11 14 14 10 14 10Z" fill="#FFAA40" />
    <rect x="10" y="24" width="8" height="6" rx="1" fill="var(--text-muted)" />
    <path d="M8 30C8 28 10 27 14 27C18 27 20 28 20 30C20 32 18 34 14 34C10 34 8 32 8 30Z" fill="var(--border)" />
  </svg>
);

// Hoisted Google logo — used in 3 places (Vercel: rendering-hoist-jsx)
const IcGoogle = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="flex-none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);
const IcExt = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>;
const IcCheck = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>;
const IcWarn = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
const IcPin = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
const IcClock = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const IcSun = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>;
const IcMoon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>;

const IcRefresh = (loading) => (
  <span style={{ display: "inline-flex", animation: loading ? "spin 1s linear infinite" : "none" }}>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  </span>
);

const IcTrack = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="9" strokeOpacity=".35" /><line x1="12" y1="3" x2="12" y2="6.5" /><line x1="12" y1="17.5" x2="12" y2="21" /><line x1="3" y1="12" x2="6.5" y2="12" /><line x1="17.5" y1="12" x2="21" y2="12" /></svg>;
const IcPrice = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" /></svg>;
const IcReport = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const IcNews = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" /></svg>;
const IcAlert = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
const IcSupport = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
const IcShop = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l1-5h16l1 5" /><path d="M3 9a2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2" /><path d="M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><line x1="10" y1="15" x2="14" y2="15" /></svg>;
const IcPhone = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.5 5.5l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
const IcWhatsApp = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>;
const IcBolt = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;

// ─── Module-level data (Vercel: hoist-jsx) ────────────────────────────────────
const TABS = [
  { id: "track", label: "Track", icon: IcTrack },
  { id: "prices", label: "Prices", icon: IcPrice },
  { id: "community", label: "Reports", icon: IcReport },
  { id: "news", label: "News", icon: IcNews },
  { id: "alerts", label: "Alerts", icon: IcAlert },
  { id: "commercial", label: "For Biz", icon: IcShop },
];
const PORTALS = [
  ["🔵", "IndianOil — Indane", "https://ivrs.indianoil.in"],
  ["🟡", "HP Gas — MyHP", "https://myhpgas.in"],
  ["🟢", "Bharat Gas — eBharatgas", "https://ebharatgas.com"],
];
const UPI_PORTALS = [
  ["G", "Google Pay", "https://pay.google.com", "#4285F4"],
  ["P", "PhonePe", "https://www.phonepe.com/lpg-gas-booking/", "#5f259f"],
  ["₹", "Paytm", "https://paytm.com/lpg-gas-booking/", "#00B9F1"],
];
const FEAT_COMPARISON = [
  ["Booking window countdown", true, true],
  ["Official portal links", true, true],
  ["Community shortage reports", true, true],
  ["Email booking alert", true, true],
  ["SMS / WhatsApp alert", false, true],
  ["Shortage early warning", false, true],
  ["Price revision alert", false, true],
  ["Delivery day ping", false, true],
];
const PLUS_FEATURES = [
  ["📲", "SMS + WhatsApp alert 2 days before booking window"],
  ["🚨", "Shortage early warning for your PIN — before it spreads"],
  ["💰", "Price revision alert 24hrs before news breaks"],
  ["📦", "Delivery day status ping so you're home on time"],
  ["📊", "Monthly supply health score for your area"],
];

// ─── Commercial MVP — module-level constants ──────────────────────────────────
const COMMERCIAL_CITIES = ["Mumbai", "Bangalore", "Hyderabad", "Chennai", "Delhi", "Kolkata", "Vizag"];

// Normalise postal API city names → our COMMERCIAL_CITIES keys
// Vercel: js-cache-property-access — built once at module level
const CITY_NORMALISE = {
  "visakhapatnam": "Vizag", "vizag": "Vizag", "vishakhapatnam": "Vizag",
  "bengaluru": "Bangalore", "bangalore": "Bangalore",
  "mumbai": "Mumbai", "bombay": "Mumbai",
  "delhi": "Delhi", "new delhi": "Delhi", "new delhi": "Delhi",
  "hyderabad": "Hyderabad",
  "chennai": "Chennai", "madras": "Chennai",
  "kolkata": "Kolkata", "calcutta": "Kolkata",
};
const BUSINESS_TYPES = [
  ["restaurant", "Restaurant"],
  ["hotel", "Hotel / Lodge"],
  ["dhaba", "Dhaba"],
  ["bakery", "Bakery"],
  ["catering", "Catering Business"],
  ["cloud_kitchen", "Cloud Kitchen"],
  ["other", "Other"],
];
const NEED_TYPES = [
  ["induction", "🔌 Induction Cooktop"],
  ["electric", "⚡ Electric Range"],
  ["kerosene", "🪔 Kerosene Supply"],
  ["png", "🔧 PNG Connection"],
  ["not_sure", "🤔 Not Sure — Need Advice"],
];
const CATEGORY_META = {
  induction: { label: "Induction", color: "var(--info)", bg: "var(--info-soft)", border: "var(--info-border)" },
  electric: { label: "Electric", color: "var(--warning)", bg: "var(--warning-soft)", border: "var(--warning-border)" },
  kerosene: { label: "Kerosene", color: "var(--success)", bg: "var(--success-soft)", border: "var(--success-border)" },
  png: { label: "PNG", color: "var(--accent)", bg: "var(--accent-soft)", border: "rgba(255,107,0,0.22)" },
  other: { label: "Other", color: "var(--text-muted)", bg: "var(--bg-inset)", border: "var(--border)" },
};

// Hoisted static skeleton — never recreated (Vercel: hoist-jsx)
const SkeletonCard = (
  <div className="neu-card mb-card">
    <div className="skeleton skeleton-heading" style={{ width: "55%", marginBottom: 18 }} />
    <div className="skeleton skeleton-text" style={{ width: "100%", marginBottom: 10 }} />
    <div className="skeleton skeleton-text" style={{ width: "80%", marginBottom: 10 }} />
    <div className="skeleton skeleton-text" style={{ width: "90%" }} />
  </div>
);

// ─── Ring ─────────────────────────────────────────────────────────────────────
function Ring({ daysLeft }) {
  const r = 48, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, (25 - Math.max(daysLeft, 0)) / 25));
  const color = daysLeft <= 0 ? "var(--success)" : daysLeft <= 3 ? "var(--warning)" : "var(--accent)";
  return (
    <svg width="116" height="116" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="var(--bg-inset)" strokeWidth="7" />
      <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1), stroke .3s" }} />
      <text x="55" y="50" textAnchor="middle" fill={color} fontSize="24" fontWeight="700" fontFamily="'Bricolage Grotesque',sans-serif">
        {daysLeft <= 0 ? "✓" : daysLeft}
      </text>
      <text x="55" y="66" textAnchor="middle" fill="var(--text-muted)" fontSize="9" letterSpacing="1.2" fontFamily="'Instrument Sans',sans-serif">
        {daysLeft <= 0 ? "BOOK NOW" : "DAYS LEFT"}
      </text>
    </svg>
  );
}

// ─── Trend badge ──────────────────────────────────────────────────────────────
function Trend({ t }) {
  const map = {
    improving: ["badge badge-success", "↑ Improving"],
    stable: ["badge badge-neutral", "→ Stable"],
    worsening: ["badge badge-danger", "↓ Worsening"],
  };
  const [cls, label] = map[t] || map.stable;
  return <span className={cls}>{label}</span>;
}

// ─── EmptyState — hoisted, no props (Vercel: hoist-jsx) ─────────────────────
const EmptyState = (
  <div className="neu-inset anim-fade-in" style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "36px 24px", borderRadius: "var(--radius-lg)", textAlign: "center",
  }}>
    <svg width="44" height="44" viewBox="0 0 56 56" fill="none" style={{ opacity: .3 }}>
      <circle cx="28" cy="28" r="26" stroke="var(--accent)" strokeWidth="2" strokeDasharray="6 4" />
      <path d="M28 16v12l7 7" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="28" cy="28" r="3" fill="var(--accent)" />
    </svg>
    <div className="t-subheading" style={{ marginBottom: 6 }}>No data yet</div>
    <p className="t-caption" style={{ maxWidth: 220, marginBottom: 16 }}>
      Enter your 6-digit PIN code to see live delivery intelligence for your area.
    </p>
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
      {["530001", "400001", "110001", "560001"].map(p => (
        <span key={p} className="badge badge-accent" style={{ fontFamily: "monospace" }}>{p}</span>
      ))}
    </div>
    <div className="t-caption" style={{ marginTop: 8 }}>Try one of these sample PINs</div>
  </div>
);

// ─── Auth Context ─────────────────────────────────────────────────────────────
// AuthContext reserved for future component tree — auth state lives in App for now

// ─── SupportModal ─────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  ["Why does it say 21–25 days?", "The government mandates a minimum 21-day gap between bookings. Many agencies enforce 25 days. CylinderCheck uses 25 days as the safe default."],
  ["Why are prices different across cities?", "LPG pricing includes state-level taxes and transport subsidies that vary by location. Delhi prices are not the same as Mumbai or Chennai."],
  ["How does the shortage signal work?", "When 2+ reports are filed for the same PIN in 30 days, we flag it as an active shortage. 5+ reports trigger a severe warning."],
  ["How do I cancel Plus?", "Email us at support@cylindercheck.in with your registered mobile/email. We'll cancel and refund the current month's unused days within 24 hrs."],
  ["Does this work for piped gas (PNG)?", "No — CylinderCheck is specifically for domestic LPG cylinders (14.2 kg). PNG billing and connection tracking are not supported yet."],
];

function SupportModal({ onClose }) {
  const [activeSection, setActiveSection] = useState("price");
  const [openFaq, setOpenFaq] = useState(null);
  const [priceForm, setPriceForm] = useState({ city: "", company: "IndianOil", reported_price: "", correct_price: "", contact: "" });
  const [feedback, setFeedback] = useState({ message: "", contact: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const handlePriceSubmit = async () => {
    if (!priceForm.city || !priceForm.correct_price) { setFormError("City and correct price are required."); return; }
    setSubmitting(true); setFormError("");
    const { error } = await supabase.from("price_corrections").insert([{ ...priceForm }]);
    if (error) setFormError("Something went wrong. Try again.");
    else setSubmitted(true);
    setSubmitting(false);
  };
  const handleFeedbackSubmit = async () => {
    if (!feedback.message.trim()) { setFormError("Please enter your feedback."); return; }
    setSubmitting(true); setFormError("");
    const { error } = await supabase.from("feedback").insert([{ ...feedback }]);
    if (error) setFormError("Something went wrong. Try again.");
    else setSubmitted(true);
    setSubmitting(false);
  };

  const sections = [
    { id: "price", label: "Wrong price?" },
    { id: "billing", label: "Billing issue" },
    { id: "feedback", label: "Feedback" },
    { id: "faq", label: "FAQ" },
  ];

  return (
    <div className="support-overlay" onClick={onClose}>
      <div className="support-sheet" onClick={e => e.stopPropagation()}>
        <div className="city-sheet-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="t-heading" style={{ fontSize: 20 }}>Support</div>
          <button onClick={onClose} className="btn btn-ghost" style={{ width: 34, height: 34, padding: 0, minHeight: "auto", borderRadius: "var(--radius-sm)" }}>✕</button>
        </div>

        {/* Section tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => { setActiveSection(s.id); setSubmitted(false); setFormError(""); setOpenFaq(null); }}
              className={`btn ${activeSection === s.id ? "btn-primary" : "btn-ghost"}`}
              style={{ minHeight: "auto", padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Report wrong price */}
        {activeSection === "price" && (
          submitted ? (
            <div className="alert-banner alert-banner-success">
              {IcCheck}
              <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--success)" }}>Thanks! We'll review and update.</div></div>
            </div>
          ) : (
            <>
              <p className="t-caption" style={{ marginBottom: 14 }}>Spotted an outdated or incorrect price on the map? Tell us what it should be.</p>
              <div className="input-group">
                <label className="input-label">City *</label>
                <input className="input" placeholder="e.g. Hyderabad" value={priceForm.city} onChange={e => setPriceForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Company</label>
                <select className="input" value={priceForm.company} onChange={e => setPriceForm(p => ({ ...p, company: e.target.value }))}>
                  {COMPANIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="input-group">
                  <label className="input-label">Price shown</label>
                  <input className="input" placeholder="₹ shown" inputMode="numeric" value={priceForm.reported_price} onChange={e => setPriceForm(p => ({ ...p, reported_price: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Correct price *</label>
                  <input className="input" placeholder="₹ correct" inputMode="numeric" value={priceForm.correct_price} onChange={e => setPriceForm(p => ({ ...p, correct_price: e.target.value }))} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Your contact <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                <input className="input" placeholder="Mobile or email" value={priceForm.contact} onChange={e => setPriceForm(p => ({ ...p, contact: e.target.value }))} />
              </div>
              {formError && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{formError}</div>}
              <button className="btn btn-primary btn-block" onClick={handlePriceSubmit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Price Correction →"}
              </button>
            </>
          )
        )}

        {/* Billing */}
        {activeSection === "billing" && (
          <div>
            <p className="t-body" style={{ marginBottom: 16 }}>For payment or subscription issues, use these resources:</p>
            {[
              ["🟢", "Razorpay Support", "https://razorpay.com/support/", "Payment gateway — refunds, failed transactions"],
              ["🇮🇳", "pgportal.gov.in", "https://pgportal.gov.in", "Government grievance portal for LPG billing issues"],
              ["📧", "Email Us", "mailto:support@cylindercheck.in", "support@cylindercheck.in — reply within 24 hrs"],
            ].map(([icon, label, href, desc]) => (
              <a key={href} href={href} target="_blank" rel="noopener" className="portal-link" style={{ flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                  <span>{icon} {label}</span>
                  <span className="ext-icon-ml-auto" style={{ color: "var(--text-muted)" }}>{IcExt}</span>
                </div>
                <span className="t-caption">{desc}</span>
              </a>
            ))}
          </div>
        )}

        {/* Feedback */}
        {activeSection === "feedback" && (
          submitted ? (
            <div className="alert-banner alert-banner-success">
              {IcCheck}
              <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--success)" }}>Thanks for the feedback!</div></div>
            </div>
          ) : (
            <>
              <p className="t-caption" style={{ marginBottom: 14 }}>Feature ideas, bugs, complaints — we read everything.</p>
              <div className="input-group">
                <label className="input-label">Your message *</label>
                <textarea className="input" style={{ height: 110, resize: "vertical" }} placeholder="What's on your mind?" value={feedback.message} onChange={e => setFeedback(p => ({ ...p, message: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Contact <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                <input className="input" placeholder="Mobile or email if you want a reply" value={feedback.contact} onChange={e => setFeedback(p => ({ ...p, contact: e.target.value }))} />
              </div>
              {formError && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{formError}</div>}
              <button className="btn btn-primary btn-block" onClick={handleFeedbackSubmit} disabled={submitting}>
                {submitting ? "Sending…" : "Send Feedback →"}
              </button>
            </>
          )
        )}

        {/* FAQ */}
        {activeSection === "faq" && (
          <div>
            {FAQ_ITEMS.map(([q, a], i) => (
              <div key={i} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 12 }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span className="t-body" style={{ margin: 0, fontWeight: 600 }}>{q}</span>
                  <span className="flex-none" style={{ color: "var(--text-muted)", fontSize: 18, lineHeight: 1 }}>{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <p className="t-caption" style={{ marginTop: 10, marginBottom: 0 }}>{a}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ThemeToggle — module-level (Vercel: no-inline-components) ────────────────
function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => getTheme() === "dark");
  return (
    <button className="theme-toggle"
      onClick={() => { toggleTheme(); setIsDark(p => !p); }}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme">
      {isDark ? IcSun : IcMoon}
    </button>
  );
}

// ─── PriceTicker — scrolling price strip on Track tab ─────────────────────────
// Vercel: rendering-hoist-jsx, rerender-no-inline-components
function PriceTicker({ mapPrices }) {
  const items = Object.entries(mapPrices).flatMap(([city, companies]) => {
    const prices = COMPANIES.map(c => companies[c]?.price).filter(Boolean);
    if (!prices.length) return [];
    const cheapest = Math.min(...prices);
    const color = cheapest < 880 ? "var(--success)" : cheapest < 930 ? "var(--warning)" : "var(--danger)";
    return [{ city, price: cheapest, color }];
  });

  if (!items.length) return (
    <div className="price-ticker-wrap">
      <div className="skeleton skeleton-text" style={{ width: "100%", height: 14 }} />
    </div>
  );

  // Double the list for seamless CSS loop
  const doubled = [...items, ...items];

  return (
    <div className="price-ticker-wrap" aria-label="LPG prices ticker">
      <div className="price-ticker-inner">
        {doubled.map(({ city, price, color }, i) => (
          <span key={`${city}-${i}`} className="price-ticker-item">
            <span style={{ color: "var(--text-muted)" }}>{city}</span>
            <span style={{ color, fontWeight: 700 }}>₹{price}</span>
            <span className="price-ticker-sep">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── PricesMap — module-level (Vercel: no-inline-components) ─────────────────
function PricesMap({ contact, setContact, alertSaved, setAlertSaved, mapPrices, lastUpdated }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});

  const [selectedCity, setSelectedCity] = useState(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertError, setAlertError] = useState("");

  // mapLoading = prices not yet populated from App
  const mapLoading = Object.keys(mapPrices).length === 0;

  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!leafletLoaded || leafletMap.current) return;
    const L = window.L;
    const INDIA = L.latLngBounds(L.latLng(6.5, 68.0), L.latLng(37.5, 97.5));
    leafletMap.current = L.map(mapRef.current, {
      center: [22.5, 82.0], zoom: 5, minZoom: 4, maxZoom: 8,
      maxBounds: INDIA, maxBoundsViscosity: 1.0,
      zoomControl: false, attributionControl: false, doubleClickZoom: false,
    });
    // Tile layer — respect system/user theme
    const isDark = document.documentElement.getAttribute("data-theme") === "dark"
      || (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(leafletMap.current);
    L.control.zoom({ position: "bottomright" }).addTo(leafletMap.current);
    leafletMap.current.fitBounds(INDIA, { padding: [16, 16] });
  }, [leafletLoaded]);

  useEffect(() => {
    if (!leafletLoaded || !leafletMap.current || mapLoading) return;
    const L = window.L;
    Object.entries(CITY_COORDS).forEach(([city, { lat, lng }]) => {
      const cp = mapPrices[city] || {};
      const allP = COMPANIES.map(c => cp[c]?.price).filter(Boolean);
      const cheap = allP.length ? Math.min(...allP) : null;
      const color = !cheap ? "#555" : cheap < 880 ? "#16a34a" : cheap < 930 ? "#FF6B00" : "#e53e3e";
      const icon = L.divIcon({
        html: `<div style="position:relative;width:32px;height:32px;cursor:pointer">
          <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.18;animation:lpgPulse 2.2s ease-out infinite;"></div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:${color};box-shadow:0 0 10px ${color};border:2px solid rgba(255,255,255,0.2);"></div>
          <div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:700;color:${color};white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,0.9);font-family:'Instrument Sans',sans-serif;">${city}</div>
          ${cheap ? `<div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);font-size:8px;font-weight:700;color:#fff;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,0.9);font-family:'Instrument Sans',sans-serif;">₹${cheap}</div>` : ""}
        </div>`,
        className: "", iconSize: [32, 32], iconAnchor: [16, 16],
      });
      if (markersRef.current[city]) markersRef.current[city].remove();
      markersRef.current[city] = L.marker([lat, lng], { icon }).addTo(leafletMap.current).on("click", () => setSelectedCity(city));
    });
  }, [leafletLoaded, mapPrices, mapLoading]);

  // Skill: derive during render — no extra state
  const cityData = selectedCity ? mapPrices[selectedCity] || {} : null;
  const allSelPrices = cityData ? COMPANIES.map(c => cityData[c]?.price).filter(Boolean) : [];
  const cheapestPrice = allSelPrices.length ? Math.min(...allSelPrices) : null;
  const cheapestCo = cheapestPrice ? COMPANIES.find(c => cityData[c]?.price === cheapestPrice) : null;

  return (
    <div>
      {/* Status bar — above the map frame */}
      <div className="map-status-bar">
        <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}>{IcClock}</span>
        <span className="t-label" style={{ color: "var(--text-muted)" }}>
          WEEKLY · {Object.keys(mapPrices).length} CITIES · UPDATED {fmtDateTime(lastUpdated)}
        </span>
      </div>

      {/* Map — legend floats inside as glass overlay */}
      <div className="india-map-frame">
        <div ref={mapRef} style={{ height: 560, width: "100%", background: "var(--bg-inset)" }} />

        {/* Floating legend — bottom-left glass pill inside the frame */}
        <div className="map-legend-overlay">
          {[["#16a34a", "Under ₹880"], ["#FF6B00", "₹880–₹930"], ["#e53e3e", "Above ₹930"]].map(([c, l]) => (
            <div key={l} className="legend-item">
              <div className="legend-dot" style={{ background: c, boxShadow: `0 0 5px ${c}55` }} />
              {l}
            </div>
          ))}
        </div>
        {(!leafletLoaded || mapLoading) && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-inset)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div className="skeleton" style={{ width: 260, height: 160, borderRadius: "var(--radius-lg)" }} />
              <span className="t-caption">Loading map…</span>
            </div>
          </div>
        )}

        {/* Desktop popup */}
        {selectedCity && cityData && (
          <div className="city-popup city-popup-desktop neu-card" style={{ position: "absolute", top: 16, right: 16, zIndex: 1000, minWidth: 260 }}>
            <button onClick={() => setSelectedCity(null)}
              style={{ position: "absolute", top: 10, right: 12, color: "var(--text-muted)", fontSize: 18, background: "none", border: "none", cursor: "pointer" }}>×</button>
            <div className="t-heading" style={{ marginBottom: 6 }}>{selectedCity}</div>
            {cheapestCo && <div className="badge badge-success mb-card">{COMPANY_EMOJI[cheapestCo]} Cheapest · {cheapestCo} · ₹{cheapestPrice}</div>}
            {COMPANIES.map((company, idx) => {
              const row = cityData[company]; const isCheapest = company === cheapestCo;
              return (
                <div key={company} className={`stat-row${idx === COMPANIES.length - 1 ? " stat-row-last" : ""}`}>
                  <div className="stat-label">
                    {COMPANY_EMOJI[company]}
                    <span style={{ fontWeight: isCheapest ? 600 : 400 }}>{company}</span>
                    {isCheapest && <span className="badge badge-success" style={{ fontSize: 8 }}>BEST</span>}
                  </div>
                  <span className="stat-value" style={{ color: isCheapest ? "var(--success)" : "var(--text-primary)" }}>
                    {row?.price ? `₹${row.price}` : "—"}
                  </span>
                </div>
              );
            })}
            <div className="t-caption" style={{ marginTop: 10, textAlign: "right" }}>Updated {fmtDateTime(Object.values(cityData)[0]?.recorded_at)}</div>
          </div>
        )}

        {/* Mobile bottom sheet */}
        {selectedCity && cityData && (
          <div className="city-sheet-overlay" onClick={() => setSelectedCity(null)}>
            <div className="city-sheet" onClick={e => e.stopPropagation()}>
              <div className="city-sheet-handle" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="t-heading" style={{ fontSize: 26 }}>{selectedCity}</div>
                  {cheapestCo && <div className="badge badge-success" style={{ marginTop: 8 }}>{COMPANY_EMOJI[cheapestCo]} Cheapest · {cheapestCo} · ₹{cheapestPrice}</div>}
                </div>
                <button onClick={() => setSelectedCity(null)} className="btn btn-ghost"
                  style={{ width: 36, height: 36, padding: 0, minHeight: "auto", borderRadius: "var(--radius-sm)" }}>×</button>
              </div>
              {COMPANIES.map((company, idx) => {
                const row = cityData[company]; const isCheapest = company === cheapestCo;
                return (
                  <div key={company} className={`stat-row${idx === COMPANIES.length - 1 ? " stat-row-last" : ""}`}>
                    <div className="stat-label" style={{ gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{COMPANY_EMOJI[company]}</span>
                      <span style={{ fontSize: 15, fontWeight: isCheapest ? 600 : 400 }}>{company}</span>
                      {isCheapest && <span className="badge badge-success" style={{ fontSize: 9 }}>BEST</span>}
                    </div>
                    <span className="stat-value" style={{ fontSize: 20, fontWeight: 800, color: isCheapest ? "var(--success)" : "var(--text-primary)" }}>
                      {row?.price ? `₹${row.price}` : "—"}
                    </span>
                  </div>
                );
              })}
              <div className="t-caption" style={{ marginTop: 12, textAlign: "right" }}>Updated {fmtDateTime(Object.values(cityData)[0]?.recorded_at)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Price revision alert */}
      <div className="neu-card" style={{ marginTop: 16 }}>
        <div className="section-title">Price Revision Alert</div>
        <p className="t-body mb-card">Get notified before the 1st of each month — before it hits the news.</p>
        {alertSaved ? (
          <div className="alert-banner alert-banner-success">
            {IcCheck}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--success)" }}>You're on the list!</div>
              <div className="t-caption" style={{ marginTop: 2 }}>We'll notify {contact} before the next price revision.</div>
            </div>
          </div>
        ) : (
          <>
            <div className="input-group">
              <label className="input-label">Mobile or Email</label>
              <input className="input" placeholder="Mobile number or email"
                value={contact} onChange={e => { setContact(e.target.value); setAlertError(""); }} />
            </div>
            {alertError && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{alertError}</div>}
            <button className="btn btn-primary btn-block" disabled={alertSaving}
              onClick={async () => {
                if (!contact.trim()) { setAlertError("Enter your mobile number or email."); return; }
                setAlertSaving(true); setAlertError("");
                const { error } = await supabase.from("alert_subscriptions").insert([{ contact: contact.trim(), alert_type: "price_revision" }]);
                if (error) { setAlertError("Something went wrong. Please try again."); setAlertSaving(false); }
                else setAlertSaved(true);
              }}>
              {alertSaving ? "Saving…" : "Notify Me on Price Changes →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── CommercialPage ───────────────────────────────────────────────────────────
// Vercel: rerender-no-inline-components — defined at module level
function CommercialPage({ prefilledCity = "" }) {
  // ── Lead form state ────────────────────────────────────────────────────────
  const [bizName, setBizName] = useState("");
  const [bizType, setBizType] = useState("");
  const [city, setCity] = useState(prefilledCity);
  const [phone, setPhone] = useState("");
  const [needType, setNeedType] = useState("");
  const [cylinders, setCylinders] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Vendor state ───────────────────────────────────────────────────────────
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState(prefilledCity || COMMERCIAL_CITIES[0]);

  // ── Fetch vendors when city changes ───────────────────────────────────────
  useEffect(() => {
    if (!selectedCity) return;
    // Keep lead form city in sync with vendor city tab
    setCity(selectedCity);
    setVendorsLoading(true);
    supabase
      .from("vendors")
      .select("*")
      .eq("city", selectedCity)
      .eq("active", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setVendors(data || []);
        setVendorsLoading(false);
      });
  }, [selectedCity]);

  // ── Submit lead ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!bizName.trim()) { setFormError("Enter your business name."); return; }
    if (!bizType) { setFormError("Select your business type."); return; }
    if (!city) { setFormError("Select your city."); return; }
    if (!phone.trim()) { setFormError("Enter your phone number."); return; }
    if (!needType) { setFormError("Tell us what you need."); return; }
    setFormError(""); setSubmitting(true);
    const { error } = await supabase.from("commercial_leads").insert([{
      business_name: bizName.trim(),
      business_type: bizType,
      city,
      phone: phone.trim(),
      need_type: needType,
      cylinders_week: cylinders ? parseInt(cylinders, 10) : null,
      message: message.trim() || null,
    }]);
    if (error) { setFormError("Something went wrong. Please try again."); setSubmitting(false); }
    else { setSubmitted(true); setSubmitting(false); }
  };

  return (
    <div className="tab-panel">
      {/* ── Header ── */}
      <div className="commercial-hero">
        <div className="commercial-hero-badge">
          <span className="pulse-dot pulse-dot-danger" />
          LIVE CRISIS — MARCH 2026
        </div>
        <h1 className="page-title" style={{ marginBottom: "var(--space-3)" }}>
          No Commercial Gas?<br />Find Alternatives Now.
        </h1>
        <p className="page-subtitle" style={{ maxWidth: 520, marginBottom: 0 }}>
          The Strait of Hormuz disruption has cut commercial LPG to restaurants across India.
          Connect with verified suppliers of induction cooktops, electric ranges and more —
          available in your city today.
        </p>
      </div>

      {/* ── Stats bar ── */}
      <div className="commercial-stats-bar">
        {[
          ["8,000+", "Hotels & restaurants affected"],
          ["7", "Cities covered"],
          ["48hrs", "Avg vendor response time"],
        ].map(([val, label]) => (
          <div key={label} className="commercial-stat">
            <span className="commercial-stat-value">{val}</span>
            <span className="t-caption">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid-2col" style={{ alignItems: "start" }}>

        {/* ── Left — Lead form ── */}
        <div>
          <div className="neu-card mb-card">
            <div className="section-title">Get Help Today — Free</div>

            {submitted ? (
              <div className="alert-banner alert-banner-success anim-scale-in">
                {IcCheck}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--success)", marginBottom: 4 }}>
                    Request submitted!
                  </div>
                  <p className="t-caption" style={{ margin: 0 }}>
                    Vendors in {city} will contact you on {phone} within 24–48 hours.
                    You can also call them directly from the cards below.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="input-group">
                  <label className="input-label" htmlFor="cc-biz-name">Business Name *</label>
                  <input id="cc-biz-name" className="input" placeholder="e.g. Sharma Dhaba"
                    value={bizName} onChange={e => { setBizName(e.target.value); setFormError(""); }} />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="cc-biz-type">Business Type *</label>
                  <select id="cc-biz-type" className="input" value={bizType}
                    onChange={e => { setBizType(e.target.value); setFormError(""); }}>
                    <option value="">Select type…</option>
                    {BUSINESS_TYPES.map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="cc-city">City *</label>
                  <select id="cc-city" className="input" value={city}
                    onChange={e => { setCity(e.target.value); setFormError(""); }}>
                    <option value="">Select city…</option>
                    {COMMERCIAL_CITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="cc-phone">Phone Number *</label>
                  <input id="cc-phone" className="input" placeholder="98xxxxxxxx"
                    inputMode="tel" maxLength={10}
                    value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, "")); setFormError(""); }} />
                </div>

                <div className="input-group">
                  <label className="input-label">What do you need? *</label>
                  <div className="need-type-grid">
                    {NEED_TYPES.map(([val, label]) => (
                      <button key={val} type="button"
                        className={`need-type-btn${needType === val ? " active" : ""}`}
                        onClick={() => { setNeedType(val); setFormError(""); }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="cc-cylinders">
                    Cylinders per week{" "}
                    <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                      (optional — helps vendors prepare)
                    </span>
                  </label>
                  <input id="cc-cylinders" className="input" placeholder="e.g. 4"
                    inputMode="numeric" maxLength={2}
                    value={cylinders} onChange={e => setCylinders(e.target.value.replace(/\D/g, ""))} />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="cc-message">
                    Anything else{" "}
                    <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                      (optional)
                    </span>
                  </label>
                  <textarea id="cc-message" className="input" style={{ height: 80, resize: "vertical" }}
                    placeholder="e.g. Need delivery by tomorrow, budget is ₹50,000…"
                    value={message} onChange={e => setMessage(e.target.value)} />
                </div>

                {formError && (
                  <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12 }}>
                    {formError}
                  </div>
                )}

                <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Submitting…" : "Find Alternatives in My City →"}
                </button>

                <p className="t-caption" style={{ textAlign: "center", marginTop: 10 }}>
                  Free service. Vendors contact you directly. No middleman.
                </p>
              </>
            )}
          </div>

          {/* ── Crisis context card ── */}
          <div className="alert-banner alert-banner-danger mb-card">
            <span className="flex-none" style={{ fontSize: 20 }}>🚨</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)", marginBottom: 4 }}>
                Why is this happening?
              </div>
              <p className="t-caption" style={{ margin: 0 }}>
                The Strait of Hormuz disruption has cut India's LPG imports.
                The government has prioritised domestic supply — commercial
                kitchens are last in line. This is not your distributor's fault.
                Alternatives are the only reliable solution right now.
              </p>
            </div>
          </div>

          {/* ── Rights card ── */}
          <div className="neu-card">
            <div className="section-title">Your Rights as a Business</div>
            {[
              ["🛡", "Overcharging is illegal", "MRP is printed on the cylinder. Any price above that is a violation of the Essential Commodities Act."],
              ["📞", "Call 1906 for complaints", "National LPG helpline. Free, 24/7, available in Hindi and regional languages."],
              ["🌐", "File at pgportal.gov.in", "Government grievance portal. Lodge a formal complaint if supply is withheld."],
            ].map(([icon, title, desc]) => (
              <div key={title} className="stat-row" style={{ alignItems: "flex-start", gap: "var(--space-3)" }}>
                <span className="flex-none" style={{ fontSize: 16, marginTop: 2 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{title}</div>
                  <p className="t-caption" style={{ margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right — Vendor cards ── */}
        <div>
          {/* City filter */}
          <div className="commercial-city-tabs mb-card">
            {COMMERCIAL_CITIES.map(c => (
              <button key={c}
                className={`commercial-city-tab${selectedCity === c ? " active" : ""}`}
                onClick={() => setSelectedCity(c)}>
                {c}
              </button>
            ))}
          </div>

          <div className="t-label mb-card" style={{ paddingLeft: 2 }}>
            Verified suppliers in {selectedCity}
          </div>

          {vendorsLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="neu-card mb-card">
                <div className="skeleton skeleton-heading" style={{ width: "60%", marginBottom: 12 }} />
                <div className="skeleton skeleton-text" style={{ width: "90%", marginBottom: 8 }} />
                <div className="skeleton skeleton-text" style={{ width: "70%" }} />
              </div>
            ))
          ) : vendors.length === 0 ? (
            <div className="neu-card" style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏗</div>
              <div className="t-subheading" style={{ marginBottom: 8 }}>
                Vendors coming soon for {selectedCity}
              </div>
              <p className="t-caption" style={{ marginBottom: 16 }}>
                We're onboarding suppliers in this city right now.
                Submit your request above and we'll match you manually within 24 hours.
              </p>
            </div>
          ) : vendors.map(v => {
            const meta = CATEGORY_META[v.category] || CATEGORY_META.other;
            return (
              <div key={v.id} className={`neu-card mb-card vendor-card${v.featured ? " vendor-card-featured" : ""}`}>
                {v.featured && (
                  <div className="vendor-featured-badge">⭐ Featured Supplier</div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div className="t-subheading" style={{ flex: 1, paddingRight: 8 }}>{v.name}</div>
                  <span className="badge" style={{
                    background: meta.bg, color: meta.color,
                    border: `1px solid ${meta.border}`, flexShrink: 0,
                  }}>
                    {meta.label}
                  </span>
                </div>

                {v.tagline && (
                  <p className="t-body" style={{ marginBottom: 14 }}>{v.tagline}</p>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {v.whatsapp && (
                    <a href={`https://wa.me/${v.whatsapp}`} target="_blank" rel="noopener noreferrer"
                      className="btn btn-primary" style={{ minHeight: "auto", padding: "8px 14px", fontSize: 13, flex: 1, minWidth: 130 }}>
                      {IcWhatsApp}
                      WhatsApp
                    </a>
                  )}
                  {v.phone && (
                    <a href={`tel:${v.phone}`}
                      className="btn btn-ghost" style={{ minHeight: "auto", padding: "8px 14px", fontSize: 13, flex: 1, minWidth: 110 }}>
                      {IcPhone}
                      Call
                    </a>
                  )}
                  {v.website && (
                    <a href={v.website} target="_blank" rel="noopener noreferrer"
                      className="btn btn-ghost" style={{ minHeight: "auto", padding: "8px 14px", fontSize: 13 }}>
                      {IcExt}
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── List your business CTA ── */}
          <div className="neu-card" style={{ background: "var(--bg-inset)", textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>🏪</div>
            <div className="t-subheading" style={{ marginBottom: 6 }}>Are you a supplier?</div>
            <p className="t-caption" style={{ marginBottom: 14 }}>
              List your business here and reach restaurant owners actively looking for alternatives right now.
            </p>
            <a href="mailto:support@cylindercheck.in?subject=List my business on CylinderCheck"
              className="btn btn-ghost btn-block" style={{ fontSize: 13 }}>
              Get Listed — ₹3,000/month →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("track");
  const [pin, setPin] = useState("");
  const [lastBooking, setLastBooking] = useState("");
  const [pinData, setPinData] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef(null); // scroll-into-view after track lookup

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
  const [freeAlertSaving, setFreeAlertSaving] = useState(false);
  const [freeAlertError, setFreeAlertError] = useState("");

  const [payContact, setPayContact] = useState("");
  const [payPin, setPayPin] = useState("");
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payError, setPayError] = useState("");

  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [shortageSummary, setShortageSummary] = useState(null);
  const newsLastFetched = useRef(null); // Vercel: rerender-use-ref-transient-values

  // Hoisted price state — shared by PriceTicker (Track tab) + PricesMap (Prices tab)
  // Vercel: state-lift-state — avoids duplicate Supabase query across tabs
  const [mapPrices, setMapPrices] = useState({});
  const [pricesLastUpdated, setPricesLastUpdated] = useState(null);

  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Support modal
  const [showSupport, setShowSupport] = useState(false);

  // Report extras
  const [reportDeliveryDays, setReportDeliveryDays] = useState("");
  const [editingReportId, setEditingReportId] = useState(null);
  const [editingText, setEditingText] = useState("");

  // Restore tab after OAuth redirect (sessionStorage round-trip)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("cc-post-auth-tab");
      if (saved) { setTab(saved); sessionStorage.removeItem("cc-post-auth-tab"); }
    } catch { /* private mode */ }
  }, []);

  // ── Data fetches ────────────────────────────────────────────────────────────
  // Auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    supabase.from("reports").select("pin, city, created_at")
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .then(({ data }) => {
        if (!data?.length) { setShortageSummary(null); return; }
        const pinCounts = {}, pinCities = {};
        for (const r of data) { pinCounts[r.pin] = (pinCounts[r.pin] || 0) + 1; if (r.city) pinCities[r.pin] = r.city; }
        const active = Object.entries(pinCounts).filter(([, n]) => n >= 2);
        if (!active.length) { setShortageSummary(null); return; }
        const hot = active.toSorted((a, b) => b[1] - a[1])[0];
        setShortageSummary({ activePinCount: active.length, totalReports: data.length, hotspot: pinCities[hot[0]] || `PIN ${hot[0]}`, hotspotReports: hot[1] });
      });
  }, []);

  useEffect(() => {
    supabase.from("reports").select("*").order("votes", { ascending: false }).limit(20)
      .then(({ data }) => data && setReports(data));
  }, []);

  // Hoist lpg_prices fetch — shared by PriceTicker + PricesMap (Vercel: state-lift-state)
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
        setPricesLastUpdated(latest);
      });
  }, []);

  const fetchNews = useCallback((force = false) => {
    const STALE_MS = 5 * 60 * 1000; // 5 minutes
    if (!force && newsLastFetched.current && Date.now() - newsLastFetched.current < STALE_MS) return;
    setNewsLoading(true);
    fetch(`${SUPABASE_FUNC_URL}/lpg-news`, { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.articles?.length) {
          setNews(d.articles.map(a => ({ title: a.title, source: a.source, link: a.link, pubDate: new Date(a.pubDate) })));
          newsLastFetched.current = Date.now();
        }
      })
      .catch(() => { }).finally(() => setNewsLoading(false));
  }, []);

  useEffect(() => { if (tab === "news") fetchNews(); }, [tab, fetchNews]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleTrack = async () => {
    if (!pin || pin.length !== 6) { setError("Enter a valid 6-digit PIN code."); return; }
    setError(""); setLoading(true); setPinData(null); setBookingResult(null);
    // Skill: Promise.all — parallel independent fetches
    const [{ data: dbData }, location, { data: recentReports }] = await Promise.all([
      supabase.from("pin_data").select("*").eq("pin", pin).single(),
      lookupPIN(pin),
      supabase.from("reports").select("id, created_at", { count: "exact" }).eq("pin", pin).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    ]);
    const reportCount = recentReports?.length || 0;
    const hasShortage = reportCount >= 2;
    const last7 = (recentReports || []).filter(r => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)).length;
    const prior7 = reportCount - last7;
    const trend = last7 > prior7 + 1 ? "worsening" : last7 < prior7 ? "improving" : "stable";
    setPinData(dbData
      ? { ...dbData, city: location ? `${location.city}, ${location.state}` : dbData.city, area: location?.area || "", shortage: hasShortage, trend, reportCount }
      : { pin, city: location ? `${location.city}, ${location.state}` : `PIN ${pin}`, area: location?.area || "", agency: "Check with local agency", avg_days: "—", shortage: hasShortage, trend, reportCount });
    if (lastBooking) { const nw = addDays(new Date(lastBooking), 25); setBookingResult({ nextWindow: nw, daysLeft: daysUntil(nw) }); }
    setLoading(false);
    // Scroll result into view on mobile so it's not hidden under topbar
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const handleReport = async () => {
    if (!reportText.trim() || !reportPin) return;
    if (!user) return; // auth guard — UI should prevent reaching here
    setSubmitting(true);
    const days = reportDeliveryDays ? parseInt(reportDeliveryDays, 10) : null;
    const { data, error: e } = await supabase.from("reports").insert([{
      pin: reportPin, city: reportCity || `PIN ${reportPin}`, issue: reportText,
      user_id: user.id, user_email: user.email,
      delivery_days: days && days >= 1 && days <= 30 ? days : null,
    }]).select().single();
    if (!e && data) {
      setReports(prev => [data, ...prev]);
      setReportText(""); setReportPin(""); setReportCity(""); setReportDeliveryDays("");
      setSubmitOk(true); setTimeout(() => setSubmitOk(false), 3000);
    }
    setSubmitting(false);
  };

  const handleEditReport = async (id) => {
    if (!editingText.trim()) return;
    await supabase.from("reports").update({ issue: editingText }).eq("id", id);
    setReports(prev => prev.map(r => r.id === id ? { ...r, issue: editingText } : r));
    setEditingReportId(null); setEditingText("");
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm("Delete this report? This cannot be undone.")) return;
    await supabase.from("reports").delete().eq("id", id);
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const handleVote = useCallback(async (r) => {
    if (votes[r.id]) return;
    setVotes(prev => ({ ...prev, [r.id]: true }));             // Skill: functional setState
    setReports(prev => prev.map(x => x.id === r.id ? { ...x, votes: x.votes + 1 } : x));
    await supabase.from("reports").update({ votes: r.votes + 1 }).eq("id", r.id);
  }, [votes]);

  const handlePayment = async () => {
    if (!payContact) { setPayError("Enter your mobile or email to continue."); return; }
    setPayError(""); setPaying(true);
    const loaded = await loadRazorpay();
    if (!loaded) { setPayError("Could not load payment gateway."); setPaying(false); return; }
    try {
      const res = await fetch(`${SUPABASE_FUNC_URL}/create-order`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, body: JSON.stringify({ contact: payContact, pin: payPin }) });
      const { order_id, error: orderErr } = await res.json();
      if (orderErr || !order_id) { setPayError(orderErr || "Could not create order."); setPaying(false); return; }
      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY_ID, amount: 4900, currency: "INR", order_id, name: "CylinderCheck", description: "Plus — Monthly Subscription", prefill: { contact: payContact }, theme: { color: "#FF6B00" }, modal: { backdropclose: false },
        handler: async (response) => {
          const vr = await fetch(`${SUPABASE_FUNC_URL}/verify-payment`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, body: JSON.stringify({ ...response, contact: payContact, pin: payPin }) });
          const { success, error: verifyErr } = await vr.json();
          if (success) setPaySuccess(true); else setPayError(verifyErr || "Payment verification failed.");
          setPaying(false);
        },
      });
      rzp.on("payment.failed", () => { setPayError("Payment failed. Please try again."); setPaying(false); });
      rzp.open();
    } catch { setPayError("Something went wrong. Try again."); setPaying(false); }
  };

  const handleLogoClick = () => {
    setLogoClicks(prev => { const next = prev + 1; if (next >= 5) { setShowAdminPrompt(true); return 0; } return next; }); // Skill: functional setState
  };

  const handleAdminUnlock = async () => {
    if (adminPassword !== ADMIN_PASSWORD) { setAdminPassword(""); return; }
    setAdminUnlocked(true); setShowAdminPrompt(false); setAdminPassword("");
    setTab("admin"); setAdminLoading(true);
    try {
      const res = await fetch(`${SUPABASE_FUNC_URL}/get-admin-stats`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, body: JSON.stringify({ admin_password: ADMIN_PASSWORD }) });
      const data = await res.json();
      if (data.ok) setAdminData({ subscriptions: data.subscriptions || [], reportCount: data.reportCount || 0, alertCount: data.alertCount || 0 });
    } catch { /* silently fail */ }
    setAdminLoading(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="app-shell">

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo" onClick={handleLogoClick} title={logoClicks > 0 ? `${5 - logoClicks} more…` : ""}>
            {IcFlame}
            <span className="sidebar-logo-name">CylinderCheck<span className="sidebar-logo-dot" /></span>
          </div>
          <div className="sidebar-section">
            <span className="sidebar-section-label">Main</span>
            {TABS.map(t => (
              <button key={t.id} className={`sidebar-item${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
          <div className="sidebar-footer">
            <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "flex-start", gap: 8, marginBottom: 8, minHeight: "auto", padding: "6px 8px", fontSize: 12 }}
              onClick={() => setShowSupport(true)}>
              {IcSupport} Support & FAQ
            </button>
            {!authLoading && (user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div className="flex-none" style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-soft)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>
                  {user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="t-caption" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span>
                <button className="btn btn-ghost" style={{ minHeight: "auto", padding: "3px 8px", fontSize: 11 }}
                  onClick={() => supabase.auth.signOut()}>Out</button>
              </div>
            ) : (
              <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "flex-start", gap: 8, marginBottom: 8, minHeight: "auto", padding: "6px 8px", fontSize: 12 }}
                onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })}>
                {IcGoogle}
                Sign in with Google
              </button>
            ))}
            Not affiliated with IndianOil,<br />HP Gas, or Bharat Gas.<br />
            Data is community-sourced.<br /><br />
            © 2026 CylinderCheck 🇮🇳
          </div>
        </aside>

        {/* Main */}
        <div className="main-content">
          <div className="topbar">
            {IcFlame}
            <span className="topbar-name">CylinderCheck</span>
            {!authLoading && !user && (
              <button className="btn btn-ghost" style={{ minHeight: "auto", padding: "5px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })}>
                {IcGoogle}
                Sign in
              </button>
            )}
            {!authLoading && user && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-soft)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
                {user.email?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <ThemeToggle />
          </div>

          <div className="content-area">

            {/* ══ TRACK ══════════════════════════════════════════════════ */}
            {tab === "track" && (
              <div className="tab-panel">
                <h1 className="page-title">Booking Tracker</h1>
                <p className="page-subtitle">Know when to book. Know if there's a shortage. Real-time delivery intelligence by PIN code.</p>
                <PriceTicker mapPrices={mapPrices} />

                {shortageSummary && (
                  <div className="alert-banner alert-banner-danger anim-slide-up" style={{ marginBottom: 16 }}>
                    <div className="flex-none" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 1, color: "var(--danger)" }}>
                      <span className="pulse-dot pulse-dot-danger" />{IcWarn}
                    </div>
                    <div>
                      <div className="t-label" style={{ color: "var(--danger)", marginBottom: 5 }}>
                        COMMUNITY SHORTAGE SIGNAL · {shortageSummary.activePinCount} ACTIVE PIN{shortageSummary.activePinCount > 1 ? "S" : ""}
                      </div>
                      <p className="t-body" style={{ margin: 0 }}>
                        <strong style={{ color: "var(--danger)" }}>{shortageSummary.totalReports} community reports</strong> in the last 30 days across{" "}
                        <strong style={{ color: "var(--danger)" }}>{shortageSummary.activePinCount} PIN zones</strong>.{" "}
                        Hotspot: <strong style={{ color: "var(--danger)" }}>{shortageSummary.hotspot}</strong> ({shortageSummary.hotspotReports} reports).
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid-2col">
                  <div className="track-form">
                    <div className="neu-card mb-card">
                      <div className="section-title">Delivery Prediction</div>
                      <div className="input-group">
                        <label className="input-label">PIN Code</label>
                        <input className="input" placeholder="Enter 6-digit PIN e.g. 530001"
                          value={pin} maxLength={6} inputMode="numeric" pattern="[0-9]*"
                          autoFocus={typeof window !== "undefined" && window.innerWidth < 768}
                          onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                          onKeyDown={e => e.key === "Enter" && handleTrack()} />
                      </div>
                      <div className="input-group">
                        <label className="input-label">
                          Last Booking Date{" "}
                          <span style={{ color: "var(--text-muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none", fontSize: 11 }}>(optional)</span>
                        </label>
                        <input className="input" type="date" value={lastBooking} onChange={e => setLastBooking(e.target.value)} />
                      </div>
                      {error && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{error}</div>}
                      <button className="btn btn-primary btn-block" onClick={handleTrack} disabled={loading}>
                        {loading ? "Looking up…" : "Check My Area →"}
                      </button>
                    </div>
                  </div>

                  <div className="track-result">
                    {!pinData && !loading && EmptyState}
                    {loading && SkeletonCard}
                    {pinData && !loading && (
                      <div className="anim-slide-up result-card" ref={resultRef}>
                        <div className="neu-card mb-card">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                                {IcPin}<span className="t-label" style={{ color: "var(--accent)" }}>{pinData.area || `PIN ${pinData.pin}`}</span>
                              </div>
                              <div className="t-heading" style={{ fontSize: 24 }}>{pinData.city}</div>
                            </div>
                            <Trend t={pinData.trend} />
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Average Delivery Time</span>
                            <span className="stat-value">{pinData.avg_days !== "—" ? `${pinData.avg_days} days` : "No data yet"}</span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Gas Agency</span>
                            <span className="stat-value">{pinData.agency}</span>
                          </div>
                          <div className="stat-row stat-row-last">
                            <span className="stat-label">Shortage Status</span>
                            {(() => {
                              const n = pinData.reportCount;
                              if (n === 0) return <span className="stat-value" style={{ color: "var(--success)" }}>🟢 All clear</span>;
                              if (n === 1) return <span className="stat-value" style={{ color: "var(--warning)" }}>🟡 Early signal ({n} report)</span>;
                              if (n <= 4) return <span className="stat-value" style={{ color: "var(--warning)" }}>🟠 Active shortage ({n} reports)</span>;
                              return <span className="stat-value" style={{ color: "var(--danger)" }}>🔴 Severe shortage ({n} reports)</span>;
                            })()}
                          </div>
                        </div>

                        {bookingResult && (
                          <div className={`neu-card mb-card${bookingResult.daysLeft <= 0 ? " booking-open" : ""}`}>
                            <div className="section-title">Your Booking Window</div>
                            <div className="booking-ring-row">
                              <Ring daysLeft={bookingResult.daysLeft} />
                              <div>
                                <div className="t-caption" style={{ marginBottom: 5 }}>{bookingResult.daysLeft <= 0 ? "Window is open now" : "Next window opens"}</div>
                                <div className="t-heading" style={{ color: bookingResult.daysLeft <= 0 ? "var(--success)" : "var(--text-primary)" }}>
                                  {bookingResult.daysLeft <= 0 ? "Book Right Now! 🎉" : fmt(bookingResult.nextWindow)}
                                </div>
                                {bookingResult.daysLeft > 0 && <div className="t-caption" style={{ marginTop: 8 }}>Est. delivery by {fmt(addDays(bookingResult.nextWindow, Math.round(pinData.avg_days)))}</div>}
                                <div className="t-caption" style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                                  Based on 25-day refilling rules + {pinData.avg_days}-day local delivery lag
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {pinData.reportCount >= 2 && (
                          <div className={`alert-banner ${pinData.reportCount >= 5 ? "alert-banner-danger" : "alert-banner-warning"} anim-scale-in`}>
                            <span className="flex-none" style={{ fontSize: 20, lineHeight: 1 }}>{pinData.reportCount >= 5 ? "🔴" : "🟠"}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: pinData.reportCount >= 5 ? "var(--danger)" : "var(--warning)", marginBottom: 4 }}>
                                {pinData.reportCount >= 5 ? "Severe Shortage in Your Area" : "Active Shortage in Your Area"}
                              </div>
                              <p className="t-caption" style={{ margin: 0 }}>Expect 3–7 extra days on delivery. Book as early as your window allows.</p>
                            </div>
                          </div>
                        )}

                        {/* Commercial alternatives nudge — shown when shortage detected */}
                        {pinData.reportCount >= 2 && (
                          <div className="commercial-nudge anim-scale-in">
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              {IcBolt}
                              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                                Running a restaurant or hotel?
                              </span>
                            </div>
                            <p className="t-caption" style={{ margin: "0 0 10px" }}>
                              Commercial LPG has been cut across India. Find induction cooktops,
                              electric ranges and more available in your city today.
                            </p>
                            <button className="btn btn-primary"
                              style={{ minHeight: "auto", padding: "8px 16px", fontSize: 13, width: "100%" }}
                              onClick={() => setTab("commercial")}>
                              Find Alternatives Now →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="track-portals">
                    <div className="neu-card mb-card">
                      <div className="section-title">Official Booking Portals</div>
                      {PORTALS.map(([emoji, label, url]) => (
                        <a key={url} href={url} target="_blank" rel="noopener" className="portal-link">
                          <span>{emoji} {label}</span>
                          <span style={{ color: "var(--text-muted)" }}>{IcExt}</span>
                        </a>
                      ))}
                    </div>
                    <div className="neu-card mb-card">
                      <div className="section-title">Book via UPI Apps</div>
                      <p className="t-caption" style={{ marginBottom: 12 }}>Most users don't know this — GPay, PhonePe & Paytm have LPG booking built in.</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        {UPI_PORTALS.map(([letter, label, url, color]) => (
                          <a key={url} href={url} target="_blank" rel="noopener" className="upi-portal-btn">
                            <div className="upi-portal-icon" style={{ background: color }}>{letter}</div>
                            <span className="t-caption" style={{ textAlign: "center", color: "var(--text-secondary)" }}>{label}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                    <AdSlot id="track-left" type="rectangle" />
                  </div>
                </div>
              </div>
            )}

            {/* ══ PRICES ══════════════════════════════════════════════════ */}
            {tab === "prices" && (
              <div className="tab-panel">
                <h1 className="page-title">LPG Prices</h1>
                <p className="page-subtitle">14.2 kg domestic cylinder — live prices across 12 cities, updated every Sunday.</p>
                <PricesMap contact={contact} setContact={setContact} alertSaved={alertSaved} setAlertSaved={setAlertSaved} mapPrices={mapPrices} lastUpdated={pricesLastUpdated} />
                <AdSlot id="prices-bottom" type="leaderboard" />
              </div>
            )}

            {/* ══ REPORTS ═════════════════════════════════════════════════ */}
            {tab === "community" && (
              <div className="tab-panel">
                <h1 className="page-title">Community Reports</h1>
                <p className="page-subtitle">Flag delivery delays, shortages, and agency issues in your area. Real reports from real people.</p>
                <div className="grid-2col">
                  <div>
                    <div className="neu-card mb-card">
                      <div className="section-title">Submit a Report</div>
                      {!authLoading && !user ? (
                        <div style={{ textAlign: "center", padding: "20px 0" }}>
                          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
                          <div className="t-subheading" style={{ marginBottom: 8 }}>Sign in to submit</div>
                          <p className="t-caption" style={{ marginBottom: 16 }}>Reports require a Google account so the community stays spam-free and accountable.</p>
                          <button className="btn btn-primary btn-block"
                            onClick={() => {
                              try { sessionStorage.setItem("cc-post-auth-tab", "community"); } catch { /* private mode */ }
                              supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
                            }}>
                            {IcGoogle}
                            Sign in with Google →
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="input-group">
                            <label className="input-label">PIN Code *</label>
                            <input className="input" placeholder="6-digit PIN" value={reportPin} maxLength={6} inputMode="numeric" pattern="[0-9]*"
                              onChange={e => setReportPin(e.target.value.replace(/\D/g, ""))} />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Area / Colony <span style={{ color: "var(--text-muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>(optional)</span></label>
                            <input className="input" placeholder="e.g. Vizag — Gajuwaka" value={reportCity} onChange={e => setReportCity(e.target.value)} />
                          </div>
                          <div className="input-group">
                            <label className="input-label">What's happening? *</label>
                            <textarea className="input" style={{ height: 110, resize: "vertical" }}
                              placeholder="e.g. No delivery in 12 days, driver demanding ₹100 extra…"
                              value={reportText} onChange={e => setReportText(e.target.value)} />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Delivery took how many days? <span style={{ color: "var(--text-muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>(optional — helps calibrate avg)</span></label>
                            <input className="input" placeholder="e.g. 8" inputMode="numeric" maxLength={2}
                              value={reportDeliveryDays} onChange={e => setReportDeliveryDays(e.target.value.replace(/\D/g, ""))} />
                          </div>
                          <button className="btn btn-primary btn-block" onClick={handleReport} disabled={submitting || !reportText.trim() || !reportPin}>
                            {submitOk ? "✓ Submitted — Thank you!" : submitting ? "Submitting…" : "Submit Report →"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="t-label mb-card">Live Feed — Top Voted</div>
                    {reports.length === 0 ? (
                      <div className="neu-card" style={{ textAlign: "center", padding: 40 }}>
                        <p className="t-body">No reports yet. Be the first to flag an issue.</p>
                      </div>
                    ) : reports.map(r => (
                      <div key={r.id} className="neu-card list-card mb-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                          <span className="badge badge-accent">PIN {r.pin}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="t-caption">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                            {user && r.user_id === user.id && editingReportId !== r.id && (
                              <>
                                <button onClick={() => { setEditingReportId(r.id); setEditingText(r.issue); }}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px 4px", fontSize: 13 }} title="Edit">✏️</button>
                                <button onClick={() => handleDeleteReport(r.id)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: "2px 4px", fontSize: 13 }} title="Delete">🗑</button>
                              </>
                            )}
                          </div>
                        </div>
                        {r.city ? <div className="t-subheading" style={{ marginBottom: 5 }}>{r.city}</div> : null}
                        {editingReportId === r.id ? (
                          <div>
                            <textarea className="input" style={{ height: 90, resize: "vertical", marginBottom: 8 }} value={editingText} onChange={e => setEditingText(e.target.value)} />
                            <div style={{ display: "flex", gap: 8 }}>
                              <button className="btn btn-primary" style={{ flex: 1, minHeight: "auto", padding: "7px 12px", fontSize: 13 }} onClick={() => handleEditReport(r.id)}>Save</button>
                              <button className="btn btn-ghost" style={{ minHeight: "auto", padding: "7px 12px", fontSize: 13 }} onClick={() => setEditingReportId(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <p className="t-body" style={{ marginBottom: 12 }}>{r.issue}</p>
                        )}
                        {r.delivery_days && <div className="t-caption" style={{ marginBottom: 8, color: "var(--text-muted)" }}>⏱ Delivery took {r.delivery_days} days</div>}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <button onClick={() => handleVote(r)} className={`vote-btn${votes[r.id] ? " voted" : ""}`}>
                            ↑ {r.votes} upvote{r.votes !== 1 ? "s" : ""}
                          </button>
                          {r.votes > 20 && <span className="badge badge-danger">Trending</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══ NEWS ════════════════════════════════════════════════════ */}
            {tab === "news" && (
              <div className="tab-panel">
                <h1 className="page-title">LPG News</h1>
                <p className="page-subtitle">Latest coverage on LPG pricing, supply, and policy from across India.</p>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                  <button onClick={() => fetchNews(true)} disabled={newsLoading} className="btn btn-ghost"
                    style={{ minHeight: "auto", padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    {IcRefresh(newsLoading)}{newsLoading ? "Refreshing…" : "Refresh feed"}
                  </button>
                </div>
                {/* Skeleton only on first load (no existing articles yet) */}
                {newsLoading && !news.length ? [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="neu-card mb-card">
                    <div className="skeleton skeleton-text" style={{ width: "85%", marginBottom: 10 }} />
                    <div className="skeleton skeleton-text" style={{ width: "50%" }} />
                  </div>
                )) : !news.length ? (
                  <div className="neu-card" style={{ textAlign: "center", padding: 48 }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📰</div>
                    <div className="t-subheading" style={{ marginBottom: 8 }}>No recent news</div>
                    <p className="t-caption">Try refreshing or check back later.</p>
                  </div>
                ) : news.map((item, i) => {
                  const m = Math.round((Date.now() - item.pubDate) / 60000);
                  const timeAgo = m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
                  const waUrl = `https://wa.me/?text=${encodeURIComponent(item.title + " — cylindercheck.in")}`;
                  return (
                    <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                      className="neu-card list-card mb-card" style={{ display: "block", textDecoration: "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <p className="t-body" style={{ margin: 0, flex: 1, color: "var(--text-primary)", lineHeight: 1.5 }}>{item.title}</p>
                        <span className="flex-none" style={{ color: "var(--text-muted)", marginTop: 2 }}>{IcExt}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                        <span className="badge badge-accent">{item.source}</span>
                        <span className="t-caption">{timeAgo}</span>
                        <a className="whatsapp-share"
                          href={waUrl}
                          target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          title="Share on WhatsApp">
                          📲 Share
                        </a>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}

            {/* ══ ALERTS ══════════════════════════════════════════════════ */}
            {tab === "alerts" && (
              <div className="tab-panel">
                <h1 className="page-title">Alerts &amp; Notifications</h1>
                <p className="page-subtitle">Know before the shortage hits. Get pinged when your booking window opens and when your area runs low.</p>
                <div className="grid-2col">
                  <div>
                    <div className="neu-card mb-card">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <span className="badge badge-success">FREE</span>
                        <div className="section-title" style={{ marginBottom: 0 }}>Booking Window Alert</div>
                      </div>
                      <p className="t-body" style={{ marginBottom: 18 }}>Enter your last booking date and we'll alert you 2 days before your next window opens. No app, no spam.</p>
                      <div className="input-group">
                        <label className="input-label">PIN Code</label>
                        <input className="input" placeholder="6-digit PIN" value={alertPin} maxLength={6} inputMode="numeric" pattern="[0-9]*"
                          onChange={e => setAlertPin(e.target.value.replace(/\D/g, ""))} />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Last Booking Date</label>
                        <input className="input" type="date" value={alertDate} onChange={e => setAlertDate(e.target.value)} />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Mobile or Email *</label>
                        <input className="input" placeholder="98xxxxxxxx or you@email.com" inputMode="email" autoComplete="email"
                          value={contact} onChange={e => { setContact(e.target.value); setFreeAlertError(""); }} />
                      </div>
                      {freeAlertError && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{freeAlertError}</div>}
                      <button className="btn btn-primary btn-block" disabled={freeAlertSaving || !contact}
                        onClick={async () => {
                          if (!contact.trim()) { setFreeAlertError("Enter your mobile number or email."); return; }
                          setFreeAlertSaving(true); setFreeAlertError("");
                          const { error } = await supabase.from("alert_subscriptions").insert([{ contact: contact.trim(), pin: alertPin || null, last_booking: alertDate || null, alert_type: "free" }]);
                          if (error) { setFreeAlertError("Something went wrong. Please try again."); setFreeAlertSaving(false); }
                          else setAlertSaved(true);
                        }}>
                        {alertSaved ? "✓ Alert Activated!" : freeAlertSaving ? "Saving…" : "Activate Free Alert →"}
                      </button>
                      {alertSaved && <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, fontSize: 12, color: "var(--success)" }}>{IcCheck} You'll be notified 2 days before your window opens.</div>}
                    </div>

                    <div className="neu-card" style={{ background: "var(--bg-inset)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div className="section-title" style={{ marginBottom: 0 }}>Free vs Plus</div>
                        <div style={{ display: "flex", gap: 28, paddingRight: 4 }}>
                          <span className="t-label">FREE</span>
                          <span className="t-label" style={{ color: "var(--accent)" }}>PLUS</span>
                        </div>
                      </div>
                      {FEAT_COMPARISON.map(([feat, free, plus], idx) => (
                        <div key={feat} className={`feat-row${idx === FEAT_COMPARISON.length - 1 ? " feat-row-last" : ""}`}>
                          <span className="t-body" style={{ margin: 0 }}>{feat}</span>
                          <div className="feat-checks">
                            <span style={{ fontSize: 13, fontWeight: 600, width: 14, textAlign: "center", color: free ? "var(--success)" : "var(--border)" }}>{free ? "✓" : "—"}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, width: 14, textAlign: "center", color: plus ? "var(--accent)" : "var(--border)" }}>{plus ? "✓" : "—"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="neu-card plus-card-border" style={{ position: "relative", overflow: "hidden" }}>
                      <div className="plus-card-glow" />
                      <div style={{ position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <div className="t-heading" style={{ color: "var(--accent)" }}>CylinderCheck Plus</div>
                          <span className="badge badge-accent">EARLY ACCESS</span>
                        </div>
                        <p className="t-caption" style={{ marginBottom: 20 }}>Shortage intelligence for Indian households. Know before your neighbours do.</p>
                        <div className="neu-inset" style={{ padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "baseline", gap: 8, borderRadius: "var(--radius-md)" }}>
                          <div className="t-display">₹49</div>
                          <div>
                            <div className="t-body" style={{ margin: 0 }}>/month</div>
                            <div className="t-caption">Cancel anytime</div>
                          </div>
                        </div>
                        {PLUS_FEATURES.map(([icon, feat]) => (
                          <div key={feat} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 13 }}>
                            <span className="flex-none" style={{ fontSize: 16, lineHeight: 1.3 }}>{icon}</span>
                            <span className="t-body" style={{ margin: 0 }}>{feat}</span>
                          </div>
                        ))}
                        <div className="alert-banner alert-banner-warning" style={{ margin: "20px 0 16px" }}>
                          <span className="flex-none" style={{ fontSize: 18 }}>🔥</span>
                          <p className="t-caption" style={{ margin: 0 }}>
                            <strong style={{ color: "var(--warning)" }}>During active shortages</strong>,
                            {" "}Plus members get area-specific alerts up to 48 hours before the disruption is publicly reported.
                          </p>
                        </div>
                        <p className="t-caption" style={{ marginBottom: 16, textAlign: "center" }}>
                          Join <span style={{ color: "var(--accent)", fontWeight: 600 }}>early access</span> — limited to first 500 subscribers
                        </p>
                        {paySuccess ? (
                          <div className="alert-banner alert-banner-success" style={{ flexDirection: "column", textAlign: "center", gap: 6 }}>
                            <div style={{ fontSize: 28 }}>🎉</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--success)" }}>You're a Plus member!</div>
                            <p className="t-caption" style={{ margin: 0 }}>Alerts will be sent to <strong>{payContact}</strong>.<br />You'll get your first alert within 24 hours.</p>
                          </div>
                        ) : (
                          <>
                            <div className="input-group">
                              <label className="input-label">Your mobile or email *</label>
                              <input className="input" placeholder="98xxxxxxxx or you@gmail.com" value={payContact} onChange={e => setPayContact(e.target.value)} />
                            </div>
                            <div className="input-group">
                              <label className="input-label">PIN Code <span style={{ color: "var(--text-muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>(optional)</span></label>
                              <input className="input" placeholder="6-digit PIN" value={payPin} maxLength={6} inputMode="numeric" pattern="[0-9]*"
                                onChange={e => setPayPin(e.target.value.replace(/\D/g, ""))} />
                            </div>
                            {payError && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{payError}</div>}
                            <button className="btn btn-primary btn-block" onClick={handlePayment} disabled={paying}>
                              {paying ? "Opening payment…" : "Get Plus for ₹49/month →"}
                            </button>
                          </>
                        )}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 14 }}>
                          <span className="t-caption">🔒 Razorpay · 256-bit SSL</span>
                          <span className="t-caption">·</span>
                          <span className="t-caption">Cancel anytime</span>
                        </div>
                      </div>
                    </div>
                    <AdSlot id="alerts-bottom" type="rectangle" />
                  </div>
                </div>
              </div>
            )}

            {/* ══ COMMERCIAL ══════════════════════════════════════════════ */}
            {tab === "commercial" && (
              <CommercialPage prefilledCity={
                pinData?.city
                  ? CITY_NORMALISE[pinData.city.split(",")[0].trim().toLowerCase()] || ""
                  : ""
              } />
            )}

            {/* ══ ADMIN ════════════════════════════════════════════════════ */}
            {tab === "admin" && adminUnlocked && (
              <div className="tab-panel">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <h1 className="page-title">Admin Dashboard</h1>
                    <p className="page-subtitle" style={{ margin: 0 }}>Revenue, subscribers, and platform health.</p>
                  </div>
                  <button className="btn btn-ghost" onClick={() => { setAdminUnlocked(false); setTab("track"); }}>🔒 Lock</button>
                </div>
                {adminLoading ? (
                  <div className="grid-3col" style={{ marginBottom: 20 }}>
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton skeleton-card" />)}
                  </div>
                ) : adminData && (
                  <>
                    <div className="grid-3col" style={{ marginBottom: 20 }}>
                      {[
                        ["💰", "Total Revenue", `₹${((adminData.subscriptions?.length || 0) * 49).toLocaleString("en-IN")}`, "var(--success)"],
                        ["👥", "Active Subscribers", adminData.subscriptions?.filter(s => s.status === "active").length || 0, "var(--accent)"],
                        ["📋", "Free Alert Signups", adminData.alertCount || 0, "var(--info)"],
                        ["🗣", "Community Reports", adminData.reportCount || 0, "var(--warning)"],
                        ["📈", "This Month", `₹${(adminData.subscriptions?.filter(s => { const d = new Date(s.created_at), n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() }).length || 0) * 49}`, "var(--warning)"],
                        ["🔄", "MRR", `₹${(adminData.subscriptions?.filter(s => s.status === "active").length || 0) * 49}/mo`, "var(--accent)"],
                      ].map(([icon, label, value, color]) => (
                        <div key={label} className="neu-card" style={{ marginBottom: 0 }}>
                          <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                          <div className="t-label" style={{ marginBottom: 6 }}>{label}</div>
                          {(value === 0 || value === "₹0" || value === "₹0/mo")
                            ? <div className="t-body" style={{ color: "var(--text-muted)", margin: 0 }}>No subscribers yet</div>
                            : <div className="t-heading" style={{ color, fontSize: 28, letterSpacing: "-0.03em" }}>{value}</div>}
                        </div>
                      ))}
                    </div>

                    <div className="neu-card mb-card">
                      <div className="section-title">Recent Subscribers</div>
                      {(!adminData.subscriptions || adminData.subscriptions.length === 0) ? (
                        <div style={{ textAlign: "center", padding: "20px 0" }}><p className="t-body">No subscribers yet — share the link!</p></div>
                      ) : (
                        <div className="admin-table-wrap">
                          <table className="admin-table">
                            <thead><tr>{["Contact", "PIN", "Amount", "Status", "Date"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                            <tbody>
                              {adminData.subscriptions.map(s => (
                                <tr key={s.id}>
                                  <td style={{ color: "var(--text-primary)" }}>{s.contact}</td>
                                  <td>{s.pin || "—"}</td>
                                  <td style={{ color: "var(--success)", fontWeight: 600 }}>₹{(s.amount || 4900) / 100}</td>
                                  <td><span className={`badge ${s.status === "active" ? "badge-success" : "badge-danger"}`}>{s.status}</span></td>
                                  <td style={{ fontSize: 11 }}>{new Date(s.created_at).toLocaleDateString("en-IN")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="neu-card" style={{ background: "var(--bg-inset)" }}>
                      <div className="section-title">Recent Payment IDs</div>
                      <p className="t-caption" style={{ marginBottom: 12 }}>Cross-reference with Razorpay dashboard if needed.</p>
                      {(adminData.subscriptions || []).slice(0, 10).map(s => (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--bg-raised)", fontSize: 11 }}>
                          <span style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>{s.razorpay_payment_id || "pending"}</span>
                          <span className="t-caption">{new Date(s.created_at).toLocaleDateString("en-IN")}</span>
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

      {/* Admin modal */}
      {showAdminPrompt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="neu-card anim-scale-in" style={{ width: "min(340px,calc(100vw - 32px))", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🔒</div>
            <div className="t-subheading" style={{ marginBottom: 4 }}>Admin Access</div>
            <p className="t-caption" style={{ marginBottom: 20 }}>Enter your admin password</p>
            <div className="input-group">
              <input className="input" type="password" placeholder="••••••••"
                value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdminUnlock()} autoFocus
                style={{ textAlign: "center", letterSpacing: 4 }} />
            </div>
            {adminPassword && adminPassword !== ADMIN_PASSWORD && (
              <div style={{ fontSize: 11, color: "var(--danger)", marginBottom: 8 }}>Incorrect password</div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowAdminPrompt(false); setAdminPassword(""); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAdminUnlock}>Unlock</button>
            </div>
          </div>
        </div>
      )}

      {/* Support modal */}
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}

      {/* Floating support button — mobile only */}
      <button className="support-fab" onClick={() => setShowSupport(true)} aria-label="Support">
        {IcSupport}
      </button>

      {/* Mobile bottom nav */}
      <div className="bottom-nav">
        {TABS.map(t => (
          <button key={t.id} className={`bn-item${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
    </>
  );
}
