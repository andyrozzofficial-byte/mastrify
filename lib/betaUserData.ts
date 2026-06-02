import type {
  AdminFeedbackRow,
  AdminJobRow,
  AdminSupportRow,
  BetaDashboardSummary,
  BetaUserListRow,
  BetaUserProfile,
  BetaUserTagCount,
} from "./adminTypes"
import {
  buildBetaTimeline,
  calcEngagementScore,
  computeBetaBadges,
  engagementLevel,
  nextBetaRank,
} from "./betaEngagement"
import {
  BETA_USER_RANKS,
  betaRankLabel,
  isBetaUserRank,
  migrateLegacyRank,
  normalizeBetaEmail,
  type BetaUserRank,
} from "./betaAccess"
import {
  aggregateBetaActivityForEmail,
  buildBetaMasteringUiState,
  buildBetaRankProgress,
  calcBetaPoints,
  calcRecommendationScore,
  effectiveBetaRank,
  rewardStatusForRank,
  type BetaMasteringUiState,
} from "./betaPoints"
import { BETA_FEEDBACK_TABLE } from "./betaFeedbackDb"
import type { BetaFeedbackPayload } from "./betaFeedbackTypes"
import {
  CUSTOMER_PROFILES_TABLE,
  fetchAdminFeedback,
  fetchAdminFeedbackDatesForEmail,
  fetchAdminFeedbackForEmail,
  fetchAdminFeedbackMetaForEmail,
  fetchAdminJobs,
  fetchAdminSupport,
  fetchAdminSupportDatesForEmail,
  fetchAdminSupportForEmail,
  MASTERED_EXPORTS_TABLE,
  PIPELINE_EVENTS_TABLE,
} from "./adminData"
import { panelTimedAsync, panelTimedSync } from "./betaPanelPerf"
import { supabaseTimed } from "./supabaseTimed"
import {
  buildBetaProfilePanelData,
  mapRecentActivityFromTimeline,
  mergeBetaProfilePanelSecondary,
  type BetaProfilePanelData,
  type BetaProfilePanelSecondary,
} from "./betaProfilePanel"
import { findBetaProfileByEmail, upsertCustomerProfileRow } from "./betaProfileDb"
import {
  countBetaDownloadsForEmail,
  fetchBetaMasterCompletionsForEmailFast,
  fetchBetaMasterCompletionsTableForEmail,
  fetchCompletionsGroupedForEmails,
  type BetaMasterCompletionRow,
} from "./betaMasterTracking"
import { countBetaIssuesForEmail, fetchBetaIssuesForEmail } from "./betaIssues"
import { createSupabaseServerClient } from "./supabaseServer"
import { formatSupabaseTableError } from "./supabaseSchemaErrors"

type BetaProfileRow = {
  email: string
  name: string | null
  genre: string | null
  daw: string | null
  beta_rank: string | null
  beta_signed_up_at: string | null
  notes: string | null
  beta_approved: boolean
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

/** Distinct sessions from beta_master_completions + pipeline (used for Insider points). */
function countTrackedMasterCompletions(completions: BetaMasterCompletionRow[]): number {
  const sessions = new Set(
    completions.map((c) => c.session_id).filter((sid): sid is string => Boolean(sid?.trim())),
  )
  return sessions.size
}

/**
 * Admin display count — completions, completed jobs, and feedback sessions (legacy parity).
 */
function countAdminDisplayMasters(
  completions: BetaMasterCompletionRow[],
  userJobs: AdminJobRow[] = [],
  email = "",
  userFeedback: AdminFeedbackRow[] = [],
): number {
  const sessions = new Set(
    completions.map((c) => c.session_id).filter((sid): sid is string => Boolean(sid?.trim())),
  )
  let count = sessions.size
  const normalized = email.trim().toLowerCase()
  if (!normalized.includes("@")) return count

  for (const job of userJobs) {
    if (job.status !== "complete") continue
    if (job.user_email?.trim().toLowerCase() !== normalized) continue
    const sid = job.session_id?.trim()
    if (sid) {
      if (sessions.has(sid)) continue
      sessions.add(sid)
      count++
      continue
    }
    count++
  }

  for (const fb of userFeedback) {
    if (fb.contact_email?.trim().toLowerCase() !== normalized) continue
    const sid = fb.session_id?.trim()
    if (sid) {
      if (sessions.has(sid)) continue
      sessions.add(sid)
      count++
      continue
    }
    count++
  }

  return count
}

/** Feedback rows that should not also earn a separate feedback point when a master completion exists. */
function countFeedbackForPoints(
  userFeedback: AdminFeedbackRow[],
  completions: BetaMasterCompletionRow[],
): number {
  const completionSessions = new Set(
    completions.map((c) => c.session_id).filter((sid): sid is string => Boolean(sid?.trim())),
  )
  return userFeedback.filter((f) => {
    const sid = f.session_id?.trim()
    if (sid && completionSessions.has(sid)) return false
    return true
  }).length
}

/** Count signups that stored `referred_by:<email>` in profile notes (no extra tables). */
async function buildCreatorInviteCountByReferrer(): Promise<Map<string, number>> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return new Map()

  const { data, error } = await supabase
    .from(CUSTOMER_PROFILES_TABLE)
    .select("notes")
    .ilike("notes", "%referred_by:%")

  if (error) return new Map()

  const map = new Map<string, number>()
  for (const row of data ?? []) {
    const notes = row.notes
    if (typeof notes !== "string") continue
    const match = notes.match(/referred_by:([^\s,;]+)/i)
    if (!match?.[1]) continue
    const ref = normalizeBetaEmail(match[1])
    map.set(ref, (map.get(ref) ?? 0) + 1)
  }
  return map
}

