import type { BetaFeedbackRecord } from "./betaFeedbackAnalytics"
import { buildBetaFeedbackDashboard } from "./betaFeedbackAnalytics"
import {
  getBetaSurveyFieldsByAnalyticsRole,
  getBetaSurveyField,
} from "./betaFeedbackSurveySchema"
import { getNumericSurveyScore, getSurveyValue } from "./betaFeedbackSurveyDisplay"
import type { AdminFeedbackRow } from "./adminTypes"
import { ANALYSIS_ACCURACY_OPTIONS, PREVIEW_COMPARISON_OPTIONS } from "./betaFeedbackPulseTypes"

export type AdminFeedbackStageAnalytics = {
  byStage: { stage: string; count: number }[]
  analysisAccuracy: { label: string; count: number }[]
  previewComparison: { label: string; count: number }[]
  analysisAccuracyScore: number | null
  previewSatisfactionScore: number | null
  dropOff: { step: string; count: number }[]
}

export type AdminFeedbackAnalytics = {
  summary: {
    totalSubmissions: number
    avgRecommendScore: number | null
    avgUseAgainScore: number | null
    recommendHighPercent: number | null
    promoterPercent: number | null
  }
  stages: AdminFeedbackStageAnalytics
  chartLabels: {
    genre: string
    useAgainScores: string
    recommendScores: string
    topPositives: string
    commonIssues: string
    textSnippets: string
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

function scoreDistribution(
  rows: AdminFeedbackRow[],
  key: string,
  min: number,
  max: number,
): { label: string; count: number }[] {
  const buckets = new Map<string, number>()
  for (let i = min; i <= max; i++) buckets.set(String(i), 0)
  for (const row of rows) {
    const s = getNumericSurveyScore(row.survey, key)
    if (s == null) continue
    const k = String(Math.min(max, Math.max(min, Math.round(s))))
    buckets.set(k, (buckets.get(k) ?? 0) + 1)
  }
  return [...buckets.entries()].map(([label, count]) => ({ label, count }))
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

  const recommendField = getBetaSurveyFieldsByAnalyticsRole("recommend_score")[0]
  const useAgainField = getBetaSurveyFieldsByAnalyticsRole("use_again_score")[0]
  const genreField = getBetaSurveyFieldsByAnalyticsRole("genre_distribution")[0]
  const stoodField = getBetaSurveyFieldsByAnalyticsRole("stood_out_tags")[0]
  const issuesField = getBetaSurveyFieldsByAnalyticsRole("sounded_off_tags")[0]
  const textFields = getBetaSurveyFieldsByAnalyticsRole("text_snippets")

  const recommendKey = recommendField?.key ?? "recommendScore"
  const useAgainKey = useAgainField?.key ?? "useAgainScore"

  const recommendScores = rows
    .map((r) => getNumericSurveyScore(r.survey, recommendKey))
    .filter((n): n is number => n != null)
  const useAgainScores = rows
    .map((r) => getNumericSurveyScore(r.survey, useAgainKey))
    .filter((n): n is number => n != null)

  const positives: string[] = []
  const snippets: string[] = []
  const stoodKey = stoodField?.key ?? "stoodOut"
  const issuesKey = issuesField?.key ?? "soundedOff"

  for (const row of rows) {
    const stood = getSurveyValue(row.survey, stoodKey)
    if (Array.isArray(stood)) positives.push(...stood.map(String))
    for (const field of textFields) {
      const t = getSurveyValue(row.survey, field.key)
      if (typeof t === "string" && t.trim().length >= 8) snippets.push(t.trim().slice(0, 120))
    }
  }

  const byDay = new Map<string, { scores: number[]; count: number }>()
  for (const row of rows) {
    const day = (row.created_at ?? "").slice(0, 10)
    const score = getNumericSurveyScore(row.survey, recommendKey)
    if (score == null) continue
    const entry = byDay.get(day) ?? { scores: [], count: 0 }
    entry.scores.push(score)
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
    const score = getNumericSurveyScore(row.survey, recommendKey)
    if (score == null) continue
    const week = weekKey(row.created_at)
    const entry = byWeek.get(week) ?? { scores: [], count: 0 }
    entry.scores.push(score)
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

  const highRecommend = recommendScores.filter((s) => s >= 7).length
  const promoters = recommendScores.filter((s) => s >= 9).length

  const useAgainDef = getBetaSurveyField(useAgainKey)
  const recommendDef = getBetaSurveyField(recommendKey)

  const stageCounts = { analysis: 0, preview: 0, completed: 0 }
  const analysisAccMap = new Map<string, number>()
  const previewCompMap = new Map<string, number>()
  let analysisPositive = 0
  let analysisTotal = 0
  let previewPositive = 0
  let previewTotal = 0

  for (const row of rows) {
    stageCounts[row.feedback_stage] = (stageCounts[row.feedback_stage] ?? 0) + 1
    if (row.feedback_stage === "analysis") {
      const acc = String(getSurveyValue(row.survey, "analysisAccuracy") ?? "")
      if (acc) {
        analysisAccMap.set(acc, (analysisAccMap.get(acc) ?? 0) + 1)
        analysisTotal += 1
        if (acc === "Yes") analysisPositive += 1
      }
    }
    if (row.feedback_stage === "preview") {
      const cmp = String(getSurveyValue(row.survey, "previewComparison") ?? "")
      if (cmp) {
        previewCompMap.set(cmp, (previewCompMap.get(cmp) ?? 0) + 1)
        previewTotal += 1
        if (cmp === "Better") previewPositive += 1
      }
    }
  }

  const stages: AdminFeedbackStageAnalytics = {
    byStage: [
      { stage: "analysis", count: stageCounts.analysis },
      { stage: "preview", count: stageCounts.preview },
      { stage: "completed", count: stageCounts.completed },
    ],
    analysisAccuracy: ANALYSIS_ACCURACY_OPTIONS.map((label) => ({
      label,
      count: analysisAccMap.get(label) ?? 0,
    })).filter((x) => x.count > 0),
    previewComparison: PREVIEW_COMPARISON_OPTIONS.map((label) => ({
      label,
      count: previewCompMap.get(label) ?? 0,
    })).filter((x) => x.count > 0),
    analysisAccuracyScore:
      analysisTotal > 0 ? round1((analysisPositive / analysisTotal) * 100) : null,
    previewSatisfactionScore:
      previewTotal > 0 ? round1((previewPositive / previewTotal) * 100) : null,
    dropOff: [
      { step: "Analysis pulse", count: stageCounts.analysis },
      { step: "Preview pulse", count: stageCounts.preview },
      { step: "Full survey", count: stageCounts.completed },
    ],
  }

  return {
    stages,
    summary: {
      totalSubmissions: rows.length,
      avgRecommendScore: mean(recommendScores) != null ? round1(mean(recommendScores)!) : null,
      avgUseAgainScore: mean(useAgainScores) != null ? round1(mean(useAgainScores)!) : null,
      recommendHighPercent:
        recommendScores.length > 0 ? round1((highRecommend / recommendScores.length) * 100) : null,
      promoterPercent:
        recommendScores.length > 0 ? round1((promoters / recommendScores.length) * 100) : null,
    },
    chartLabels: {
      genre: genreField?.label ?? "Genre",
      useAgainScores: useAgainDef?.label ?? "Use again",
      recommendScores: recommendDef?.label ?? "Recommend",
      topPositives: stoodField?.label ?? "What stood out",
      commonIssues: issuesField?.label ?? "What sounded off",
      textSnippets: "Written survey answers",
    },
    charts: {
      genreDistribution: base.charts.genreDistribution,
      ratingDistribution: scoreDistribution(
        rows,
        useAgainKey,
        useAgainDef?.rangeMin ?? 0,
        useAgainDef?.rangeMax ?? 10,
      ),
      recommendRatingDistribution: scoreDistribution(
        rows,
        recommendKey,
        recommendDef?.rangeMin ?? 0,
        recommendDef?.rangeMax ?? 10,
      ),
      dailyTrend,
      weeklyTrend,
      commonIssues: base.charts.commonIssues,
      topPositives: countByLabel(positives).slice(0, 10),
      requestedFeatureSnippets: countByLabel(snippets).slice(0, 8),
    },
  }
}
