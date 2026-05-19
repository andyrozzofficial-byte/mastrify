"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import { useEngineStepRotation } from "../../../lib/useEngineStepRotation"
import OrbScene from "./OrbScene"

const EASE = [0.22, 1, 0.36, 1] as const

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
  const rotatedStep = useEngineStepRotation()
  const engineStep = engineStepProp ?? rotatedStep
  const isProduct = variant === "product"

  return (
    <section
      className={[
        "marketing-hero-shell hero-section page-container page-hero-pad relative z-10 sm:pb-10 md:pb-12",
        isProduct ? "marketing-hero-shell--product" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <motion.div
        className="marketing-ambient-pulse pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
      />

      <motion.div
        className={[
          "marketing-hero-lockup relative grid gap-6 sm:gap-10",
          isProduct ? "marketing-hero-lockup--product" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <motion.div
          className={[
            "marketing-hero-copy text-center lg:text-left",
            isProduct ? "marketing-hero-copy--product" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.05, ease: EASE }}
        >
          {children}
        </motion.div>

        <OrbScene activeStep={engineStep} />
      </motion.div>
    </section>
  )
}
