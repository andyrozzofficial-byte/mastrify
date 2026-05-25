import type { BetaFeedbackPayload } from "./betaFeedbackTypes"
import { emptyBetaFeedbackPayload } from "./betaFeedbackSurveySchema"
import { buildBetaFeedbackDashboard, type BetaFeedbackRecord } from "./betaFeedbackAnalytics"
import type {
  AdminActivityItem,
  AdminAnalyticsExtended,
  AdminCustomerProfile,
  AdminCustomerRow,
  AdminFeedbackRow,
  AdminFeedbackStatus,
  AdminJobRow,
  AdminJobStatus,
  AdminKpis,
  AdminOverview,
  AdminSupportPriority,
  AdminSupportRow,
  AdminSupportStatus,
} from "./adminTypes"
import {
  isAdminFeedbackStatus,
  isAdminJobStatus,
  isAdminSupportPriority,
  isAdminSupportStatus,
} from "./adminTypes"
import { BETA_FEEDBACK_TABLE } from "./betaFeedbackDb"
import { isBetaFeedbackStage, type BetaFeedbackStage } from "./betaFeedbackPulseTypes"
import { createSupabaseServerClient } from "./supabaseServer"

export const SUPPORT_INBOX_TABLE = "admin_support_inbox"
export const MASTER_JOBS_TABLE = "admin_master_jobs"
export const PIPELINE_EVENTS_TABLE = "admin_pipeline_events"
export const CUSTOMER_PROFILES_TABLE = "admin_customer_profiles"
export const MASTERED_EXPORTS_TABLE = "mastered_exports"

const EXPORT_PRICE_USD = 9

function startOfTodayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function payloadOf(r: { responses: BetaFeedbackPayload | null }): BetaFeedbackPayload {
  const raw = r.responses
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as BetaFeedbackPayload
  return emptyBetaFeedbackPayload()
}

type BetaFeedbackDbRow = {
  id: string
  created_at: string
  updated_at?: string | null
  status?: string | null
  session_id: string | null
  track_name: string | null
  track_duration?: number | null
  mastering_style: string | null
  contact_email: string | null
  contact_discord: string | null
  admin_notes: string | null
  responses: BetaFeedbackPayload | null
  stereo_width?: number | null
  low_end?: number | null
  master_lufs?: number | null
  processing_time_ms?: number | null
  feedback_stage?: string | null
}

const FEEDBACK_SELECT =
  "id, created_at, updated_at, status, session_id, track_name, track_duration, mastering_style, contact_email, contact_discord, admin_notes, responses, stereo_width, low_end, master_lufs, processing_time_ms, feedback_stage"

const FEEDBACK_SELECT_WITHOUT_STAGE = FEEDBACK_SELECT.replace(", feedback_stage", "")

function isMissingFeedbackStageColumn(message: string): boolean {
  return /feedback_stage/i.test(message) && /does not exist/i.test(message)
}

function normalizeFeedbackStage(raw: unknown, survey: BetaFeedbackPayload): BetaFeedbackStage {
  if (typeof raw === "string" && isBetaFeedbackStage(raw)) return raw
  const fromJson = (survey as Record<string, unknown>).feedbackStage
  if (typeof fromJson === "string" && isBetaFeedbackStage(fromJson)) return fromJson
  return "completed"
}

function mapAdminFeedbackRow(row: BetaFeedbackDbRow): AdminFeedbackRow {
  const p = payloadOf(row)
  const trackName =
    row.track_name?.trim() || p.trackName?.trim() || p.trackTitle?.trim() || null
  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    status: normalizeFeedbackStatus(row.status),
    session_id: row.session_id,
    track_name: trackName,
    track_duration: row.track_duration ?? p.trackDuration ?? null,
    mastering_style: row.mastering_style?.trim() || p.masteringStyle?.trim() || null,
    contact_email: row.contact_email ?? (p.contactEmail?.trim() || null),
    contact_discord: row.contact_discord ?? (p.contactDiscord?.trim() || null),
    recommend_score: Number.isFinite(p.recommendScore) ? p.recommendScore : 0,
    use_again_score: Number.isFinite(p.useAgainScore) ? p.useAgainScore : 0,
    ease_rating: Number.isFinite(p.easeRating) ? p.easeRating : 0,
    genre: p.genre?.trim() || "Unknown",
    role: p.role?.trim() || "—",
    release_ready: p.releaseReady || "—",
    admin_notes: row.admin_notes,
    processing_time_ms: row.processing_time_ms ?? p.processingTimeMs ?? null,
    master_lufs:
      row.master_lufs != null
        ? Number(row.master_lufs)
        : p.masterLufs != null && Number.isFinite(p.masterLufs)
          ? Number(p.masterLufs)
          : null,
    stereo_width: row.stereo_width ?? p.stereoWidth ?? null,
    low_end: row.low_end ?? p.lowEnd ?? null,
    survey: p,
    feedback_stage: normalizeFeedbackStage(row.feedback_stage, p),
  }
}

