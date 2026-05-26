import type { AdminFeedbackRow, AdminJobRow, AdminSupportRow, BetaUserListRow, BetaUserProfile, BetaUserTagCount } from "./adminTypes"
import {
  BETA_USER_RANKS,
  betaRankLabel,
  isBetaUserRank,
  normalizeBetaEmail,
  type BetaUserRank,
} from "./betaAccess"
import { BETA_FEEDBACK_TABLE } from "./betaFeedbackDb"
import type { BetaFeedbackPayload } from "./betaFeedbackTypes"
import {
  CUSTOMER_PROFILES_TABLE,
  fetchAdminFeedback,
  fetchAdminJobs,
  fetchAdminSupport,
  MASTERED_EXPORTS_TABLE,
  PIPELINE_EVENTS_TABLE,
} from "./adminData"
import { createSupabaseServerClient } from "./supabaseServer"

type BetaProfileRow = {
  email: string
  name: string | null
  genre: string | null
  daw: string | null
  beta_rank: string | null
  beta_signed_up_at: string | null
}

function isFetchError<T>(v: T | { error: string }): v is { error: string } {
  return v != null && typeof v === "object" && "error" in v
}

function dateKey(iso: string): string {
  return iso.slice(0, 10)
}

function topLabel(
  items: (string | null | undefined)[],
  exclude?: Set<string>,
): string | null {
  const counts = new Map<string, number>()
  for (const raw of items) {
    const label = raw?.trim()
    if (!label) continue
    if (exclude?.has(label)) continue
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  let best: string | null = null
  let max = 0
  for (const [label, count] of counts) {
    if (count > max) {
      max = count
      best = label
    }
  }
  return best
}

function tagCountsFromArrays(arrays: string[][]): BetaUserTagCount[] {
  const counts = new Map<string, number>()
  for (const arr of arrays) {
    for (const raw of arr) {
      const label = raw?.trim()
      if (!label) continue
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

function avgRecommend(rows: AdminFeedbackRow[]): number | null {
  if (!rows.length) return null
  const sum = rows.reduce((a, r) => a + r.recommend_score, 0)
  return Math.round((sum / rows.length) * 10) / 10
}

export function formatBetaLastActive(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return "Today"
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d)
  } catch {
    return iso.slice(0, 10)
  }
}

function displayName(email: string, name: string | null): string | null {
  if (name?.trim()) return name.trim()
  const local = email.split("@")[0] ?? ""
  if (!local) return null
  const bits = local.replace(/[._-]+/g, " ").trim().split(/\s+/)
  if (bits.length >= 2) {
    return bits.map((b) => b.charAt(0).toUpperCase() + b.slice(1)).join(" ")
  }
  return local.charAt(0).toUpperCase() + local.slice(1)
}

async function fetchBetaProfileRows(): Promise<BetaProfileRow[]> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from(CUSTOMER_PROFILES_TABLE)
    .select("email, name, genre, daw, beta_rank, beta_signed_up_at")
    .order("beta_signed_up_at", { ascending: false, nullsFirst: false })

  if (error) {
    if (/does not exist/i.test(error.message)) return []
    return []
  }
  return (data ?? []).map((row) => ({
    email: row.email.toLowerCase(),
    name: row.name ?? null,
    genre: row.genre ?? null,
    daw: row.daw ?? null,
    beta_rank: row.beta_rank ?? null,
    beta_signed_up_at: row.beta_signed_up_at ?? null,
  }))
}

async function fetchExportCountsByEmail(): Promise<Map<string, number>> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return new Map()

  const { data } = await supabase.from(MASTERED_EXPORTS_TABLE).select("email").limit(5000)
  const map = new Map<string, number>()
  for (const row of data ?? []) {
    const e = (row.email as string).toLowerCase()
    map.set(e, (map.get(e) ?? 0) + 1)
  }
  return map
}

async function fetchUploadCountsBySession(sessions: string[]): Promise<number> {
  if (!sessions.length) return 0
  const supabase = createSupabaseServerClient()
  if (!supabase) return sessions.length

  const { data, error } = await supabase
    .from(PIPELINE_EVENTS_TABLE)
    .select("session_id")
    .eq("event_type", "upload")
    .in("session_id", sessions.slice(0, 200))

  if (error) return sessions.length
  const unique = new Set((data ?? []).map((r) => r.session_id).filter(Boolean))
  return Math.max(unique.size, sessions.length)
}

function collectEmails(
  profiles: BetaProfileRow[],
  feedback: AdminFeedbackRow[],
  support: AdminSupportRow[],
): string[] {
  const set = new Set<string>()
  for (const p of profiles) {
    if (p.beta_signed_up_at || p.genre || p.daw) set.add(p.email)
  }
  for (const f of feedback) {
    const e = f.contact_email?.trim().toLowerCase()
    if (e) set.add(e)
  }
  for (const s of support) {
    set.add(s.email.trim().toLowerCase())
  }
  return [...set]
}

