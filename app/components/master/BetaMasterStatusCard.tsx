"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useBetaMasteringGate } from "../beta/BetaMasteringGateProvider"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  className?: string
}

export default function BetaMasterStatusCard({ className = "" }: Props) {
  const { isBeta, checking, betaUi } = useBetaMasteringGate()
  const reduce = useReducedMotion()

  if (checking || !isBeta) return null

  const progressTitle = betaUi?.progressTitle ?? "Insider progress"
  const progressLabel = betaUi?.progressLabel ?? "—"
  const nextReward = betaUi?.nextReward ?? "10% discount code"

  return (
    <motion.div
      className={`w-full ${className}`}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <div className="relative overflow-hidden rounded-xl border border-violet-400/20 bg-white/[0.03] px-3.5 py-3 shadow-[0_0_20px_rgba(124,58,237,0.08),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm sm:px-4 sm:py-3.5">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,rgba(124,58,237,0.1),transparent_65%)]"
          aria-hidden
        />
        <div className="relative space-y-2.5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-violet-200/80 sm:text-[10px]">
              Private beta
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-snug text-white/94 sm:text-[14px]">
              You&apos;re helping shape Mastrify.
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/52 sm:text-[12px]">
              Every master, rating, feedback submission and bug report improves the engine.
            </p>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-t border-white/[0.06] pt-2.5">
            <div>
              <p className="text-[9px] font-medium uppercase tracking-wide text-white/40">{progressTitle}</p>
              <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-violet-100/95 sm:text-[13px]">
                {progressLabel}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-medium uppercase tracking-wide text-white/40">Next reward</p>
              <p className="mt-0.5 max-w-[11rem] text-[11px] leading-snug text-white/72 sm:text-[12px]">
                {nextReward}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
