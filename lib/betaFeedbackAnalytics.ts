import type { BetaFeedbackPayload } from "./betaFeedbackTypes"
import {
  BETA_FEEDBACK_RELEASE_READY_OPTIONS,
  BETA_FEEDBACK_SPEED_OPTIONS,
} from "./betaFeedbackTypes"
import { getBetaSurveyFieldsByAnalyticsRole } from "./betaFeedbackSurveySchema"

export type BetaFeedbackRecord = {
  id: string
  created_at: string
  session_id: string | null
  track_name: string | null
  mastering_style: string | null
  stereo_width: number | null
  low_end: number | null
  responses: BetaFeedbackPayload
}

export type BetaFeedbackDashboardData = {
  summary: {
    totalSubmissions: number
    avgRecommendScore: number | null
    avgUseAgainScore: number | null
    releaseReadyPercent: number | null
    totalGenres: number
    totalMasteringStyles: number
  }
  charts: {
    recommendOverTime: { date: string; avgRecommend: number; count: number }[]
    genreDistribution: { label: string; count: number }[]
    masteringStyleDistribution: { label: string; count: number }[]
    releaseReadyBreakdown: { label: string; count: number }[]
    commonIssues: { label: string; count: number }[]
    requestedFeatures: { label: string; count: number }[]
  }
  analytics: {
    topRatedMasteringStyles: { style: string; avgRecommend: number; count: number }[]
    avgScoreByGenre: { genre: string; avgRecommend: number; count: number }[]
    avgScoreByStereoWidth: { bucket: string; avgRecommend: number; count: number }[]
    avgScoreByLowEnd: { bucket: string; avgRecommend: number; count: number }[]
    processingSpeedSatisfaction: { label: string; count: number }[]
  }
  rows: BetaFeedbackTableRow[]
}

export type BetaFeedbackTableRow = {
  id: string
  date: string
  trackName: string | null
  genre: string
  masteringStyle: string
  recommendScore: number
  useAgainScore: number
  releaseReady: string
  sessionId: string
}

const RELEASE_READY_POSITIVE = new Set(["Yes, absolutely", "Almost"])

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function payloadOf(r: BetaFeedbackRecord): BetaFeedbackPayload {
  return r.responses
}

function styleOf(r: BetaFeedbackRecord): string {
  const s = r.mastering_style?.trim() || payloadOf(r).masteringStyle?.trim()
  return s || "Unknown"
}

function genreOf(r: BetaFeedbackRecord): string {
  return payloadOf(r).genre?.trim() || "Unknown"
}

function stereoBucket(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "Unknown"
  if (v <= 33) return "Narrow (0–33)"
  if (v <= 66) return "Balanced (34–66)"
  return "Wide (67–100)"
}

