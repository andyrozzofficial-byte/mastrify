"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useBetaMasteringGate } from "../beta/BetaMasteringGateProvider"

const EASE = [0.22, 1, 0.36, 1] as const

const REWARDS = [
  "1 master + feedback → 10% discount",
  "5 masters + feedback → 25% discount",
  "Top contributors → Insider status + future rewards",
] as const

export default function BetaExperienceBanner() {
  const { isBetaUser, checking } = useBetaMasteringGate()
  const reduce = useReducedMotion()

  if (checking || !isBetaUser) return null

  return (
    <motion.div
      className="w-full"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-violet-400/25 bg-white/[0.03] px-4 py-3.5 shadow-[0_0_28px_rgba(124,58,237,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:px-5 sm:py-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(124,58,237,0.14),transparent_70%)]"
          aria-hidden
        />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/80">
            <span aria-hidden>🟣 </span>
            Private beta
          </p>
          <h2 className="mt-1.5 text-[15px] font-semibold tracking-tight text-white sm:text-base">
            Help shape Mastrify
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/62 sm:text-[13px]">
            You&apos;re testing early access to Mastrify. Every master, rating and feedback submission helps improve
            the engine.
          </p>
        </div>
      </div>

      <div className="mt-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:px-5">
        <p className="text-[11px] font-medium text-white/70">
          <span aria-hidden>🎁 </span>
          Beta rewards
        </p>
        <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-white/70 sm:text-[12px]">
          {REWARDS.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-white/35" aria-hidden>
                ·
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}
