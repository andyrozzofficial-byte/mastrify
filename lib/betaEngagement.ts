import type {
  AdminFeedbackRow,
  AdminJobRow,
  AdminSupportRow,
  BetaEngagementLevel,
  BetaTimelineEvent,
  BetaUserBadge,
} from "./adminTypes"
import type { BetaUserRank } from "./betaAccess"
import { migrateLegacyRank } from "./betaAccess"

export type { BetaEngagementLevel, BetaTimelineEvent, BetaUserBadge }

export function calcEngagementScore(input: {
  masterCount: number
  feedbackCount: number
  supportCount: number
  activeDays: number
}): number {
  return input.masterCount + input.feedbackCount + input.supportCount + input.activeDays
}

export function engagementLevel(score: number): BetaEngagementLevel {
  if (score >= 15) return "high"
  if (score >= 5) return "medium"
  return "low"
}

export function engagementLevelLabel(level: BetaEngagementLevel): string {
  if (level === "high") return "High"
  if (level === "medium") return "Medium"
  return "Low"
}

export function nextBetaRank(current: string | null | undefined): BetaUserRank {
  const rank = migrateLegacyRank(current)
  if (rank === "explorer") return "insider"
  if (rank === "insider") return "pioneer"
  if (rank === "pioneer") return "legend"
  return "legend"
}

export function normalizeRankKey(rank: string | null | undefined): BetaUserRank {
  return migrateLegacyRank(rank)
}

export function computeBetaBadges(input: {
  masterCount: number
  feedbackCount: number
  bugReportCount: number
  engagementLevel: BetaEngagementLevel
  betaRank: string | null | undefined
}): BetaUserBadge[] {
  const badges: BetaUserBadge[] = []
  if (input.masterCount >= 1) {
    badges.push({ id: "first_master", emoji: "🎵", label: "First Master" })
  }
  if (input.feedbackCount >= 3) {
    badges.push({ id: "feedback_hero", emoji: "💬", label: "Feedback Hero" })
  }
  if (input.bugReportCount >= 1) {
    badges.push({ id: "bug_hunter", emoji: "🐛", label: "Bug Hunter" })
  }
  if (input.engagementLevel === "high") {
    badges.push({ id: "power_user", emoji: "🚀", label: "Power User" })
  }
  if (normalizeRankKey(input.betaRank) === "legend") {
    badges.push({ id: "legend_tester", emoji: "🏆", label: "Legend" })
  }
  return badges
}

export function countBugReports(
  userFeedback: AdminFeedbackRow[],
  userSupport: AdminSupportRow[],
): number {
  const supportBugs = userSupport.filter((s) =>
    /bug|error|crash|broken|glitch/i.test(`${s.subject} ${s.category ?? ""}`),
  ).length
  const feedbackBugs = userFeedback.filter((f) => {
    const extra = f.survey.additional?.trim()
    return Boolean(extra && /bug|error|crash|broken|glitch/i.test(extra))
  }).length
  return supportBugs + feedbackBugs
}

type PipelineUpload = { session_id: string; created_at: string }
type ExportRow = { id: string; created_at: string; track_title?: string | null }

export function buildBetaTimeline(input: {
  signupAt: string | null
  uploads: PipelineUpload[]
  userFeedback: AdminFeedbackRow[]
  userJobs: AdminJobRow[]
  userSupport: AdminSupportRow[]
  exports: ExportRow[]
}): BetaTimelineEvent[] {
  const events: BetaTimelineEvent[] = []

  if (input.signupAt) {
    events.push({
      id: `signup-${input.signupAt}`,
      type: "signup",
      label: "Signed up for beta",
      detail: null,
      created_at: input.signupAt,
      href: null,
    })
  }

  for (const u of input.uploads) {
    events.push({
      id: `upload-${u.session_id}-${u.created_at}`,
      type: "upload",
      label: "Uploaded track",
      detail: u.session_id ? `Session ${u.session_id.slice(0, 8)}…` : null,
      created_at: u.created_at,
      href: null,
    })
  }

  for (const j of input.userJobs) {
    if (j.status !== "complete") continue
    events.push({
      id: `master-${j.id}`,
      type: "master",
      label: "Completed master",
      detail: j.track_name ?? j.mastering_style,
      created_at: j.created_at,
      href: `/admin/jobs`,
    })
  }

  for (const f of input.userFeedback) {
    events.push({
      id: `feedback-${f.id}`,
      type: "feedback",
      label: "Submitted feedback",
      detail: f.track_name ?? `Recommend ${f.recommend_score}/10`,
      created_at: f.created_at,
      href: `/admin/feedback/${f.id}`,
    })
  }

  for (const s of input.userSupport) {
    events.push({
      id: `support-${s.id}`,
      type: "support",
      label: "Created support ticket",
      detail: s.subject,
      created_at: s.created_at,
      href: `/admin/support/${s.id}`,
    })
  }

  for (const ex of input.exports) {
    events.push({
      id: `download-${ex.id}`,
      type: "download",
      label: "Downloaded master",
      detail: ex.track_title ?? null,
      created_at: ex.created_at,
      href: null,
    })
  }

  return events.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function getBetaInvitePayload(origin: string): {
  accessUrl: string
  inviteCode: string | null
  inviteMessage: string
} {
  const base = origin.replace(/\/$/, "")
  const accessUrl = `${base}/access`
  const inviteCode = process.env.MASTRIFY_BETA_INVITE_CODE?.trim() || null
  const inviteMessage = inviteCode
    ? `Join Mastrify Beta\n${accessUrl}\nReferral code: ${inviteCode}`
    : `Join Mastrify Beta\n${accessUrl}\nSign up with your email to start mastering.`
  return { accessUrl, inviteCode, inviteMessage }
}