export async function countCreatorInvitesForEmail(email: string): Promise<number> {
  const normalized = normalizeBetaEmail(email)
  if (!normalized.includes("@")) return 0

  const supabase = createSupabaseServerClient()
  if (!supabase) return 0

  const { count, error } = await supabase
    .from(CUSTOMER_PROFILES_TABLE)
    .select("email", { count: "exact", head: true })
    .ilike("notes", `%referred_by:${normalized}%`)

  if (error) return 0
  return count ?? 0
}

export function feedbackMetaAsRows(
  email: string,
  meta: Awaited<ReturnType<typeof fetchAdminFeedbackMetaForEmail>>,
): AdminFeedbackRow[] {
  return meta.map((m) => ({
    id: m.id,
    created_at: m.created_at,
    updated_at: m.created_at,
    status: "open",
    session_id: m.session_id,
    track_name: null,
    track_duration: null,
    mastering_style: null,
    contact_email: email,
    contact_discord: null,
    recommend_score: 0,
    use_again_score: 0,
    ease_rating: 0,
    genre: "",
    role: "",
    release_ready: "",
    admin_notes: m.admin_notes,
    processing_time_ms: null,
    master_lufs: null,
    stereo_width: null,
    low_end: null,
    survey: {},
    feedback_stage: "completed",
  }))
}

function activeDaysFromTimestamps(
  profileRow: BetaProfileRow | null,
  timestamps: string[],
): number {
  const activityDates = new Set<string>()
  for (const iso of timestamps) activityDates.add(dateKey(iso))
  if (profileRow?.beta_signed_up_at) activityDates.add(dateKey(profileRow.beta_signed_up_at))
  return activityDates.size
}

export async function syncBetaProfileFromActivity(email: string): Promise<void> {
  const normalized = normalizeBetaEmail(email)
  if (!normalized.includes("@")) return

  const supabase = createSupabaseServerClient()
  if (!supabase) return

  const profile = await fetchBetaProfileByEmail(normalized)
  const [userFeedback, userSupport, completions, issueReportCount, creatorInviteCount] =
    await Promise.all([
      fetchAdminFeedbackForEmail(normalized),
      fetchAdminSupportForEmail(normalized),
      fetchBetaMasterCompletionsForEmailFast(normalized),
      countBetaIssuesForEmail(normalized),
      countCreatorInvitesForEmail(normalized),
    ])

  const counts = aggregateBetaActivityForEmail(
    normalized,
    userFeedback,
    userSupport,
    [],
    creatorInviteCount,
    countTrackedMasterCompletions(completions),
    issueReportCount,
    countFeedbackForPoints(userFeedback, completions),
  )
  const points = calcBetaPoints(counts)
  const rank = effectiveBetaRank(profile?.beta_rank, points)

  await upsertCustomerProfileRow(
    {
      email: normalized,
      beta_rank: rank,
      updated_at: new Date().toISOString(),
    },
    supabase,
  )
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

function mapBetaProfileRow(row: {
  email: string
  name?: string | null
  genre?: string | null
  daw?: string | null
  beta_rank?: string | null
  beta_signed_up_at?: string | null
  notes?: string | null
  beta_approved?: boolean | null
}): BetaProfileRow {
  return {
    email: row.email.toLowerCase(),
    name: row.name ?? null,
    genre: row.genre ?? null,
    daw: row.daw ?? null,
    beta_rank: row.beta_rank ?? null,
    beta_signed_up_at: row.beta_signed_up_at ?? null,
    notes: row.notes ?? null,
    beta_approved: Boolean(row.beta_approved),
  }
}

export async function fetchBetaProfileByEmail(email: string): Promise<BetaProfileRow | null> {
  const normalized = normalizeBetaEmail(email)
  const row = await findBetaProfileByEmail(normalized)
  if (!row?.email) return null
  return mapBetaProfileRow({
    email: row.email,
    name: row.name,
    genre: row.genre,
    daw: row.daw,
    beta_rank: row.beta_rank,
    beta_signed_up_at: row.beta_signed_up_at ?? row.created_at,
    notes: row.notes,
    beta_approved: row.beta_approved,
  })
}

async function fetchBetaProfileRows(): Promise<BetaProfileRow[]> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from(CUSTOMER_PROFILES_TABLE)
    .select("email, name, genre, daw, beta_rank, beta_signed_up_at, notes, beta_approved")
    .order("beta_signed_up_at", { ascending: false, nullsFirst: false })
    .limit(2000)

  if (error) {
    if (/beta_approved|does not exist/i.test(error.message)) {
      const fallback = await supabase
        .from(CUSTOMER_PROFILES_TABLE)
        .select("email, name, genre, daw, beta_rank, beta_signed_up_at, notes")
        .order("beta_signed_up_at", { ascending: false, nullsFirst: false })
      return (fallback.data ?? []).map((row) => mapBetaProfileRow({ ...row, beta_approved: false }))
    }
    return []
  }
  return (data ?? []).map((row) => mapBetaProfileRow(row))
}

