import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';

export function CommercialHero({ children, className = '' }) {
  const ref = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.4], [0, -48]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [1, 0.97]);

  // If reduced motion, ignore scroll transformations
  if (shouldReduceMotion) {
    return (
      <div ref={ref} className={`relative min-h-[80vh] flex items-center ${className}`}>
        <div>{children}</div>
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative min-h-[80vh] flex items-center ${className}`}>
      <motion.div style={{ opacity, y, scale }} className="w-full">
        {children}
      </motion.div>
    </div>
  );
}
