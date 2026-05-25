import type { BetaFeedbackPayload } from "./betaFeedbackTypes"
import { buildBetaFeedbackDashboard, type BetaFeedbackRecord } from "./betaFeedbackAnalytics"
import type {
  AdminCustomerRow,
  AdminFeedbackRow,
  AdminItemStatus,
  AdminOverview,
  AdminSupportRow,
} from "./adminTypes"
import { isAdminItemStatus } from "./adminTypes"
import { BETA_FEEDBACK_TABLE } from "./betaFeedbackDb"
import { createSupabaseServerClient } from "./supabaseServer"

export const SUPPORT_INBOX_TABLE = "admin_support_inbox"

function normalizeStatus(raw: unknown): AdminItemStatus {
  return typeof raw === "string" && isAdminItemStatus(raw) ? raw : "new"
}

function payloadOf(r: { responses: BetaFeedbackPayload }): BetaFeedbackPayload {
  return r.responses
}

export async function fetchAdminOverview(): Promise<AdminOverview | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const [feedbackRes, supportRes] = await Promise.all([
    supabase
      .from(BETA_FEEDBACK_TABLE)
      .select("id, created_at, track_name, status, responses")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from(SUPPORT_INBOX_TABLE)
      .select("id, created_at, email, subject, status")
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

  return {
    feedbackTotal: feedback.length,
    feedbackNew: feedback.filter((r) => normalizeStatus(r.status) === "new").length,
    supportTotal: support.length,
    supportNew: support.filter((r) => normalizeStatus(r.status) === "new").length,
    avgRecommendScore,
    recentFeedback: feedback.slice(0, 6).map((r) => ({
      id: r.id,
      created_at: r.created_at,
      track_name: r.track_name,
      status: normalizeStatus(r.status),
    })),
    recentSupport: support.slice(0, 6).map((r) => ({
      id: r.id,
      created_at: r.created_at,
      email: r.email,
      subject: r.subject,
      status: normalizeStatus(r.status),
    })),
  }
}

export async function fetchAdminFeedback(): Promise<AdminFeedbackRow[] | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { data, error } = await supabase
    .from(BETA_FEEDBACK_TABLE)
    .select(
      "id, created_at, updated_at, status, session_id, track_name, mastering_style, contact_email, contact_discord, admin_notes, responses",
    )
    .order("created_at", { ascending: false })

  if (error) return { error: error.message }

  return (data ?? []).map((row) => {
    const p = payloadOf(row as { responses: BetaFeedbackPayload })
    return {
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at ?? row.created_at,
      status: normalizeStatus(row.status),
      session_id: row.session_id,
      track_name: row.track_name,
      mastering_style: row.mastering_style,
      contact_email: row.contact_email,
      contact_discord: row.contact_discord,
      recommend_score: p.recommendScore,
      use_again_score: p.useAgainScore,
      genre: p.genre || "Unknown",
      release_ready: p.releaseReady || "—",
      admin_notes: row.admin_notes,
    }
  })
}

export async function updateFeedbackItem(
  id: string,
  patch: { status?: AdminItemStatus; admin_notes?: string | null },
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
    email: row.email,
    name: row.name,
    subject: row.subject,
    message: row.message,
    status: normalizeStatus(row.status),
    source: row.source ?? "manual",
    admin_notes: row.admin_notes,
  }))
}

export async function createSupportItem(input: {
  email: string
  name?: string | null
  subject?: string | null
  message: string
  source?: string
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
        status: "new",
      },
    ])
    .select("id")
    .single()

  if (error) return { error: error.message }
  return { id: data.id }
}

export async function updateSupportItem(
  id: string,
  patch: { status?: AdminItemStatus; admin_notes?: string | null },
): Promise<{ ok: true } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const body: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.status) body.status = patch.status
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

  const map = new Map<string, AdminCustomerRow>()

  for (const row of feedback) {
    const email = row.contact_email?.trim().toLowerCase()
    if (!email) continue
    const existing = map.get(email)
    if (!existing) {
      map.set(email, {
        email,
        name: null,
        feedbackCount: 1,
        supportCount: 0,
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
    const existing = map.get(email)
    if (!existing) {
      map.set(email, {
        email,
        name: row.name,
        feedbackCount: 0,
        supportCount: 1,
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

  return [...map.values()].sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))
}

export async function fetchAdminAnalytics() {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { data, error } = await supabase
    .from(BETA_FEEDBACK_TABLE)
    .select(
      "id, created_at, session_id, track_name, mastering_style, stereo_width, low_end, responses",
    )
    .order("created_at", { ascending: false })

  if (error) return { error: error.message }

  const records: BetaFeedbackRecord[] = (data ?? []).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    session_id: row.session_id,
    track_name: row.track_name,
    mastering_style: row.mastering_style,
    stereo_width: row.stereo_width,
    low_end: row.low_end,
    responses: row.responses,
  }))

  return buildBetaFeedbackDashboard(records)
}