async function fetchExportsForEmail(email: string) {
  const supabase = createSupabaseServerClient()
  if (!supabase) return [] as { id: string; created_at: string; track_title?: string | null }[]

  const { data, error } = await supabase
    .from(MASTERED_EXPORTS_TABLE)
    .select("id, created_at, track_title")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) return []
  return data ?? []
}

async function fetchPipelineUploadsForSessions(
  sessions: string[],
): Promise<{ session_id: string; created_at: string }[]> {
  if (!sessions.length) return []
  const supabase = createSupabaseServerClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from(PIPELINE_EVENTS_TABLE)
    .select("session_id, created_at")
    .eq("event_type", "upload")
    .in("session_id", sessions.slice(0, 200))
    .order("created_at", { ascending: false })

  if (error) return []
  return (data ?? []).filter((r) => r.session_id) as { session_id: string; created_at: string }[]
}

function engagementForUser(
  masterCount: number,
  feedbackCount: number,
  supportCount: number,
  activeDays: number,
) {
  const engagementScore = calcEngagementScore({
    masterCount,
    feedbackCount,
    supportCount,
    activeDays,
  })
  return { engagementScore, engagementLevel: engagementLevel(engagementScore) }
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
  creatorInviteCount: number,
  completions: BetaMasterCompletionRow[],
  issueReportCount: number,
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
  const trackedMasterCount = countTrackedMasterCompletions(completions)
  const masterCount = countAdminDisplayMasters(completions, jobs, email, userFeedback)
  const feedbackCountForPoints = countFeedbackForPoints(userFeedback, completions)
  const activeDaySet = new Set<string>()
  for (const iso of lastTimes) activeDaySet.add(dateKey(iso))
  if (profile?.beta_signed_up_at) activeDaySet.add(dateKey(profile.beta_signed_up_at))

  const { engagementScore, engagementLevel: level } = engagementForUser(
    masterCount,
    userFeedback.length,
    userSupport.length,
    activeDaySet.size,
  )

  const counts = aggregateBetaActivityForEmail(
    email,
    userFeedback,
    userSupport,
    jobs,
    creatorInviteCount,
    trackedMasterCount,
    issueReportCount,
    feedbackCountForPoints,
  )
  const betaPoints = calcBetaPoints(counts)
  const rankKey = effectiveBetaRank(profile?.beta_rank, betaPoints)
  const rankProgress = buildBetaRankProgress(betaPoints)

  return {
    email,
    name: displayName(email, profile?.name ?? userSupport[0]?.name ?? null),
    genre: genre && genre !== "Unknown" ? genre : genre,
    daw: profile?.daw ?? null,
    betaRank: betaRankLabel(rankKey),
    betaPoints,
    rewardStatus: rewardStatusForRank(rankKey),
    signupDate: profile?.beta_signed_up_at ?? null,
    masterCount,
    feedbackCount: userFeedback.length,
    supportCount: userSupport.length,
    issueReportCount,
    avgRecommend: calcRecommendationScore(userFeedback),
    topStyle: topLabel(styles),
    topIssue: topLabel(soundedOff, new Set(["No, it sounded good"])),
    lastActivity: formatBetaLastActive(lastActivity),
    engagementScore,
    engagementLevel: level,
    rankProgress,
  }
}

export async function getBetaMasteringUiStateForEmail(
  email: string,
): Promise<BetaMasteringUiState | null> {
  return buildBetaMasteringUiForEmailScoped(email)
}

export type BetaMasterCompleteStats = {
  betaUi: BetaMasteringUiState
  masterCount: number
  completionsCount: number
}

