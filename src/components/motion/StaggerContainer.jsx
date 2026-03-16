import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { staggerRules } from '../../lib/springs';

export function StaggerContainer({ children, staggerVal, className }) {
  const shouldReduceMotion = useReducedMotion();
  const staggerTime = shouldReduceMotion ? 0 : (staggerVal ?? staggerRules.cards);

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden:  { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: staggerTime },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }) {
  const shouldReduceMotion = useReducedMotion();
  const transitionProps = shouldReduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 280, damping: 28 };

  return (
    <motion.div
      className={className}
      variants={{
        hidden:  { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: transitionProps },
      }}
    >
      {children}
    </motion.div>
  );
}
