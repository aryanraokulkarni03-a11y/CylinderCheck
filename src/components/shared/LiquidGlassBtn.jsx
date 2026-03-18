import React, { useId, useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { springs, timing } from '../../lib/springs'
import { useHoverCapable } from '../../lib/useHoverCapable'

function toDomSafeId(id) {
  // React's useId() can include ":" which is valid in HTML, but annoying in url(#id).
  return String(id).replace(/[:]/g, '')
}

export default function LiquidGlassBtn({
  as = 'button',
  disabled = false,
  className = '',
  children,
  onClick,
  ...props
}) {
  const shouldReduceMotion = useReducedMotion()
  const canHover = useHoverCapable()
  const rid = useId()
  const liquidId = useMemo(() => `liquid-${toDomSafeId(rid)}`, [rid])

  const hoverEffect =
    canHover && !shouldReduceMotion ? { scale: 1.02 } : undefined
  const tapEffect = !shouldReduceMotion ? { scale: 0.97, y: 1 } : undefined

  const commonProps = {
    className: `glass-btn relative overflow-hidden flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-md type-nav text-[var(--accent-pop)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`,
    whileHover: disabled ? undefined : hoverEffect,
    whileTap: disabled ? undefined : tapEffect,
    transition: shouldReduceMotion ? { duration: 0.01 } : springs.response,
  }

  if (as === 'a') {
    const handleClick = (e) => {
      if (disabled) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      onClick?.(e)
    }

    return (
      <motion.a
        {...props}
        {...commonProps}
        onClick={handleClick}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : props.tabIndex}
      >
        {/* SVG liquid distortion filter (Disabled if reduced motion is on) */}
        {!shouldReduceMotion && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300">
            <filter id={liquidId}>
              <feTurbulence
                type="turbulence"
                baseFrequency="0.02 0.05"
                numOctaves="2"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="4"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
            <rect
              width="100%"
              height="100%"
              filter={`url(#${liquidId})`}
              opacity="0.3"
              fill="currentColor"
            />
          </svg>
        )}

        {/* Accent glow on hover */}
        {canHover && !disabled && !shouldReduceMotion && (
          <motion.span
            className="absolute inset-0 rounded-[inherit]"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={shouldReduceMotion ? { duration: 0.01 } : { duration: timing.fast }}
            style={{
              background:
                'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)',
            }}
          />
        )}

        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </motion.a>
    )
  }

  return (
    <motion.button
      {...props}
      {...commonProps}
      type={props.type ?? 'button'}
      onClick={onClick}
      disabled={disabled}
    >
      {/* SVG liquid distortion filter (Disabled if reduced motion is on) */}
      {!shouldReduceMotion && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300">
          <filter id={liquidId}>
            <feTurbulence
              type="turbulence"
              baseFrequency="0.02 0.05"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="4"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <rect
            width="100%"
            height="100%"
            filter={`url(#${liquidId})`}
            opacity="0.3"
            fill="currentColor"
          />
        </svg>
      )}

      {/* Accent glow on hover */}
      {canHover && !disabled && !shouldReduceMotion && (
        <motion.span
          className="absolute inset-0 rounded-[inherit]"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={shouldReduceMotion ? { duration: 0.01 } : { duration: timing.fast }}
          style={{
            background: 'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)',
          }}
        />
      )}

      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  )
}
