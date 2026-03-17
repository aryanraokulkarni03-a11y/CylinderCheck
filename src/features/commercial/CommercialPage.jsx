import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ShieldCheck, FileText, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { StaggerContainer } from '../../components/motion/StaggerContainer';
import { SectionMarker } from '../../components/shared/SectionMarker';
import { COMMERCIAL_CITIES } from '../../lib/utils';
import { springs } from '../../lib/springs';
import CommercialHero from './CommercialHero';
import VendorCard from './VendorCard';
import LeadForm from './LeadForm';

export default function CommercialPage({ prefilledCity }) {
  const shouldReduceMotion = useReducedMotion();
  const defaultCity = prefilledCity && COMMERCIAL_CITIES.includes(prefilledCity)
    ? prefilledCity
    : COMMERCIAL_CITIES[0];

  const [activeCity, setActiveCity] = useState(defaultCity);
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorError, setVendorError] = useState(null);

  useEffect(() => {
    if (prefilledCity && COMMERCIAL_CITIES.includes(prefilledCity)) {
      setActiveCity(prefilledCity);
    }
  }, [prefilledCity]);

  const fetchVendors = useCallback(async (city) => {
    setVendorsLoading(true);
    setVendorError(null);

    const { data, error } = await supabase
      .from('vendors')
      .select('id, name, category, city, tagline, description, whatsapp, phone, website, featured')
      .eq('city', city)
      .eq('active', true)
      .or(`listing_expires_at.is.null,listing_expires_at.gt.${new Date().toISOString()}`)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      setVendorError('Could not load suppliers. Please try again.');
      setVendors([]);
    } else {
      setVendors(data || []);
    }
    setVendorsLoading(false);
  }, []);

  useEffect(() => {
    fetchVendors(activeCity);
  }, [activeCity, fetchVendors]);

  return (
    <div className="pb-24 w-full">
      <CommercialHero />

      <div id="commercial-vendors" className="mt-16 md:mt-24 w-full">
        {/* Trust banner */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8
                        mb-16 py-6 border-y border-[var(--border)] bg-[var(--bg-inset)]
                        text-[12px] font-bold tracking-widest uppercase font-data text-[var(--text-muted)] w-full">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--status-clear)]" />
            Verified Agencies Only
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="flex items-center gap-2">
            <FileText size={16} className="text-[var(--text-secondary)]" />
            Transparent Pricing
          </span>
        </div>

        {/* Section header */}
        <div className="text-center mb-10 w-full">
          <h2 className="text-[clamp(28px,5vw,42px)] font-bold font-display tracking-tight text-[var(--text-primary)] mb-4">
            Private Suppliers
          </h2>
          <p className="text-[14px] md:text-[16px] text-[var(--text-secondary)] font-medium max-w-2xl mx-auto">
            Choose your city to view verified agencies with active stock.
            Contact them directly or request bulk quotes.
          </p>
        </div>

        {/* City tabs */}
        <div className="relative mb-12 w-full max-w-full">
          <div className="flex items-center overflow-x-auto gap-2 pb-4 scrollbar-hide snap-x"
            style={{
              maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
            }}>
            {COMMERCIAL_CITIES.map(city => (
              <button
                key={city}
                onClick={() => setActiveCity(city)}
                className={`relative px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors snap-start shrink-0
                  ${activeCity === city
                    ? 'text-[var(--bg-base)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] border border-transparent hover:border-[var(--border)] hover:text-[var(--text-primary)]'}`}
              >
                {activeCity === city && (
                  <motion.div
                    layoutId="city-indicator"
                    className="absolute inset-0 bg-[var(--text-primary)] rounded-full -z-10"
                    transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                  />
                )}
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16 items-start w-full">

          {/* Left — Vendor list */}
          <div className="lg:col-span-7 xl:col-span-8 w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[18px] font-bold font-display text-[var(--text-primary)] flex items-center gap-2">
                Agencies in {activeCity}
                <span className="bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--text-muted)] text-[11px] px-2 py-0.5 rounded-full font-data">
                  {vendorsLoading ? '…' : vendors.length}
                </span>
              </h3>
              {!vendorsLoading && (
                <button onClick={() => fetchVendors(activeCity)} aria-label="Refresh"
                  className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors p-1">
                  <RefreshCw size={14} />
                </button>
              )}
            </div>

            <AnimatePresence mode="popLayout">
              {vendorsLoading ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                  className="space-y-4"
                >
                  {[1, 2].map(i => (
                    <div key={i} className="h-44 rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] animate-pulse opacity-50" />
                  ))}
                </motion.div>
              ) : vendorError ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                  className="rounded-lg border border-[var(--status-active-border)] bg-[var(--status-active-soft)] p-8 text-center"
                >
                  <p className="text-[14px] text-[var(--text-secondary)] mb-3">{vendorError}</p>
                  <button onClick={() => fetchVendors(activeCity)}
                    className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-pop)] transition-colors">
                    Try again {' \u2192'}
                  </button>
                </motion.div>
              ) : vendors.length > 0 ? (
                <StaggerContainer key={activeCity} className="flex flex-col gap-6 w-full">
                  {vendors.map(vendor => <VendorCard key={vendor.id} vendor={vendor} />)}
                </StaggerContainer>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
                  transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                  className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-inset)] p-12 text-center w-full"
                >
                  <svg width="48" height="60" viewBox="0 0 48 60" fill="none" className="mx-auto mb-4 opacity-25">
                    <ellipse cx="24" cy="9" rx="18" ry="6" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
                    <line x1="6" y1="9" x2="6" y2="47" stroke="var(--accent)" strokeWidth="1.5" />
                    <line x1="42" y1="9" x2="42" y2="47" stroke="var(--accent)" strokeWidth="1.5" />
                    <ellipse cx="24" cy="47" rx="18" ry="6" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
                    <ellipse cx="24" cy="47" rx="18" ry="6" fill="var(--accent)" opacity="0.10" />
                  </svg>
                  <p className="text-[14px] text-[var(--text-secondary)] mb-2">Coming to {activeCity} soon.</p>
                  <p className="text-[12px] text-[var(--text-muted)] font-data uppercase tracking-widest">We are onboarding agencies daily.</p>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-4">Submit your details on the right — we'll match you manually within 24 hours.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {vendors.length > 0 && (
              <div className="mt-8 p-4 rounded-md bg-[var(--bg-inset)] border border-[var(--divider)] flex gap-3 text-[12px] text-[var(--text-muted)]">
                <FileText size={14} className="shrink-0 text-[var(--text-secondary)] mt-0.5" />
                <p>CylinderCheck verifies business licenses but does not guarantee stock availability or set prices. Always confirm rates directly with the agency.</p>
              </div>
            )}
          </div>

          {/* Right — Lead form */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-[calc(var(--topbar-height)+32px)] w-full">
            <LeadForm selectedCity={activeCity} />
          </div>
        </div>
      </div>
    </div>
  );
}
