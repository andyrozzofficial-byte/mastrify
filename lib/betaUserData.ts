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
  fetchAdminJobs,
  fetchAdminSupport,
  MASTERED_EXPORTS_TABLE,
  PIPELINE_EVENTS_TABLE,
} from "./adminData"
import { findBetaProfileByEmail, upsertCustomerProfileRow } from "./betaProfileDb"
import {
  countBetaDownloadsForEmail,
  fetchBetaMasterCompletionsForEmail,
  type BetaMasterCompletionRow,
} from "./betaMasterTracking"
import { countBetaIssuesForEmail, fetchBetaIssuesForEmail } from "./betaIssues"
import { buildBetaProfilePanelData, type BetaProfilePanelData } from "./betaProfilePanel"
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
 * Admin display count — matches legacy Beta Users (completed admin_master_jobs per email).
 * Includes feedback-synced jobs when the dedicated completions table has no rows yet.
 */
function countAdminDisplayMasters(
  completions: BetaMasterCompletionRow[],
  userJobs: AdminJobRow[] = [],
  email = "",
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
  return count
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

export async function syncBetaProfileFromActivity(email: string): Promise<void> {
  const normalized = normalizeBetaEmail(email)
  if (!normalized.includes("@")) return

  const supabase = createSupabaseServerClient()
  if (!supabase) return

  const profile = await fetchBetaProfileByEmail(normalized)
  const [feedback, support, jobsRes] = await Promise.all([
    fetchAdminFeedback(),
    fetchAdminSupport(),
    fetchAdminJobs(),
  ])
  if (isFetchError(feedback) || isFetchError(support)) return
  const jobs = isFetchError(jobsRes) ? [] : jobsRes

  const userFeedback = feedback.filter((f) => f.contact_email?.toLowerCase() === normalized)
  const userSupport = support.filter((s) => s.email.toLowerCase() === normalized)
  const [completions, issueReportCount] = await Promise.all([
    fetchBetaMasterCompletionsForEmail(normalized),
    countBetaIssuesForEmail(normalized),
  ])
  const inviteMap = await buildCreatorInviteCountByReferrer()
  const counts = aggregateBetaActivityForEmail(
    normalized,
    userFeedback,
    userSupport,
    jobs,
    inviteMap.get(normalized) ?? 0,
    countTrackedMasterCompletions(completions),
    issueReportCount,
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
  const masterCount = countAdminDisplayMasters(completions, jobs, email)
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
  const profile = await fetchBetaUserProfile(email)
  if ("error" in profile) return null
  return buildBetaMasteringUiState({
    betaRank: profile.betaRank,
    betaPoints: profile.betaPoints,
    rankProgress: profile.rankProgress,
    rewardStatus: profile.rewardStatus,
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

  const inviteMap = await buildCreatorInviteCountByReferrer()
  const completionsByEmail = new Map<string, BetaMasterCompletionRow[]>()
  const issueCountByEmail = new Map<string, number>()
  await Promise.all(
    emails.map(async (email) => {
      const [completions, issueCount] = await Promise.all([
        fetchBetaMasterCompletionsForEmail(email),
        countBetaIssuesForEmail(email),
      ])
      completionsByEmail.set(email, completions)
      issueCountByEmail.set(email, issueCount)
    }),
  )

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

  return rows.sort((a, b) => {
    if (b.betaPoints !== a.betaPoints) return b.betaPoints - a.betaPoints
    if (b.engagementScore !== a.engagementScore) return b.engagementScore - a.engagementScore
    return (b.signupDate ?? "").localeCompare(a.signupDate ?? "")
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
  const downloadCount = await countBetaDownloadsForEmail(normalized)

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

  const [completions, reportedIssues] = await Promise.all([
    fetchBetaMasterCompletionsForEmail(normalized),
    fetchBetaIssuesForEmail(normalized),
  ])

  const activityDates = new Set<string>()
  for (const iso of [
    ...userFeedback.map((f) => f.created_at),
    ...userSupport.map((s) => s.created_at),
    ...userJobs.map((j) => j.created_at),
    ...completions.map((c) => c.completed_at),
    ...reportedIssues.map((i) => i.created_at),
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

  const inviteMap = await buildCreatorInviteCountByReferrer()
  const list = buildListRow(
    normalized,
    profile,
    userFeedback,
    userSupport,
    jobs,
    inviteMap.get(normalized) ?? 0,
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
    betaRank: profile?.beta_rank,
  })
  const timeline = buildBetaTimeline({
    signupAt: profile?.beta_signed_up_at ?? null,
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
    totalUsageEvents: userFeedback.length + userSupport.length + userJobs.length + downloadCount,
    betaApproved: profile?.beta_approved ?? false,
    adminNotes: profile?.notes ?? null,
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

export async function fetchBetaDashboardSummary(): Promise<BetaDashboardSummary | { error: string }> {
  const users = await fetchBetaUsers()
  if (isFetchError(users)) return users

  const [feedback, support] = await Promise.all([fetchAdminFeedback(), fetchAdminSupport()])
  if (isFetchError(feedback)) return feedback
  if (isFetchError(support)) return support

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
  await syncBetaProfileFromActivity(normalized)
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

    try {
      await syncBetaProfileFromActivity(email)
    } catch (syncErr) {
      console.error("[beta] sync profile activity failed:", syncErr)
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

  try {
    await syncBetaProfileFromActivity(email)
  } catch (syncErr) {
    console.error("[beta] sync profile activity failed:", syncErr)
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

  if (!body.genre && !body.daw) {
    await syncBetaProfileFromActivity(normalized)
    return
  }

  await supabase.from(CUSTOMER_PROFILES_TABLE).upsert(body, { onConflict: "email" })
  await syncBetaProfileFromActivity(normalized)
}

export async function fetchBetaProfilePanelForEmail(
  email: string,
): Promise<{ ok: true; panel: BetaProfilePanelData } | { error: string }> {
  const profile = await fetchBetaUserProfile(email)
  if (isFetchError(profile)) return profile
  return { ok: true, panel: buildBetaProfilePanelData(profile) }
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
