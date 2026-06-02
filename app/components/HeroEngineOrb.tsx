"use client"

import { usePathname } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"
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
  /** Landing: lighter layers + scroll-safe overflow — still animated */
  scrollSafe?: boolean
  /** Controls orb animation vs static render (and avoids reduced variants on passive). */
  mode?: "auto" | "passive" | "active"
}

/**
 * Marketing hero orb — efficient rendering path (no processing-UI changes).
 */
export default function HeroEngineOrb({
  activeStep,
  compactAtmosphere = false,
  mobileGlowBoost = false,
  className = "",
  scrollSafe = false,
  mode = "auto",
}: Props) {
  const reduce = useReducedMotion()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  /** Remount orb after hydration / when returning to homepage so loops restart cleanly */
  const orbKey = `${pathname ?? "/"}-${hydrated ? "h" : "s"}`

  const rootClass = `hero-engine-orb-root relative isolate mx-auto w-full max-w-full min-w-0 px-2 py-2 max-md:mb-0 sm:px-3 sm:py-3 md:px-4 md:py-4 lg:px-0 lg:py-0 ${className}`

  const workflowMotion =
    (pathname === "/analyze" || pathname?.startsWith("/analyze/") || false) ||
    (pathname === "/master" || pathname?.startsWith("/master/") || false) ||
    (pathname === "/flow" || pathname?.startsWith("/flow/") || false) ||
    (pathname === "/flow-v2" || pathname?.startsWith("/flow-v2/") || false)

  // Passive pages: visible but fully static (no looping motion / rAF).
  const autoPassive =
    pathname === "/" || pathname === "/landing" || pathname === "/how-it-works" || pathname === "/pricing"

  const passive = mode === "passive" || (mode === "auto" && autoPassive)
  const active = mode === "active" || (mode === "auto" && workflowMotion && !autoPassive)

  // Efficiency is only for scroll-safe rendering; passive must keep premium appearance.
  const efficientVisuals = scrollSafe
  const staticVisual = passive && !active
  // Even when premium-appearance is preserved, passive mode must be fully idle (no rAF loops).
  const idleBackdrop = efficientVisuals || staticVisual

  const orbContent = (
    <div className="hero-engine-orb-cage relative mx-auto w-full min-w-0 overflow-hidden">
      <div className="hero-orb-radial-mobile pointer-events-none absolute inset-0 z-0 lg:hidden" aria-hidden />
      {!efficientVisuals ? (
        <LandingHeroAtmosphere
          compact={compactAtmosphere}
          mobileGlowBoost={mobileGlowBoost || compactAtmosphere}
          efficient
        />
      ) : null}
      <div className="hero-engine-orb-stage relative z-[1] aspect-square w-full max-w-full overflow-hidden">
        <HeroWaveBackdrop
          efficient={idleBackdrop}
          heightClass="h-[34%] md:h-[40%]"
          className={scrollSafe ? "opacity-[0.16] md:opacity-[0.2]" : "opacity-[0.18] md:opacity-[0.22]"}
        />
        <MasteringEngineVisual
          key={orbKey}
          activeStep={activeStep}
          efficient={efficientVisuals}
          static={staticVisual}
          className="marketing-engine-visual relative z-[1] mx-auto"
        />
      </div>
    </div>
  )

  if (scrollSafe || staticVisual) {
    return <div className={rootClass}>{orbContent}</div>
  }

  return (
    <motion.div
      className={rootClass}
      initial={reduce ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.65, ease: CINEMATIC_EASE }}
    >
      {orbContent}
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
