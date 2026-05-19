"use client"

import { motion, useReducedMotion } from "framer-motion"
import CinematicDivider from "../components/CinematicDivider"
import MarketingPageFrame from "../components/cinematic/MarketingPageFrame"
import MarketingSection from "../components/cinematic/MarketingSection"
import PricingPageHero from "../components/pricing/PricingPageHero"
import PricingTrustRow from "../components/pricing/PricingTrustRow"

const EASE = [0.22, 1, 0.36, 1] as const

export default function Pricing() {
  const reduce = useReducedMotion()

  return (
    <MarketingPageFrame>
      <PricingPageHero />

      <MarketingSection afterHero>
        <p className="mb-6 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
          What you get
        </p>
        <PricingTrustRow />

        <motion.div
          className="mt-10 sm:mt-12 md:mt-14"
          initial={reduce ? false : { opacity: 0 }}
          whileInView={reduce ? undefined : { opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <CinematicDivider />
          <p className="mt-8 text-center text-[12px] leading-relaxed text-white/58 md:text-[13px]">
            Studio-quality master. One simple price — more value than the cost suggests.
          </p>
        </motion.div>
      </MarketingSection>
    </MarketingPageFrame>
  )
}
