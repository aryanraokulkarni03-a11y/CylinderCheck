import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { fadeUp } from '../../lib/animations';

export function FadeIn({ children, className, delay = 0 }) {
  const shouldReduceMotion = useReducedMotion();
  const transitionProps = shouldReduceMotion ? { duration: 0.01 } : { ...fadeUp.visible.transition, delay };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: fadeUp.hidden,
        visible: { ...fadeUp.visible, transition: transitionProps }
      }}
    >
      {children}
    </motion.div>
  );
}
