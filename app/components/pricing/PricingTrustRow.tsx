"use client"

import { motion, useReducedMotion } from "framer-motion"

const TRUST = [
  "Full quality WAV export",
  "Streaming-ready loudness",
  "Musical dynamics preserved",
  "AI-assisted mastering engine",
  "No subscription required",
] as const

const EASE = [0.22, 1, 0.36, 1] as const

export default function PricingTrustRow() {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="marketing-pricing-features"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-32px" }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <p className="marketing-pricing-features-kicker">What you get</p>

      <ul className="marketing-pricing-features-list">
        {TRUST.map((label, i) => (
          <motion.li
            key={label}
            className="marketing-pricing-features-item"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.03 * i, ease: EASE }}
          >
            <span className="marketing-pricing-features-dot" aria-hidden />
            <span>{label}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  )
}
