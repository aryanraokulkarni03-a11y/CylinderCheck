import { Children } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { springs, staggerRules } from '../../lib/springs'

export function StaggerContainer({ children, staggerVal, className, maxChildren = 8 }) {
  const shouldReduceMotion = useReducedMotion()
  const childCount = Children.count(children)
  const shouldStagger = !shouldReduceMotion && childCount <= maxChildren

  // Performance rule: for long lists we animate the container only (no child staggering).
  if (!shouldStagger) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0.01 } : springs.arrival}
      >
        {children}
      </motion.div>
    )
  }

  const staggerTime = staggerVal ?? staggerRules.cards

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
  )
}

export function StaggerItem({ children, className }) {
  const shouldReduceMotion = useReducedMotion()
  const transitionProps = shouldReduceMotion ? { duration: 0.01 } : springs.smooth

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
  )
}
