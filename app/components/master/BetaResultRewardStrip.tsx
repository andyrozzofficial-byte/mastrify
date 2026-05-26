"use client"

import { motion, useReducedMotion } from "framer-motion"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  className?: string
}

/** Compact completion badge — progress bar lives only in the top Insider card. */
export default function BetaResultRewardStrip({ className = "" }: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.p
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={`text-center text-[11px] font-semibold tracking-wide text-violet-200/90 sm:text-left ${className}`}
      aria-label="Master completion reward"
    >
      <span className="text-emerald-300/95" aria-hidden>
        ✓{" "}
      </span>
      +1 Insider point · Master completed
    </motion.p>
  )
}
