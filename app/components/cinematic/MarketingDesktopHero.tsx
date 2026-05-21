"use client"

import { useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import { useEngineStepRotation } from "../../../lib/useEngineStepRotation"
import OrbScene from "./OrbScene"
import "./marketing-hero-perf.css"

export type MarketingHeroVariant = "marketing" | "product"

type Props = {
  children: ReactNode
  /** marketing = homepage / why / short heroes; product = analyze / master / pricing with action card */
  variant?: MarketingHeroVariant
  engineStep?: number
}

/**
 * Homepage-canonical hero — one grid, one orb column, one copy column.
 */
export default function MarketingDesktopHero({
  children,
  variant = "marketing",
  engineStep: engineStepProp,
}: Props) {
  const reduce = useReducedMotion()
  const isProduct = variant === "product"
  const rotatedStep = useEngineStepRotation(4000, !isProduct)
  const engineStep = engineStepProp ?? (isProduct ? 2 : rotatedStep)

  return (
    <section
      className={[
        "marketing-hero-shell hero-section page-container page-hero-pad relative z-10 sm:pb-10 md:pb-12",
        isProduct ? "marketing-hero-shell--product" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="marketing-ambient-pulse pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
      />

      <div
        className={[
          "marketing-hero-lockup relative grid gap-6 sm:gap-10",
          isProduct ? "marketing-hero-lockup--product" : "",
          reduce ? "" : "marketing-hero-lockup--enter",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className={[
            "marketing-hero-copy text-center lg:text-left",
            isProduct ? "marketing-hero-copy--product" : "",
            reduce ? "" : "marketing-hero-copy--enter",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </div>

        <OrbScene activeStep={engineStep} />
      </div>
    </section>
  )
}