/** Lightweight post-completion stats — scoped queries only. */
export async function buildBetaMasterCompleteStats(
  email: string,
  opts?: { completions?: BetaMasterCompletionRow[] },
): Promise<BetaMasterCompleteStats | null> {
  const normalized = normalizeBetaEmail(email)
  if (!normalized.includes("@")) return null

  const completionsFetch = opts?.completions
    ? Promise.resolve(opts.completions)
    : supabaseTimed(
        "select",
        () => fetchBetaMasterCompletionsTableForEmail(normalized),
        { caller: "buildBetaMasterCompleteStats", table: "beta_master_completions" },
      )

  const [profileRow, feedbackMeta, completions, issueCount] = await Promise.all([
    supabaseTimed("select", () => fetchBetaProfileByEmail(normalized), {
      caller: "buildBetaMasterCompleteStats",
      table: "admin_customer_profiles",
    }),
    supabaseTimed("select", () => fetchAdminFeedbackMetaForEmail(normalized), {
      caller: "buildBetaMasterCompleteStats",
      table: "beta_master_feedback",
    }),
    completionsFetch,
    supabaseTimed("count", () => countBetaIssuesForEmail(normalized), {
      caller: "buildBetaMasterCompleteStats",
      table: "beta_reported_issues",
    }),
  ])

  if (!profileRow) return null

  const userFeedback = feedbackMetaAsRows(normalized, feedbackMeta)
  const list = buildListRow(
    normalized,
    profileRow,
    userFeedback,
    [],
    [],
    0,
    completions,
    issueCount,
  )

  return {
    betaUi: buildBetaMasteringUiState({
      betaRank: list.betaRank,
      betaPoints: list.betaPoints,
      rankProgress: list.rankProgress,
      rewardStatus: list.rewardStatus,
    }),
    masterCount: countTrackedMasterCompletions(completions),
    completionsCount: completions.length,
  }
}

/** Scoped beta UI with real points — replaces legacy full-table profile load. */
export async function buildBetaMasteringUiForEmailScoped(
  email: string,
): Promise<BetaMasteringUiState | null> {
  const stats = await buildBetaMasterCompleteStats(email)
  return stats?.betaUi ?? null
}

/** @deprecated Use fetchBetaUserProfileScoped */
export async function fetchBetaUserProfile(email: string): Promise<BetaUserProfile | { error: string }> {
  return fetchBetaUserProfileScoped(email)
}

/** Fast beta UI for gate/signup — single profile row, no admin-wide aggregates. */
export async function buildBetaUiForEmail(email: string): Promise<BetaMasteringUiState | null> {
  const normalized = normalizeBetaEmail(email)
  if (!normalized.includes("@")) return null

  const profile = await fetchBetaProfileByEmail(normalized)
  if (!profile) return null

  const rank = effectiveBetaRank(profile.beta_rank, 0)
  return buildBetaMasteringUiState({
    betaRank: betaRankLabel(rank),
    betaPoints: 0,
    rankProgress: buildBetaRankProgress(0),
    rewardStatus: rewardStatusForRank(rank),
  })
}

export async function fetchBetaUsers(): Promise<BetaUserListRow[] | { error: string }> {
  const [feedback, support, jobsRes, profiles] = await Promise.all([
    fetchAdminFeedback(),
    fetchAdminSupport(),
    fetchAdminJobs(),
    fetchBetaProfileRows(),
  ])

  if (isFetchError(feedback)) return feedback
  const supportError = isFetchError(support) ? support.error : null
  const jobs = isFetchError(jobsRes) ? [] : jobsRes
  const supportRows = isFetchError(support) ? [] : support

  const profileByEmail = new Map(profiles.map((p) => [p.email, p]))
  const emails = collectEmails(profiles, feedback, supportRows)

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
  for (const row of supportRows) {
    const e = row.email.trim().toLowerCase()
    const list = supportByEmail.get(e) ?? []
    list.push(row)
    supportByEmail.set(e, list)
  }

  const [inviteMap, completionsByEmail, issueCountByEmail] = await Promise.all([
    buildCreatorInviteCountByReferrer(),
    fetchCompletionsGroupedForEmails(emails),
    fetchIssueCountsByEmail(),
  ])

  const rows = emails.map((email) =>
    buildListRow(
      email,
      profileByEmail.get(email),
      feedbackByEmail.get(email) ?? [],
      supportByEmail.get(email) ?? [],
      jobs,
      inviteMap.get(email) ?? 0,
      completionsByEmail.get(email) ?? [],
      issueCountByEmail.get(email) ?? 0,
    ),
  )

  if (supportError) console.error("[admin-beta-users] support inbox unavailable", supportError)
  return rows.sort((a, b) => {
    if (b.betaPoints !== a.betaPoints) return b.betaPoints - a.betaPoints
    if (b.engagementScore !== a.engagementScore) return b.engagementScore - a.engagementScore
    return (b.signupDate ?? "").localeCompare(a.signupDate ?? "")
  })
}