function buildListRow(
  email: string,
  profile: BetaProfileRow | undefined,
  userFeedback: AdminFeedbackRow[],
  userSupport: AdminSupportRow[],
  jobs: AdminJobRow[],
): BetaUserListRow {
  const lastTimes = [
    ...userFeedback.map((f) => f.created_at),
    ...userSupport.map((s) => s.created_at),
    ...jobs.filter((j) => j.user_email?.toLowerCase() === email).map((j) => j.created_at),
  ].sort()
  const lastActivity = lastTimes.pop() ?? null

  const latestFeedback = userFeedback[0]
  const genre =
    profile?.genre?.trim() ||
    latestFeedback?.genre?.trim() ||
    latestFeedback?.survey?.genre?.trim() ||
    null

  const soundedOff = userFeedback.flatMap((f) => f.survey.soundedOff ?? [])
  const styles = userFeedback.map((f) => f.mastering_style)

  return {
    email,
    name: displayName(email, profile?.name ?? userSupport[0]?.name ?? null),
    genre: genre && genre !== "Unknown" ? genre : genre,
    daw: profile?.daw ?? null,
    betaRank: betaRankLabel(profile?.beta_rank ?? "insider"),
    signupDate: profile?.beta_signed_up_at ?? null,
    masterCount: Math.max(
      userFeedback.length,
      jobs.filter((j) => j.user_email?.toLowerCase() === email).length,
    ),
    feedbackCount: userFeedback.length,
    supportCount: userSupport.length,
    avgRecommend: avgRecommend(userFeedback),
    topStyle: topLabel(styles),
    topIssue: topLabel(soundedOff, new Set(["No, it sounded good"])),
    lastActivity: formatBetaLastActive(lastActivity),
  }
}

