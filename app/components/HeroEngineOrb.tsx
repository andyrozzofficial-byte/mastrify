"use client"

import { motion, useReducedMotion } from "framer-motion"
import HeroWaveBackdrop from "./HeroWaveBackdrop"
import LandingHeroAtmosphere from "./LandingHeroAtmosphere"
import MasteringEngineVisual from "../master/processing/MasteringEngineVisual"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  activeStep: number
  /** Use tighter atmosphere inset on narrow layouts (still inside overflow-visible bounds). */
  compactAtmosphere?: boolean
  className?: string
}

/**
 * Hero orb stack sized for mobile Safari: no max-height crop, glow layers stay visible.
 */
export default function HeroEngineOrb({ activeStep, compactAtmosphere = false, className = "" }: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={`relative isolate mx-auto w-full max-w-full overflow-visible px-3 py-6 max-lg:mb-2 sm:px-4 sm:py-8 lg:px-0 lg:py-0 ${className}`}
      initial={reduce ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.85, delay: 0.08, ease: EASE }}
    >
      <motion.div className="relative mx-auto w-[min(18rem,78vw)] overflow-visible sm:w-[min(20rem,82vw)] md:w-[min(21rem,38vw)] lg:w-[min(24rem,42vw)] lg:max-w-[28rem]">
        <LandingHeroAtmosphere compact={compactAtmosphere} />
        <motion.div className="relative aspect-square w-full overflow-visible">
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
