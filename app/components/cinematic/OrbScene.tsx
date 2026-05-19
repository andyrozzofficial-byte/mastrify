"use client"

import HeroEngineOrb from "../HeroEngineOrb"

type Props = {
  activeStep: number
}

/**
 * Fixed marketing orb column — identical sizing, position, and glow on every page.
 * Do not pass layout classNames; all rules live in globals.css (.marketing-hero-visual).
 */
export default function OrbScene({ activeStep }: Props) {
  return (
    <div className="marketing-hero-orb-slot marketing-hero-visual marketing-hero-visual-slot hidden min-w-0 shrink-0 items-center justify-center md:flex">
      <HeroEngineOrb activeStep={activeStep} compactAtmosphere />
    </div>
  )
}
