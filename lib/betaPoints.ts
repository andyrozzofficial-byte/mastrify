import type { AdminFeedbackRow, AdminJobRow, AdminSupportRow } from "./adminTypes"
import type { BetaUserRank } from "./betaAccess"
import { betaRankLabel, migrateLegacyRank } from "./betaAccess"

/** Point thresholds for ranks and reward milestones. */
export const BETA_RANK_THRESHOLDS: Record<BetaUserRank, number> = {
  explorer: 0,
  insider: 10,
  pioneer: 25,
  legend: 50,
  founder: 100,
}

export const BETA_REWARD_MILESTONES = [
  {
    points: 10,
    rank: "insider" as const,
    perks: ["10% discount code", "Insider badge"],
  },
  {
    points: 25,
    rank: "pioneer" as const,
    perks: ["25% discount code", "Early access to new features"],
  },
  {
    points: 50,
    rank: "legend" as const,
    perks: ["50% discount / mastering credits"],
  },
  {
    points: 100,
    rank: "founder" as const,
    perks: ["Founder / Early Supporter status", "Exclusive future perks"],
  },
] as const

export const BETA_EARN_WAYS = [
  { points: "+1", label: "Complete master" },
  { points: "+1", label: "Submit feedback" },
  { points: "+2", label: "Report bug" },
  { points: "+3", label: "Invite creator" },
  { points: "+5", label: "Valuable feedback (admin)" },
] as const

const RANK_ORDER: BetaUserRank[] = ["explorer", "insider", "pioneer", "legend", "founder"]

export type BetaActivityCounts = {
  completedMasters: number
  feedbackCount: number
  feedbackOnlyBugCount: number
  usefulFeedbackCount: number
  creatorInviteCount: number
}

export type BetaPointsBreakdown = {
  masters: number
  feedback: number
  bugs: number
  invites: number
  usefulFeedback: number
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

export type BetaMilestoneProgress = {
  points: number
  progressTitle: string
  progressLabel: string
  progressPct: number
  nextReward: string
  nextRewardDetail: string | null
  nextMilestonePoints: number | null
}

export function rankTier(rank: BetaUserRank): number {
  return RANK_ORDER.indexOf(rank)
}

export function maxBetaRank(a: BetaUserRank, b: BetaUserRank): BetaUserRank {
  return rankTier(a) >= rankTier(b) ? a : b
}

export function rankFromPoints(points: number): BetaUserRank {
  if (points >= BETA_RANK_THRESHOLDS.founder) return "founder"
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
  _userSupport: AdminSupportRow[],
  _jobs: AdminJobRow[],
  creatorInviteCount: number,
  completedMasterCount?: number,
): BetaActivityCounts {
  const completedMasters = completedMasterCount ?? 0

  return {
    completedMasters,
    feedbackCount: userFeedback.length,
    feedbackOnlyBugCount: countFeedbackOnlyBugs(userFeedback),
    usefulFeedbackCount: countUsefulFeedback(userFeedback),
    creatorInviteCount,
  }
}

export function calcBetaPointsBreakdown(counts: BetaActivityCounts): BetaPointsBreakdown {
  const masters = counts.completedMasters * 1
  const feedback = counts.feedbackCount * 1
  const bugs = counts.feedbackOnlyBugCount * 2
  const invites = counts.creatorInviteCount * 3
  const usefulFeedback = counts.usefulFeedbackCount * 5
  return {
    masters,
    feedback,
    bugs,
    invites,
    usefulFeedback,
    total: masters + feedback + bugs + invites + usefulFeedback,
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

export function buildBetaMilestoneProgress(points: number): BetaMilestoneProgress {
  const next = BETA_REWARD_MILESTONES.find((m) => points < m.points)
  const prevThreshold =
    next != null
      ? (BETA_REWARD_MILESTONES[BETA_REWARD_MILESTONES.indexOf(next) - 1]?.points ?? 0)
      : BETA_REWARD_MILESTONES[BETA_REWARD_MILESTONES.length - 1]!.points

  const span = next != null ? next.points - prevThreshold : 1
  const progressPct =
    next != null ? Math.min(100, Math.round(((points - prevThreshold) / span) * 100)) : 100

  const progressTitle = next
    ? `${betaRankLabel(next.rank).toUpperCase()} PROGRESS`
    : "ALL REWARDS UNLOCKED"

  const progressLabel = next ? `${points} / ${next.points} points` : `${points} points`

  return {
    points,
    progressTitle,
    progressLabel,
    progressPct,
    nextReward: next?.perks[0] ?? "You unlocked every beta milestone",
    nextRewardDetail: next?.perks[1] ?? null,
    nextMilestonePoints: next?.points ?? null,
  }
}

export function rewardStatusForRank(rank: BetaUserRank): string {
  if (rank === "founder") return "Founder / Early Supporter · Exclusive future perks"
  if (rank === "legend") return "50% discount / mastering credits"
  if (rank === "pioneer") return "25% discount code · Early feature access"
  if (rank === "insider") return "10% discount code · Insider badge"
  return "Earn points to unlock your first rewards"
}

export function nextRewardLabelForRank(nextRank: BetaUserRank | null): string {
  const milestone = BETA_REWARD_MILESTONES.find((m) => m.rank === nextRank)
  if (!milestone) return "Max tier — enjoy your rewards"
  return milestone.perks.join(" · ")
}

export type BetaMasteringUiState = {
  rankLabel: string
  navLabel: string
  points: number
  progressTitle: string
  progressLabel: string
  progressPct: number
  nextReward: string
  nextRewardDetail: string | null
  earnWays: readonly { points: string; label: string }[]
}

export function buildBetaMasteringUiState(input: {
  betaRank: string
  betaPoints: number
  rankProgress: BetaRankProgress
  rewardStatus: string
}): BetaMasteringUiState {
  const milestone = buildBetaMilestoneProgress(input.betaPoints)
  const navLabel = input.rankProgress.rank === "explorer" ? "Beta Member" : input.betaRank

  const nextReward = milestone.nextMilestonePoints
    ? milestone.nextReward
    : input.rewardStatus

  return {
    rankLabel: input.betaRank,
    navLabel,
    points: input.betaPoints,
    progressTitle: milestone.progressTitle,
    progressLabel: milestone.progressLabel,
    progressPct: milestone.progressPct,
    nextReward,
    nextRewardDetail: milestone.nextRewardDetail,
    earnWays: BETA_EARN_WAYS,
  }
}

export function effectiveBetaRank(storedRank: string | null | undefined, points: number): BetaUserRank {
  const stored = migrateLegacyRank(storedRank)
  const calculated = rankFromPoints(points)
  return maxBetaRank(stored, calculated)
}
