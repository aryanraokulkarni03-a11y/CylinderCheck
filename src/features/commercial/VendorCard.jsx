import React from 'react'
import { ExternalLink, MapPin, Phone, ShieldCheck } from 'lucide-react'
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import { motion } from 'motion/react'
import { StaggerItem } from '../../components/motion/StaggerContainer'
import { springs } from '../../lib/springs'

const CATEGORY_LABEL = {
  induction: 'Induction',
  electric: 'Electric',
  kerosene: 'Kerosene',
  png: 'PNG/Piped',
  other: 'Other',
}

function digitsOnly(v) {
  return String(v || '').replace(/\D/g, '')
}

export default function VendorCard({ vendor }) {
  const isFeatured = !!vendor?.featured
  const category = CATEGORY_LABEL[vendor?.category] || 'Supplier'

  const whatsappNumber = digitsOnly(vendor?.whatsapp || vendor?.phone)
  const phoneNumber = digitsOnly(vendor?.phone || vendor?.whatsapp)

  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        'Hi, I found you on CylinderCheck. I need commercial LPG cylinders.'
      )}`
    : null

  const telHref = phoneNumber ? `tel:${phoneNumber}` : null

  return (
    <StaggerItem>
      <motion.div
        whileHover={{ y: -4 }}
        transition={springs.delight}
        className={`relative overflow-hidden group rounded-lg border bg-[var(--bg-raised)] p-5 md:p-6 transition-colors duration-300 ${
          isFeatured
            ? 'border-[var(--accent)] shadow-[0_8px_30px_rgba(224,120,48,0.12)]'
            : 'border-[var(--border)] hover:border-[var(--accent-glow)] hover:shadow-[0_8px_30px_rgba(224,120,48,0.06)]'
        }`}
      >
        {isFeatured && (
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[var(--accent)] opacity-10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none animate-pulse" />
        )}

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-between items-start mb-4 gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-[18px] font-bold font-display text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent)] transition-colors truncate">
                  {vendor?.name || 'Supplier'}
                </h3>
                <ShieldCheck
                  size={16}
                  className="text-[var(--status-clear)] flex-shrink-0"
                  aria-label="Verified supplier"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-widest font-data text-[var(--text-muted)]">
                <MapPin size={12} className="text-[var(--accent)]" />
                <span className="truncate">
                  {vendor?.city || 'India'}
                </span>
              </div>
              {vendor?.tagline && (
                <p className="text-[13px] text-[var(--text-secondary)] mt-3 leading-relaxed">
                  {vendor.tagline}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className="bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] border border-[var(--border)] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[var(--radius-xs)] font-data">
                {category}
              </span>
              {isFeatured && (
                <span className="bg-[rgba(224,120,48,0.10)] text-[var(--accent)] border border-[rgba(224,120,48,0.18)] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[var(--radius-xs)] font-data">
                  Featured
                </span>
              )}
            </div>
          </div>

          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-6 flex-grow">
            {vendor?.description || 'Contact this supplier for availability and pricing.'}
          </p>

          <div className="flex items-center gap-3 mt-auto pt-4 border-t border-[var(--divider)]">
            <LiquidGlassBtn
              as="a"
              href={waHref || undefined}
              target="_blank"
              rel="noopener noreferrer"
              disabled={!waHref}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px]"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              WhatsApp
            </LiquidGlassBtn>

            <a
              href={telHref || undefined}
              aria-disabled={!telHref || undefined}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border border-[var(--border)] bg-[var(--bg-inset)] hover:bg-[var(--bg-raised)] text-[var(--text-primary)] transition-colors text-[13px] font-bold ${
                telHref ? '' : 'opacity-50 pointer-events-none'
              }`}
            >
              <Phone size={16} />
              Call
            </a>

            {vendor?.website && (
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
  )
}
