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
      className={`relative isolate mx-auto w-full max-w-full min-w-0 overflow-hidden px-3 py-3 max-md:mb-0 sm:px-4 sm:py-4 md:py-8 lg:overflow-visible lg:px-0 lg:py-0 ${className}`}
      initial={reduce ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.06, ease: CINEMATIC_EASE }}
    >
      <motion.div className="relative mx-auto w-[min(15rem,66vw)] max-w-full overflow-hidden sm:w-[min(16.5rem,60vw)] md:w-[min(21rem,38vw)] lg:w-[min(24rem,42vw)] lg:max-w-[28rem] lg:overflow-visible">
        <motion.div className="hero-orb-radial-mobile" aria-hidden />
        <LandingHeroAtmosphere compact={compactAtmosphere} mobileGlowBoost={mobileGlowBoost || compactAtmosphere} />
        <motion.div className="relative aspect-square w-full max-w-full overflow-hidden lg:overflow-visible">
          <HeroWaveBackdrop heightClass="h-[34%] md:h-[40%]" className="opacity-[0.18] md:opacity-[0.22]" />
          <MasteringEngineVisual
            activeStep={activeStep}
            className="relative z-[1] mx-auto !h-full !w-full !max-w-none"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
