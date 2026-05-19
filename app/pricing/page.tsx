"use client"

import { motion, useReducedMotion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"
import MarketingPageAmbient from "../components/MarketingPageAmbient"
import CinematicDivider from "../components/CinematicDivider"
import PricingPageHero from "../components/pricing/PricingPageHero"
import PricingTrustRow from "../components/pricing/PricingTrustRow"

const EASE = [0.22, 1, 0.36, 1] as const

export default function Pricing() {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="marketing-page-root relative min-h-screen overflow-x-clip text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" marketingLite />

      <MarketingPageAmbient />

      <main className="relative z-10 pb-10 max-md:pb-12 sm:pb-16 md:pb-24">
        <PricingPageHero />

        <motion.div
          className="page-container section-after-hero"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <p className="mb-6 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
            What you get
          </p>
          <PricingTrustRow />

          <motion.div
            className="mt-12 sm:mt-16 md:mt-20"
            initial={reduce ? false : { opacity: 0 }}
            whileInView={reduce ? undefined : { opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <CinematicDivider />
            <p className="mt-8 text-center text-[12px] leading-relaxed text-white/58 md:text-[13px]">
              Studio-quality master. One simple price — more value than the cost suggests.
            </p>
          </motion.div>
        </motion.div>
      </main>
    </motion.div>
  )
}
