/** Premium ease — softer deceleration than default material curves */
export const CINEMATIC_EASE = [0.25, 0.46, 0.45, 1] as const

export const CINEMATIC_EASE_SOFT = [0.33, 1, 0.32, 1] as const

export const revealTransition = {
  duration: 0.8,
  ease: CINEMATIC_EASE,
} as const

export const pageEnterTransition = {
  duration: 0.55,
  ease: CINEMATIC_EASE_SOFT,
} as const