function normalizeFeedbackStatus(raw: unknown): AdminFeedbackStatus {
  return typeof raw === "string" && isAdminFeedbackStatus(raw) ? raw : "new"
}

function normalizeSupportStatus(raw: unknown): AdminSupportStatus {
  if (typeof raw !== "string") return "open"
  if (isAdminSupportStatus(raw)) return raw
  if (raw === "new") return "open"
  if (raw === "read") return "waiting_for_customer"
  return "open"
}

function normalizeSupportPriority(raw: unknown): AdminSupportPriority {
  return typeof raw === "string" && isAdminSupportPriority(raw) ? raw : "medium"
}

function normalizeJobStatus(raw: unknown): AdminJobStatus {
  return typeof raw === "string" && isAdminJobStatus(raw) ? raw : "complete"
}

async function fetchExportsSince(iso: string | null) {
  const supabase = createSupabaseServerClient()
  if (!supabase) {
    return {
      data: [] as { id: string; email: string; created_at: string; amount_cents?: number; track_title?: string | null }[],
      error: null,
    }
  }

  let q = supabase
    .from(MASTERED_EXPORTS_TABLE)
    .select("id, email, created_at, amount_cents, track_title")
    .order("created_at", { ascending: false })
  if (iso) q = q.gte("created_at", iso)

  const { data, error } = await q.limit(5000)
  if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
    return { data: [], error: null }
  }
  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

async function syncJobsFromFeedback(): Promise<void> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return

  const { data: feedback } = await supabase
    .from(BETA_FEEDBACK_TABLE)
    .select("id, created_at, session_id, track_name, mastering_style, contact_email, responses")
    .order("created_at", { ascending: false })
    .limit(500)

  if (!feedback?.length) return

  const { data: existing } = await supabase
    .from(MASTER_JOBS_TABLE)
    .select("id, source")
    .eq("source", "feedback")
    .limit(2000)

  const existingIds = new Set((existing ?? []).map((r) => r.id))

  const rows = feedback
    .filter((row) => !existingIds.has(row.id))
    .map((row) => {
      const p = payloadOf(row as { responses: BetaFeedbackPayload })
      return {
        id: row.id,
        created_at: row.created_at,
        updated_at: row.created_at,
        session_id: row.session_id,
        track_name: row.track_name,
        user_email: row.contact_email,
        status: "complete",
        processing_time_ms: p.processingTimeMs,
        master_lufs: p.masterLufs,
        mastering_style: row.mastering_style ?? p.masteringStyle,
        error_log: null,
        source: "feedback",
      }
    })

  if (rows.length > 0) {
    await supabase.from(MASTER_JOBS_TABLE).upsert(rows, { onConflict: "id" })
  }
}

