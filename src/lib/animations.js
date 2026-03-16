// src/lib/animations.js
// Reusable Framer Motion variants for consistency across components.
import { springs } from './springs';

export const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: springs.arrival },
};

export const slideRight = {
  hidden:  { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: springs.smooth },
};

export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: springs.delight },
};

export const staggerContainer = (staggerVal = 0.08) => ({
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: staggerVal },
  },
});

export const tabTransition = (direction = 1) => ({
  initial: { opacity: 0, x: 12 * direction },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -12 * direction },
});
