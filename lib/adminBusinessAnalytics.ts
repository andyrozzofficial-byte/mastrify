import type { SupabaseClient } from "@supabase/supabase-js"
import {
  bucketKey,
  parseAnalyticsPeriod,
  resolvePeriodRange,
  resolveRevenueSummaryRanges,
  resolveTimeSeriesGranularity,
  type AnalyticsPeriod,
  type PeriodRange,
  type TimeSeriesGranularity,
} from "./adminAnalyticsPeriods"
import {
  MASTERED_EXPORTS_TABLE,
  MASTER_JOBS_TABLE,
  PIPELINE_EVENTS_TABLE,
  SITE_PAGE_VIEWS_TABLE,
} from "./adminData"
import type {
  AdminBusinessAnalytics,
  MasteringAnalytics,
  PeriodMetrics,
  PeriodTraffic,
  RevenueSummary,
} from "./adminTypes"
import { BETA_MASTER_COMPLETIONS_TABLE } from "./betaMasterTracking"
import { BETA_FEEDBACK_TABLE } from "./betaFeedbackDb"
import {
  exportRevenueUsd,
  isPaidExport,
  loadExportClassificationContext,
  type ExportClassificationContext,
  type ExportRow,
} from "./exportStats"
import { createSupabaseServerClient } from "./supabaseServer"

const PAGE_SIZE = 1000

function pctRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  if (numerator > denominator) return null
  return Math.round((numerator / denominator) * 1000) / 10
}

const FUNNEL_INCOMPARABLE_NOTE =
  "Upload and master counts come from different tracking sources (pipeline upload events vs. completion records). These steps do not represent the same session population."

type CompletionRow = Awaited<ReturnType<typeof paginateCompletions>>[number]

function assessUploadMasterFunnel(input: {
  uploadSessions: string[]
  completions: CompletionRow[]
}): { comparable: boolean; note: string | null } {
  const uploadSet = new Set(input.uploadSessions.map((sid) => sid.trim()).filter(Boolean))
  const masters = input.completions.length
  const uploads = input.uploadSessions.length

  if (masters === 0 && uploads === 0) {
    return { comparable: true, note: null }
  }

  let mastersWithoutUpload = 0
  for (const row of input.completions) {
    const sid = row.session_id?.trim()
    if (!sid || !uploadSet.has(sid)) mastersWithoutUpload += 1
  }

  const comparable =
    mastersWithoutUpload === 0 && masters <= uploads && (uploads > 0 || masters === 0)

  return {
    comparable,
    note: comparable ? null : FUNNEL_INCOMPARABLE_NOTE,
  }
}

function masterToPaidRate(paidExports: number, masters: number): number | null {
  if (masters <= 0) return null
  if (paidExports > masters) return null
  return pctRate(paidExports, masters)
}

function roundUsd(n: number): number {
  return Math.round(n * 100) / 100
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function topCounts(rows: { label: string; count: number }[], limit = 12) {
  const map = new Map<string, number>()
  for (const row of rows) {
    const label = row.label.trim() || "Unknown"
    map.set(label, (map.get(label) ?? 0) + row.count)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }))
}

function isMissingTable(message: string): boolean {
  return /does not exist|42P01/i.test(message)
}

async function paginateRows<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  start: string | null,
  end: string | null,
): Promise<T[]> {
  const rows: T[] = []
  let offset = 0

  while (true) {
    let query = supabase.from(table).select(select).order("created_at", { ascending: true })
    if (start) query = query.gte("created_at", start)
    if (end) query = query.lte("created_at", end)

    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      if (isMissingTable(error.message)) return []
      throw new Error(error.message)
    }

    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return rows
}