export async function fetchBetaUsers(): Promise<BetaUserListRow[] | { error: string }> {
  const [feedback, support, jobsRes, profiles] = await Promise.all([
    fetchAdminFeedback(),
    fetchAdminSupport(),
    fetchAdminJobs(),
    fetchBetaProfileRows(),
  ])

  if (isFetchError(feedback)) return feedback
  if (isFetchError(support)) return support
  const jobs = isFetchError(jobsRes) ? [] : jobsRes

  const profileByEmail = new Map(profiles.map((p) => [p.email, p]))
  const emails = collectEmails(profiles, feedback, support)

  const feedbackByEmail = new Map<string, AdminFeedbackRow[]>()
  for (const row of feedback) {
    const e = row.contact_email?.trim().toLowerCase()
    if (!e) continue
    const list = feedbackByEmail.get(e) ?? []
    list.push(row)
    feedbackByEmail.set(e, list)
  }
  for (const list of feedbackByEmail.values()) {
    list.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  const supportByEmail = new Map<string, AdminSupportRow[]>()
  for (const row of support) {
    const e = row.email.trim().toLowerCase()
    const list = supportByEmail.get(e) ?? []
    list.push(row)
    supportByEmail.set(e, list)
  }

  const rows = emails.map((email) =>
    buildListRow(
      email,
      profileByEmail.get(email),
      feedbackByEmail.get(email) ?? [],
      supportByEmail.get(email) ?? [],
      jobs,
    ),
  )

  return rows.sort((a, b) => {
    const aIso = a.signupDate ?? ""
    const bIso = b.signupDate ?? ""
    if (aIso !== bIso) return bIso.localeCompare(aIso)
    return (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "")
  })
}

export async function fetchBetaUserProfile(email: string): Promise<BetaUserProfile | { error: string }> {
  const normalized = normalizeBetaEmail(email)
  const [feedback, support, jobsRes, profiles, exportMap] = await Promise.all([
    fetchAdminFeedback(),
    fetchAdminSupport(),
    fetchAdminJobs(),
    fetchBetaProfileRows(),
    fetchExportCountsByEmail(),
  ])

  if (isFetchError(feedback)) return feedback
  if (isFetchError(support)) return support
  const jobs = isFetchError(jobsRes) ? [] : jobsRes

  const profile = profiles.find((p) => p.email === normalized)
  const userFeedback = feedback
    .filter((f) => f.contact_email?.toLowerCase() === normalized)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const userSupport = support
    .filter((s) => s.email.toLowerCase() === normalized)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const userJobs = jobs.filter((j) => j.user_email?.toLowerCase() === normalized)

  const sessions = [
    ...new Set([
      ...userFeedback.map((f) => f.session_id).filter((s): s is string => Boolean(s)),
      ...userJobs.map((j) => j.session_id).filter((s): s is string => Boolean(s)),
    ]),
  ]

  const uploadCount = await fetchUploadCountsBySession(sessions)
  const downloadCount = exportMap.get(normalized) ?? 0

  const lufsValues = userFeedback.map((f) => f.master_lufs).filter((v): v is number => v != null)
  const avgLufs =
    lufsValues.length > 0
      ? Math.round((lufsValues.reduce((a, b) => a + b, 0) / lufsValues.length) * 10) / 10
      : null

  const procValues = userFeedback
    .map((f) => f.processing_time_ms)
    .filter((v): v is number => v != null && v > 0)
  const avgProcessingMs =
    procValues.length > 0
      ? Math.round(procValues.reduce((a, b) => a + b, 0) / procValues.length)
      : null

  const activityDates = new Set<string>()
  for (const iso of [
    ...userFeedback.map((f) => f.created_at),
    ...userSupport.map((s) => s.created_at),
    ...userJobs.map((j) => j.created_at),
  ]) {
    activityDates.add(dateKey(iso))
  }

  const stoodOut = userFeedback.map((f) => f.survey.stoodOut ?? [])
  const soundedOff = userFeedback.map((f) => f.survey.soundedOff ?? [])
  const missingFeatures = userFeedback
    .map((f) => f.survey.missing?.trim())
    .filter((s): s is string => Boolean(s))
  const featureRequests = userFeedback
    .flatMap((f) => [f.survey.oneChange, f.survey.worthPaying].map((s) => s?.trim()))
    .filter((s): s is string => Boolean(s))
  const bugsReported = [
    ...userSupport
      .filter((s) => /bug|error|crash|broken|glitch/i.test(`${s.subject} ${s.category ?? ""}`))
      .map((s) => s.subject.trim()),
    ...userFeedback
      .map((f) => f.survey.additional?.trim())
      .filter((s): s is string => Boolean(s && /bug|error|crash|broken|glitch/i.test(s))),
  ]

  const recommendTrend = userFeedback
    .slice()
    .reverse()
    .map((f) => ({
      date: dateKey(f.created_at),
      score: f.recommend_score,
    }))

  const supportIssues = tagCountsFromArrays(
    userSupport.map((s) => [s.subject, s.category].filter((x): x is string => Boolean(x?.trim()))),
  )

  const list = buildListRow(normalized, profile, userFeedback, userSupport, jobs)

  return {
    ...list,
    uploadCount,
    downloadCount,
    avgLufs,
    avgProcessingMs,
    activeDays: activityDates.size,
    totalUsageEvents: userFeedback.length + userSupport.length + userJobs.length + downloadCount,
    feedback: userFeedback,
    support: userSupport,
    sessions,
    positiveTags: tagCountsFromArrays(stoodOut),
    issueTags: tagCountsFromArrays(
      soundedOff.map((arr) => arr.filter((s) => s !== "No, it sounded good")),
    ),
    missingFeatures,
    featureRequests,
    bugsReported,
    recommendTrend,
    supportIssues,
  }
}

export async function upsertBetaProfile(input: {
  email: string
  name?: string | null
  genre: string
  daw: string
  betaRank?: BetaUserRank
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const email = normalizeBetaEmail(input.email)
  const genre = input.genre.trim()
  const daw = input.daw.trim()
  if (!email.includes("@")) return { error: "Valid email required" }
  if (!genre) return { error: "Genre required" }
  if (!daw) return { error: "DAW required" }

  const rank = input.betaRank && isBetaUserRank(input.betaRank) ? input.betaRank : "insider"

  const { data: existing } = await supabase
    .from(CUSTOMER_PROFILES_TABLE)
    .select("beta_signed_up_at")
    .eq("email", email)
    .maybeSingle()

  const body: Record<string, unknown> = {
    email,
    genre,
    daw,
    beta_rank: rank,
    updated_at: new Date().toISOString(),
  }
  if (input.name !== undefined) body.name = input.name?.trim() || null
  if (!existing?.beta_signed_up_at) body.beta_signed_up_at = new Date().toISOString()

  const { error } = await supabase.from(CUSTOMER_PROFILES_TABLE).upsert(body, { onConflict: "email" })
  if (error) return { error: error.message }
  return { ok: true }
}

export async function touchBetaProfileFromFeedback(
  email: string | null | undefined,
  genre: string | null | undefined,
): Promise<void> {
  const normalized = email?.trim().toLowerCase()
  if (!normalized?.includes("@")) return

  const supabase = createSupabaseServerClient()
  if (!supabase) return

  const { data: existing } = await supabase
    .from(CUSTOMER_PROFILES_TABLE)
    .select("genre")
    .eq("email", normalized)
    .maybeSingle()

  const body: Record<string, unknown> = {
    email: normalized,
    updated_at: new Date().toISOString(),
  }
  const g = genre?.trim()
  if (g && g !== "Unknown" && !existing?.genre) body.genre = g

  if (Object.keys(body).length <= 2) return

  await supabase.from(CUSTOMER_PROFILES_TABLE).upsert(body, { onConflict: "email" })
}

export async function getBetaProfileStatus(
  email: string,
): Promise<{ complete: boolean; profile: BetaProfileRow | null }> {
  const normalized = normalizeBetaEmail(email)
  const profiles = await fetchBetaProfileRows()
  const profile = profiles.find((p) => p.email === normalized) ?? null
  const complete = Boolean(profile?.beta_signed_up_at && profile.genre && profile.daw)
  return { complete, profile }
}

export { BETA_USER_RANKS }
