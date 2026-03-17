import React, { useState, useEffect, useCallback } from 'react';
import NewsMap, { getCity } from './NewsMap';
import { SectionMarker } from '../../components/shared/SectionMarker';
import { Newspaper, RefreshCw, AlertTriangle, TrendingUp, Landmark, FileText, Loader2, MapPin } from 'lucide-react';
import { FadeIn } from '../../components/motion/FadeIn';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerContainer';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SUPABASE_FUNC_URL = `${(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "")}/functions/v1`;

let cachedNews = [];
let lastFetchedAt = 0;

const RE_SHORTAGE = /shortage|delay|disruption|supply|scarcity|crisis/i;
const RE_PRICE    = /price|rate|hike|revision|subsidy|cost|expensive/i;
const RE_POLICY   = /ministry|government|policy|rule|regulation|announce/i;

function getCategory(title) {
  if (RE_SHORTAGE.test(title)) return "SHORTAGE SIGNALS";
  if (RE_PRICE.test(title))    return "PRICE & RATES";
  if (RE_POLICY.test(title))   return "POLICY";
  return "GENERAL";
}

const CAT_STATUS = {
  "SHORTAGE SIGNALS": "severe",
  "PRICE & RATES": "active",
  "POLICY": "early",
  "GENERAL": "clear"
};