export async function fetchBetaUserProfileScoped(
  email: string,
): Promise<BetaUserProfile | { error: string }> {
  const normalized = normalizeBetaEmail(email)
  const profile = await fetchBetaProfileByEmail(normalized)
  if (!profile) return { error: "Profile not found" }

  const [userFeedback, userSupport, completions, reportedIssues, downloadCount, creatorInviteCount] =
    await Promise.all([
      fetchAdminFeedbackForEmail(normalized),
      fetchAdminSupportForEmail(normalized),
      fetchBetaMasterCompletionsForEmailFast(normalized),
      fetchBetaIssuesForEmail(normalized),
      countBetaDownloadsForEmail(normalized),
      countCreatorInvitesForEmail(normalized),
    ])

  const userJobs: AdminJobRow[] = []
  const sessions = [
    ...new Set(userFeedback.map((f) => f.session_id).filter((s): s is string => Boolean(s))),
  ]

  const uploadCount = await fetchUploadCountsBySession(sessions)

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
    ...completions.map((c) => c.completed_at),
    ...reportedIssues.map((i) => i.created_at),
  ]) {
    activityDates.add(dateKey(iso))
  }
  if (profile.beta_signed_up_at) activityDates.add(dateKey(profile.beta_signed_up_at))

  const stoodOut = userFeedback.map((f) => f.survey.stoodOut ?? [])
  const soundedOff = userFeedback.map((f) => f.survey.soundedOff ?? [])
  const missingFeatures = userFeedback
    .map((f) => f.survey.missing?.trim())
    .filter((s): s is string => Boolean(s))
  const featureRequests = userFeedback
    .flatMap((f) => [f.survey.oneChange, f.survey.worthPaying].map((s) => s?.trim()))
    .filter((s): s is string => Boolean(s))
  const issuesReported = reportedIssues.map((i) => i.title)

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

  const list = buildListRow(
    normalized,
    profile,
    userFeedback,
    userSupport,
    userJobs,
    creatorInviteCount,
    completions,
    reportedIssues.length,
  )
  const userExports = await fetchExportsForEmail(normalized)
  const pipelineUploads = await fetchPipelineUploadsForSessions(sessions)
  const badges = computeBetaBadges({
    masterCount: list.masterCount,
    feedbackCount: list.feedbackCount,
    issueReportCount: list.issueReportCount,
    engagementLevel: list.engagementLevel,
    betaRank: profile.beta_rank,
  })
  const timeline = buildBetaTimeline({
    signupAt: profile.beta_signed_up_at ?? null,
    uploads: pipelineUploads,
    userFeedback,
    userJobs,
    userSupport,
    exports: userExports,
    completions,
    issues: reportedIssues.map((i) => ({
      id: i.id,
      title: i.title,
      created_at: i.created_at,
    })),
  })

  return {
    ...list,
    uploadCount,
    downloadCount,
    avgLufs,
    avgProcessingMs,
    activeDays: activityDates.size,
    totalUsageEvents: userFeedback.length + userSupport.length + downloadCount,
    betaApproved: profile.beta_approved ?? false,
    adminNotes: profile.notes ?? null,
    badges,
    timeline,
    feedback: userFeedback,
    support: userSupport,
    sessions,
    positiveTags: tagCountsFromArrays(stoodOut),
    issueTags: tagCountsFromArrays(
      soundedOff.map((arr) => arr.filter((s) => s !== "No, it sounded good")),
    ),
    missingFeatures,
    featureRequests,
    issuesReported,
    recommendTrend,
    supportIssues,
  }
}

type SummaryUserRow = {
  email: string
  name: string | null
  signupDate: string | null
  betaRank: string
  feedbackCount: number
  supportCount: number
  issueReportCount: number
  engagementScore: number
  engagementLevel: ReturnType<typeof engagementLevel>
}

async function fetchIssueCountsByEmail(): Promise<Map<string, number>> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return new Map()

  const { data, error } = await supabase
    .from("beta_reported_issues")
    .select("reporter_email, user_id")
    .limit(500)

  if (error) return new Map()

  const map = new Map<string, number>()
  for (const row of data ?? []) {
    const email = String(row.reporter_email ?? row.user_id ?? "")
      .trim()
      .toLowerCase()
    if (!email.includes("@")) continue
    map.set(email, (map.get(email) ?? 0) + 1)
  }
  return map
}

/** Lightweight dashboard widgets — avoids fetchBetaUsers() and per-email N+1 queries. */
export async function fetchBetaDashboardSummary(): Promise<BetaDashboardSummary | { error: string }> {
  const { getCachedBetaDashboardSummary, setCachedBetaDashboardSummary } = await import(
    "./betaDashboardSummaryCache"
  )
  const cached = getCachedBetaDashboardSummary()
  if (cached) return cached

  const summary = await fetchBetaDashboardSummaryUncached()
  if (!("error" in summary)) setCachedBetaDashboardSummary(summary)
  return summary
}

