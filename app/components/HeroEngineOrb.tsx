"use client"

import { motion, useReducedMotion } from "framer-motion"
import { CINEMATIC_EASE } from "../../lib/cinematicMotion"
import HeroWaveBackdrop from "./HeroWaveBackdrop"
import LandingHeroAtmosphere from "./LandingHeroAtmosphere"
import MasteringEngineVisual from "../master/processing/MasteringEngineVisual"
import OrbScene from "./cinematic/OrbScene"

type Props = {
  activeStep: number
  compactAtmosphere?: boolean
  mobileGlowBoost?: boolean
  className?: string
}

/**
 * Marketing hero orb — efficient rendering path (no processing-UI changes).
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
      className={`hero-engine-orb-root relative isolate mx-auto w-full max-w-full min-w-0 px-2 py-2 max-md:mb-0 sm:px-3 sm:py-3 md:px-4 md:py-4 lg:px-0 lg:py-0 ${className}`}
      initial={reduce ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.65, ease: CINEMATIC_EASE }}
    >
      <div className="hero-engine-orb-cage relative mx-auto w-full min-w-0 overflow-hidden">
        <div className="hero-orb-radial-mobile pointer-events-none absolute inset-0 z-0 lg:hidden" aria-hidden />
        <LandingHeroAtmosphere
          compact={compactAtmosphere}
          mobileGlowBoost={mobileGlowBoost || compactAtmosphere}
          efficient
        />
        <motion.div
          className="hero-engine-orb-stage relative z-[1] aspect-square w-full max-w-full overflow-hidden"
          aria-hidden
        >
          <HeroWaveBackdrop
            efficient
            heightClass="h-[34%] md:h-[40%]"
            className="opacity-[0.18] md:opacity-[0.22]"
          />
          <MasteringEngineVisual
            activeStep={activeStep}
            efficient
            className="marketing-engine-visual relative z-[1] mx-auto"
          />
        </motion.div>
      </div>
    </motion.div>
  )
}

type SlotProps = {
  activeStep: number
}

/** @deprecated Prefer OrbScene — className overrides are ignored for layout consistency. */
export function MarketingHeroOrbSlot({ activeStep }: SlotProps) {
  return <OrbScene activeStep={activeStep} />
}
