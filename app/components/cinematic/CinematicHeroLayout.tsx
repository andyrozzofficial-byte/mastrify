"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import { MarketingHeroOrbSlot } from "../HeroEngineOrb"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  engineStep: number
  children: ReactNode
  /** Defaults match landing: centered mobile, left desktop */
  copyClassName?: string
}

/**
 * Landing-page hero structure — single source of truth for split hero + orb.
 */
export default function CinematicHeroLayout({
  engineStep,
  children,
  copyClassName = "marketing-hero-copy text-center lg:text-left",
}: Props) {
  const reduce = useReducedMotion()

  return (
    <section className="marketing-hero-shell hero-section page-container page-hero-pad relative z-10 sm:pb-10 md:pb-12">
      <div
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
          className={copyClassName}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.05, ease: EASE }}
        >
          {children}
        </motion.div>

        <MarketingHeroOrbSlot activeStep={engineStep} />
      </motion.div>
    </section>
  )
}
