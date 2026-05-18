/** Shared motion tokens for analyze results — presentation only */
export const ANALYZE_EASE = [0.25, 0.46, 0.45, 1] as const

export const analyzeReveal = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, ease: ANALYZE_EASE },
} as const

export const analyzeRevealDelayed = (delay: number) => ({
  ...analyzeReveal,
  transition: { ...analyzeReveal.transition, delay },
})