function lowEndBucket(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "Unknown"
  if (v <= 33) return "Light (0–33)"
  if (v <= 66) return "Moderate (34–66)"
  return "Heavy (67–100)"
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

function countByKey<T>(
  records: T[],
  keyFn: (r: T) => string,
  scoreFn: (r: T) => number,
): { label: string; avgRecommend: number; count: number }[] {
  const groups = new Map<string, number[]>()
  for (const r of records) {
    const k = keyFn(r)
    const scores = groups.get(k) ?? []
    scores.push(scoreFn(r))
    groups.set(k, scores)
  }
  return [...groups.entries()]
    .map(([label, scores]) => ({
      label,
      avgRecommend: round1(mean(scores) ?? 0),
      count: scores.length,
    }))
    .sort((a, b) => b.avgRecommend - a.avgRecommend || b.count - a.count)
}

export function buildBetaFeedbackDashboard(records: BetaFeedbackRecord[]): BetaFeedbackDashboardData {
  const recommendScores = records.map((r) => payloadOf(r).recommendScore).filter(Number.isFinite)
  const useAgainScores = records.map((r) => payloadOf(r).useAgainScore).filter(Number.isFinite)
  const releasePositive = records.filter((r) =>
    RELEASE_READY_POSITIVE.has(payloadOf(r).releaseReady),
  ).length

  const genres = new Set(records.map(genreOf).filter((g) => g !== "Unknown"))
  const styles = new Set(records.map(styleOf).filter((s) => s !== "Unknown"))

  const byDay = new Map<string, number[]>()
  for (const r of records) {
    const day = r.created_at.slice(0, 10)
    const scores = byDay.get(day) ?? []
    scores.push(payloadOf(r).recommendScore)
    byDay.set(day, scores)
  }
  const recommendOverTime = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, scores]) => ({
      date,
      avgRecommend: round1(mean(scores) ?? 0),
      count: scores.length,
    }))

  const soundedField = getBetaSurveyFieldsByAnalyticsRole("sounded_off_tags")[0]
  const soundedKey = (soundedField?.key ?? "soundedOff") as keyof BetaFeedbackPayload
  const textFields = getBetaSurveyFieldsByAnalyticsRole("text_snippets")

  const issues: string[] = []
  for (const r of records) {
    const off = payloadOf(r)[soundedKey]
    if (!Array.isArray(off)) continue
    for (const item of off) {
      if (item !== "No, it sounded good") issues.push(item)
    }
  }

  const featureTexts: string[] = []
  for (const r of records) {
    const p = payloadOf(r)
    for (const field of textFields) {
      const t = p[field.key as keyof BetaFeedbackPayload]
      if (typeof t === "string" && t.trim()) featureTexts.push(t.trim())
    }
  }

  const releaseReadyBreakdown = BETA_FEEDBACK_RELEASE_READY_OPTIONS.map((label) => ({
    label,
    count: records.filter((r) => payloadOf(r).releaseReady === label).length,
  })).filter((x) => x.count > 0)

  const speedOrder = [...BETA_FEEDBACK_SPEED_OPTIONS]
  const speedCounts = countByLabel(records.map((r) => payloadOf(r).speedPerception))
  const processingSpeedSatisfaction = speedOrder
    .map((label) => ({
      label,
      count: speedCounts.find((x) => x.label === label)?.count ?? 0,
    }))
    .filter((x) => x.count > 0)

  const rows: BetaFeedbackTableRow[] = records.map((r) => {
    const p = payloadOf(r)
    return {
      id: r.id,
      date: r.created_at,
      trackName: r.track_name?.trim() || p.trackName?.trim() || p.trackTitle?.trim() || null,
      genre: genreOf(r),
      masteringStyle: styleOf(r),
      recommendScore: p.recommendScore,
      useAgainScore: p.useAgainScore,
      releaseReady: p.releaseReady || "—",
      sessionId: r.session_id?.trim() || p.sessionId || "—",
    }
  })

  return {
    summary: {
      totalSubmissions: records.length,
      avgRecommendScore: mean(recommendScores) != null ? round1(mean(recommendScores)!) : null,
      avgUseAgainScore: mean(useAgainScores) != null ? round1(mean(useAgainScores)!) : null,
      releaseReadyPercent:
        records.length > 0 ? round1((releasePositive / records.length) * 100) : null,
      totalGenres: genres.size,
      totalMasteringStyles: styles.size,
    },
    charts: {
      recommendOverTime,
      genreDistribution: countByLabel(records.map(genreOf)),
      masteringStyleDistribution: countByLabel(records.map(styleOf)),
      releaseReadyBreakdown,
      commonIssues: countByLabel(issues).slice(0, 12),
      requestedFeatures: countByLabel(featureTexts).slice(0, 12),
    },
    analytics: {
      topRatedMasteringStyles: countByKey(
        records,
        styleOf,
        (r) => payloadOf(r).recommendScore,
      )
        .map(({ label, avgRecommend, count }) => ({ style: label, avgRecommend, count }))
        .slice(0, 12),
      avgScoreByGenre: countByKey(records, genreOf, (r) => payloadOf(r).recommendScore).map(
        ({ label, avgRecommend, count }) => ({ genre: label, avgRecommend, count }),
      ),
      avgScoreByStereoWidth: countByKey(
        records,
        (r) => stereoBucket(r.stereo_width ?? payloadOf(r).stereoWidth),
        (r) => payloadOf(r).recommendScore,
      ).map(({ label, avgRecommend, count }) => ({ bucket: label, avgRecommend, count })),
      avgScoreByLowEnd: countByKey(
        records,
        (r) => lowEndBucket(r.low_end ?? payloadOf(r).lowEnd),
        (r) => payloadOf(r).recommendScore,
      ).map(({ label, avgRecommend, count }) => ({ bucket: label, avgRecommend, count })),
      processingSpeedSatisfaction,
    },
    rows,
  }
}

export function filterAndSortTableRows(
  rows: BetaFeedbackTableRow[],
  opts: {
    search: string
    genre: string
    masteringStyle: string
    releaseReady: string
    sort: "newest" | "highest_score"
  },
): BetaFeedbackTableRow[] {
  const q = opts.search.trim().toLowerCase()
  let out = rows.filter((row) => {
    if (opts.genre && row.genre !== opts.genre) return false
    if (opts.masteringStyle && row.masteringStyle !== opts.masteringStyle) return false
    if (opts.releaseReady && row.releaseReady !== opts.releaseReady) return false
    if (!q) return true
    const hay = [
      row.trackName ?? "",
      row.genre,
      row.masteringStyle,
      row.sessionId,
      row.releaseReady,
    ]
      .join(" ")
      .toLowerCase()
    return hay.includes(q)
  })

  if (opts.sort === "highest_score") {
    out = [...out].sort((a, b) => b.recommendScore - a.recommendScore || b.date.localeCompare(a.date))
  } else {
    out = [...out].sort((a, b) => b.date.localeCompare(a.date))
  }
  return out
}
