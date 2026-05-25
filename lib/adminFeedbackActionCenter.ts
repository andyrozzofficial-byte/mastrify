import type { AdminFeedbackRow } from "./adminTypes"
import { BETA_FEEDBACK_SOUNDED_OFF_OPTIONS, BETA_FEEDBACK_STOOD_OUT_OPTIONS } from "./betaFeedbackTypes"
import { getSurveyValue } from "./betaFeedbackSurveyDisplay"

export type IssueTier = "critical" | "medium" | "positive"

export type RankedIssue = {
  label: string
  count: number
  tier: IssueTier
}

export type ActionCenterItem = {
  tier: IssueTier
  emoji: string
  message: string
}

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

const POSITIVE_STOOD_OUT = new Set([...BETA_FEEDBACK_STOOD_OUT_OPTIONS].filter((l) => l !== "Other"))

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

  // Preview-stage stood out (pulse)
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

export function buildAdminActionCenter(rows: AdminFeedbackRow[]): ActionCenterItem[] {
  const { critical, medium, positive } = buildRankedFeedbackIssues(rows)
  const items: ActionCenterItem[] = []

  const topCritical = critical[0]
  if (topCritical && topCritical.count >= 2) {
    items.push({
      tier: "critical",
      emoji: "🔴",
      message: `${topCritical.label} complaints increasing (${topCritical.count} mentions)`,
    })
  }

  const stereo = medium.find((m) => /stereo|width/i.test(m.label))
  const widthPulse = rows.filter((r) => {
    const stood = getSurveyValue(r.survey, "previewStoodOut")
    return Array.isArray(stood) && stood.some((s) => /stereo/i.test(String(s)))
  }).length
  if (stereo && stereo.count >= 2) {
    items.push({
      tier: "medium",
      emoji: "🟡",
      message: `Users mention ${stereo.label.toLowerCase()} (${stereo.count} in full survey)`,
    })
  } else if (widthPulse >= 2) {
    items.push({
      tier: "medium",
      emoji: "🟡",
      message: `Users request stereo width improvements (${widthPulse} in preview pulse)`,
    })
  } else {
    const topMedium = medium[0]
    if (topMedium && topMedium.count >= 2) {
      items.push({
        tier: "medium",
        emoji: "🟡",
        message: `${topMedium.label} mentioned by ${topMedium.count} users`,
      })
    }
  }

  const punch = positive.find((p) => p.label === "Loudness / punch")
  const vibe = positive.find((p) => p.label === "Preserved the vibe of the mix")
  if (punch && vibe) {
    items.push({
      tier: "positive",
      emoji: "🟢",
      message: `Users love punch and preserved vibe (${punch.count} + ${vibe.count} mentions)`,
    })
  } else {
    const topPos = positive[0]
    if (topPos && topPos.count >= 2) {
      items.push({
        tier: "positive",
        emoji: "🟢",
        message: `Users highlight “${topPos.label}” (${topPos.count} mentions)`,
      })
    }
  }

  return items.slice(0, 5)
}