async function fetchBetaDashboardSummaryUncached(): Promise<BetaDashboardSummary | { error: string }> {
  const profiles = await fetchBetaProfileRows()
  const [feedback, support, issueCounts] = await Promise.all([
    fetchAdminFeedback(),
    fetchAdminSupport(),
    fetchIssueCountsByEmail(),
  ])

  if (isFetchError(feedback)) return feedback
  const supportError = isFetchError(support) ? support.error : null
  const supportRows = isFetchError(support) ? [] : support

  const feedbackByEmail = new Map<string, { count: number; sessions: Set<string>; dates: string[] }>()
  for (const row of feedback) {
    const email = row.contact_email?.trim().toLowerCase()
    if (!email) continue
    const bucket = feedbackByEmail.get(email) ?? { count: 0, sessions: new Set<string>(), dates: [] }
    bucket.count += 1
    if (row.session_id) bucket.sessions.add(row.session_id)
    bucket.dates.push(row.created_at)
    feedbackByEmail.set(email, bucket)
  }

  const supportByEmail = new Map<string, number>()
  for (const row of supportRows) {
    const email = row.email.trim().toLowerCase()
    supportByEmail.set(email, (supportByEmail.get(email) ?? 0) + 1)
  }

  const emails = collectEmails(profiles, feedback, supportRows)
  const profileByEmail = new Map(profiles.map((p) => [p.email, p]))

  const users: SummaryUserRow[] = emails.map((email) => {
    const profile = profileByEmail.get(email)
    const fb = feedbackByEmail.get(email)
    const feedbackCount = fb?.count ?? 0
    const supportCount = supportByEmail.get(email) ?? 0
    const issueReportCount = issueCounts.get(email) ?? 0
    const activeDays = new Set<string>()
    for (const iso of fb?.dates ?? []) activeDays.add(dateKey(iso))
    if (profile?.beta_signed_up_at) activeDays.add(dateKey(profile.beta_signed_up_at))
    const masterCount = fb?.sessions.size ?? 0
    const { engagementScore, engagementLevel: level } = engagementForUser(
      masterCount,
      feedbackCount,
      supportCount,
      activeDays.size,
    )
    return {
      email,
      name: displayName(email, profile?.name ?? null),
      signupDate: profile?.beta_signed_up_at ?? null,
      betaRank: betaRankLabel(effectiveBetaRank(profile?.beta_rank, 0)),
      feedbackCount,
      supportCount,
      issueReportCount,
      engagementScore,
      engagementLevel: level,
    }
  })

  const mostActive = [...users]
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 5)
    .map((u) => ({
      email: u.email,
      name: u.name,
      engagementScore: u.engagementScore,
      engagementLevel: u.engagementLevel,
    }))

  const recentSignups = [...users]
    .filter((u) => u.signupDate)
    .sort((a, b) => (b.signupDate ?? "").localeCompare(a.signupDate ?? ""))
    .slice(0, 5)
    .map((u) => ({
      email: u.email,
      name: u.name,
      signupDate: u.signupDate!,
      betaRank: u.betaRank,
    }))

  const topFeedbackContributors = [...users]
    .filter((u) => u.feedbackCount > 0)
    .sort((a, b) => b.feedbackCount - a.feedbackCount)
    .slice(0, 5)
    .map((u) => ({ email: u.email, name: u.name, feedbackCount: u.feedbackCount }))

  const topIssueReporters = [...users]
    .filter((u) => u.issueReportCount > 0)
    .sort((a, b) => b.issueReportCount - a.issueReportCount)
    .slice(0, 5)
    .map((u) => ({
      email: u.email,
      name: u.name,
      issueReportCount: u.issueReportCount,
    }))

  if (supportError) console.error("[admin-beta-summary] support inbox unavailable", supportError)
  return { mostActive, recentSignups, topFeedbackContributors, topIssueReporters }
}

export async function updateBetaProfileAdmin(
  email: string,
  patch: {
    notes?: string | null
    betaApproved?: boolean
    betaRank?: BetaUserRank
    promoteRank?: boolean
  },
): Promise<{ ok: true; betaRank?: string } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const normalized = normalizeBetaEmail(email)
  const { data: existing } = await supabase
    .from(CUSTOMER_PROFILES_TABLE)
    .select("beta_rank")
    .eq("email", normalized)
    .maybeSingle()

  const body: Record<string, unknown> = {
    email: normalized,
    updated_at: new Date().toISOString(),
  }

  if (patch.notes !== undefined) body.notes = patch.notes
  if (patch.betaApproved !== undefined) body.beta_approved = patch.betaApproved

  let newRank: string | undefined
  if (patch.promoteRank) {
    newRank = nextBetaRank(existing?.beta_rank)
    body.beta_rank = newRank
  } else if (patch.betaRank) {
    newRank = patch.betaRank
    body.beta_rank = newRank
  }

  const { error } = await supabase.from(CUSTOMER_PROFILES_TABLE).upsert(body, { onConflict: "email" })
  if (error) {
    return {
      error: formatSupabaseTableError(CUSTOMER_PROFILES_TABLE, error.message, error.code),
    }
  }
  const refreshed = await fetchBetaProfileByEmail(normalized)
  const displayRank = newRank ? betaRankLabel(newRank) : betaRankLabel(refreshed?.beta_rank)
  return { ok: true, betaRank: displayRank }
}

