"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useBetaMasteringGate } from "../beta/BetaMasteringGateProvider"

const EASE = [0.22, 1, 0.36, 1] as const

const RANK_PILL_STYLES: Record<string, string> = {
  explorer: "border-white/12 bg-white/[0.06] text-white/65",
  insider: "border-violet-400/28 bg-violet-500/12 text-violet-100/90",
  pioneer: "border-indigo-400/28 bg-indigo-500/14 text-indigo-100/90",
  legend: "border-violet-300/35 bg-violet-600/20 text-violet-50/95",
  founding: "border-violet-300/35 bg-violet-600/20 text-violet-50/95",
}

function rankPillClass(rankLabel: string): string {
  const key = rankLabel.trim().toLowerCase()
  return RANK_PILL_STYLES[key] ?? RANK_PILL_STYLES.insider!
}

type Props = {
  className?: string
}

export default function BetaMasterStatusCard({ className = "" }: Props) {
  const { isBeta, checking, betaUi } = useBetaMasteringGate()
  const reduce = useReducedMotion()

  if (checking || !isBeta) return null

  const rankLabel = betaUi?.rankLabel ?? "Explorer"
  const progressTitle = betaUi?.progressTitle ?? "Insider Progress"
  const progressLabel = betaUi?.progressLabel ?? "—"
  const progressPct = betaUi?.progressPct ?? 0
  const nextReward = betaUi?.nextReward ?? "10% discount code"

  return (
    <motion.div
      className={`w-full ${className}`}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <div className="relative overflow-hidden rounded-lg border border-violet-400/18 bg-white/[0.025] px-3 py-2 shadow-[0_0_16px_rgba(124,58,237,0.06),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:px-3.5 sm:py-2.5">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_65%_at_50%_0%,rgba(124,58,237,0.08),transparent_70%)]"
          aria-hidden
        />
        <div className="relative space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-violet-200/75 sm:text-[9px]">
              Private beta
            </p>
            <span
              className={`inline-flex items-center rounded-full border px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide sm:text-[9px] ${rankPillClass(rankLabel)}`}
            >
              {rankLabel}
            </span>
          </div>
          <p className="text-[12px] font-semibold leading-tight text-white/92 sm:text-[13px]">
            You&apos;re helping shape Mastrify.
          </p>
          <p className="text-[10px] leading-snug text-white/48 sm:text-[11px]">
            Every master and feedback helps improve Mastrify.
          </p>

          <div className="space-y-1 border-t border-white/[0.05] pt-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[8px] font-medium uppercase tracking-wide text-white/42 sm:text-[9px]">
                {progressTitle}
              </p>
              <p className="shrink-0 text-[10px] font-semibold tabular-nums text-violet-100/90 sm:text-[11px]">
                {progressLabel}
              </p>
            </div>
            <div
              className="h-1 overflow-hidden rounded-full bg-white/[0.07]"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={progressTitle}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500/90 to-indigo-500/85 transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
              />
            </div>
            <p className="text-[8px] font-medium uppercase tracking-wide text-white/38 sm:text-[9px]">Next reward</p>
            <p className="text-[10px] leading-snug text-white/62 sm:text-[11px]">{nextReward}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
