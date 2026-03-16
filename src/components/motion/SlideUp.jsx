import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { springs } from '../../lib/springs';

export function SlideUp({ children, delay = 0, className }) {
  const shouldReduceMotion = useReducedMotion();
  const transitionProps = shouldReduceMotion ? { duration: 0.01 } : { ...springs.arrival, delay };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitionProps}
    >
      {children}
    </motion.div>
  );
}