export type RegisterBetaOnboardingResult =
  | { ok: true; existing: boolean }
  | { error: string }

/** Fast Join Beta signup — email (+ optional name) only; genre/DAW collected after mastering. */
export async function registerBetaOnboarding(input: {
  email: string
  name?: string | null
}): Promise<RegisterBetaOnboardingResult> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const email = normalizeBetaEmail(input.email)
  if (!email.includes("@")) return { error: "Valid email required" }

  const existing = await findBetaProfileByEmail(email, supabase)
  if (existing?.email) {
    console.log("[beta] existing profile found")
    const touch: Record<string, unknown> = {
      email,
      updated_at: new Date().toISOString(),
    }
    if (input.name !== undefined) touch.name = input.name?.trim() || null
    if (existing.genre) touch.genre = existing.genre
    if (existing.daw) touch.daw = existing.daw
    if (existing.beta_rank && isBetaUserRank(existing.beta_rank)) {
      touch.beta_rank = migrateLegacyRank(existing.beta_rank)
    } else if (!existing.beta_signed_up_at) {
      touch.beta_rank = "explorer"
    }
    if (!existing.beta_signed_up_at) {
      touch.beta_signed_up_at = new Date().toISOString()
    }

    const touchResult = await upsertCustomerProfileRow(touch, supabase)
    if ("error" in touchResult) {
      console.error("[beta] create profile failed:", touchResult.error)
      return { error: touchResult.error }
    }

    return { ok: true, existing: true }
  }

  const body: Record<string, unknown> = {
    email,
    name: input.name?.trim() || null,
    beta_rank: "explorer",
    beta_signed_up_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const upsertResult = await upsertCustomerProfileRow(body, supabase)
  if ("error" in upsertResult) {
    console.error("[beta] create profile failed:", upsertResult.error)
    return { error: upsertResult.error }
  }

  return { ok: true, existing: false }
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

  const rank =
    input.betaRank && isBetaUserRank(input.betaRank) ? migrateLegacyRank(input.betaRank) : "explorer"

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

  const upsertResult = await upsertCustomerProfileRow(body, supabase)
  if ("error" in upsertResult) {
    return { error: upsertResult.error }
  }
  return { ok: true }
}

export async function touchBetaProfileFromFeedback(
  email: string | null | undefined,
  genre: string | null | undefined,
  daw?: string | null | undefined,
): Promise<void> {
  const normalized = email?.trim().toLowerCase()
  if (!normalized?.includes("@")) return

  const supabase = createSupabaseServerClient()
  if (!supabase) return

  const body: Record<string, unknown> = {
    email: normalized,
    updated_at: new Date().toISOString(),
  }
  const g = genre?.trim()
  const d = daw?.trim()
  if (g && g !== "Unknown") body.genre = g
  if (d) body.daw = d

  await upsertCustomerProfileRow(body, supabase)
}

