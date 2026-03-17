import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import CompanyPicker from '../../components/shared/CompanyPicker';
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn';
import EmptyState from '../../components/shared/EmptyState';
import { Users, AlertCircle, Edit2, Trash2, ArrowUp, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { FadeIn } from '../../components/motion/FadeIn';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerContainer';
import { springs } from '../../lib/springs';

const CC_USER_VERSION = "v1";
const CC_LS_KEY = `cc-user:${CC_USER_VERSION}`;

export default function ReportsTab({ user, authLoading }) {
  const shouldReduceMotion = useReducedMotion();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reportText, setReportText] = useState("");
  const [reportPin, setReportPin] = useState("");
  const [reportCity, setReportCity] = useState("");
  const [reportDeliveryDays, setReportDeliveryDays] = useState("");
  
  const [reportCompany, setReportCompany] = useState(() => {
    try { const r = localStorage.getItem(CC_LS_KEY); return r ? JSON.parse(r)?.company || null : null; }
    catch { return null; }
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const [votes, setVotes] = useState({});

  const [editingReportId, setEditingReportId] = useState(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const { data } = await supabase.from("reports").select("*").order("votes", { ascending: false }).limit(30);
      if (data) setReports(data);
      setLoading(false);
    };
    fetchReports();
  }, []);

  const handleReport = async () => {
    if (!reportText.trim() || !reportPin) return;
    if (!user) return;
    setSubmitting(true);
    const days = reportDeliveryDays ? parseInt(reportDeliveryDays, 10) : null;
    const { data, error } = await supabase.from("reports").insert([{
      pin: reportPin, 
      city: reportCity || `PIN ${reportPin}`, 
      issue: reportText,
      user_id: user.id, 
      user_email: user.email,
      delivery_days: days && days >= 1 && days <= 30 ? days : null,
      company: reportCompany || null,
    }]).select().single();
    
    if (!error && data) {
      setReports(prev => [data, ...prev]);
      setReportText(""); setReportPin(""); setReportCity(""); setReportDeliveryDays("");
      setSubmitOk(true); 
      setTimeout(() => setSubmitOk(false), 3000);
    }
    setSubmitting(false);
  };

  const handleEditReport = async (id) => {
    if (!editingText.trim()) return;
    await supabase.from("reports").update({ issue: editingText }).eq("id", id);
    setReports(prev => prev.map(r => r.id === id ? { ...r, issue: editingText } : r));
    setEditingReportId(null); 
    setEditingText("");
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm("Delete this report? This cannot be undone.")) return;
    await supabase.from("reports").delete().eq("id", id);
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const handleVote = useCallback(async (r) => {
    if (votes[r.id]) return;
    setVotes(prev => ({ ...prev, [r.id]: true }));
    setReports(prev => prev.map(x => x.id === r.id ? { ...x, votes: x.votes + 1 } : x));
    await supabase.from("reports").update({ votes: r.votes + 1 }).eq("id", r.id);
  }, [votes]);

  return (
    <div className="space-y-8">
        <h1 className="text-[clamp(24px,4vw,36px)] font-bold font-display tracking-tight text-[var(--text-primary)] mb-2 flex items-center gap-3">
          <Users size={28} className="text-[var(--accent)]" />
          Community Reports
        </h1>
        <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed mb-8 font-medium">
          Flag delivery delays, shortages, and agency issues in your area. Real reports from real people.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8 items-start">
          {/* Submit Report Form */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-6 sticky top-24">
            <h2 className="text-[14px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-6 border-b border-[var(--border)] pb-4">Submit a Report</h2>
            
            {!authLoading && !user ? (
              <div className="text-center py-8">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] font-data text-[var(--text-muted)] mb-4">
                  Sign in required
                </div>
                <div className="text-[16px] font-bold text-[var(--text-primary)] mb-2 font-display">Sign in to submit</div>
                <p className="text-[13px] text-[var(--text-secondary)] mb-6 leading-relaxed">
                  Reports require a Google account so the community stays spam-free and accountable.
                </p>
                <LiquidGlassBtn 
                  className="w-full justify-center"
                  onClick={() => {
                    try { sessionStorage.setItem("cc-post-auth-tab", "community"); } catch { /* private mode */ }
                    supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
                  }}
                >
                  Sign in with Google {' \u2192'}
                </LiquidGlassBtn>
              </div>
            ) : (
              <FadeIn delay={0.1}>
                <div className="space-y-5">
                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2" htmlFor="report-pin">PIN Code *</label>
                    <input id="report-pin" className="block w-full px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border)] rounded-md font-data text-lg tracking-widest text-[var(--text-data)] focus:border-[var(--accent)] focus:outline-none placeholder:tracking-normal placeholder:font-body placeholder:text-[15px] placeholder:text-[var(--text-muted)]" placeholder="6-digit PIN" value={reportPin} maxLength={6} inputMode="numeric" pattern="[0-9]*" onChange={e => setReportPin(e.target.value.replace(/\D/g, ""))} />
                  </div>
                  
                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2" htmlFor="report-area">
                      Area / Colony <span className="text-[var(--text-muted)] text-[10px] normal-case tracking-normal font-body font-normal">(optional)</span>
                    </label>
                    <input id="report-area" className="block w-full px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border)] rounded-md focus:border-[var(--accent)] focus:outline-none text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" placeholder="e.g. Vizag — Gajuwaka" value={reportCity} onChange={e => setReportCity(e.target.value)} />
                  </div>

                  <CompanyPicker value={reportCompany} onChange={setReportCompany} compact={true} />

                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2" htmlFor="report-issue">What's happening? *</label>
                    <textarea id="report-issue" className="block w-full px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border)] rounded-md focus:border-[var(--accent)] focus:outline-none text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-y min-h-[110px]" placeholder="e.g. No delivery in 12 days, driver demanding ₹100 extra…" value={reportText} onChange={e => setReportText(e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2" htmlFor="report-days">
                      Delivery took how many days? <span className="text-[var(--text-muted)] text-[10px] normal-case tracking-normal font-body font-normal">(optional)</span>
                    </label>
                    <input id="report-days" className="block w-full px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border)] rounded-md focus:border-[var(--accent)] focus:outline-none text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" placeholder="e.g. 8" inputMode="numeric" maxLength={2} value={reportDeliveryDays} onChange={e => setReportDeliveryDays(e.target.value.replace(/\D/g, ""))} />
                  </div>

                  <LiquidGlassBtn 
                    className="w-full justify-center mt-2" 
                    onClick={handleReport} 
                    disabled={submitting || !reportText.trim() || !reportPin}
                  >
                    {submitOk ? "Submitted - thank you." : submitting ? (
                      <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Submitting...</span>
                    ) : (
                      <span className="flex items-center justify-center gap-2"><Send size={16} /> Submit Report</span>
                    )}
                  </LiquidGlassBtn>
                </div>
              </FadeIn>
            )}
          </div>

          {/* Feed */}
          <div>
              <div className="flex items-center gap-2 text-[12px] font-bold text-[var(--accent)] uppercase tracking-widest font-data mb-4 pl-1">
                <AlertCircle size={14} /> Live Feed | Top Voted
              </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] opacity-50 animate-pulse" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <EmptyState 
                title="No reports yet" 
                description="Be the first to flag an issue in your area."
              />
            ) : (
              <StaggerContainer className="space-y-4">
                {reports.map((r, i) => (
                  <StaggerItem key={r.id}>
                    <div 
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-5 relative group hover:border-[var(--accent)] transition-colors"
                      style={{ contentVisibility: 'auto' }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-[var(--accent-soft)] text-[var(--accent)] text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[var(--radius-xs)] font-data border border-[var(--accent-glow)]">
                          PIN {r.pin}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-[var(--text-muted)] font-body font-medium">
                            {new Date(r.created_at).toLocaleDateString("en-IN")}
                          </span>
                          {user && r.user_id === user.id && editingReportId !== r.id && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingReportId(r.id); setEditingText(r.issue); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1" title="Edit">
                                <Edit2 size={13} />
                              </button>
                              <button onClick={() => handleDeleteReport(r.id)} className="text-[var(--status-severe)] hover:bg-[var(--status-severe-soft)] rounded p-1" title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {r.city && <div className="text-[15px] font-bold font-display text-[var(--text-primary)] mb-2 tracking-tight">{r.city}</div>}
                      
                      {editingReportId === r.id ? (
                        <div className="mt-2 mb-4">
                          <textarea className="block w-full px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border)] rounded-md focus:border-[var(--accent)] focus:outline-none text-[15px] text-[var(--text-primary)] resize-y min-h-[90px] mb-3" value={editingText} onChange={e => setEditingText(e.target.value)} />
                          <div className="flex gap-2">
                            <LiquidGlassBtn className="py-1.5 px-4 text-[12px]" onClick={() => handleEditReport(r.id)}>Save</LiquidGlassBtn>
                            <button className="text-[12px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] px-4" onClick={() => setEditingReportId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-4 whitespace-pre-wrap">{r.issue}</p>
                      )}
                      
                      {r.delivery_days && (
                        <div className="text-[11px] text-[var(--text-muted)] font-medium mb-3 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)] inline-block" />
                          Delivery took <strong className="text-[var(--text-primary)]">{r.delivery_days} days</strong>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-3 border-t border-[var(--divider)] mt-auto">
                        <motion.button 
                          whileTap={shouldReduceMotion ? undefined : { scale: 1.15 }}
                          transition={shouldReduceMotion ? { duration: 0.01 } : springs.delight}
                          onClick={() => handleVote(r)} 
                          className={`flex items-center gap-1.5 text-[12px] font-bold tracking-widest px-3 py-1.5 rounded-full transition-colors ${
                            votes[r.id] ? "bg-[var(--accent)] text-[var(--text-on-accent)]" : "bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]"
                          }`}
                        >
                          <ArrowUp size={14} className={votes[r.id] ? "text-[var(--text-on-accent)]" : "text-[var(--text-muted)]"} />
                          {r.votes} UPVOTE{r.votes !== 1 ? "S" : ""}
                        </motion.button>
                        
                        {r.votes > 20 && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--status-severe)] bg-[var(--status-severe-soft)] px-2 py-0.5 rounded-[var(--radius-xs)] flex items-center gap-1 border border-[var(--status-severe-border)]">
                            <span className="w-1.5 h-1.5 bg-[var(--status-severe)] rounded-full animate-pulse" /> Trending
                          </span>
                        )}
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        </div>
    </div>
  );
}
