import type { AdminFeedbackRow } from "./adminTypes"
import {
  BETA_FEEDBACK_SOUNDED_OFF_OPTIONS,
  BETA_FEEDBACK_STOOD_OUT_OPTIONS,
} from "./betaFeedbackTypes"
import { getNumericSurveyScore, getSurveyValue } from "./betaFeedbackSurveyDisplay"
import { getBetaSurveyFieldsByAnalyticsRole } from "./betaFeedbackSurveySchema"

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function countLabels(items: string[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const raw of items) {
    const label = raw.trim()
    if (!label || label === "No, it sounded good") continue
    map.set(label, (map.get(label) ?? 0) + 1)
  }
  return map
}

function topEntry(map: Map<string, number>): { label: string; count: number } | null {
  let best: { label: string; count: number } | null = null
  for (const [label, count] of map) {
    if (!best || count > best.count) best = { label, count }
  }
  return best
}

/** Rule-based insight bullets derived from beta survey schema fields. */
export function buildAdminFeedbackInsights(rows: AdminFeedbackRow[]): string[] {
  if (rows.length === 0) return ["No survey submissions yet — insights will appear after the first response."]

  const recommendField = getBetaSurveyFieldsByAnalyticsRole("recommend_score")[0]
  const genreField = getBetaSurveyFieldsByAnalyticsRole("genre_distribution")[0]
  const stoodField = getBetaSurveyFieldsByAnalyticsRole("stood_out_tags")[0]
  const issuesField = getBetaSurveyFieldsByAnalyticsRole("sounded_off_tags")[0]
  const missingField = getBetaSurveyFieldsByAnalyticsRole("text_snippets").find((f) => f.key === "missing")

  const recommendKey = recommendField?.key ?? "recommendScore"
  const genreKey = genreField?.key ?? "genre"
  const stoodKey = stoodField?.key ?? "stoodOut"
  const issuesKey = issuesField?.key ?? "soundedOff"

  const insights: string[] = []
  const stoodOut: string[] = []
  const issues: string[] = []

  for (const row of rows) {
    const stood = getSurveyValue(row.survey, stoodKey)
    const off = getSurveyValue(row.survey, issuesKey)
    if (Array.isArray(stood)) stoodOut.push(...stood.map(String))
    if (Array.isArray(off)) issues.push(...off.map(String))
  }

  const stoodMap = countLabels(stoodOut)
  const issueMap = countLabels(issues)
  const topPositive = topEntry(stoodMap)
  const topIssue = topEntry(issueMap)

  if (topPositive && topPositive.count >= 2) {
    insights.push(
      `Most users highlight “${topPositive.label}” (${topPositive.count} mention${topPositive.count === 1 ? "" : "s"}).`,
    )
  }

  const punchClarity = BETA_FEEDBACK_STOOD_OUT_OPTIONS.filter(
    (l) => (stoodMap.get(l) ?? 0) > 0 && l !== "Other",
  ).slice(0, 3)
  if (punchClarity.length >= 2) {
    insights.push(`Users frequently mention ${punchClarity.map((l) => l.toLowerCase()).join(", ")}.`)
  }

  if (topIssue && topIssue.count >= 2) {
    insights.push(
      `${topIssue.count} user${topIssue.count === 1 ? "" : "s"} reported “${topIssue.label}”.`,
    )
  }

  const harshLabel = BETA_FEEDBACK_SOUNDED_OFF_OPTIONS.find((o) => o === "Harsh highs") ?? "Harsh highs"
  const harsh = issueMap.get(harshLabel) ?? 0
  if (harsh > 0) {
    insights.push(`${harsh} user${harsh === 1 ? "" : "s"} reported harsh highs.`)
  }

  const byGenre = new Map<string, number[]>()
  for (const row of rows) {
    const g = String(getSurveyValue(row.survey, genreKey) ?? "").trim() || "Unknown"
    const score = getNumericSurveyScore(row.survey, recommendKey)
    if (score == null) continue
    const scores = byGenre.get(g) ?? []
    scores.push(score)
    byGenre.set(g, scores)
  }

  let bestGenre: { genre: string; avg: number; count: number } | null = null
  for (const [genre, scores] of byGenre) {
    if (genre === "Unknown" || scores.length < 2) continue
    const avg = mean(scores)
    if (avg == null) continue
    if (!bestGenre || avg > bestGenre.avg) {
      bestGenre = { genre, avg: round1(avg), count: scores.length }
    }
  }
  if (bestGenre && recommendField) {
    const q = recommendField.label.replace(/^\d+\.\s*/, "")
    insights.push(`${bestGenre.genre} tracks average ${bestGenre.avg}/10 on “${q}” (${bestGenre.count} submissions).`)
  }

  const promoters = rows.filter((r) => (getNumericSurveyScore(r.survey, recommendKey) ?? -1) >= 9).length
  const pct = round1((promoters / rows.length) * 100)
  if (promoters > 0 && recommendField) {
    insights.push(
      `${pct}% scored 9–10 on “${recommendField.label.replace(/^\d+\.\s*/, "")}”.`,
    )
  }

  const lowScores = rows.filter((r) => (getNumericSurveyScore(r.survey, recommendKey) ?? 99) <= 5).length
  if (lowScores > 0 && recommendField) {
    insights.push(
      `${lowScores} submission${lowScores === 1 ? "" : "s"} scored ≤5 on “${recommendField.label.replace(/^\d+\.\s*/, "")}”.`,
    )
  }

  if (missingField) {
    const missingTexts = rows
      .map((r) => getSurveyValue(r.survey, missingField.key))
      .filter((t): t is string => typeof t === "string" && Boolean(t.trim()))
    if (missingTexts.length >= 3) {
      insights.push(`${missingTexts.length} users answered “${missingField.label.replace(/^\d+\.\s*/, "")}”.`)
    }
  }

  return insights.slice(0, 8)
}