export async function computeAdminKpis(): Promise<AdminKpis | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const today = startOfTodayIso()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [feedbackRes, eventsRes, jobsRes, exportsRes] = await Promise.all([
    supabase
      .from(BETA_FEEDBACK_TABLE)
      .select("id, created_at, session_id, responses")
      .gte("created_at", today)
      .limit(2000),
    supabase
      .from(PIPELINE_EVENTS_TABLE)
      .select("id, event_type, created_at, session_id")
      .gte("created_at", today)
      .limit(2000),
    supabase
      .from(MASTER_JOBS_TABLE)
      .select("id, status, created_at")
      .gte("created_at", today)
      .limit(2000),
    fetchExportsSince(today),
  ])

  if (feedbackRes.error && !feedbackRes.error.message.includes("does not exist")) {
    return { error: feedbackRes.error.message }
  }

  const uploadsFromEvents =
    eventsRes.data?.filter((e) => e.event_type === "upload").length ?? 0
  const feedbackToday = feedbackRes.data ?? []
  const uploadsToday = Math.max(uploadsFromEvents, feedbackToday.length, jobsRes.data?.length ?? 0)

  const mastersCompletedToday = feedbackToday.length

  const paidDownloadsToday = exportsRes.data.length
  const revenueToday = exportsRes.data.reduce(
    (sum, row) => sum + (row.amount_cents != null ? row.amount_cents / 100 : EXPORT_PRICE_USD),
    0,
  )

  const conversionRate =
    uploadsToday > 0 ? Math.round((paidDownloadsToday / uploadsToday) * 1000) / 10 : null

  const { data: weekFeedback } = await supabase
    .from(BETA_FEEDBACK_TABLE)
    .select("session_id")
    .gte("created_at", weekAgo)
    .limit(5000)

  const activeUsers = new Set(
    (weekFeedback ?? []).map((r) => r.session_id).filter((s): s is string => Boolean(s)),
  ).size

  const failedJobs =
    jobsRes.data?.filter((j) => j.status === "failed").length ??
    (await supabase.from(MASTER_JOBS_TABLE).select("id").eq("status", "failed")).data?.length ??
    0

  return {
    uploadsToday,
    mastersCompletedToday,
    paidDownloadsToday,
    revenueToday: Math.round(revenueToday * 100) / 100,
    conversionRate,
    activeUsers,
    failedJobs,
  }
}

export async function fetchAdminOverview(): Promise<AdminOverview | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const kpis = await computeAdminKpis()
  if ("error" in kpis) return kpis

  const [feedbackRes, supportRes] = await Promise.all([
    supabase
      .from(BETA_FEEDBACK_TABLE)
      .select("id, created_at, track_name, status, responses")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from(SUPPORT_INBOX_TABLE)
      .select("id, created_at, email, subject, status, priority")
      .order("created_at", { ascending: false })
      .limit(200),
  ])

  if (feedbackRes.error) return { error: feedbackRes.error.message }
  if (supportRes.error) return { error: supportRes.error.message }

  const feedback = feedbackRes.data ?? []
  const support = supportRes.data ?? []

  const recommendScores = feedback
    .map((r) => payloadOf(r as { responses: BetaFeedbackPayload }).recommendScore)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))

  const avgRecommendScore =
    recommendScores.length > 0
      ? Math.round((recommendScores.reduce((a, b) => a + b, 0) / recommendScores.length) * 10) / 10
      : null

  const feedbackNew = feedback.filter((r) => normalizeFeedbackStatus(r.status) === "new").length
  const supportOpen = support.filter((r) => normalizeSupportStatus(r.status) === "open").length
  const supportWaiting = support.filter(
    (r) => normalizeSupportStatus(r.status) === "waiting_for_customer",
  ).length

  const exportsAll = await fetchExportsSince(null)
  const exports = exportsAll.data

  const recentFeedback = feedback.slice(0, 6).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    track_name: r.track_name,
    status: normalizeFeedbackStatus(r.status),
  }))

  const recentSupport = support.slice(0, 6).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    email: r.email,
    subject: r.subject,
    status: normalizeSupportStatus(r.status),
    priority: normalizeSupportPriority(r.priority),
  }))

  const recentMasters = feedback.slice(0, 8).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    track_name: r.track_name,
    mastering_style: r.mastering_style,
    status: "complete" as const,
  }))

  const recentPurchases = exports.slice(0, 8).map((row, i) => ({
    id: row.id ?? `export-${i}`,
    created_at: row.created_at,
    email: row.email,
    track_title: row.track_title ?? null,
    amount: row.amount_cents != null ? row.amount_cents / 100 : EXPORT_PRICE_USD,
  }))

  const activity: AdminActivityItem[] = [
    ...recentMasters.map((m) => ({
      id: `master-${m.id}`,
      type: "master" as const,
      title: m.track_name ?? "Untitled master",
      subtitle: m.mastering_style,
      created_at: m.created_at,
      href: "/admin/jobs",
    })),
    ...recentPurchases.map((p) => ({
      id: `purchase-${p.id}`,
      type: "purchase" as const,
      title: p.track_title ?? "Export delivered",
      subtitle: p.email,
      created_at: p.created_at,
      href: `/admin/customers/${encodeURIComponent(p.email)}`,
    })),
    ...recentFeedback.map((f) => ({
      id: `feedback-${f.id}`,
      type: "feedback" as const,
      title: f.track_name ?? "Feedback",
      subtitle: f.status,
      created_at: f.created_at,
      href: `/admin/feedback/${f.id}`,
    })),
    ...recentSupport.map((s) => ({
      id: `support-${s.id}`,
      type: "support" as const,
      title: s.subject ?? s.email,
      subtitle: s.email,
      created_at: s.created_at,
      href: `/admin/support/${s.id}`,
    })),
  ]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 12)

  return {
    ...kpis,
    feedbackTotal: feedback.length,
    feedbackNew,
    supportTotal: support.length,
    supportOpen,
    avgRecommendScore,
    badges: { feedback: feedbackNew, support: supportOpen + supportWaiting },
    recentFeedback,
    recentSupport,
    recentMasters,
    recentPurchases,
    recentActivity: activity,
  }
}

