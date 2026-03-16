import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn';
import { Bell, ShieldAlert, BadgeCheck, Check, Zap, Loader2 } from 'lucide-react';
import { FadeIn } from '../../components/motion/FadeIn';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SUPABASE_FUNC_URL = `${(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "")}/functions/v1`;

const PLUS_FEATURES = [
  ["📲", "SMS + WhatsApp alert 2 days before booking window"],
  ["🚨", "Shortage early warning for your PIN — before it spreads"],
  ["💰", "Price revision alert 24hrs before news breaks"],
  ["📦", "Delivery day status ping so you're home on time"],
  ["📊", "Monthly supply health score for your area"],
];

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

export default function AlertsTab() {
  const [contact, setContact] = useState("");
  const [alertPin, setAlertPin] = useState("");
  const [alertDate, setAlertDate] = useState("");
  
  const [freeAlertSaving, setFreeAlertSaving] = useState(false);
  const [freeAlertError, setFreeAlertError] = useState("");
  const [alertSaved, setAlertSaved] = useState(false);

  // Plus Payment State
  const [payContact, setPayContact] = useState("");
  const [payPin, setPayPin] = useState("");
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payError, setPayError] = useState("");

  const handleFreeAlertSubmit = async () => {
    if (!contact.trim()) { setFreeAlertError("Enter your mobile number or email."); return; }
    setFreeAlertSaving(true); setFreeAlertError("");
    
    const { error } = await supabase.from("alert_subscriptions").insert([{ 
      contact: contact.trim(), 
      pin: alertPin || null, 
      last_booking: alertDate || null, 
      alert_type: "free" 
    }]);
    
    if (error) { 
      setFreeAlertError("Something went wrong. Please try again."); 
      setFreeAlertSaving(false); 
    } else {
      setAlertSaved(true);
    }
  };

  const handlePayment = async () => {
    if (!payContact) { setPayError("Enter your mobile or email to continue."); return; }
    setPayError(""); setPaying(true);
    
    const loaded = await loadRazorpay();
    if (!loaded) { setPayError("Could not load payment gateway."); setPaying(false); return; }
    
    try {
      const res = await fetch(`${SUPABASE_FUNC_URL}/create-order`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, 
        body: JSON.stringify({ contact: payContact, pin: payPin }) 
      });
      const { order_id, error: orderErr } = await res.json();
      
      if (orderErr || !order_id) { 
        setPayError(orderErr || "Could not create order."); 
        setPaying(false); 
        return; 
      }
      
      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY_ID, 
        amount: 4900, 
        currency: "INR", 
        order_id, 
        name: "CylinderCheck", 
        description: "Plus — Monthly Subscription", 
        prefill: { contact: payContact }, 
        theme: { color: "#FF6B00" }, 
        modal: { backdropclose: false },
        handler: async (response) => {
          const vr = await fetch(`${SUPABASE_FUNC_URL}/verify-payment`, { 
            method: "POST", 
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, 
            body: JSON.stringify({ ...response, contact: payContact, pin: payPin }) 
          });
          const { success, error: verifyErr } = await vr.json();
          if (success) setPaySuccess(true); 
          else setPayError(verifyErr || "Payment verification failed.");
          setPaying(false);
        },
      });
      
      rzp.on("payment.failed", () => { setPayError("Payment failed. Please try again."); setPaying(false); });
      rzp.open();
    } catch { 
      setPayError("Something went wrong. Try again."); 
      setPaying(false); 
    }
  };

  return (
    <div className="space-y-8 pb-12 w-full">
      <div className="max-w-2xl mx-auto md:px-4">
        <h1 className="text-[clamp(24px,4vw,36px)] font-bold font-display tracking-tight text-[var(--text-primary)] mb-2 flex items-center gap-3">
          <Bell size={28} className="text-[var(--accent)]" />
          Alerts & Notifications
        </h1>
        <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed mb-8 font-medium">
          Know before the shortage hits. Get pinged when your booking window opens, when your area runs low, and when prices drop.
        </p>

        <div className="flex flex-col space-y-6">
          
          {/* Free Booking Alert */}
          <FadeIn delay={0.1}>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="bg-[rgba(45,92,58,0.1)] text-[var(--status-clear)] border border-[rgba(45,92,58,0.2)] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[var(--radius-xs)] font-data">
                  Free
                </span>
                <h2 className="text-[18px] font-bold text-[var(--text-primary)] capitalize tracking-tight font-display">Booking Window Alert</h2>
              </div>
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-6">
                Enter your last booking date and we'll alert you 2 days before your next window opens. No app, no spam.
              </p>
              
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2">PIN Code</label>
                    <input className="block w-full px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border)] rounded-md font-data text-lg tracking-widest text-[var(--text-data)] focus:border-[var(--accent)] focus:outline-none placeholder:tracking-normal placeholder:font-body placeholder:text-[14px] placeholder:text-[var(--text-muted)]" placeholder="6-digit PIN" value={alertPin} maxLength={6} inputMode="numeric" pattern="[0-9]*" onChange={e => setAlertPin(e.target.value.replace(/\D/g, ""))} />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2">Last Booking</label>
                    <input className="block w-full px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border)] rounded-md focus:border-[var(--accent)] focus:outline-none text-[15px] text-[var(--text-primary)]" type="date" value={alertDate} onChange={e => setAlertDate(e.target.value)} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2">Mobile or Email *</label>
                  <input className="block w-full px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border)] rounded-md focus:border-[var(--accent)] focus:outline-none text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" placeholder="98xxxxxxxx or you@email.com" inputMode="email" autoComplete="email" value={contact} onChange={e => { setContact(e.target.value); setFreeAlertError(""); }} />
                </div>
                
                {freeAlertError && <div className="text-[12px] text-[var(--status-severe)] font-medium bg-[rgba(224,48,48,0.1)] px-3 py-2 rounded-md mb-2 border border-[rgba(224,48,48,0.2)]">{freeAlertError}</div>}
                
                <button 
                  className="w-full flex items-center justify-center py-3 rounded-md border border-[var(--border)] bg-[var(--bg-inset)] text-[14px] font-bold text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors" 
                  disabled={freeAlertSaving || !contact} 
                  onClick={handleFreeAlertSubmit}
                >
                  {alertSaved ? (
                    <span className="flex items-center justify-center gap-2 text-[var(--status-clear)]"><Check size={16} /> Alert Activated!</span>
                  ) : freeAlertSaving ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Saving...</span>
                  ) : (
                    "Activate Free Alert →"
                  )}
                </button>
                
                {alertSaved && (
                  <div className="flex items-center gap-2 mt-2 text-[12px] font-medium text-[var(--status-clear)] justify-center">
                    <Check size={14} /> You'll be notified 2 days before your window opens.
                  </div>
                )}
              </div>
            </div>
          </FadeIn>

          {/* Gap Nudge Strip */}
          <FadeIn delay={0.2}>
            <div className="rounded-lg bg-[var(--bg-inset)] border border-[var(--border)] py-4 px-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest font-data mb-3">Upgrade to Plus for:</div>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-[13px] text-[var(--text-primary)] font-medium">
                      <span className="text-[var(--accent)]"><Check size={14} /></span> 48hr early shortage warnings
                    </li>
                    <li className="flex items-center gap-2 text-[13px] text-[var(--text-primary)] font-medium">
                      <span className="text-[var(--accent)]"><Check size={14} /></span> Black market price tracking
                    </li>
                  </ul>
                </div>
                <button 
                  className="rounded-full border border-[var(--accent)] text-[var(--accent)] hover:bg-[rgba(255,107,0,0.1)] px-4 py-2 text-[12px] font-bold transition-colors"
                  onClick={() => document.getElementById("plus-card").scrollIntoView({ behavior: "smooth" })}
                >
                  See Details ↓
                </button>
              </div>
            </div>
          </FadeIn>

          {/* Plus Card */}
          <FadeIn delay={0.3}>
            <div id="plus-card" className="rounded-lg relative overflow-hidden bg-[var(--bg-raised)] border border-[rgba(255,107,0,0.3)] p-6 shadow-[0_8px_30px_rgba(255,107,0,0.08)]">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[var(--accent)] opacity-10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[22px] font-bold font-display text-[var(--accent)] tracking-tight flex items-center gap-2">
                    <BadgeCheck size={24} />
                    CylinderCheck Plus
                  </h2>
                  <span className="bg-[var(--accent-fog)] text-[var(--accent)] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[var(--radius-xs)] font-data border border-[rgba(255,107,0,0.2)]">
                    EARLY ACCESS
                  </span>
                </div>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-6 font-medium">
                  Shortage intelligence for Indian households. Know before your neighbours do.
                </p>
                
                <div className="bg-[var(--bg-inset)] border border-[var(--border)] rounded-md p-4 mb-6 flex items-baseline gap-2 max-w-max">
                  <div className="text-[32px] font-display font-bold tracking-tight text-[var(--text-primary)]">₹49</div>
                  <div className="flex flex-col">
                    <span className="text-[14px] text-[var(--text-secondary)] font-medium leading-none mb-1">/month</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-body">Cancel anytime</span>
                  </div>
                </div>
                
                <div className="space-y-3.5 mb-8 border-b border-[var(--divider)] pb-6">
                  {PLUS_FEATURES.map(([emoji, feat]) => (
                    <div key={feat} className="flex items-start gap-3">
                      <span className="flex-none text-[16px] leading-[1.3]">{emoji}</span>
                      <span className="text-[14px] text-[var(--text-primary)] font-medium leading-relaxed">{feat}</span>
                    </div>
                  ))}
                </div>
                
                <div className="bg-[rgba(232,168,64,0.1)] border border-[rgba(232,168,64,0.2)] rounded-md p-4 mb-6 flex gap-3">
                  <span className="flex-none text-[18px]">🔥</span>
                  <p className="text-[13px] text-[var(--status-early)] leading-relaxed font-medium m-0">
                    <strong className="block mb-1">During active shortages,</strong>
                    Plus members get area-specific alerts up to 48 hours before the disruption is publicly reported.
                  </p>
                </div>
                
                <p className="text-[13px] text-center text-[var(--text-secondary)] mb-5">
                  Join <strong className="text-[var(--accent)] font-semibold">early access</strong> — limited to first 500 subscribers
                </p>
                
                {paySuccess ? (
                  <div className="bg-[rgba(45,92,58,0.1)] border border-[rgba(45,92,58,0.2)] rounded-md p-6 text-center shadow-sm">
                    <div className="text-3xl mb-3">🎉</div>
                    <div className="text-[16px] font-bold text-[var(--status-clear)] mb-2 font-display">You're a Plus member!</div>
                    <p className="text-[13px] text-[var(--text-secondary)] m-0 leading-relaxed">
                      Alerts will be sent to <strong>{payContact}</strong>.<br />You'll get your first alert within 24 hours.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2">Your mobile or email *</label>
                      <input className="block w-full px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border)] rounded-md focus:border-[var(--accent)] focus:outline-none text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" placeholder="98xxxxxxxx or you@gmail.com" value={payContact} onChange={e => setPayContact(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2">
                        PIN Code <span className="text-[var(--text-muted)] text-[10px] normal-case tracking-normal font-body font-normal">(optional)</span>
                      </label>
                      <input className="block w-full px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border)] rounded-md font-data text-lg tracking-widest text-[var(--text-data)] focus:border-[var(--accent)] focus:outline-none placeholder:tracking-normal placeholder:font-body placeholder:text-[14px] placeholder:text-[var(--text-muted)]" placeholder="6-digit PIN" value={payPin} maxLength={6} inputMode="numeric" pattern="[0-9]*" onChange={e => setPayPin(e.target.value.replace(/\D/g, ""))} />
                    </div>
                    
                    {payError && <div className="text-[12px] text-[var(--status-severe)] font-medium bg-[rgba(224,48,48,0.1)] px-3 py-2 rounded-md mb-2 border border-[rgba(224,48,48,0.2)]">{payError}</div>}
                    
                    <LiquidGlassBtn 
                      className="w-full justify-center mt-2" 
                      onClick={handlePayment} 
                      disabled={paying}
                    >
                      {paying ? (
                         <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Opening payment…</span>
                      ) : (
                        <span className="flex items-center justify-center gap-2"><Zap size={16} /> Get Plus for ₹49/month →</span>
                      )}
                    </LiquidGlassBtn>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-4 mt-5 text-[11px] text-[var(--text-muted)] font-medium font-data tracking-widest uppercase">
                  <span className="flex items-center gap-1.5"><ShieldAlert size={12} /> Razorpay · 256-bit SSL</span>
                  <span className="text-[var(--divider)]">·</span>
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </FadeIn>

        </div>
      </div>
    </div>
  );
}