/** Critical panel stats (points, rank, level, masters) — no heavy lists. */
export async function fetchBetaProfilePanelCoreForEmail(
  email: string,
): Promise<{ ok: true; panel: BetaProfilePanelData } | { error: string }> {
  const normalized = normalizeBetaEmail(email)
  if (!normalized.includes("@")) return { error: "Valid email required" }

  const { getCachedBetaPanelCoreServer, setCachedBetaPanelCoreServer } = await import(
    "./betaPanelServerCache"
  )
  const cached = getCachedBetaPanelCoreServer(normalized)
  if (cached) return { ok: true, panel: cached }

  const profileRow = await panelTimedAsync("profile query", () => fetchBetaProfileByEmail(normalized))
  if (!profileRow) return { error: "Profile not found" }

  const [
    feedbackMeta,
    supportDates,
    completions,
    issueCount,
    downloadCount,
    creatorInviteCount,
  ] = await Promise.all([
    panelTimedAsync("feedback query", () => fetchAdminFeedbackMetaForEmail(normalized)),
    panelTimedAsync("support dates query", () => fetchAdminSupportDatesForEmail(normalized)),
    panelTimedAsync("completions query", () => fetchBetaMasterCompletionsForEmailFast(normalized)),
    panelTimedAsync("issues count query", () => countBetaIssuesForEmail(normalized)),
    panelTimedAsync("downloads query", () => countBetaDownloadsForEmail(normalized)),
    panelTimedAsync("invites query", () => countCreatorInvitesForEmail(normalized)),
  ])

  const userFeedback = panelTimedSync("rank calculation", () =>
    feedbackMetaAsRows(normalized, feedbackMeta),
  )
  const userJobs: AdminJobRow[] = []
  const list = buildListRow(
    normalized,
    profileRow,
    userFeedback,
    [],
    userJobs,
    creatorInviteCount,
    completions,
    issueCount,
  )

  const activeDays = activeDaysFromTimestamps(profileRow, [
    ...feedbackMeta.map((m) => m.created_at),
    ...supportDates,
    ...completions.map((c) => c.completed_at),
  ])

  const panelProfile: BetaUserProfile = {
    ...list,
    issueReportCount: issueCount,
    uploadCount: 0,
    downloadCount,
    avgLufs: null,
    avgProcessingMs: null,
    activeDays,
    totalUsageEvents: feedbackMeta.length + supportDates.length + downloadCount,
    betaApproved: profileRow.beta_approved ?? false,
    adminNotes: profileRow.notes ?? null,
    badges: [],
    timeline: [],
    feedback: [],
    support: [],
    sessions: [],
    positiveTags: [],
    issueTags: [],
    missingFeatures: [],
    featureRequests: [],
    issuesReported: [],
    recommendTrend: [],
    supportIssues: [],
  }

  const panel = buildBetaProfilePanelData(panelProfile)
  setCachedBetaPanelCoreServer(normalized, panel)
  return { ok: true, panel }
}

/** Timeline + refined active days — load after panel opens. */
export async function fetchBetaProfilePanelSecondaryForEmail(
  email: string,
): Promise<{ ok: true; secondary: BetaProfilePanelSecondary } | { error: string }> {
  const normalized = normalizeBetaEmail(email)
  if (!normalized.includes("@")) return { error: "Valid email required" }

  const profileRow = await panelTimedAsync("profile query (secondary)", () =>
    fetchBetaProfileByEmail(normalized),
  )

  const [userFeedback, userSupport, completions, reportedIssues] = await Promise.all([
    panelTimedAsync("feedback query", () => fetchAdminFeedbackForEmail(normalized)),
    panelTimedAsync("support query", () => fetchAdminSupportForEmail(normalized)),
    panelTimedAsync("completions query", () => fetchBetaMasterCompletionsForEmailFast(normalized)),
    panelTimedAsync("issues query", () => fetchBetaIssuesForEmail(normalized)),
  ])

  const userJobs: AdminJobRow[] = []
  const activityDates = new Set<string>()
  for (const iso of [
    ...userFeedback.map((f) => f.created_at),
    ...userSupport.map((s) => s.created_at),
    ...completions.map((c) => c.completed_at),
    ...reportedIssues.map((i) => i.created_at),
  ]) {
    activityDates.add(dateKey(iso))
  }
  if (profileRow?.beta_signed_up_at) activityDates.add(dateKey(profileRow.beta_signed_up_at))

  const timeline = buildBetaTimeline({
    signupAt: profileRow?.beta_signed_up_at ?? null,
    uploads: [],
    userFeedback,
    userJobs,
    userSupport,
    exports: [],
    completions,
    issues: reportedIssues.map((i) => ({
      id: i.id,
      title: i.title,
      created_at: i.created_at,
    })),
  })

  return {
    ok: true,
    secondary: {
      recentActivity: mapRecentActivityFromTimeline(timeline),
      activity: { activeDays: activityDates.size },
    },
  }
}

/** Full panel (core + secondary) — used by write paths that return an updated panel. */
export async function fetchBetaProfilePanelForEmail(
  email: string,
): Promise<{ ok: true; panel: BetaProfilePanelData } | { error: string }> {
  const core = await fetchBetaProfilePanelCoreForEmail(email)
  if ("error" in core) return core
  const secondary = await fetchBetaProfilePanelSecondaryForEmail(email)
  if ("error" in secondary) return { ok: true, panel: core.panel }
  return {
    ok: true,
    panel: mergeBetaProfilePanelSecondary(core.panel, secondary.secondary),
  }
}

export async function getBetaProfileStatus(
  email: string,
): Promise<{ complete: boolean; profileDetailsComplete: boolean; profile: BetaProfileRow | null }> {
  const profile = await fetchBetaProfileByEmail(email)
  const complete = Boolean(profile?.beta_signed_up_at)
  const profileDetailsComplete = Boolean(profile?.genre && profile.daw)
  return { complete, profileDetailsComplete, profile }
}

export { BETA_USER_RANKS }
