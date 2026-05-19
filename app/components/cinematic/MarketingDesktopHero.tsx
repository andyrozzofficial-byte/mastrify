"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import { useEngineStepRotation } from "../../../lib/useEngineStepRotation"
import OrbScene from "./OrbScene"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  children: ReactNode
  /** When omitted, uses the shared 4s engine step cycle. */
  engineStep?: number
}

/**
 * Landing-page desktop hero — single grid, orb column, spacing, and copy column for all marketing pages.
 */
export default function MarketingDesktopHero({ children, engineStep: engineStepProp }: Props) {
  const reduce = useReducedMotion()
  const rotatedStep = useEngineStepRotation()
  const engineStep = engineStepProp ?? rotatedStep

  return (
    <section className="marketing-hero-shell hero-section page-container page-hero-pad relative z-10 sm:pb-10 md:pb-12">
      <motion.div
        className="marketing-ambient-pulse pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
      />

      <motion.div
        className="marketing-hero-lockup relative grid gap-6 sm:gap-10"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <motion.div
          className="marketing-hero-copy text-center lg:text-left"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.05, ease: EASE }}
        >
          {children}
        </motion.div>

        <OrbScene activeStep={engineStep} />
      </motion.div>
    </section>
  )
}
