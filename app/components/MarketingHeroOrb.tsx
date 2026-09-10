"use client"

import { motion, useReducedMotion } from "framer-motion"
import { forwardRef } from "react"
import MasteringEngineVisual from "../master/processing/MasteringEngineVisual"

const EASE = [0.22, 1, 0.36, 1] as const

export type MarketingHeroOrbProps = {
  activeStep: number
  className?: string
  /** md-up: desktop column (default). mobile-only: inline hero slot below md. */
  breakpoint?: "md-up" | "mobile-only"
}

/**
 * Shared marketing hero globe — same component, sizing and slot logic on every hero.
 */
const MarketingHeroOrb = forwardRef<HTMLDivElement, MarketingHeroOrbProps>(
  function MarketingHeroOrb({ activeStep, className = "", breakpoint = "md-up" }, ref) {
    const reduce = useReducedMotion()
    const visibility =
      breakpoint === "mobile-only"
        ? "flex md:hidden"
        : "hidden md:flex"

    return (
      <motion.div
        ref={ref}
        className={[
          `marketing-hero-orb marketing-hero-orb-slot ${visibility} marketing-hero-visual relative mx-auto w-full min-w-0 max-w-full justify-center overflow-visible lg:justify-start lg:overflow-visible`,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.08, ease: EASE }}
      >
        <div className="hero-engine-orb-cage relative w-full overflow-visible max-lg:mx-auto">
          <MasteringEngineVisual activeStep={activeStep} className="marketing-engine-visual" />
        </div>
      </motion.div>
    )
  },
)

export default MarketingHeroOrb
