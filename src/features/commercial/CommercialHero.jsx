import React from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn';
import { ChevronDown } from 'lucide-react';
import { easing, springs } from '../../lib/springs';

export default function CommercialHero() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  
  // Parallax and fade effects linked to scroll
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const y = useTransform(scrollY, [0, 300], [0, 100]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.95]);

  const parallaxStyle = shouldReduceMotion ? undefined : { opacity, y, scale };

  return (
    <div className="relative w-full h-[85vh] min-h-[500px] max-h-[800px] flex flex-col items-center justify-center overflow-hidden -mt-6">
      {/* Deep Background with Glow */}
      <div className="absolute inset-0 bg-[var(--bg-base)] z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-[var(--accent)] opacity-[0.08] blur-[100px] rounded-full z-0 pointer-events-none" />

      <motion.div 
        style={parallaxStyle}
        className="relative z-10 text-center px-4 w-full max-w-4xl mx-auto flex flex-col items-center"
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0.01 } : { duration: 0.6, ease: easing.out }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 bg-[var(--status-severe-soft)] text-[var(--status-severe)] border border-[var(--status-severe-border)] text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full font-data shadow-[0_0_20px_var(--status-severe-glow)] backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-severe)] animate-pulse shadow-[0_0_10px_var(--status-severe-glow)]" />
            LIVE CRISIS · MARCH 2026
          </span>
        </motion.div>

        <h1 className="text-[clamp(40px,8vw,72px)] font-bold font-display leading-[1.05] tracking-[-0.03em] text-[var(--text-primary)] max-w-[800px] mx-auto drop-shadow-2xl">
          <motion.span 
            className="block"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0.01 } : { duration: 0.8, delay: 0.1, ease: easing.out }}
          >
            Commercial gas
          </motion.span>
          <motion.span 
            className="block text-[var(--accent)]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0.01 } : { duration: 0.8, delay: 0.22, ease: easing.out }}
          >
            is running dry.
          </motion.span>
        </h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={shouldReduceMotion ? { duration: 0.01 } : { duration: 1, delay: 0.5 }}
          className="mt-6 sm:mt-8 text-[clamp(16px,2vw,20px)] text-[var(--text-secondary)] max-w-2xl mx-auto font-medium leading-relaxed"
        >
          Restaurants and hotels face sudden supply cuts. Connect directly with verified private agencies who still have stock.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={shouldReduceMotion ? { duration: 0.01 } : { ...springs.smooth, delay: 0.7 }}
          className="mt-10 sm:mt-12 w-full max-w-xs mx-auto"
        >
          <LiquidGlassBtn 
            onClick={() => document.getElementById('commercial-vendors')?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' })}
            className="w-full justify-center py-4 text-[16px] shadow-[0_16px_48px_var(--shadow-glow)]"
          >
            Find Agencies Now
          </LiquidGlassBtn>
        </motion.div>
      </motion.div>

      {/* Down indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={shouldReduceMotion ? { duration: 0.01 } : { delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[var(--accent)] flex flex-col items-center gap-2"
      >
        <span className="font-data text-[10px] uppercase tracking-widest font-bold">Scroll Down</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: shouldReduceMotion ? 60 : 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </motion.div>
    </div>
  );
}
