"use client"

import { useReducedMotion } from "framer-motion"
import HeroEngineOrb from "../HeroEngineOrb"
import "./cinematic-flow-layout.css"
import "./marketing-hero-perf.css"

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
    <div
      className={`cinematic-orb-center cinematic-orb-center--flow ${
        reduce ? "" : "cinematic-orb-center--enter"
      } ${className}`.trim()}
    >
      <HeroEngineOrb activeStep={activeStep} compactAtmosphere className="mx-auto w-full" />
    </div>
  )
}
