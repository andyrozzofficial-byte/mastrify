import type { AdminFeedbackRow, AdminJobRow, AdminSupportRow } from "./adminTypes"
import type { BetaUserRank } from "./betaAccess"
import { betaRankLabel, migrateLegacyRank } from "./betaAccess"

export const BETA_RANK_THRESHOLDS: Record<BetaUserRank, number> = {
  explorer: 0,
  insider: 10,
  pioneer: 25,
  legend: 50,
}

const RANK_ORDER: BetaUserRank[] = ["explorer", "insider", "pioneer", "legend"]

export type BetaActivityCounts = {
  completedMasters: number
  feedbackCount: number
  supportCount: number
  feedbackOnlyBugCount: number
  usefulFeedbackCount: number
  betaApproved: boolean
}

export type BetaPointsBreakdown = {
  masters: number
  feedback: number
  support: number
  bugs: number
  usefulFeedback: number
  approvedInvite: number
  total: number
}

export type BetaRankProgress = {
  rank: BetaUserRank
  rankLabel: string
  points: number
  nextRank: BetaUserRank | null
  nextRankLabel: string | null
  pointsInTier: number
  pointsToNext: number | null
  nextThreshold: number | null
  progressPct: number
}

export function rankTier(rank: BetaUserRank): number {
  return RANK_ORDER.indexOf(rank)
}

export function maxBetaRank(a: BetaUserRank, b: BetaUserRank): BetaUserRank {
  return rankTier(a) >= rankTier(b) ? a : b
}

export function rankFromPoints(points: number): BetaUserRank {
  if (points >= BETA_RANK_THRESHOLDS.legend) return "legend"
  if (points >= BETA_RANK_THRESHOLDS.pioneer) return "pioneer"
  if (points >= BETA_RANK_THRESHOLDS.insider) return "insider"
  return "explorer"
}

export function countFeedbackOnlyBugs(userFeedback: AdminFeedbackRow[]): number {
  return userFeedback.filter((f) => {
    const extra = f.survey.additional?.trim()
    return Boolean(extra && /bug|error|crash|broken|glitch/i.test(extra))
  }).length
}

export function countUsefulFeedback(userFeedback: AdminFeedbackRow[]): number {
  return userFeedback.filter((f) => /\buseful\b/i.test(f.admin_notes ?? "")).length
}

export function aggregateBetaActivityForEmail(
  email: string,
  userFeedback: AdminFeedbackRow[],
  userSupport: AdminSupportRow[],
  jobs: AdminJobRow[],
  betaApproved: boolean,
): BetaActivityCounts {
  const normalized = email.toLowerCase()
  const completedMasters = jobs.filter(
    (j) => j.user_email?.toLowerCase() === normalized && j.status === "complete",
  ).length

  return {
    completedMasters,
    feedbackCount: userFeedback.length,
    supportCount: userSupport.length,
    feedbackOnlyBugCount: countFeedbackOnlyBugs(userFeedback),
    usefulFeedbackCount: countUsefulFeedback(userFeedback),
    betaApproved,
  }
}

export function calcBetaPointsBreakdown(counts: BetaActivityCounts): BetaPointsBreakdown {
  const masters = counts.completedMasters * 1
  const feedback = counts.feedbackCount * 2
  const support = counts.supportCount * 3
  const bugs = counts.feedbackOnlyBugCount * 3
  const usefulFeedback = counts.usefulFeedbackCount * 5
  const approvedInvite = counts.betaApproved ? 10 : 0
  return {
    masters,
    feedback,
    support,
    bugs,
    usefulFeedback,
    approvedInvite,
    total: masters + feedback + support + bugs + usefulFeedback + approvedInvite,
  }
}

export function calcBetaPoints(counts: BetaActivityCounts): number {
  return calcBetaPointsBreakdown(counts).total
}

export function calcRecommendationScore(feedback: AdminFeedbackRow[]): number | null {
  if (!feedback.length) return null
  let sum = 0
  for (const row of feedback) {
    const rating = row.recommend_score
    const reuse = Math.min(10, Math.max(0, row.use_again_score))
    sum += rating * 0.65 + reuse * 0.35
  }
  return Math.round((sum / feedback.length) * 10) / 10
}

export function buildBetaRankProgress(points: number): BetaRankProgress {
  const rank = rankFromPoints(points)
  const rankLabel = betaRankLabel(rank)
  const idx = rankTier(rank)
  const nextRank = idx < RANK_ORDER.length - 1 ? RANK_ORDER[idx + 1]! : null
  const currentThreshold = BETA_RANK_THRESHOLDS[rank]
  const nextThreshold = nextRank ? BETA_RANK_THRESHOLDS[nextRank] : null
  const pointsInTier = points - currentThreshold
  const span = nextThreshold != null ? nextThreshold - currentThreshold : 1
  const pointsToNext = nextThreshold != null ? Math.max(0, nextThreshold - points) : null
  const progressPct =
    nextThreshold != null ? Math.min(100, Math.round((pointsInTier / span) * 100)) : 100

  return {
    rank,
    rankLabel,
    points,
    nextRank,
    nextRankLabel: nextRank ? betaRankLabel(nextRank) : null,
    pointsInTier,
    pointsToNext,
    nextThreshold,
    progressPct,
  }
}

export function rewardStatusForRank(rank: BetaUserRank): string {
  if (rank === "legend") return "Lifetime Insider badge + future premium rewards"
  if (rank === "pioneer") return "25% discount code · Early feature access"
  if (rank === "insider") return "10% discount code"
  return "Keep mastering and sharing feedback to unlock rewards"
}

export function effectiveBetaRank(storedRank: string | null | undefined, points: number): BetaUserRank {
  const stored = migrateLegacyRank(storedRank)
  const calculated = rankFromPoints(points)
  return maxBetaRank(stored, calculated)
}

export function countSupportOrBugIncidents(
  userFeedback: AdminFeedbackRow[],
  userSupport: AdminSupportRow[],
): number {
  return userSupport.length + countFeedbackOnlyBugs(userFeedback)
}
