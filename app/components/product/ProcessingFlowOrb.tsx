"use client"

import { motion, useReducedMotion } from "framer-motion"
import LandingHeroAtmosphere from "../LandingHeroAtmosphere"
import MasteringEngineVisual from "../../master/processing/MasteringEngineVisual"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  activeStep: number
  /** Matches analyze processing sweep; off on master upload if desired */
  showScanSweep?: boolean
}

/**
 * Same orb stack as AnalyzeProcessingView / live mastering — no marketing efficient path.
 */
export default function ProcessingFlowOrb({ activeStep, showScanSweep = true }: Props) {
  const reduce = useReducedMotion()

  return (
    <div className="product-flow-orb-cage relative w-full">
      <LandingHeroAtmosphere />
      {showScanSweep ? (
        <motion.div
          className="pointer-events-none absolute inset-x-[4%] top-[8%] h-[55%] overflow-hidden rounded-full opacity-[0.14]"
          aria-hidden
        >
          <motion.div
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent"
            animate={reduce ? undefined : { left: ["-20%", "90%"] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
          />
        </motion.div>
      ) : null}
      <MasteringEngineVisual activeStep={activeStep} className="relative z-[1] mx-auto" />
    </div>
  )
}

type SlotProps = {
  activeStep: number
  showScanSweep?: boolean
}

export function ProductFlowOrbSlot({ activeStep, showScanSweep }: SlotProps) {
  return (
    <motion.div
      className="product-flow-orb-slot marketing-hero-orb-slot hidden md:flex marketing-hero-visual marketing-hero-visual-slot relative mx-auto w-full min-w-0 max-w-full justify-center overflow-hidden md:py-2 lg:sticky lg:top-20 lg:min-h-[16rem] lg:justify-start lg:py-0"
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.65, ease: EASE }}
    >
      <ProcessingFlowOrb activeStep={activeStep} showScanSweep={showScanSweep} />
    </motion.div>
  )
}
