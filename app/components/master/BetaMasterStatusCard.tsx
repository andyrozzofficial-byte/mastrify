"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useBetaMasteringGate } from "../beta/BetaMasteringGateProvider"

const EASE = [0.22, 1, 0.36, 1] as const

const RANK_PILL_STYLES: Record<string, string> = {
  explorer: "border-white/12 bg-white/[0.06] text-white/65",
  insider: "border-violet-400/28 bg-violet-500/12 text-violet-100/90",
  pioneer: "border-indigo-400/28 bg-indigo-500/14 text-indigo-100/90",
  legend: "border-violet-300/35 bg-violet-600/20 text-violet-50/95",
  founder: "border-amber-400/30 bg-amber-500/12 text-amber-100/90",
  founding: "border-violet-300/35 bg-violet-600/20 text-violet-50/95",
}

function rankPillClass(rankLabel: string): string {
  const key = rankLabel.trim().toLowerCase()
  return RANK_PILL_STYLES[key] ?? RANK_PILL_STYLES.insider!
}

type Props = {
  className?: string
  /** Result page: tighter panel + completion reward strip */
  variant?: "upload" | "result"
  /** @deprecated Use variant="result" */
  showCompletionReward?: boolean
}

export default function BetaMasterStatusCard({
  className = "",
  variant = "upload",
  showCompletionReward = false,
}: Props) {
  const isResult = variant === "result" || showCompletionReward
  const { isBeta, checking, betaUi } = useBetaMasteringGate()
  const reduce = useReducedMotion()

  if (checking || !isBeta) return null

  const rankLabel = betaUi?.rankLabel ?? "Explorer"
  const points = betaUi?.points ?? 0
  const progressTitle = betaUi?.progressTitle ?? "INSIDER PROGRESS"
  const progressLabel = betaUi?.progressLabel ?? "—"
  const progressPct = betaUi?.progressPct ?? 0
  const nextReward = betaUi?.nextReward ?? "10% discount code"
  const nextRewardDetail = betaUi?.nextRewardDetail
  const earnWays = betaUi?.earnWays ?? []

  return (
    <motion.div
      className={`beta-status-card-root relative w-full ${className}`}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <div
        className={`product-surface-card relative overflow-hidden px-[14px] py-[14px] sm:px-5 ${
          isResult ? "sm:py-5" : "sm:py-4"
        }`}
      >
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/55 sm:text-[10px]">
                Private beta
              </p>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] ${rankPillClass(rankLabel)}`}
              >
                {rankLabel}
              </span>
            </div>
          </div>

          {!isResult ? (
            <div className="space-y-1">
              <p className="text-[13px] font-semibold leading-snug text-white/92 sm:text-[14px]">
                You&apos;re helping shape Mastrify.
              </p>
              <p className="text-[11px] leading-relaxed text-white/50 sm:text-[12px]">
                Every master and feedback helps improve Mastrify.
              </p>
            </div>
          ) : null}

          <div className="space-y-2.5 rounded-xl border border-white/[0.08] bg-black/25 px-3.5 py-3 sm:px-3.5 sm:py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50 sm:text-[10px]">
                {progressTitle}
              </p>
              <div className="text-right">
                <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-white/42">Points</p>
                <p className="text-[15px] font-bold tabular-nums text-violet-100 sm:text-[13px]">
                  {points}
                </p>
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[11px] text-white/52">Progress</p>
              <p className="shrink-0 text-[12px] font-medium tabular-nums text-white/78 sm:text-[12px]">
                {progressLabel}
              </p>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-white/[0.08] sm:h-1.5"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={progressTitle}
            >
              <div
                className="h-full rounded-full bg-violet-500 transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
              />
            </div>
          </div>

          {earnWays.length > 0 ? (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/38 sm:text-[10px]">
                Ways to earn
              </p>
              <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                {earnWays.map((way) => (
                  <li
                    key={way.label}
                    className="flex items-center gap-2 text-[10px] text-white/55 sm:text-[11px]"
                  >
                    <span className="shrink-0 font-semibold tabular-nums text-violet-200/75">{way.points}</span>
                    <span>{way.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55 sm:text-[10px]">
              Next reward
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-snug text-white/90 sm:text-[13px]">
              <span aria-hidden>🎁 </span>
              {nextReward}
            </p>
            {nextRewardDetail ? (
              <p className="mt-1 text-[12px] leading-snug text-white/58">{nextRewardDetail}</p>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