async function paginateCompletions(
  supabase: SupabaseClient,
  start: string | null,
  end: string | null,
) {
  const rows: {
    session_id: string
    completed_at: string
    mastering_style: string | null
    processing_time_ms: number | null
    master_lufs: number | null
  }[] = []
  let offset = 0

  while (true) {
    let q = supabase
      .from(BETA_MASTER_COMPLETIONS_TABLE)
      .select("session_id, completed_at, mastering_style, processing_time_ms, master_lufs")
      .order("completed_at", { ascending: true })
    if (start) q = q.gte("completed_at", start)
    if (end) q = q.lte("completed_at", end)

    const { data, error } = await q.range(offset, offset + PAGE_SIZE - 1)
    if (error) {
      if (isMissingTable(error.message)) return []
      throw new Error(error.message)
    }

    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return rows
}

const EXPORT_SELECT =
  "email, created_at, amount_cents, track_title, object_key, stripe_session_id"

async function fetchExportsInRange(
  supabase: SupabaseClient,
  start: string | null,
  end: string | null,
): Promise<ExportRow[]> {
  return paginateRows<ExportRow>(supabase, MASTERED_EXPORTS_TABLE, EXPORT_SELECT, start, end)
}

async function fetchUploadSessionsInRange(
  supabase: SupabaseClient,
  start: string | null,
  end: string | null,
): Promise<string[]> {
  const sessions = new Set<string>()
  let offset = 0

  while (true) {
    let q = supabase
      .from(PIPELINE_EVENTS_TABLE)
      .select("session_id, created_at")
      .eq("event_type", "upload")
      .order("created_at", { ascending: true })
    if (start) q = q.gte("created_at", start)
    if (end) q = q.lte("created_at", end)

    const { data, error } = await q.range(offset, offset + PAGE_SIZE - 1)
    if (error) {
      if (isMissingTable(error.message)) return []
      throw new Error(error.message)
    }

    for (const row of data ?? []) {
      const sid = typeof row.session_id === "string" ? row.session_id.trim() : ""
      if (sid) sessions.add(sid)
    }

    if ((data ?? []).length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return [...sessions]
}

async function countFailedJobsInRange(
  supabase: SupabaseClient,
  start: string | null,
  end: string | null,
): Promise<number> {
  let q = supabase
    .from(MASTER_JOBS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
  if (start) q = q.gte("created_at", start)
  if (end) q = q.lte("created_at", end)

  const { count, error } = await q
  if (error) {
    if (isMissingTable(error.message)) return 0
    throw new Error(error.message)
  }
  return count ?? 0
}

type PageViewRow = {
  created_at: string
  visitor_id: string
  session_id: string
  path: string
  referrer_host: string | null
  device_type: string | null
  country: string | null
}

async function fetchPageViewsInRange(
  supabase: SupabaseClient,
  start: string | null,
  end: string | null,
): Promise<PageViewRow[]> {
  return paginateRows<PageViewRow>(
    supabase,
    SITE_PAGE_VIEWS_TABLE,
    "created_at, visitor_id, session_id, path, referrer_host, device_type, country",
    start,
    end,
  )
}

async function fetchTrackDurationsFromFeedback(
  supabase: SupabaseClient,
  start: string | null,
  end: string | null,
): Promise<number[]> {
  const durations: number[] = []
  let offset = 0

  while (true) {
    let q = supabase
      .from(BETA_FEEDBACK_TABLE)
      .select("track_duration, created_at")
      .not("track_duration", "is", null)
      .order("created_at", { ascending: true })
    if (start) q = q.gte("created_at", start)
    if (end) q = q.lte("created_at", end)

    const { data, error } = await q.range(offset, offset + PAGE_SIZE - 1)
    if (error) {
      if (isMissingTable(error.message)) return []
      throw new Error(error.message)
    }

    for (const row of data ?? []) {
      const n = row.track_duration != null ? Number(row.track_duration) : NaN
      if (Number.isFinite(n) && n > 0) durations.push(n)
    }

    if ((data ?? []).length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return durations
}

function sumRevenue(exports: ExportRow[], ctx: ExportClassificationContext): number {
  return roundUsd(exports.reduce((sum, row) => sum + exportRevenueUsd(row, ctx), 0))
}

function countPaid(exports: ExportRow[], ctx: ExportClassificationContext): number {
  return exports.filter((row) => isPaidExport(row, ctx)).length
}

function buildPeriodMetrics(input: {
  exports: ExportRow[]
  exportCtx: ExportClassificationContext
  completions: CompletionRow[]
  uploadSessions: string[]
  visitors: number
  failedJobs: number
  funnelComparable: boolean
}): PeriodMetrics {
  const revenue = sumRevenue(input.exports, input.exportCtx)
  const masters = input.completions.length
  const uploads = input.uploadSessions.length
  const paidExports = countPaid(input.exports, input.exportCtx)

  return {
    revenue,
    masters,
    uploads,
    visitors: input.visitors,
    paidExports,
    failedJobs: input.failedJobs,
    uploadToMasterRate: input.funnelComparable ? pctRate(masters, uploads) : null,
    masterToPaidRate: masterToPaidRate(paidExports, masters),
  }
}

function buildMasteringAnalytics(input: {
  completions: CompletionRow[]
  failedJobs: number
  paidExports: number
  trackDurations: number[]
}): MasteringAnalytics {
  const procTimes = input.completions
    .map((r) => (r.processing_time_ms != null ? Number(r.processing_time_ms) : NaN))
    .filter((n): n is number => Number.isFinite(n) && n > 0)

  const lufsValues = input.completions
    .map((r) => (r.master_lufs != null ? Number(r.master_lufs) : NaN))
    .filter((n): n is number => Number.isFinite(n))

  const styleCounts = new Map<string, number>()
  for (const row of input.completions) {
    const style = row.mastering_style?.trim()
    if (!style) continue
    styleCounts.set(style, (styleCounts.get(style) ?? 0) + 1)
  }

  const styleDistribution = [...styleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))

  const topStyleEntry = styleDistribution[0]

  const durationAvg = avg(input.trackDurations)

  return {
    completed: input.completions.length,
    failed: input.failedJobs,
    avgProcessingMs: procTimes.length > 0 ? Math.round(procTimes.reduce((a, b) => a + b, 0) / procTimes.length) : null,
    avgLufs: avg(lufsValues),
    avgTrackDurationSec: durationAvg,
    trackDurationSource: durationAvg != null ? "feedback" : null,
    masterToPaidRate: masterToPaidRate(input.paidExports, input.completions.length),
    topStyle: topStyleEntry ? { style: topStyleEntry.label, count: topStyleEntry.count } : null,
    styleDistribution,
  }
}

function buildTrafficMetrics(pageViews: PageViewRow[], granularity: TimeSeriesGranularity): PeriodTraffic {
  const publicViews = pageViews.filter((row) => !row.path.startsWith("/admin"))

  const visitors = new Set(publicViews.map((r) => r.visitor_id)).size
  const sessions = new Set(publicViews.map((r) => r.session_id)).size
  const pageViewsCount = publicViews.length

  const dailyMap = new Map<string, { visitors: Set<string>; sessions: Set<string>; pageViews: number }>()
  for (const row of publicViews) {
    const key = bucketKey(row.created_at, granularity === "hour" ? "hour" : "day")
    const cur = dailyMap.get(key) ?? { visitors: new Set(), sessions: new Set(), pageViews: 0 }
    cur.visitors.add(row.visitor_id)
    cur.sessions.add(row.session_id)
    cur.pageViews += 1
    dailyMap.set(key, cur)
  }

  const dailyTraffic = [...dailyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      visitors: v.visitors.size,
      sessions: v.sessions.size,
      pageViews: v.pageViews,
    }))

  return {
    visitors,
    pageViews: pageViewsCount,
    sessions,
    topPages: topCounts(publicViews.map((r) => ({ label: r.path, count: 1 }))),
    topReferrers: topCounts(
      publicViews.map((r) => ({
        label: r.referrer_host?.trim() || "Direct / none",
        count: 1,
      })),
    ),
    devices: topCounts(
      publicViews.map((r) => ({
        label: r.device_type?.trim() || "desktop",
        count: 1,
      })),
    ),
    countries: topCounts(
      publicViews.filter((r) => r.country?.trim()).map((r) => ({ label: r.country!.trim(), count: 1 })),
    ),
    dailyTraffic,
  }
}

function incrementBucket(map: Map<string, number>, key: string, delta = 1) {
  map.set(key, (map.get(key) ?? 0) + delta)
}

function mapToSeries(map: Map<string, number>, valueKey: keyof { revenue: number; masters: number; uploads: number; visitors: number }) {
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, [valueKey]: value }))
}