export async function fetchAdminFeedback(): Promise<AdminFeedbackRow[] | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  let select = FEEDBACK_SELECT
  let { data, error } = await supabase
    .from(BETA_FEEDBACK_TABLE)
    .select(select)
    .order("created_at", { ascending: false })

  if (error && isMissingFeedbackStageColumn(error.message)) {
    select = FEEDBACK_SELECT_WITHOUT_STAGE
    const retry = await supabase
      .from(BETA_FEEDBACK_TABLE)
      .select(select)
      .order("created_at", { ascending: false })
    data = retry.data
    error = retry.error
  }

  if (error) return { error: error.message }

  return (data ?? []).map((row) => mapAdminFeedbackRow(row as BetaFeedbackDbRow))
}

export async function fetchAdminFeedbackById(
  id: string,
): Promise<AdminFeedbackRow | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  let select = FEEDBACK_SELECT
  let { data, error } = await supabase
    .from(BETA_FEEDBACK_TABLE)
    .select(select)
    .eq("id", id)
    .maybeSingle()

  if (error && isMissingFeedbackStageColumn(error.message)) {
    select = FEEDBACK_SELECT_WITHOUT_STAGE
    const retry = await supabase
      .from(BETA_FEEDBACK_TABLE)
      .select(select)
      .eq("id", id)
      .maybeSingle()
    data = retry.data
    error = retry.error
  }

  if (error) return { error: error.message }
  if (!data) return { error: "Feedback not found" }
  return mapAdminFeedbackRow(data as BetaFeedbackDbRow)
}

export async function updateFeedbackItem(
  id: string,
  patch: { status?: AdminFeedbackStatus; admin_notes?: string | null },
): Promise<{ ok: true } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const body: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.status) body.status = patch.status
  if (patch.admin_notes !== undefined) body.admin_notes = patch.admin_notes

  const { error } = await supabase.from(BETA_FEEDBACK_TABLE).update(body).eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function fetchAdminSupport(): Promise<AdminSupportRow[] | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { data, error } = await supabase
    .from(SUPPORT_INBOX_TABLE)
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return { error: error.message }

  return (data ?? []).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    resolved_at: row.resolved_at ?? null,
    email: row.email,
    name: row.name,
    subject: row.subject,
    message: row.message,
    status: normalizeSupportStatus(row.status),
    priority: normalizeSupportPriority(row.priority),
    source: row.source ?? "manual",
    admin_notes: row.admin_notes,
  }))
}

export async function fetchSupportTicket(id: string): Promise<AdminSupportRow | { error: string }> {
  const rows = await fetchAdminSupport()
  if ("error" in rows) return rows
  const ticket = rows.find((r) => r.id === id)
  if (!ticket) return { error: "Ticket not found" }
  return ticket
}

export async function createSupportItem(input: {
  email: string
  name?: string | null
  subject?: string | null
  message: string
  source?: string
  priority?: AdminSupportPriority
}): Promise<{ id: string } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { data, error } = await supabase
    .from(SUPPORT_INBOX_TABLE)
    .insert([
      {
        email: input.email.trim(),
        name: input.name?.trim() || null,
        subject: input.subject?.trim() || null,
        message: input.message.trim(),
        source: input.source?.trim() || "manual",
        status: "open",
        priority: input.priority ?? "medium",
      },
    ])
    .select("id")
    .single()

  if (error) return { error: error.message }
  return { id: data.id }
}

