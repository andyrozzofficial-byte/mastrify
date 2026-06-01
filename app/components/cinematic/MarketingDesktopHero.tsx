"use client"

import { useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import OrbScene from "./OrbScene"
import "./marketing-hero-perf.css"

export type MarketingHeroVariant = "marketing" | "product"

type Props = {
  children: ReactNode
  /** marketing = homepage / why / short heroes; product = analyze / master / pricing with action card */
  variant?: MarketingHeroVariant
  engineStep?: number
  /** Landing: static orb + no enter animations — prevents scroll compositing jank */
  scrollSafe?: boolean
  /** Master flow: no orb column, tighter copy column */
  workstation?: boolean
}

/**
 * Homepage-canonical hero — one grid, one orb column, one copy column.
 */
export default function MarketingDesktopHero({
  children,
  variant = "marketing",
  engineStep: engineStepProp,
  scrollSafe = false,
  workstation = false,
}: Props) {
  const reduce = useReducedMotion()
  const isProduct = variant === "product"
  const engineStep = engineStepProp ?? (isProduct ? 2 : 2)
  const useEnter = !reduce && !scrollSafe && !workstation

  return (
    <section
      className={[
        "marketing-hero-shell hero-section page-container page-hero-pad relative z-10 sm:pb-10 md:pb-12",
        isProduct ? "marketing-hero-shell--product product-flow-page-bottom" : "",
        scrollSafe ? "marketing-hero-shell--scroll-safe" : "",
        workstation ? "marketing-hero-shell--workstation" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!workstation ? (
        <div
          className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)] marketing-hero-ambient-layer ${
            scrollSafe ? "opacity-55" : "marketing-ambient-pulse"
          }`}
          aria-hidden
        />
      ) : null}

      <div
        className={[
          "marketing-hero-lockup relative grid gap-6 sm:gap-10",
          isProduct ? "marketing-hero-lockup--product" : "",
          useEnter ? "marketing-hero-lockup--enter" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className={[
            "marketing-hero-copy",
            isProduct ? "marketing-hero-copy--product text-left" : "text-center lg:text-left",
            useEnter ? "marketing-hero-copy--enter" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </div>

        {workstation ? null : <OrbScene activeStep={engineStep} scrollSafe={scrollSafe} />}
      </div>
    </section>
  )
}