export default function NewsTab() {
  const [news, setNews] = useState(cachedNews);
  const [loading, setLoading] = useState(!cachedNews.length);
  const [selectedCity, setSelectedCity] = useState(null);
  const [showGeneral, setShowGeneral] = useState(false);

  const fetchNews = useCallback((force = false) => {
    const STALE_MS = 5 * 60 * 1000;
    if (!force && Date.now() - lastFetchedAt < STALE_MS) {
      setNews(cachedNews);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    fetch(`${SUPABASE_FUNC_URL}/lpg-news`, { 
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } 
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.articles?.length) {
          const parsed = d.articles.map(a => ({ 
            title: a.title, 
            source: a.source, 
            link: a.link, 
            pubDate: new Date(a.pubDate),
            city: getCity(a.title)
          }));
          cachedNews = parsed;
          lastFetchedAt = Date.now();
          setNews(parsed);
        }
      })
      .catch(() => { /* silent fail */ })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const validNews = news || [];
  
  const cityHasNews = {};
  validNews.forEach(n => {
    if (n.city) cityHasNews[n.city] = true;
  });

  const filteredNews = selectedCity
    ? validNews.filter(n => n.city === selectedCity)
    : validNews;

  const grouped = filteredNews.reduce((acc, item) => {
    const cat = getCategory(item.title);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const leadStory = filteredNews[0];
  const order = ["SHORTAGE SIGNALS", "PRICE & RATES", "POLICY", "GENERAL"];

  const buildWhatsAppLink = (item) => {
    return `https://wa.me/?text=${encodeURIComponent(item.title + " " + item.link)}`;
  };

  return (
    <div className="space-y-8 pb-12 w-full">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-4">
        <div>
          <h1 className="text-[clamp(24px,4vw,36px)] font-bold font-display tracking-tight text-[var(--text-primary)] mb-2 flex items-center gap-3">
            <Newspaper size={28} className="text-[var(--accent)]" />
            LPG Intelligence Feed
          </h1>
          <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed font-medium">
            Live tracking of shortages, price hikes, and policy shifts across India.
          </p>
        </div>
        
        <button 
          onClick={() => fetchNews(true)} 
          disabled={loading} 
          className="flex items-center gap-2 py-2 px-4 rounded-md border border-[var(--border)] bg-[var(--bg-inset)] hover:bg-[var(--bg-raised)] text-[var(--text-primary)] transition-colors self-start md:self-auto"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
          <span className="font-bold tracking-widest uppercase font-data text-[11px]">Sync Feed</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 xl:gap-12 items-start">
        
        {/* Feed */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 mb-6">
              <button 
                className={`px-4 py-1.5 rounded-full text-[12px] font-bold font-data tracking-widest uppercase border transition-colors duration-150 ${
                !selectedCity ? "bg-[var(--text-primary)] text-[var(--bg-base)] border-[var(--text-primary)]" : "bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-muted)]"
                }`}
                onClick={() => setSelectedCity(null)}
              >
                All India
              </button>
            {Object.keys(cityHasNews).map(c => (
                <button 
                  key={c}
                  className={`relative px-4 py-1.5 rounded-full text-[12px] font-bold font-data tracking-widest uppercase border transition-colors duration-150 flex items-center gap-2 ${
                  selectedCity === c ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]" : "bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-muted)]"
                  }`}
                  onClick={() => setSelectedCity(c)}
                >
                  {c}
                {selectedCity === c && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-pulse" />}
              </button>
            ))}
          </div>

          {loading && !validNews.length ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] animate-pulse" />
              ))}
            </div>
          ) : !validNews.length ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-raised)] text-center py-12">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] font-data text-[var(--text-muted)] mb-4">No feed yet</div>
              <div className="text-[16px] font-bold font-display text-[var(--text-primary)] mb-2">Scraper quiet</div>
              <p className="text-[14px] text-[var(--text-secondary)]">No recent intelligence found. Try refreshing.</p>
            </div>
          ) : (
            <StaggerContainer className="space-y-10">
              
              {/* Lead Story */}
              {leadStory && (
                <StaggerItem>
                  <div className="rounded-lg border border-[var(--border)] bg-gradient-to-br from-[var(--bg-raised)] to-[var(--bg-inset)] relative overflow-hidden group hover:border-[var(--accent)] transition-colors p-6">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[var(--status-severe)]" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-[var(--status-severe-soft)] text-[var(--status-severe)] border border-[var(--status-severe-border)] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[var(--radius-xs)] font-data inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-severe)] animate-pulse" /> Live Intelligence
                        </span>
                        {leadStory.city && (
                          <span className="text-[11px] font-bold uppercase tracking-widest font-data text-[var(--text-muted)] flex items-center gap-1">
                            <MapPin size={10} /> {leadStory.city}
                          </span>
                        )}
                      </div>
                      
                      <a href={buildWhatsAppLink(leadStory)} target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--status-clear)] transition-colors" title="Share to WhatsApp">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                      </a>
                    </div>
                    
                    <a href={leadStory.link} target="_blank" rel="noopener noreferrer" className="block">
                      <h2 className="text-[20px] md:text-[24px] font-bold font-display text-[var(--text-primary)] leading-tight mb-4 group-hover:text-[var(--accent)] transition-colors">
                        {leadStory.title}
                      </h2>
                    </a>
                    
                    <div className="flex items-center gap-3">
                      <span className="bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--text-primary)] text-[11px] font-bold tracking-widest uppercase font-data px-2 py-0.5 rounded-[var(--radius-xs)]">
                        {leadStory.source}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] font-medium font-body">
                        {new Date(leadStory.pubDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </StaggerItem>
              )}

              {/* Grouped Feed */}
              {order.map(cat => {
                const items = grouped[cat];
                if (!items || !items.length) return null;
                
                // General rules
                if (cat === "GENERAL" && !showGeneral) {
                  return (
                    <StaggerItem key={cat}>
                      <button 
                        className="w-full py-4 text-center rounded-lg border border-dashed border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors bg-[var(--bg-inset)] font-data text-[12px] uppercase tracking-widest font-bold"
                        onClick={() => setShowGeneral(true)}
                      >
                        Show {items.length} General News Items ↓
                      </button>
                    </StaggerItem>
                  );
                }
                
                return (
                  <StaggerItem key={cat}>
                    <div>
                      <SectionMarker status={CAT_STATUS[cat] || "clear"} label={cat} />
                      
                      <div className="space-y-4">
                        {items.map((item, i) => {
                          if (item === leadStory) return null;
                          const ms = Date.now() - item.pubDate;
                          const mins = Math.round(ms / 60000);
                          const timeAgo = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 1440)}d ago`;
                          
                          return (
                            <div key={item.link + i} className="rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-4 hover:border-[var(--text-muted)] transition-colors group">
                              <div className="flex items-start justify-between gap-4">
                                <a href={item.link} target="_blank" rel="noopener noreferrer" className="block flex-1">
                                  <h3 className="text-[15px] font-bold font-body text-[var(--text-primary)] leading-snug mb-2 group-hover:text-[var(--accent)] transition-colors">
                                    {item.title}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold tracking-widest uppercase font-data text-[var(--text-secondary)]">
                                      {item.source}
                                    </span>
                                    <span className="text-[var(--divider)]">•</span>
                                    <span className="text-[11px] text-[var(--text-muted)] font-body font-medium flex items-center gap-1">
                                      {item.city && <><MapPin size={10} className="text-[var(--accent)]" /> {item.city} <span className="text-[var(--divider)] mx-1">•</span></>}
                                      {timeAgo}
                                    </span>
                                  </div>
                                </a>
                                <a href={buildWhatsAppLink(item)} target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--status-clear)] transition-colors p-1 flex-shrink-0" title="Share to WhatsApp">
                                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>

        {/* Right Column: Sticky Map */}
        <div className="lg:h-[calc(100vh-140px)] sticky top-24">
          <FadeIn delay={0.2} className="h-[400px] lg:h-full relative rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-1 sm:p-2 overflow-hidden">
            <NewsMap
              cityHasNews={cityHasNews}
              selectedCity={selectedCity}
              onSelectCity={c => setSelectedCity(prev => prev === c ? null : c)}
            />
            
            {/* Map Overlay Legend */}
            <div className="absolute bottom-6 right-6 z-[400] rounded-md border border-[var(--border)] bg-[var(--glass-deep)] p-3 pointer-events-none" style={{ backdropFilter: 'blur(16px)' }}>
              <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_18px_var(--accent-glow)]" />
                Live Signals
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
