import type { BetaTimelineEvent, BetaUserProfile } from "./adminTypes"
import { BETA_EARN_WAYS, BETA_REWARD_MILESTONES, buildBetaMilestoneProgress } from "./betaPoints"

export type BetaProfilePanelActivityItem = {
  id: string
  label: string
  detail: string | null
  createdAt: string
}

export type BetaProfilePanelDiscountItem = {
  label: string
  unlocked: boolean
  pointsRequired: number
}

export type BetaProfilePanelData = {
  profile: {
    name: string | null
    email: string
    rankLabel: string
    joinedDate: string | null
  }
  progress: {
    points: number
    progressPct: number
    progressLabel: string
    pointsToNext: number | null
    nextRankLabel: string | null
  }
  activity: {
    mastersCompleted: number
    feedbackSubmitted: number
    bugReports: number
    downloads: number
    activeDays: number
  }
  rewards: {
    currentReward: string
    nextReward: string
    nextRewardDetail: string | null
    discountCodes: BetaProfilePanelDiscountItem[]
    adminCodes: string[]
  }
  recentActivity: BetaProfilePanelActivityItem[]
  earnWays: readonly { points: string; label: string }[]
}

function extractAdminDiscountCodes(notes: string | null): string[] {
  if (!notes?.trim()) return []
  const codes = new Set<string>()
  const patterns = [
    /(?:discount|promo|coupon)[_\s-]*code\s*[:=]\s*([A-Z0-9][A-Z0-9_-]{3,})/gi,
    /\bcode\s*[:=]\s*([A-Z0-9][A-Z0-9_-]{4,})\b/gi,
  ]
  for (const pattern of patterns) {
    for (const match of notes.matchAll(pattern)) {
      const code = match[1]?.trim()
      if (code) codes.add(code)
    }
  }
  return [...codes]
}

function panelActivityLabel(event: BetaTimelineEvent): string {
  if (event.type === "master") return "Completed master"
  if (event.type === "feedback") return "Feedback submitted"
  if (event.type === "download") return "Master downloaded"
  if (event.type === "signup") return "Joined beta"
  if (event.type === "upload") return "Track uploaded"
  if (event.type === "support") {
    if (/bug|error|crash|broken|glitch/i.test(`${event.label} ${event.detail ?? ""}`)) {
      return "Bug reported"
    }
    return "Support ticket"
  }
  return event.label
}

function mapRecentActivity(timeline: BetaTimelineEvent[]): BetaProfilePanelActivityItem[] {
  return timeline
    .filter((e) => e.type !== "upload")
    .slice(0, 10)
    .map((e) => ({
      id: e.id,
      label: panelActivityLabel(e),
      detail: e.detail,
      createdAt: e.created_at,
    }))
}

export function buildBetaProfilePanelData(profile: BetaUserProfile): BetaProfilePanelData {
  const milestone = buildBetaMilestoneProgress(profile.betaPoints)
  const rp = profile.rankProgress

  const discountCodes: BetaProfilePanelDiscountItem[] = BETA_REWARD_MILESTONES.flatMap((m) =>
    m.perks
      .filter((p) => /discount|credit/i.test(p))
      .map((label) => ({
        label,
        unlocked: profile.betaPoints >= m.points,
        pointsRequired: m.points,
      })),
  )

  return {
    profile: {
      name: profile.name,
      email: profile.email,
      rankLabel: profile.betaRank,
      joinedDate: profile.signupDate,
    },
    progress: {
      points: profile.betaPoints,
      progressPct: milestone.progressPct,
      progressLabel: milestone.progressLabel,
      pointsToNext: rp.pointsToNext,
      nextRankLabel: rp.nextRankLabel,
    },
    activity: {
      mastersCompleted: profile.masterCount,
      feedbackSubmitted: profile.feedbackCount,
      bugReports: profile.bugReportCount,
      downloads: profile.downloadCount,
      activeDays: profile.activeDays,
    },
    rewards: {
      currentReward: profile.rewardStatus,
      nextReward: milestone.nextReward,
      nextRewardDetail: milestone.nextRewardDetail,
      discountCodes,
      adminCodes: extractAdminDiscountCodes(profile.adminNotes),
    },
    recentActivity: mapRecentActivity(profile.timeline),
    earnWays: BETA_EARN_WAYS,
  }
}