export async function updateSupportItem(
  id: string,
  patch: {
    status?: AdminSupportStatus
    priority?: AdminSupportPriority
    admin_notes?: string | null
  },
): Promise<{ ok: true } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const body: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.status) {
    body.status = patch.status
    if (patch.status === "resolved" || patch.status === "closed") {
      body.resolved_at = new Date().toISOString()
    }
  }
  if (patch.priority) body.priority = patch.priority
  if (patch.admin_notes !== undefined) body.admin_notes = patch.admin_notes

  const { error } = await supabase.from(SUPPORT_INBOX_TABLE).update(body).eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

function isFetchError<T>(v: T | { error: string }): v is { error: string } {
  return typeof v === "object" && v !== null && "error" in v && typeof (v as { error: string }).error === "string"
}

export async function fetchAdminCustomers(): Promise<AdminCustomerRow[] | { error: string }> {
  const feedback = await fetchAdminFeedback()
  if (isFetchError(feedback)) return feedback

  const support = await fetchAdminSupport()
  if (isFetchError(support)) return support

  const exports = await fetchExportsSince(null)
  const supabase = createSupabaseServerClient()
  const profilesRes = supabase
    ? await supabase.from(CUSTOMER_PROFILES_TABLE).select("email, name, notes, purchased")
    : { data: [] }

  const profileByEmail = new Map(
    (profilesRes.data ?? []).map((p) => [p.email.toLowerCase(), p]),
  )

  const exportsByEmail = new Map<string, number>()
  for (const ex of exports.data) {
    const e = ex.email.toLowerCase()
    exportsByEmail.set(e, (exportsByEmail.get(e) ?? 0) + 1)
  }

  const map = new Map<string, AdminCustomerRow>()

  for (const row of feedback) {
    const email = row.contact_email?.trim().toLowerCase()
    if (!email) continue
    const profile = profileByEmail.get(email)
    const existing = map.get(email)
    if (!existing) {
      map.set(email, {
        email,
        name: profile?.name ?? null,
        feedbackCount: 1,
        supportCount: 0,
        exportCount: exportsByEmail.get(email) ?? 0,
        purchased: profile?.purchased ?? (exportsByEmail.get(email) ?? 0) > 0,
        lastActivity: row.created_at,
        lastTrack: row.track_name,
        avgRecommend: row.recommend_score,
      })
    } else {
      existing.feedbackCount += 1
      if (row.created_at > existing.lastActivity) {
        existing.lastActivity = row.created_at
        existing.lastTrack = row.track_name
      }
      existing.avgRecommend =
        existing.avgRecommend != null
          ? Math.round(((existing.avgRecommend + row.recommend_score) / 2) * 10) / 10
          : row.recommend_score
    }
  }

  for (const row of support) {
    const email = row.email.trim().toLowerCase()
    const profile = profileByEmail.get(email)
    const existing = map.get(email)
    if (!existing) {
      map.set(email, {
        email,
        name: row.name ?? profile?.name ?? null,
        feedbackCount: 0,
        supportCount: 1,
        exportCount: exportsByEmail.get(email) ?? 0,
        purchased: profile?.purchased ?? (exportsByEmail.get(email) ?? 0) > 0,
        lastActivity: row.created_at,
        lastTrack: null,
        avgRecommend: null,
      })
    } else {
      existing.supportCount += 1
      if (row.name && !existing.name) existing.name = row.name
      if (row.created_at > existing.lastActivity) existing.lastActivity = row.created_at
    }
  }

  for (const [email, count] of exportsByEmail) {
    if (!map.has(email)) {
      const profile = profileByEmail.get(email)
      map.set(email, {
        email,
        name: profile?.name ?? null,
        feedbackCount: 0,
        supportCount: 0,
        exportCount: count,
        purchased: profile?.purchased ?? count > 0,
        lastActivity: new Date(0).toISOString(),
        lastTrack: null,
        avgRecommend: null,
      })
    } else {
      const row = map.get(email)!
      row.exportCount = count
      if (count > 0) row.purchased = profileByEmail.get(email)?.purchased ?? true
    }
  }

  return [...map.values()].sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))
}

