import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { springs, timing } from '../../lib/springs';

export default function LiquidGlassBtn({ children, onClick, disabled = false, className = '' }) {
  const shouldReduceMotion = useReducedMotion();
  const [isHoverDevice, setIsHoverDevice] = useState(true);

  useEffect(() => {
    setIsHoverDevice(window.matchMedia('(hover: hover)').matches);
  }, []);

  const hoverEffect = isHoverDevice && !shouldReduceMotion ? { scale: 1.02 } : undefined;
  const tapEffect   = !shouldReduceMotion ? { scale: 0.97, y: 1 } : undefined;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`glass-btn relative overflow-hidden flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-md font-body text-[15px] font-semibold text-accent-pop cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      whileHover={disabled ? undefined : hoverEffect}
      whileTap={disabled ? undefined : tapEffect}
      transition={shouldReduceMotion ? { duration: 0.01 } : springs.response}
    >
      {/* SVG liquid distortion filter (Disabled if reduced motion is on) */}
      {!shouldReduceMotion && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300">
          <filter id="liquid">
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
          <rect width="100%" height="100%" filter="url(#liquid)" opacity="0.3" fill="currentColor" />
        </svg>
      )}

      {/* Accent glow on hover */}
      {isHoverDevice && !disabled && (
        <motion.span
          className="absolute inset-0 rounded-[inherit]"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: timing.fast }}
          style={{
            background: 'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)',
          }}
        />
      )}

      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
