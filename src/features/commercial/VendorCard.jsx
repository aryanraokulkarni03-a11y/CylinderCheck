import React from 'react';
import { Phone, ExternalLink, ShieldCheck, MapPin } from 'lucide-react';
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn';
import { motion } from 'motion/react';
import { StaggerItem } from '../../components/motion/StaggerContainer';
import { springs } from '../../lib/springs';

export default function VendorCard({ vendor }) {
  const isFeatured = vendor.featured;

  return (
    <StaggerItem>
      <motion.div 
        whileHover={{ y: -4 }}
        transition={springs.delight}
        className={`relative overflow-hidden group rounded-lg border bg-[var(--bg-raised)] p-5 md:p-6 transition-all duration-300 ${
          isFeatured 
            ? 'border-[var(--accent)] shadow-[0_8px_30px_rgba(224,120,48,0.12)]' 
            : 'border-[var(--border)] hover:border-[var(--accent-glow)] hover:shadow-[0_8px_30px_rgba(224,120,48,0.06)]'
        }`}
      >
        {isFeatured && (
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[var(--accent)] opacity-10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none animate-pulse" />
        )}

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-[18px] font-bold font-display text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent)] transition-colors">
                  {vendor.name}
                </h3>
                {vendor.verified && (
                  <ShieldCheck size={16} className="text-[var(--status-clear)] flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-widest font-data text-[var(--text-muted)]">
                <MapPin size={12} className="text-[var(--accent)]" /> {vendor.location}
              </div>
            </div>
            
            {isFeatured && (
              <span className="bg-[rgba(224,120,48,0.1)] text-[var(--accent)] border border-[rgba(224,120,48,0.2)] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[var(--radius-xs)] font-data shrink-0">
                Featured
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {vendor.tags.map(tag => (
              <span key={tag} className="text-[11px] font-bold uppercase tracking-widest font-data text-[var(--text-secondary)] bg-[var(--bg-inset)] border border-[var(--border)] px-2 py-1 rounded-[var(--radius-xs)]">
                {tag}
              </span>
            ))}
          </div>

          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-6 flex-grow">
            {vendor.description}
          </p>

          <div className="flex items-center gap-3 mt-auto pt-4 border-t border-[var(--divider)]">
            <LiquidGlassBtn 
              as="a" 
              href={`https://wa.me/${vendor.phone.replace(/\D/g, '')}?text=Hi, I found you on CylinderCheck. I need commercial LPG cylinders.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px]"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              WhatsApp
            </LiquidGlassBtn>
            
            <a 
              href={`tel:${vendor.phone}`}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border border-[var(--border)] bg-[var(--bg-inset)] hover:bg-[var(--bg-raised)] text-[var(--text-primary)] transition-colors text-[13px] font-bold"
            >
              <Phone size={16} />
              Call
            </a>
            
            {vendor.website && (
              <a 
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center py-2.5 px-3 rounded-md border border-[var(--border)] bg-[var(--bg-inset)] hover:bg-[var(--bg-raised)] text-[var(--text-primary)] transition-colors"
                title="Visit Website"
              >
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </StaggerItem>
  );
}
