"use client"

import type { BetaRankProgress } from "../../../lib/betaPoints"
import { AdminCard, BetaRankBadge } from "./admin-shared"

export function BetaRankProgressCard({
  rankProgress,
  rewardStatus,
  bugReportCount,
  betaPoints,
}: {
  rankProgress: BetaRankProgress
  rewardStatus: string
  bugReportCount: number
  betaPoints: number
}) {
  const { rankLabel, points, nextRankLabel, pointsToNext, nextThreshold, progressPct } = rankProgress

  return (
    <AdminCard className="!p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Beta points</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-white">{betaPoints}</p>
        </div>
        <BetaRankBadge rank={rankLabel} />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-2 text-xs text-white/55">
          <span className="font-medium text-white/80">{rankLabel}</span>
          {nextRankLabel && nextThreshold != null ? (
            <span className="tabular-nums">
              {points} / {nextThreshold} points
            </span>
          ) : (
            <span className="text-violet-200/80">Max rank</span>
          )}
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.08]"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress to ${nextRankLabel ?? "max rank"}`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {nextRankLabel && pointsToNext != null ? (
          <p className="mt-2 text-[11px] text-white/45">
            {pointsToNext} point{pointsToNext === 1 ? "" : "s"} to {nextRankLabel}
          </p>
        ) : null}
      </div>

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Reward status</p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/75">{rewardStatus}</p>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-white/50">
        <span>Bug reports</span>
        <span className="tabular-nums font-medium text-white/80">{bugReportCount}</span>
      </div>
    </AdminCard>
  )
}