export async function fetchCustomerProfile(email: string): Promise<AdminCustomerProfile | { error: string }> {
  const normalized = email.trim().toLowerCase()
  const feedback = await fetchAdminFeedback()
  if (isFetchError(feedback)) return feedback
  const support = await fetchAdminSupport()
  if (isFetchError(support)) return support

  const supabase = createSupabaseServerClient()
  let notes: string | null = null
  let purchased = false
  let name: string | null = null

  if (supabase) {
    const { data: profile } = await supabase
      .from(CUSTOMER_PROFILES_TABLE)
      .select("notes, purchased, name")
      .eq("email", normalized)
      .maybeSingle()
    if (profile) {
      notes = profile.notes
      purchased = profile.purchased
      name = profile.name
    }
  }

  const exports = await fetchExportsSince(null)
  const exportCount = exports.data.filter((e) => e.email.toLowerCase() === normalized).length
  if (exportCount > 0) purchased = true

  const userFeedback = feedback.filter((f) => f.contact_email?.toLowerCase() === normalized)
  const userSupport = support.filter((s) => s.email.toLowerCase() === normalized)
  const sessions = [...new Set(userFeedback.map((f) => f.session_id).filter((s): s is string => Boolean(s)))]

  const lastActivity = [
    ...userFeedback.map((f) => f.created_at),
    ...userSupport.map((s) => s.created_at),
  ].sort()
    .pop() ?? null

  return {
    email: normalized,
    name: name ?? userSupport[0]?.name ?? null,
    notes,
    purchased,
    totalTracksMastered: userFeedback.length,
    exportCount,
    lastActivity,
    feedback: userFeedback,
    support: userSupport,
    sessions,
  }
}

export async function updateCustomerProfile(
  email: string,
  patch: { notes?: string | null; purchased?: boolean; name?: string | null },
): Promise<{ ok: true } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const normalized = email.trim().toLowerCase()
  const body: Record<string, unknown> = {
    email: normalized,
    updated_at: new Date().toISOString(),
  }
  if (patch.notes !== undefined) body.notes = patch.notes
  if (patch.purchased !== undefined) body.purchased = patch.purchased
  if (patch.name !== undefined) body.name = patch.name

  const { error } = await supabase.from(CUSTOMER_PROFILES_TABLE).upsert(body, { onConflict: "email" })
  if (error) return { error: error.message }
  return { ok: true }
}

export async function fetchAdminJobs(): Promise<AdminJobRow[] | { error: string }> {
  await syncJobsFromFeedback()

  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { data, error } = await supabase
    .from(MASTER_JOBS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000)

  if (error?.code === "42P01") {
    const feedback = await fetchAdminFeedback()
    if (isFetchError(feedback)) return feedback
    return feedback.map((f) => ({
      id: f.id,
      created_at: f.created_at,
      updated_at: f.updated_at,
      session_id: f.session_id,
      track_name: f.track_name,
      user_email: f.contact_email,
      status: "complete" as AdminJobStatus,
      processing_time_ms: f.processing_time_ms,
      master_lufs: f.master_lufs,
      mastering_style: f.mastering_style,
      error_log: null,
      source: "feedback",
    }))
  }

  if (error) return { error: error.message }

  return (data ?? []).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    session_id: row.session_id,
    track_name: row.track_name,
    user_email: row.user_email,
    status: normalizeJobStatus(row.status),
    processing_time_ms: row.processing_time_ms,
    master_lufs: row.master_lufs != null ? Number(row.master_lufs) : null,
    mastering_style: row.mastering_style,
    error_log: row.error_log,
    source: row.source ?? "system",
  }))
}

function dateKey(iso: string): string {
  return iso.slice(0, 10)
}

function weekKey(iso: string): string {
  const d = new Date(iso)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setUTCDate(diff)
  return monday.toISOString().slice(0, 10)
}

