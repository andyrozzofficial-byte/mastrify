import type { AdminFeedbackRow } from "./adminTypes"
import { BETA_FEEDBACK_SOUNDED_OFF_OPTIONS, BETA_FEEDBACK_STOOD_OUT_OPTIONS } from "./betaFeedbackTypes"
import { getSurveyValue } from "./betaFeedbackSurveyDisplay"

export type IssueTier = "critical" | "medium" | "positive"

export type RankedIssue = {
  label: string
  count: number
  tier: IssueTier
}

export type ActionCenterPriorityLabel = "High" | "Medium" | "Low"

export type ActionCenterIssue = {
  id: string
  tier: IssueTier
  emoji: string
  label: string
  mentions: number
  priorityScore: number
  priorityLabel: ActionCenterPriorityLabel
  message: string
}

/** @deprecated Use ActionCenterIssue */
export type ActionCenterItem = ActionCenterIssue

const CRITICAL_SOUND_OFF = new Set([
  "Too compressed",
  "Harsh highs",
  "Too aggressive",
  "Lost too much dynamics",
])

const MEDIUM_SOUND_OFF = new Set([
  "Too much bass",
  "Too flat / lifeless",
  "Other",
])

const POSITIVE_STOOD_OUT = new Set<string>(
  [...BETA_FEEDBACK_STOOD_OUT_OPTIONS].filter((l) => l !== "Other"),
)

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function countMentions(rows: AdminFeedbackRow[], collect: (row: AdminFeedbackRow) => string[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    for (const label of collect(row)) {
      const t = label.trim()
      if (!t || t === "No, it sounded good") continue
      map.set(t, (map.get(t) ?? 0) + 1)
    }
  }
  return map
}

function rowsMentioningLabel(rows: AdminFeedbackRow[], label: string): AdminFeedbackRow[] {
  return rows.filter((row) => {
    const off = getSurveyValue(row.survey, "soundedOff")
    if (!Array.isArray(off)) return false
    return off.map(String).includes(label)
  })
}

function meanRecommend(rows: AdminFeedbackRow[]): number | null {
  const scores = rows
    .map((r) => r.recommend_score)
    .filter((n) => typeof n === "number" && n > 0)
  if (scores.length === 0) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

/** Priority = mentions × recommend impact (lower avg recommend → higher impact). */
export function computeIssuePriority(
  rows: AdminFeedbackRow[],
  label: string,
  mentions: number,
): { priorityScore: number; priorityLabel: ActionCenterPriorityLabel } {
  const matching = rowsMentioningLabel(rows, label)
  const avgRecommend = meanRecommend(matching) ?? 7
  const recommendImpact = Math.max(1, 11 - avgRecommend)
  const priorityScore = Math.round(mentions * recommendImpact * 10) / 10
  const priorityLabel: ActionCenterPriorityLabel =
    priorityScore >= 18 ? "High" : priorityScore >= 9 ? "Medium" : "Low"
  return { priorityScore, priorityLabel }
}

function tierForSoundedOff(label: string): IssueTier {
  if (CRITICAL_SOUND_OFF.has(label)) return "critical"
  if (MEDIUM_SOUND_OFF.has(label)) return "medium"
  if (BETA_FEEDBACK_SOUNDED_OFF_OPTIONS.includes(label as (typeof BETA_FEEDBACK_SOUNDED_OFF_OPTIONS)[number])) {
    return "medium"
  }
  return "medium"
}

function tierForStoodOut(label: string): IssueTier {
  return POSITIVE_STOOD_OUT.has(label) ? "positive" : "positive"
}

const TIER_EMOJI: Record<IssueTier, string> = {
  critical: "🔴",
  medium: "🟡",
  positive: "🟢",
}

export function buildRankedFeedbackIssues(rows: AdminFeedbackRow[]): {
  critical: RankedIssue[]
  medium: RankedIssue[]
  positive: RankedIssue[]
} {
  const completed = rows.filter((r) => r.feedback_stage === "completed" || !r.feedback_stage)

  const offMap = countMentions(completed, (row) => {
    const off = getSurveyValue(row.survey, "soundedOff")
    return Array.isArray(off) ? off.map(String) : []
  })

  const stoodMap = countMentions(completed, (row) => {
    const stood = getSurveyValue(row.survey, "stoodOut")
    return Array.isArray(stood) ? stood.map(String) : []
  })

  for (const row of rows) {
    if (row.feedback_stage !== "preview") continue
    const stood = getSurveyValue(row.survey, "previewStoodOut")
    if (!Array.isArray(stood)) continue
    for (const label of stood) {
      const t = String(label).trim()
      if (t) stoodMap.set(t, (stoodMap.get(t) ?? 0) + 1)
    }
  }

  const critical: RankedIssue[] = []
  const medium: RankedIssue[] = []
  const positive: RankedIssue[] = []

  for (const [label, count] of offMap) {
    const tier = tierForSoundedOff(label)
    const item = { label, count, tier }
    if (tier === "critical") critical.push(item)
    else medium.push(item)
  }

  for (const [label, count] of stoodMap) {
    positive.push({ label, count, tier: tierForStoodOut(label) })
  }

  const sort = (a: RankedIssue, b: RankedIssue) => b.count - a.count || a.label.localeCompare(b.label)
  critical.sort(sort)
  medium.sort(sort)
  positive.sort(sort)

  return { critical, medium, positive }
}

function issueFromRanked(rows: AdminFeedbackRow[], item: RankedIssue): ActionCenterIssue {
  const { priorityScore, priorityLabel } = computeIssuePriority(rows, item.label, item.count)
  return {
    id: slugify(item.label),
    tier: item.tier,
    emoji: TIER_EMOJI[item.tier],
    label: item.label,
    mentions: item.count,
    priorityScore,
    priorityLabel,
    message: `${item.label} — ${item.count} mention${item.count === 1 ? "" : "s"} · ${priorityLabel} priority`,
  }
}

export function buildAdminActionCenter(rows: AdminFeedbackRow[]): ActionCenterIssue[] {
  const { critical, medium } = buildRankedFeedbackIssues(rows)
  const completed = rows.filter((r) => r.feedback_stage === "completed" || !r.feedback_stage)

  const issues: ActionCenterIssue[] = []
  for (const item of [...critical, ...medium]) {
    if (item.count < 1) continue
    issues.push(issueFromRanked(completed, item))
  }

  issues.sort((a, b) => b.priorityScore - a.priorityScore || b.mentions - a.mentions)
  return issues.slice(0, 8)
}
