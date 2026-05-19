"use client"

import { motion, useReducedMotion } from "framer-motion"
import { CINEMATIC_EASE } from "../../lib/cinematicMotion"
import HeroWaveBackdrop from "./HeroWaveBackdrop"
import LandingHeroAtmosphere from "./LandingHeroAtmosphere"
import MasteringEngineVisual from "../master/processing/MasteringEngineVisual"

type Props = {
  activeStep: number
  /** Use tighter atmosphere inset on narrow layouts (still inside overflow-visible bounds). */
  compactAtmosphere?: boolean
  /** Stronger mobile radial depth behind the engine graphic */
  mobileGlowBoost?: boolean
  className?: string
}

/**
 * Hero orb stack sized for mobile Safari: no max-height crop, glow layers stay visible.
 * Desktop marketing dimensions are locked in globals.css (.hero-engine-orb-cage).
 */
export default function HeroEngineOrb({
  activeStep,
  compactAtmosphere = false,
  mobileGlowBoost = false,
  className = "",
}: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={`hero-engine-orb-root relative isolate mx-auto w-full max-w-full min-w-0 overflow-hidden px-2 py-2 max-md:mb-0 sm:px-3 sm:py-3 md:px-4 md:py-4 lg:overflow-visible lg:px-0 lg:py-0 ${className}`}
      initial={reduce ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.06, ease: CINEMATIC_EASE }}
    >
      <motion.div
        className="hero-engine-orb-cage relative mx-auto w-full min-w-0 overflow-hidden lg:overflow-visible"
        initial={reduce ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.65, delay: 0.08, ease: CINEMATIC_EASE }}
      >
        <motion.div
          className="hero-orb-radial-mobile pointer-events-none absolute inset-0 z-0 lg:hidden"
          aria-hidden
        />
        <LandingHeroAtmosphere compact={compactAtmosphere} mobileGlowBoost={mobileGlowBoost || compactAtmosphere} />
        <motion.div
          className="hero-engine-orb-stage relative z-[1] aspect-square w-full max-w-full overflow-hidden lg:overflow-visible"
          aria-hidden
        >
          <HeroWaveBackdrop heightClass="h-[34%] md:h-[40%]" className="opacity-[0.18] md:opacity-[0.22]" />
          <MasteringEngineVisual
            activeStep={activeStep}
            className="marketing-engine-visual relative z-[1] mx-auto"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

type SlotProps = {
  activeStep: number
  className?: string
}

/** Shared marketing hero orb column — same wrapper on every desktop marketing hero. */
export function MarketingHeroOrbSlot({ activeStep, className = "" }: SlotProps) {
  return (
    <div
      className={`marketing-hero-orb-slot hidden md:flex marketing-hero-visual min-w-0 shrink-0 items-center justify-center overflow-visible ${className}`.trim()}
    >
      <HeroEngineOrb activeStep={activeStep} compactAtmosphere mobileGlowBoost />
    </div>
  )
}
