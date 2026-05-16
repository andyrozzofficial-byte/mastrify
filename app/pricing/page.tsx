"use client"

import { motion, useReducedMotion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"
import CinematicDivider from "../components/CinematicDivider"
import PricingPageHero from "../components/pricing/PricingPageHero"
import PricingTrustRow from "../components/pricing/PricingTrustRow"
import PricingUnlockCard from "../components/pricing/PricingUnlockCard"

const EASE = [0.22, 1, 0.36, 1] as const

export default function Pricing() {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />

      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,rgba(99,102,241,0.11),transparent_55%),radial-gradient(ellipse_50%_40%_at_88%_60%,rgba(34,211,238,0.06),transparent_50%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.88, 1, 0.88] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-violet-950/[0.1] via-transparent to-transparent"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <main className="page-container relative z-10 pb-12 pt-6 sm:pb-16 sm:pt-8 md:pb-24 md:pt-14">
        <PricingPageHero />

        <motion.div
          className="section-after-hero relative -mt-2 md:-mt-4"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(320px,50vh)] w-[min(520px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(109,40,217,0.09),transparent_68%)] opacity-80 blur-3xl"
            aria-hidden
          />
          <PricingUnlockCard className="relative z-[1]" />
        </motion.div>

        <motion.div className="mt-16 md:mt-20">
          <p className="mb-6 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
            What you get
          </p>
          <PricingTrustRow />
        </motion.div>

        <motion.div
          className="mt-16 md:mt-20"
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
