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
}

export default function BetaMasterStatusCard({ className = "" }: Props) {
  const { isBeta, checking, betaUi } = useBetaMasteringGate()
  const reduce = useReducedMotion()

  if (checking || !isBeta) return null

  const rankLabel = betaUi?.rankLabel ?? "Explorer"
  const progressTitle = betaUi?.progressTitle ?? "INSIDER PROGRESS"
  const progressLabel = betaUi?.progressLabel ?? "—"
  const progressPct = betaUi?.progressPct ?? 0
  const nextReward = betaUi?.nextReward ?? "10% discount code"
  const nextRewardDetail = betaUi?.nextRewardDetail
  const earnWays = betaUi?.earnWays ?? []

  return (
    <motion.div
      className={`cinematic-upload-card-root relative w-full ${className}`}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <div
        className="cinematic-upload-card-glow pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-violet-500/18 via-transparent to-cyan-500/10 blur-sm"
        aria-hidden
      />

      <div className="cinematic-upload-card-panel fluid-surface relative overflow-hidden border-violet-400/20 px-4 py-3.5 sm:px-5 sm:py-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,rgba(124,58,237,0.11),transparent_68%)]"
          aria-hidden
        />

        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-violet-200/80 sm:text-[10px]">
                Private beta
              </p>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] ${rankPillClass(rankLabel)}`}
              >
                {rankLabel}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[13px] font-semibold leading-snug text-white/94 sm:text-[14px]">
              You&apos;re helping shape Mastrify.
            </p>
            <p className="text-[11px] leading-relaxed text-white/50 sm:text-[12px]">
              Every master and feedback helps improve Mastrify.
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 sm:px-3.5 sm:py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45 sm:text-[10px]">
                {progressTitle}
              </p>
              <p className="shrink-0 text-[12px] font-semibold tabular-nums text-violet-100/95 sm:text-[13px]">
                {progressLabel}
              </p>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={progressTitle}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.35)] transition-[width] duration-500"
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

          <div className="border-t border-white/[0.06] pt-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/38 sm:text-[10px]">
              Next reward
            </p>
            <p className="mt-1 text-[12px] font-medium leading-snug text-white/82 sm:text-[13px]">
              <span aria-hidden>🎁 </span>
              {nextReward}
            </p>
            {nextRewardDetail ? (
              <p className="mt-0.5 text-[11px] leading-snug text-white/52">{nextRewardDetail}</p>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