function computeSpanDays(input: {
  exports: ExportRow[]
  completions: Awaited<ReturnType<typeof paginateCompletions>>
  uploadEvents: { created_at: string }[]
  pageViews: PageViewRow[]
}): number {
  const timestamps = [
    ...input.exports.map((r) => r.created_at),
    ...input.completions.map((r) => r.completed_at),
    ...input.uploadEvents.map((r) => r.created_at),
    ...input.pageViews.map((r) => r.created_at),
  ].filter(Boolean)

  if (timestamps.length === 0) return 1
  const min = Math.min(...timestamps.map((t) => new Date(t).getTime()))
  const max = Math.max(...timestamps.map((t) => new Date(t).getTime()))
  return Math.max(1, Math.ceil((max - min) / 86400000))
}

function buildTimeSeries(input: {
  period: AnalyticsPeriod
  range: PeriodRange
  exports: ExportRow[]
  exportCtx: ExportClassificationContext
  completions: Awaited<ReturnType<typeof paginateCompletions>>
  uploadSessionsWithTime: { session_id: string; created_at: string }[]
  pageViews: PageViewRow[]
}): AdminBusinessAnalytics["timeSeries"] {
  const timestamps = [
    ...input.exports.map((r) => r.created_at),
    ...input.completions.map((r) => r.completed_at),
    ...input.uploadSessionsWithTime.map((r) => r.created_at),
    ...input.pageViews.map((r) => r.created_at),
  ].filter(Boolean)

  let spanDays = 30
  if (timestamps.length > 0) {
    const min = Math.min(...timestamps.map((t) => new Date(t).getTime()))
    const max = Math.max(...timestamps.map((t) => new Date(t).getTime()))
    spanDays = Math.max(1, Math.ceil((max - min) / 86400000))
  }

  const granularity = resolveTimeSeriesGranularity(input.period, spanDays)

  const revenueMap = new Map<string, number>()
  for (const row of input.exports) {
    const key = bucketKey(row.created_at, granularity)
    incrementBucket(revenueMap, key, exportRevenueUsd(row, input.exportCtx))
  }

  const mastersMap = new Map<string, number>()
  for (const row of input.completions) {
    incrementBucket(mastersMap, bucketKey(row.completed_at, granularity))
  }

  const uploadsMap = new Map<string, number>()
  for (const row of input.uploadSessionsWithTime) {
    incrementBucket(uploadsMap, bucketKey(row.created_at, granularity))
  }

  const visitorsMap = new Map<string, Set<string>>()
  for (const row of input.pageViews.filter((r) => !r.path.startsWith("/admin"))) {
    const key = bucketKey(row.created_at, granularity)
    const set = visitorsMap.get(key) ?? new Set()
    set.add(row.visitor_id)
    visitorsMap.set(key, set)
  }

  const revenueSeries = [...revenueMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, revenue]) => ({ date, revenue: roundUsd(revenue) }))

  return {
    revenue: revenueSeries,
    masters: mapToSeries(mastersMap, "masters"),
    uploads: mapToSeries(uploadsMap, "uploads"),
    visitors: [...visitorsMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, set]) => ({ date, visitors: set.size })),
  }
}

