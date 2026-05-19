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

      <MarketingSection afterHero tightAfterHero compact contained className="marketing-pricing-lower">
        <PricingTrustRow />

        <motion.div
          className="marketing-pricing-footer"
          initial={reduce ? false : { opacity: 0 }}
          whileInView={reduce ? undefined : { opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <CinematicDivider />
          <p className="marketing-pricing-footer-copy">
            Studio-quality master. One simple price — more value than the cost suggests.
          </p>
        </motion.div>
      </MarketingSection>
    </MarketingPageFrame>
  )
}
