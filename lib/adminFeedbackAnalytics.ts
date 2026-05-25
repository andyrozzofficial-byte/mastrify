import type { BetaFeedbackRecord } from "./betaFeedbackAnalytics"
import { buildBetaFeedbackDashboard } from "./betaFeedbackAnalytics"
import type { AdminFeedbackRow } from "./adminTypes"

export type AdminFeedbackAnalytics = {
  summary: {
    totalSubmissions: number
    avgRecommendScore: number | null
    avgUseAgainScore: number | null
    recommendHighPercent: number | null
    promoterPercent: number | null
  }
  charts: {
    genreDistribution: { label: string; count: number }[]
    ratingDistribution: { label: string; count: number }[]
    recommendRatingDistribution: { label: string; count: number }[]
    dailyTrend: { date: string; count: number; avgRecommend: number }[]
    weeklyTrend: { week: string; count: number; avgRecommend: number }[]
    commonIssues: { label: string; count: number }[]
    topPositives: { label: string; count: number }[]
    requestedFeatureSnippets: { label: string; count: number }[]
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function countByLabel(items: string[]): { label: string; count: number }[] {
  const map = new Map<string, number>()
  for (const raw of items) {
    const label = raw.trim() || "Unknown"
    map.set(label, (map.get(label) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

function weekKey(iso: string): string {
  const d = new Date(iso)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setUTCDate(diff)
  return monday.toISOString().slice(0, 10)
}

function toBetaRecords(rows: AdminFeedbackRow[]): BetaFeedbackRecord[] {
  return rows.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    session_id: r.session_id,
    track_name: r.track_name,
    mastering_style: r.mastering_style,
    stereo_width: r.stereo_width,
    low_end: r.low_end,
    responses: r.survey,
  }))
}

export function buildAdminFeedbackAnalytics(rows: AdminFeedbackRow[]): AdminFeedbackAnalytics {
  const base = buildBetaFeedbackDashboard(toBetaRecords(rows))
  const recommendScores = rows.map((r) => r.recommend_score).filter(Number.isFinite)
  const useAgainScores = rows.map((r) => r.use_again_score).filter(Number.isFinite)

  const ratingBuckets = new Map<string, number>()
  for (let i = 0; i <= 10; i++) ratingBuckets.set(String(i), 0)
  for (const s of useAgainScores) {
    const k = String(Math.min(10, Math.max(0, Math.round(s))))
    ratingBuckets.set(k, (ratingBuckets.get(k) ?? 0) + 1)
  }

  const recommendBuckets = new Map<string, number>()
  for (let i = 0; i <= 10; i++) recommendBuckets.set(String(i), 0)
  for (const s of recommendScores) {
    const k = String(Math.min(10, Math.max(0, Math.round(s))))
    recommendBuckets.set(k, (recommendBuckets.get(k) ?? 0) + 1)
  }

  const positives: string[] = []
  const snippets: string[] = []
  for (const row of rows) {
    for (const item of row.survey.stoodOut ?? []) positives.push(item)
    for (const t of [row.survey.missing, row.survey.oneChange, row.survey.worthPaying, row.survey.additional]) {
      const trimmed = t?.trim()
      if (trimmed && trimmed.length >= 8) snippets.push(trimmed.slice(0, 120))
    }
  }

  const byDay = new Map<string, { scores: number[]; count: number }>()
  for (const row of rows) {
    const day = row.created_at.slice(0, 10)
    const entry = byDay.get(day) ?? { scores: [], count: 0 }
    entry.scores.push(row.recommend_score)
    entry.count += 1
    byDay.set(day, entry)
  }

  const dailyTrend = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-21)
    .map(([date, { scores, count }]) => ({
      date,
      count,
      avgRecommend: round1(mean(scores) ?? 0),
    }))

  const byWeek = new Map<string, { scores: number[]; count: number }>()
  for (const row of rows) {
    const week = weekKey(row.created_at)
    const entry = byWeek.get(week) ?? { scores: [], count: 0 }
    entry.scores.push(row.recommend_score)
    entry.count += 1
    byWeek.set(week, entry)
  }

  const weeklyTrend = [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, { scores, count }]) => ({
      week,
      count,
      avgRecommend: round1(mean(scores) ?? 0),
    }))

  const highRecommend = rows.filter((r) => r.recommend_score >= 7).length
  const promoters = rows.filter((r) => r.recommend_score >= 9).length

  return {
    summary: {
      totalSubmissions: rows.length,
      avgRecommendScore: base.summary.avgRecommendScore,
      avgUseAgainScore: base.summary.avgUseAgainScore,
      recommendHighPercent:
        rows.length > 0 ? round1((highRecommend / rows.length) * 100) : null,
      promoterPercent: rows.length > 0 ? round1((promoters / rows.length) * 100) : null,
    },
    charts: {
      genreDistribution: base.charts.genreDistribution,
      ratingDistribution: [...ratingBuckets.entries()].map(([label, count]) => ({ label, count })),
      recommendRatingDistribution: [...recommendBuckets.entries()].map(([label, count]) => ({
        label,
        count,
      })),
      dailyTrend,
      weeklyTrend,
      commonIssues: base.charts.commonIssues,
      topPositives: countByLabel(positives).slice(0, 10),
      requestedFeatureSnippets: countByLabel(snippets).slice(0, 8),
    },
  }
}