async function fetchUploadEventsWithTime(
  supabase: SupabaseClient,
  start: string | null,
  end: string | null,
) {
  const rows: { session_id: string; created_at: string }[] = []
  const seen = new Set<string>()
  let offset = 0

  while (true) {
    let q = supabase
      .from(PIPELINE_EVENTS_TABLE)
      .select("session_id, created_at")
      .eq("event_type", "upload")
      .order("created_at", { ascending: true })
    if (start) q = q.gte("created_at", start)
    if (end) q = q.lte("created_at", end)

    const { data, error } = await q.range(offset, offset + PAGE_SIZE - 1)
    if (error) {
      if (isMissingTable(error.message)) return []
      throw new Error(error.message)
    }

    for (const row of data ?? []) {
      const sid = typeof row.session_id === "string" ? row.session_id.trim() : ""
      if (!sid || seen.has(sid)) continue
      seen.add(sid)
      rows.push({ session_id: sid, created_at: String(row.created_at) })
    }

    if ((data ?? []).length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return rows
}

async function loadRangeBundle(
  supabase: SupabaseClient,
  exportCtx: ExportClassificationContext,
  start: string | null,
  end: string | null,
) {
  const [exports, completions, uploadSessions, failedJobs, pageViews, trackDurations] =
    await Promise.all([
      fetchExportsInRange(supabase, start, end),
      paginateCompletions(supabase, start, end),
      fetchUploadSessionsInRange(supabase, start, end),
      countFailedJobsInRange(supabase, start, end),
      fetchPageViewsInRange(supabase, start, end),
      fetchTrackDurationsFromFeedback(supabase, start, end),
    ])

  const visitors = new Set(
    pageViews.filter((r) => !r.path.startsWith("/admin")).map((r) => r.visitor_id),
  ).size

  return {
    exports,
    completions,
    uploadSessions,
    failedJobs,
    pageViews,
    trackDurations,
    visitors,
  }
}

async function buildRevenueSummary(
  supabase: SupabaseClient,
  exportCtx: ExportClassificationContext,
): Promise<RevenueSummary> {
  const windows = resolveRevenueSummaryRanges()
  const [todayExports, yesterdayExports, thisMonthExports, lastMonthExports, allExports] =
    await Promise.all([
      fetchExportsInRange(supabase, windows.today.start, windows.today.end),
      fetchExportsInRange(supabase, windows.yesterday.start, windows.yesterday.end),
      fetchExportsInRange(supabase, windows.thisMonth.start, windows.thisMonth.end),
      fetchExportsInRange(supabase, windows.lastMonth.start, windows.lastMonth.end),
      fetchExportsInRange(supabase, null, null),
    ])

  return {
    today: sumRevenue(todayExports, exportCtx),
    yesterday: sumRevenue(yesterdayExports, exportCtx),
    thisMonth: sumRevenue(thisMonthExports, exportCtx),
    lastMonth: sumRevenue(lastMonthExports, exportCtx),
    allTime: sumRevenue(allExports, exportCtx),
  }
}

async function fetchGenreDistribution(
  supabase: SupabaseClient,
  start: string | null,
  end: string | null,
) {
  const genres: string[] = []
  let offset = 0

  while (true) {
    let q = supabase
      .from(BETA_FEEDBACK_TABLE)
      .select("responses, created_at")
      .order("created_at", { ascending: true })
    if (start) q = q.gte("created_at", start)
    if (end) q = q.lte("created_at", end)

    const { data, error } = await q.range(offset, offset + PAGE_SIZE - 1)
    if (error) {
      if (isMissingTable(error.message)) return []
      throw new Error(error.message)
    }

    for (const row of data ?? []) {
      const responses = row.responses as { genre?: string } | null
      const genre = responses?.genre?.trim()
      if (genre && genre !== "Unknown") genres.push(genre)
    }

    if ((data ?? []).length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return topCounts(genres.map((label) => ({ label, count: 1 })))
}

export async function fetchAdminBusinessAnalytics(
  periodInput?: AnalyticsPeriod | string | null,
): Promise<AdminBusinessAnalytics | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const period = parseAnalyticsPeriod(
    typeof periodInput === "string" ? periodInput : periodInput ?? "30d",
  )
  const range = resolvePeriodRange(period)
  const exportCtx = await loadExportClassificationContext()

  try {
    const [primary, comparison, revenueSummary, uploadEventsWithTime, genreDistribution] =
      await Promise.all([
        loadRangeBundle(supabase, exportCtx, range.start, range.end),
        range.compareStart && range.compareEnd
          ? loadRangeBundle(supabase, exportCtx, range.compareStart, range.compareEnd)
          : Promise.resolve(null),
        buildRevenueSummary(supabase, exportCtx),
        fetchUploadEventsWithTime(supabase, range.start, range.end),
        fetchGenreDistribution(supabase, range.start, range.end),
      ])

    const funnelAssessment = assessUploadMasterFunnel({
      uploadSessions: primary.uploadSessions,
      completions: primary.completions,
    })

    const overview = buildPeriodMetrics({
      exports: primary.exports,
      exportCtx,
      completions: primary.completions,
      uploadSessions: primary.uploadSessions,
      visitors: primary.visitors,
      failedJobs: primary.failedJobs,
      funnelComparable: funnelAssessment.comparable,
    })

    const comparisonMetrics = comparison
      ? buildPeriodMetrics({
          exports: comparison.exports,
          exportCtx,
          completions: comparison.completions,
          uploadSessions: comparison.uploadSessions,
          visitors: comparison.visitors,
          failedJobs: comparison.failedJobs,
          funnelComparable: assessUploadMasterFunnel({
            uploadSessions: comparison.uploadSessions,
            completions: comparison.completions,
          }).comparable,
        })
      : null

    const paidExports = countPaid(primary.exports, exportCtx)
    const mastering = buildMasteringAnalytics({
      completions: primary.completions,
      failedJobs: primary.failedJobs,
      paidExports,
      trackDurations: primary.trackDurations,
    })

    const timeSeries = buildTimeSeries({
      period,
      range,
      exports: primary.exports,
      exportCtx,
      completions: primary.completions,
      uploadSessionsWithTime: uploadEventsWithTime,
      pageViews: primary.pageViews,
    })

    const spanDays = computeSpanDays({
      exports: primary.exports,
      completions: primary.completions,
      uploadEvents: uploadEventsWithTime,
      pageViews: primary.pageViews,
    })
    const granularity = resolveTimeSeriesGranularity(period, spanDays)

    const traffic =
      primary.pageViews.length > 0
        ? buildTrafficMetrics(primary.pageViews, granularity)
        : null

    const funnel = [
      { step: "Upload", count: overview.uploads },
      { step: "Master", count: overview.masters },
      { step: "Paid export", count: overview.paidExports },
    ]

    return {
      period,
      periodLabel: range.label,
      comparisonLabel: range.compareLabel,
      overview,
      comparison: comparisonMetrics,
      revenue: revenueSummary,
      timeSeries,
      mastering,
      traffic,
      funnel,
      funnelComparable: funnelAssessment.comparable,
      funnelNote: funnelAssessment.note,
      genreDistribution,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[admin-business-analytics]", message, err)
    return { error: message }
  }
}
