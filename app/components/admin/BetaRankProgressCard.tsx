"use client"

import { BETA_EARN_WAYS, buildBetaMilestoneProgress, type BetaRankProgress } from "../../../lib/betaPoints"
import { AdminCard, BetaRankBadge } from "./admin-shared"

export function BetaRankProgressCard({
  rankProgress,
  rewardStatus,
  issueReportCount,
  betaPoints,
}: {
  rankProgress: BetaRankProgress
  rewardStatus: string
  issueReportCount: number
  betaPoints: number
}) {
  const { rankLabel, points, nextRankLabel, pointsToNext, nextThreshold, progressPct } = rankProgress
  const milestone = buildBetaMilestoneProgress(points)

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
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Next reward</p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/82">{milestone.nextReward}</p>
        {milestone.nextRewardDetail ? (
          <p className="mt-1 text-xs text-white/55">{milestone.nextRewardDetail}</p>
        ) : null}
        <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-white/42">Unlocked</p>
        <p className="mt-1 text-xs leading-relaxed text-white/60">{rewardStatus}</p>
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Ways to earn</p>
        <ul className="mt-2 space-y-1 text-xs text-white/55">
          {BETA_EARN_WAYS.map((w) => (
            <li key={w.label}>
              <span className="font-semibold text-violet-200/80">{w.points}</span> {w.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-white/50">
        <span>Issues reported</span>
        <span className="tabular-nums font-medium text-white/80">{issueReportCount}</span>
      </div>
    </AdminCard>
  )
}
