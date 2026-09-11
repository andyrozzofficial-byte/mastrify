"use client"

import { motion, useReducedMotion } from "framer-motion"
import { forwardRef } from "react"
import MasteringEngineVisual from "../master/processing/MasteringEngineVisual"

const EASE = [0.22, 1, 0.36, 1] as const

export type MarketingHeroOrbProps = {
  activeStep: number
  className?: string
  /** md-up: desktop column (default). all: every breakpoint. mobile-only: below md only. */
  breakpoint?: "md-up" | "mobile-only" | "all"
  /** Center orb on all breakpoints (home hero). */
  centered?: boolean
}

/**
 * Shared marketing hero globe — same component, sizing and slot logic on every hero.
 */
const MarketingHeroOrb = forwardRef<HTMLDivElement, MarketingHeroOrbProps>(
  function MarketingHeroOrb({ activeStep, className = "", breakpoint = "md-up", centered = false }, ref) {
    const reduce = useReducedMotion()
    const visibility =
      breakpoint === "mobile-only"
        ? "flex md:hidden"
        : breakpoint === "all"
          ? "flex"
          : "hidden md:flex"
    const align = centered ? "justify-center" : "justify-center lg:justify-start"

    return (
      <motion.div
        ref={ref}
        className={[
          `marketing-hero-orb marketing-hero-orb-slot ${visibility} marketing-hero-visual relative mx-auto w-full min-w-0 max-w-full ${align} overflow-visible lg:overflow-visible`,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.08, ease: EASE }}
      >
        <div className="hero-engine-orb-cage relative mx-auto w-full overflow-visible">
          <MasteringEngineVisual activeStep={activeStep} className="marketing-engine-visual" />
        </div>
      </motion.div>
    )
  },
)

export default MarketingHeroOrb
