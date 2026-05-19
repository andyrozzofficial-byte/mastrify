"use client"

import { motion, useReducedMotion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"
import MarketingPageAmbient from "../components/MarketingPageAmbient"
import CinematicDivider from "../components/CinematicDivider"
import PricingPageHero from "../components/pricing/PricingPageHero"
import PricingTrustRow from "../components/pricing/PricingTrustRow"
import PricingUnlockCard from "../components/pricing/PricingUnlockCard"

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
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-violet-950/[0.1] via-transparent to-transparent"
        aria-hidden
      />

      <main className="page-container relative z-10 pb-10 pt-5 max-md:pb-12 sm:pb-16 sm:pt-8 md:pb-24 md:pt-6">
        <PricingPageHero />

        <motion.div
          className="section-after-hero relative -mt-2 md:-mt-4"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div
            className="marketing-ambient-pulse pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(280px,45vh)] w-[min(480px,85vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(109,40,217,0.09),transparent_68%)] opacity-75 blur-2xl max-md:blur-xl"
            aria-hidden
          />
          <PricingUnlockCard className="relative z-[1]" />
        </motion.div>

        <motion.div className="mt-12 sm:mt-16 md:mt-20">
          <p className="mb-6 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
            What you get
          </p>
          <PricingTrustRow />
        </motion.div>

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
      </main>
    </motion.div>
  )
}
