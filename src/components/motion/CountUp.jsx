import React, { useEffect, useRef } from 'react';
import { useMotionValue, useTransform, animate, motion, useReducedMotion } from 'motion/react';
import { easing } from '../../lib/springs';

export function CountUp({ to, duration = 1.4, className }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  const hasAnimated = useRef(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    if (shouldReduceMotion) {
      count.set(to);
      return;
    }

    animate(count, to, {
      duration,
      ease: easing.data,
    });
  }, [to, duration, count, shouldReduceMotion]);

  return (
    <motion.span className={className}>
      {rounded}
    </motion.span>
  );
}
