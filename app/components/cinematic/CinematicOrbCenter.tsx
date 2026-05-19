"use client"

import { motion, useReducedMotion } from "framer-motion"
import HeroEngineOrb from "../HeroEngineOrb"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  activeStep: number
  className?: string
}

/**
 * Centered orb stack for live analyze/master processing — same HeroEngineOrb as landing.
 */
export default function CinematicOrbCenter({ activeStep, className = "" }: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={`cinematic-orb-center marketing-hero-visual relative mx-auto w-full max-w-[26rem] px-5 md:max-w-[28rem] ${className}`.trim()}
      initial={reduce ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.65, delay: 0.08, ease: EASE }}
    >
      <HeroEngineOrb activeStep={activeStep} className="mx-auto w-full" />
    </motion.div>
  )
}
