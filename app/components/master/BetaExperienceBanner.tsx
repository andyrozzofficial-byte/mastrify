"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useBetaMasteringGate } from "../beta/BetaMasteringGateProvider"

const EASE = [0.22, 1, 0.36, 1] as const

export default function BetaExperienceBanner() {
  const { isBetaUser, checking } = useBetaMasteringGate()
  const reduce = useReducedMotion()

  if (checking || !isBetaUser) return null

  return (
    <motion.div
      className="w-full"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-violet-400/22 bg-white/[0.03] px-4 py-3.5 shadow-[0_0_24px_rgba(124,58,237,0.1),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:px-5 sm:py-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(124,58,237,0.12),transparent_70%)]"
          aria-hidden
        />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/85">
            Private beta
          </p>
          <p className="mt-1.5 text-[14px] font-semibold tracking-tight text-white/95 sm:text-[15px]">
            You&apos;re helping shape Mastrify.
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-white/58 sm:text-[13px]">
            Every master and feedback submission improves the engine.
          </p>
        </div>
      </div>
    </motion.div>
  )
}
