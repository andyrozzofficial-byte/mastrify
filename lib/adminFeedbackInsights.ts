import type { AdminFeedbackRow } from "./adminTypes"

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

/** Rule-based insight bullets for the admin feedback dashboard (no external AI). */
export function buildAdminFeedbackInsights(rows: AdminFeedbackRow[]): string[] {
  if (rows.length === 0) return ["No survey submissions yet — insights will appear after the first response."]

  const insights: string[] = []
  const stoodOut: string[] = []
  const issues: string[] = []

  for (const row of rows) {
    for (const item of row.survey.stoodOut ?? []) stoodOut.push(item)
    for (const item of row.survey.soundedOff ?? []) issues.push(item)
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

  const punchClarity = ["Loudness / punch", "Clarity", "Stereo width"].filter((l) => (stoodMap.get(l) ?? 0) > 0)
  if (punchClarity.length >= 2) {
    insights.push("Users frequently mention punch, clarity, and stereo width as strengths.")
  }

  if (topIssue && topIssue.count >= 2) {
    insights.push(
      `${topIssue.count} user${topIssue.count === 1 ? "" : "s"} reported “${topIssue.label}”.`,
    )
  }

  const harsh = issueMap.get("Harsh highs") ?? 0
  if (harsh > 0) {
    insights.push(`${harsh} user${harsh === 1 ? "" : "s"} reported harsh highs.`)
  }

  const byGenre = new Map<string, number[]>()
  for (const row of rows) {
    const g = row.genre || "Unknown"
    const scores = byGenre.get(g) ?? []
    scores.push(row.recommend_score)
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
  if (bestGenre) {
    insights.push(`${bestGenre.genre} tracks average ${bestGenre.avg}/10 recommendation (${bestGenre.count} submissions).`)
  }

  const promoters = rows.filter((r) => r.recommend_score >= 9).length
  const pct = round1((promoters / rows.length) * 100)
  if (promoters > 0) {
    insights.push(`${pct}% of respondents scored 9–10 on “would recommend Mastrify”.`)
  }

  const lowScores = rows.filter((r) => r.recommend_score <= 5).length
  if (lowScores > 0) {
    insights.push(`${lowScores} submission${lowScores === 1 ? "" : "s"} scored 5 or below on recommendation — worth a closer read.`)
  }

  const missingTexts = rows
    .map((r) => r.survey.missing?.trim())
    .filter((t): t is string => Boolean(t))
  if (missingTexts.length >= 3) {
    insights.push(`${missingTexts.length} users left written notes on missing features.`)
  }

  return insights.slice(0, 8)
}
