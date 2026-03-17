import React, { useMemo } from 'react'
import { ExternalLink, MapPin, Phone, ShieldCheck } from 'lucide-react'
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import { motion, useReducedMotion } from 'motion/react'
import { StaggerItem } from '../../components/motion/StaggerContainer'
import { springs } from '../../lib/springs'
import { useHoverCapable } from '../../lib/useHoverCapable'
import { commercialStateForCity } from '../../lib/utils'

const DOT = '\u00B7'

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
  const shouldReduceMotion = useReducedMotion()
  const canHover = useHoverCapable()

  const isFeatured = !!vendor?.featured
  const verification = String(vendor?.verification_status || 'unverified').toLowerCase()
  const isVerified = verification === 'verified'
  const category = CATEGORY_LABEL[vendor?.category] || 'Supplier'
  const licenseNumber = vendor?.license_number ? String(vendor.license_number).trim() : ''

  const whatsappNumber = digitsOnly(vendor?.whatsapp || vendor?.phone)
  const phoneNumber = digitsOnly(vendor?.phone || vendor?.whatsapp)

  const stateLabel = useMemo(() => commercialStateForCity(vendor?.city), [vendor?.city])

  const waText = useMemo(() => {
    const lines = [
      'Hi, I found your listing on CylinderCheck.',
      'I need commercial LPG cylinders.',
      vendor?.city ? `Location: ${vendor.city}${stateLabel ? `, ${stateLabel}` : ''}` : null,
      "Please share today's availability, per-cylinder rate, and delivery timeline.",
    ].filter(Boolean)

    return lines.join('\n')
  }, [vendor?.city, stateLabel])

  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waText)}`
    : null

  const telHref = phoneNumber ? `tel:${phoneNumber}` : null

  return (
    <StaggerItem>
      <motion.div
        whileHover={(!shouldReduceMotion && canHover) ? { y: -4 } : undefined}
        transition={shouldReduceMotion ? { duration: 0.01 } : springs.delight}
        className={`relative overflow-hidden group rounded-lg border bg-[var(--bg-raised)] p-5 md:p-6 transition-colors duration-300 ${
          isFeatured
            ? 'border-[var(--accent)] shadow-[0_8px_30px_var(--shadow-glow)]'
            : 'border-[var(--border)] hover:border-[var(--accent-glow)] hover:shadow-[0_8px_30px_var(--shadow-glow)]'
        }`}
      >
        {isFeatured && (
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[var(--accent)] opacity-10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none motion-safe:animate-pulse" />
        )}

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-between items-start mb-4 gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-[var(--fs-body-lg)] font-bold font-display text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent)] transition-colors truncate">
                  {vendor?.name || 'Supplier'}
                </h3>
                {isVerified && (
                  <ShieldCheck
                    size={16}
                    className="text-[var(--status-clear)] flex-shrink-0"
                    aria-label="Verified license"
                    title="Verified license"
                  />
                )}
              </div>
              <div className="flex items-center gap-1.5 overline text-[var(--text-muted)]">
                <MapPin size={12} className="text-[var(--accent)]" />
                <span className="truncate">
                  {vendor?.city || 'India'}
                  {stateLabel ? ` ${DOT} ${stateLabel}` : ''}
                </span>
              </div>
              {vendor?.tagline && (
                <p className="text-[var(--fs-sm)] text-[var(--text-secondary)] mt-3 leading-relaxed">
                  {vendor.tagline}
                </p>
              )}
              {isVerified && licenseNumber && (
                <div className="mt-2 overline text-[var(--text-muted)]">
                  License <span className="text-[var(--divider)]" aria-hidden="true">{DOT}</span>{' '}
                  <span className="stat-value text-[var(--text-data)] tracking-[0.02em] normal-case">
                    {licenseNumber}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className="badge bg-[var(--bg-inset)] text-[var(--text-secondary)] border border-[var(--border)]">
                {category}
              </span>
              {!isVerified && (
                <span className="badge bg-[var(--status-early-soft)] text-[var(--status-early)] border border-[var(--status-early-border)]">
                  Listed
                </span>
              )}
              {isFeatured && (
                <span className="badge bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-glow)]">
                  Featured
                </span>
              )}
            </div>
          </div>

          <p className="text-[var(--fs-sm)] text-[var(--text-secondary)] leading-relaxed mb-6 flex-grow">
            {vendor?.description || 'Contact this supplier for availability and pricing.'}
          </p>

          <div className="flex items-center gap-3 mt-auto pt-4 border-t border-[var(--divider)]">
            <LiquidGlassBtn
              as="a"
              href={waHref || undefined}
              target="_blank"
              rel="noopener noreferrer"
              disabled={!waHref}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[var(--fs-sm)]"
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
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border border-[var(--border)] bg-[var(--bg-inset)] hover:bg-[var(--bg-raised)] text-[var(--text-primary)] transition-colors text-[var(--fs-sm)] font-medium ${
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
