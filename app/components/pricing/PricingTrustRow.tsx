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
    <motion.ul
      className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:gap-2.5"
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-32px" }}
      transition={{ duration: 0.65, ease: EASE }}
    >
      {TRUST.map((label, i) => (
        <motion.li
          key={label}
          className="flex items-center gap-2.5 rounded-lg border border-white/[0.05] bg-black/[0.28] px-3.5 py-3 backdrop-blur-md sm:justify-center lg:justify-start"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.04 * i, ease: EASE }}
        >
          <span className="h-1 w-1 shrink-0 rounded-full bg-cyan-400/55" aria-hidden />
          <span className="text-[12px] text-white/42 sm:text-[13px]">{label}</span>
        </motion.li>
      ))}
    </motion.ul>
  )
}
