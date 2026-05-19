"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import { ProductFlowOrbSlot } from "./ProcessingFlowOrb"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  engineStep: number
  showScanSweep?: boolean
  children: ReactNode
}

/** Shared Analyze + Master upload hero structure (Master page is the reference). */
export default function ProductUploadHeroLayout({ engineStep, showScanSweep, children }: Props) {
  const reduce = useReducedMotion()

  return (
    <section className="product-flow-hero-shell marketing-hero-shell hero-section relative w-full">
      <div
        className="marketing-ambient-pulse pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
      />

      <motion.div
        className="product-flow-hero-lockup marketing-hero-lockup marketing-hero-lockup--top relative grid min-w-0 gap-5 max-lg:grid-cols-1 sm:gap-6"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: EASE }}
      >
        <motion.div className="product-flow-hero-copy marketing-hero-copy flex min-w-0 flex-col max-lg:order-1">
          {children}
        </motion.div>

        <ProductFlowOrbSlot activeStep={engineStep} showScanSweep={showScanSweep} />
      </motion.div>
    </section>
  )
}