export async function fetchAdminAnalyticsExtended(): Promise<AdminAnalyticsExtended | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const [feedbackRes, eventsRes, exportsRes] = await Promise.all([
    supabase
      .from(BETA_FEEDBACK_TABLE)
      .select("id, created_at, session_id, track_name, mastering_style, responses")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from(PIPELINE_EVENTS_TABLE).select("event_type, created_at, session_id").limit(5000),
    fetchExportsSince(null),
  ])

  if (feedbackRes.error) return { error: feedbackRes.error.message }

  const feedback = feedbackRes.data ?? []
  const events = eventsRes.data ?? []
  const exports = exportsRes.data

  const uploads = Math.max(
    events.filter((e) => e.event_type === "upload").length,
    feedback.length,
  )
  const analyzed = Math.max(
    events.filter((e) => e.event_type === "analyze").length,
    feedback.length,
  )
  const mastered = feedback.length
  const paid = exports.length
  const downloaded = exports.length

  const funnel = [
    { step: "Upload", count: uploads },
    { step: "Analyze", count: analyzed },
    { step: "Payment", count: paid },
    { step: "Download", count: downloaded },
  ]

  const lufsValues = feedback
    .map((r) => payloadOf(r as { responses: BetaFeedbackPayload }).masterLufs)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
  const avgLufs =
    lufsValues.length > 0
      ? Math.round((lufsValues.reduce((a, b) => a + b, 0) / lufsValues.length) * 10) / 10
      : null

  const styleCounts = new Map<string, number>()
  for (const row of feedback) {
    const style = row.mastering_style ?? payloadOf(row as { responses: BetaFeedbackPayload }).masteringStyle
    if (!style) continue
    styleCounts.set(style, (styleCounts.get(style) ?? 0) + 1)
  }
  const topStyleEntry = [...styleCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  const topStyle = topStyleEntry ? { style: topStyleEntry[0], count: topStyleEntry[1] } : null

  const procTimes = feedback
    .map((r) => payloadOf(r as { responses: BetaFeedbackPayload }).processingTimeMs)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
  const avgProcessingMs =
    procTimes.length > 0 ? Math.round(procTimes.reduce((a, b) => a + b, 0) / procTimes.length) : null

  const dropSteps: { step: string; loss: number }[] = []
  for (let i = 0; i < funnel.length - 1; i++) {
    dropSteps.push({ step: funnel[i].step, loss: funnel[i].count - funnel[i + 1].count })
  }
  const worst = dropSteps.sort((a, b) => b.loss - a.loss)[0]
  const dropOffStep = worst && worst.loss > 0 ? worst.step : null

  const dailyMap = new Map<string, { uploads: number; masters: number; downloads: number }>()
  for (const row of feedback) {
    const key = dateKey(row.created_at)
    const cur = dailyMap.get(key) ?? { uploads: 0, masters: 0, downloads: 0 }
    cur.uploads += 1
    cur.masters += 1
    dailyMap.set(key, cur)
  }
  for (const ex of exports) {
    const key = dateKey(ex.created_at)
    const cur = dailyMap.get(key) ?? { uploads: 0, masters: 0, downloads: 0 }
    cur.downloads += 1
    dailyMap.set(key, cur)
  }

  const dailyTrend = [...dailyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, v]) => ({ date, ...v }))

  const weeklyMap = new Map<string, { uploads: number; masters: number; downloads: number }>()
  for (const row of feedback) {
    const key = weekKey(row.created_at)
    const cur = weeklyMap.get(key) ?? { uploads: 0, masters: 0, downloads: 0 }
    cur.uploads += 1
    cur.masters += 1
    weeklyMap.set(key, cur)
  }
  for (const ex of exports) {
    const key = weekKey(ex.created_at)
    const cur = weeklyMap.get(key) ?? { uploads: 0, masters: 0, downloads: 0 }
    cur.downloads += 1
    weeklyMap.set(key, cur)
  }

  const weeklyTrend = [...weeklyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([week, v]) => ({ week, ...v }))

  const records: BetaFeedbackRecord[] = feedback.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    session_id: row.session_id,
    track_name: row.track_name,
    mastering_style: row.mastering_style,
    stereo_width: null,
    low_end: null,
    responses: row.responses,
  }))

  const legacy = buildBetaFeedbackDashboard(records)

  const recommendByDate = new Map<string, { sum: number; n: number }>()
  for (const row of feedback) {
    const score = payloadOf(row as { responses: BetaFeedbackPayload }).recommendScore
    if (typeof score !== "number") continue
    const key = dateKey(row.created_at)
    const cur = recommendByDate.get(key) ?? { sum: 0, n: 0 }
    cur.sum += score
    cur.n += 1
    recommendByDate.set(key, cur)
  }

  const recommendOverTime = [...recommendByDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, { sum, n }]) => ({
      date,
      avgRecommend: Math.round((sum / n) * 10) / 10,
      count: n,
    }))

  return {
    funnel,
    avgLufs,
    topStyle,
    avgProcessingMs,
    dropOffStep,
    dailyTrend,
    weeklyTrend,
    genreDistribution: legacy.charts.genreDistribution ?? [],
    recommendOverTime: recommendOverTime ?? [],
    dailyTrend: dailyTrend ?? [],
    weeklyTrend: weeklyTrend ?? [],
    funnel: funnel ?? [],
  }
}

export async function fetchAdminAnalytics() {
  return fetchAdminAnalyticsExtended()
}
