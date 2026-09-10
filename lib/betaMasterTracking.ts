import {
  MASTERED_EXPORTS_TABLE,
  MASTER_JOBS_TABLE,
  PIPELINE_EVENTS_TABLE,
} from "./adminData"
import { statsDebug } from "./statsDebug"
import { normalizeBetaEmail } from "./betaAccess"
import { BETA_FEEDBACK_TABLE } from "./betaFeedbackDb"
import { createSupabaseServerClient } from "./supabaseServer"
import { supabaseTimed } from "./supabaseTimed"

/** Canonical completed masters — one row per session_id (PK). All completion counts read from here. */
export const BETA_MASTER_COMPLETIONS_TABLE = "beta_master_completions"
export const PIPELINE_EVENT_MASTER_COMPLETE = "master_complete"
export const PIPELINE_EVENT_DOWNLOAD = "download"

export type BetaMasterCompletionRow = {
  session_id: string
  email: string
  track_name: string | null
  mastering_style: string | null
  processing_time_ms: number | null
  master_lufs: number | null
  completed_at: string
  created_at: string
}

function logBeta(message: string, detail?: Record<string, unknown>) {
  if (detail) console.log(`[beta] ${message}`, detail)
  else console.log(`[beta] ${message}`)
}

async function fetchCompletionsTableRows(email: string): Promise<BetaMasterCompletionRow[]> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return []

  const normalized = normalizeBetaEmail(email)
  const { data, error } = await supabase
    .from(BETA_MASTER_COMPLETIONS_TABLE)
    .select(
      "session_id, email, track_name, mastering_style, processing_time_ms, master_lufs, completed_at, created_at",
    )
    .eq("email", normalized)
    .order("completed_at", { ascending: false })
    .limit(500)

  if (error) {
    if (/does not exist|42P01/i.test(error.message)) return []
    console.warn("[beta] beta_master_completions fetch failed:", error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    session_id: String(row.session_id),
    email: String(row.email),
    track_name: row.track_name ?? null,
    mastering_style: row.mastering_style ?? null,
    processing_time_ms:
      row.processing_time_ms != null ? Number(row.processing_time_ms) : null,
    master_lufs: row.master_lufs != null ? Number(row.master_lufs) : null,
    completed_at: String(row.completed_at),
    created_at: String(row.created_at ?? row.completed_at),
  }))
}

const COMPLETION_SELECT =
  "session_id, email, track_name, mastering_style, processing_time_ms, master_lufs, completed_at, created_at"

function mapCompletionTableRow(row: Record<string, unknown>): BetaMasterCompletionRow {
  return {
    session_id: String(row.session_id),
    email: String(row.email),
    track_name: (row.track_name as string | null) ?? null,
    mastering_style: (row.mastering_style as string | null) ?? null,
    processing_time_ms:
      row.processing_time_ms != null ? Number(row.processing_time_ms) : null,
    master_lufs: row.master_lufs != null ? Number(row.master_lufs) : null,
    completed_at: String(row.completed_at),
    created_at: String(row.created_at ?? row.completed_at),
  }
}

function mergeCompletionsByEmail(
  target: Map<string, BetaMasterCompletionRow[]>,
  email: string,
  rows: BetaMasterCompletionRow[],
) {
  const normalized = normalizeBetaEmail(email)
  if (!normalized.includes("@")) return
  const bySession = new Map<string, BetaMasterCompletionRow>()
  for (const row of target.get(normalized) ?? []) {
    if (row.session_id) bySession.set(row.session_id, row)
  }
  for (const row of rows) {
    if (!row.session_id) continue
    if (!bySession.has(row.session_id)) bySession.set(row.session_id, row)
  }
  target.set(normalized, [...bySession.values()].sort((a, b) => b.completed_at.localeCompare(a.completed_at)))
}

/**
 * Batch load completions for many emails (admin beta-users list). Table only — canonical source.
 */
export async function fetchCompletionsGroupedForEmails(
  emails: string[],
): Promise<Map<string, BetaMasterCompletionRow[]>> {
  const normalizedEmails = [
    ...new Set(
      emails.map((e) => normalizeBetaEmail(e)).filter((e) => e.includes("@")),
    ),
  ]
  const grouped = new Map<string, BetaMasterCompletionRow[]>()
  for (const email of normalizedEmails) grouped.set(email, [])
  if (normalizedEmails.length === 0) return grouped

  const supabase = createSupabaseServerClient()
  if (!supabase) return grouped

  const { data: tableRows, error: tableErr } = await supabase
    .from(BETA_MASTER_COMPLETIONS_TABLE)
    .select(COMPLETION_SELECT)
    .in("email", normalizedEmails)
    .order("completed_at", { ascending: false })
    .limit(5000)

  if (!tableErr) {
    for (const row of tableRows ?? []) {
      const mapped = mapCompletionTableRow(row as Record<string, unknown>)
      mergeCompletionsByEmail(grouped, mapped.email, [mapped])
    }
  } else if (!/does not exist|42P01/i.test(tableErr.message)) {
    console.warn("[beta] batch completions table fetch failed:", tableErr.message)
  }

  return grouped
}

async function fetchPipelineMasterCompleteRows(email: string): Promise<BetaMasterCompletionRow[]> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return []

  const normalized = normalizeBetaEmail(email)
  const { data, error } = await supabase
    .from(PIPELINE_EVENTS_TABLE)
    .select("session_id, created_at, track_name, user_email")
    .eq("event_type", PIPELINE_EVENT_MASTER_COMPLETE)
    .eq("user_email", normalized)
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    console.warn("[beta] pipeline master_complete fetch failed:", error.message)
    return []
  }

  return (data ?? [])
    .filter((row) => row.session_id)
    .map((row) => ({
      session_id: String(row.session_id),
      email: normalized,
      track_name: row.track_name ?? null,
      mastering_style: null,
      processing_time_ms: null,
      master_lufs: null,
      completed_at: String(row.created_at),
      created_at: String(row.created_at),
    }))
}

/**
 * One-time per email: if feedback exists but completions table is empty, record sessions from feedback.
 * Keeps Insider points stable by pairing with deduped feedback counting in aggregateBetaActivityForEmail.
 */
export async function backfillMasterCompletionsFromFeedback(email: string): Promise<number> {
  const normalized = normalizeBetaEmail(email)
  if (!normalized.includes("@")) return 0

  const existing = await fetchCompletionsTableRows(normalized)
  if (existing.length > 0) return 0

  const supabase = createSupabaseServerClient()
  if (!supabase) return 0

  const { data: feedbackRows, error } = await supabase
    .from(BETA_FEEDBACK_TABLE)
    .select("session_id, track_name, mastering_style, created_at, contact_email, responses")
    .eq("contact_email", normalized)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error || !feedbackRows?.length) return 0

  let created = 0
  for (const row of feedbackRows) {
    const sessionId = typeof row.session_id === "string" ? row.session_id.trim() : ""
    if (!sessionId) continue

    const responses = row.responses as { processingTimeMs?: number; masterLufs?: number } | null
    const processingTimeMs =
      responses?.processingTimeMs != null && Number.isFinite(Number(responses.processingTimeMs))
        ? Number(responses.processingTimeMs)
        : null
    const masterLufs =
      responses?.masterLufs != null && Number.isFinite(Number(responses.masterLufs))
        ? Number(responses.masterLufs)
        : null

    const result = await recordBetaMasterCompletion({
      email: normalized,
      sessionId,
      trackName: typeof row.track_name === "string" ? row.track_name : null,
      masteringStyle: typeof row.mastering_style === "string" ? row.mastering_style : null,
      processingTimeMs,
      masterLufs,
    })
    if ("error" in result) continue
    if (result.created) created++
  }

  if (created > 0) {
    logBeta("backfilled master completions from feedback", { email: normalized, created })
  }
  return created
}

function mergeCompletionRows(
  tableRows: BetaMasterCompletionRow[],
  pipelineRows: BetaMasterCompletionRow[],
): BetaMasterCompletionRow[] {
  const bySession = new Map<string, BetaMasterCompletionRow>()
  for (const row of [...tableRows, ...pipelineRows]) {
    if (!row.session_id) continue
    if (!bySession.has(row.session_id)) bySession.set(row.session_id, row)
  }
  return [...bySession.values()].sort((a, b) => b.completed_at.localeCompare(a.completed_at))
}

/** Merged completions without feedback backfill (fast reads for panel / APIs). */
export async function fetchBetaMasterCompletionsForEmailFast(
  email: string,
): Promise<BetaMasterCompletionRow[]> {
  const [tableRows, pipelineRows] = await Promise.all([
    fetchCompletionsTableRows(email),
    fetchPipelineMasterCompleteRows(email),
  ])
  return mergeCompletionRows(tableRows, pipelineRows)
}

/** Table-only completions (single query — skips pipeline fallback). */
export async function fetchBetaMasterCompletionsTableForEmail(
  email: string,
): Promise<BetaMasterCompletionRow[]> {
  return supabaseTimed(
    "select",
    () => fetchCompletionsTableRows(email),
    { caller: "fetchBetaMasterCompletionsTableForEmail", table: BETA_MASTER_COMPLETIONS_TABLE },
  )
}

/** Merged completions from dedicated table + pipeline fallback (deduped by session_id). */
export async function fetchBetaMasterCompletionsForEmail(
  email: string,
): Promise<BetaMasterCompletionRow[]> {
  await backfillMasterCompletionsFromFeedback(email)

  const [tableRows, pipelineRows] = await Promise.all([
    fetchCompletionsTableRows(email),
    fetchPipelineMasterCompleteRows(email),
  ])
  return mergeCompletionRows(tableRows, pipelineRows)
}

export async function countBetaMastersForEmail(email: string): Promise<number> {
  const rows = await fetchBetaMasterCompletionsTableForEmail(email)
  return rows.length
}

/** Dedupe is per email + session_id (session_id is globally unique in the completions table). */
export async function isBetaMasterSessionCompleted(
  sessionId: string,
  email: string,
): Promise<boolean> {
  const sid = sessionId.trim()
  const normalized = normalizeBetaEmail(email)
  if (!sid || !normalized.includes("@")) return false

  const supabase = createSupabaseServerClient()
  if (!supabase) return false

  const { data, error } = await supabase
    .from(BETA_MASTER_COMPLETIONS_TABLE)
    .select("session_id")
    .eq("session_id", sid)
    .eq("email", normalized)
    .maybeSingle()

  return !error && Boolean(data?.session_id)
}

/** Mirror completion into admin_master_jobs (not counted for KPIs). Idempotent on session_id. */
async function upsertAdminMasterJobFromCompletion(input: {
  sessionId: string
  email: string
  trackName?: string | null
  masteringStyle?: string | null
  processingTimeMs?: number | null
  masterLufs?: number | null
  completedAt: string
}): Promise<"created" | "updated" | "skipped"> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return "skipped"

  const { data: existing } = await supabase
    .from(MASTER_JOBS_TABLE)
    .select("id")
    .eq("session_id", input.sessionId)
    .maybeSingle()

  const fields = {
    session_id: input.sessionId,
    user_email: normalizeBetaEmail(input.email),
    track_name: input.trackName?.trim() || null,
    status: "complete",
    processing_time_ms:
      input.processingTimeMs != null && Number.isFinite(input.processingTimeMs)
        ? Math.max(0, Math.round(input.processingTimeMs))
        : null,
    master_lufs:
      input.masterLufs != null && Number.isFinite(input.masterLufs) ? input.masterLufs : null,
    mastering_style: input.masteringStyle?.trim() || null,
    error_log: null,
    source: "beta_completion",
    updated_at: input.completedAt,
  }

  if (existing?.id) {
    const { error } = await supabase.from(MASTER_JOBS_TABLE).update(fields).eq("id", existing.id)
    if (error) logBeta("admin_master_jobs update failed", { message: error.message })
    else statsDebug("admin master job mirrored", { sessionId: input.sessionId, action: "updated" })
    return error ? "skipped" : "updated"
  }

  const { error } = await supabase.from(MASTER_JOBS_TABLE).insert({
    ...fields,
    created_at: input.completedAt,
  })

  if (error) {
    if (/unique|duplicate/i.test(error.message)) {
      statsDebug("admin master job mirrored (insert race)", { sessionId: input.sessionId })
      return "updated"
    }
    logBeta("admin_master_jobs insert failed", { message: error.message })
    return "skipped"
  }

  statsDebug("admin master job mirrored", { sessionId: input.sessionId, action: "created" })
  return "created"
}

async function writePipelineMasterComplete(input: {
  email: string
  sessionId: string
  trackName?: string | null
}): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return false

  const normalized = normalizeBetaEmail(input.email)
  const { data: existing } = await supabase
    .from(PIPELINE_EVENTS_TABLE)
    .select("id")
    .eq("event_type", PIPELINE_EVENT_MASTER_COMPLETE)
    .eq("session_id", input.sessionId)
    .eq("user_email", normalized)
    .maybeSingle()

  if (existing?.id) {
    statsDebug("pipeline master_complete skipped (exists)", {
      sessionId: input.sessionId,
      email: normalized,
    })
    return true
  }

  const { error } = await supabase.from(PIPELINE_EVENTS_TABLE).insert({
    session_id: input.sessionId,
    event_type: PIPELINE_EVENT_MASTER_COMPLETE,
    user_email: normalized,
    track_name: input.trackName?.trim() || null,
    metadata: {},
  })

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      statsDebug("pipeline master_complete skipped (race duplicate)", {
        sessionId: input.sessionId,
        email: normalized,
      })
      return true
    }
    logBeta("pipeline master_complete write failed", { message: error.message })
    return false
  }
  statsDebug("pipeline master_complete written", { sessionId: input.sessionId, email: normalized })
  return true
}

async function writePipelineDownload(input: {
  email: string
  sessionId: string
  trackTitle?: string | null
}): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return false

  const normalized = normalizeBetaEmail(input.email)
  const { data: existing } = await supabase
    .from(PIPELINE_EVENTS_TABLE)
    .select("id")
    .eq("event_type", PIPELINE_EVENT_DOWNLOAD)
    .eq("session_id", input.sessionId)
    .eq("user_email", normalized)
    .maybeSingle()

  if (existing?.id) return true

  const { error } = await supabase.from(PIPELINE_EVENTS_TABLE).insert({
    session_id: input.sessionId,
    event_type: PIPELINE_EVENT_DOWNLOAD,
    user_email: normalized,
    track_name: input.trackTitle?.trim() || null,
    metadata: {},
  })

  if (error) {
    if (/duplicate|unique/i.test(error.message)) return true
    logBeta("pipeline download write failed", { message: error.message })
    return false
  }
  return true
}

export type RecordBetaMasterCompletionInput = {
  email: string
  sessionId: string
  objectKey?: string | null
  trackName?: string | null
  masteringStyle?: string | null
  processingTimeMs?: number | null
  masterLufs?: number | null
}

export type RecordBetaMasterCompletionResult =
  | { ok: true; created: true; alreadyCounted: false; completionRow: BetaMasterCompletionRow }
  | { ok: true; created: false; alreadyCounted: true }
  | { error: string }

export type RecordBetaMasterCompletionOptions = {
  /** @deprecated Ignored — completion is always idempotent via beta_master_completions PK. */
  fastPath?: boolean
  /** Write pipeline event without blocking the response. */
  pipelineAsync?: boolean
}

async function mirrorCompletionSideEffects(input: {
  sessionId: string
  email: string
  trackName?: string | null
  masteringStyle?: string | null
  processingTimeMs?: number | null
  masterLufs?: number | null
  completedAt: string
  created: boolean
  pipelineAsync: boolean
}): Promise<void> {
  await upsertAdminMasterJobFromCompletion({
    sessionId: input.sessionId,
    email: input.email,
    trackName: input.trackName,
    masteringStyle: input.masteringStyle,
    processingTimeMs: input.processingTimeMs,
    masterLufs: input.masterLufs,
    completedAt: input.completedAt,
  })

  if (!input.created) return

  const pipelineWrite = () =>
    writePipelineMasterComplete({
      email: input.email,
      sessionId: input.sessionId,
      trackName: input.trackName,
    })

  if (input.pipelineAsync) {
    void pipelineWrite().catch(() => undefined)
  } else {
    await pipelineWrite()
  }

  const { invalidateAdminOverviewCache } = await import("./adminOverviewCache")
  invalidateAdminOverviewCache("beta_master_completion")
}

export async function recordBetaMasterCompletion(
  input: RecordBetaMasterCompletionInput,
  options?: RecordBetaMasterCompletionOptions,
): Promise<RecordBetaMasterCompletionResult> {
  const pipelineAsync = options?.pipelineAsync ?? true

  const sessionId = resolveBetaMasterCompletionSessionId(input.sessionId, input.objectKey)
  const email = normalizeBetaEmail(input.email)
  if (!sessionId) return { error: "session_id required" }
  if (!email.includes("@")) return { error: "email required" }

  statsDebug("master complete request", { sessionId, email })

  const alreadyCounted = await isBetaMasterSessionCompleted(sessionId, email)
  if (alreadyCounted) {
    statsDebug("master completed event skipped (idempotent)", { sessionId, email })
    logBeta("master already counted", { sessionId, email })
    const completedAt = new Date().toISOString()
    await mirrorCompletionSideEffects({
      sessionId,
      email,
      trackName: input.trackName,
      masteringStyle: input.masteringStyle,
      processingTimeMs: input.processingTimeMs,
      masterLufs: input.masterLufs,
      completedAt,
      created: false,
      pipelineAsync,
    })
    return { ok: true, created: false, alreadyCounted: true }
  }

  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const completedAt = new Date().toISOString()
  const row = {
    session_id: sessionId,
    email,
    track_name: input.trackName?.trim() || null,
    mastering_style: input.masteringStyle?.trim() || null,
    processing_time_ms:
      input.processingTimeMs != null && Number.isFinite(input.processingTimeMs)
        ? Math.max(0, Math.round(input.processingTimeMs))
        : null,
    master_lufs:
      input.masterLufs != null && Number.isFinite(input.masterLufs) ? input.masterLufs : null,
    completed_at: completedAt,
  }

  const { error } = await supabaseTimed(
    "complete:insert",
    async () => supabase.from(BETA_MASTER_COMPLETIONS_TABLE).insert(row),
    { caller: "recordBetaMasterCompletion" },
  )

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      const { data: existing } = await supabase
        .from(BETA_MASTER_COMPLETIONS_TABLE)
        .select("email")
        .eq("session_id", sessionId)
        .maybeSingle()
      if (existing?.email && normalizeBetaEmail(String(existing.email)) === email) {
        statsDebug("master completed event skipped (insert race)", { sessionId, email })
        logBeta("master already counted", { sessionId, email })
        await mirrorCompletionSideEffects({
          sessionId,
          email,
          trackName: row.track_name,
          masteringStyle: row.mastering_style,
          processingTimeMs: row.processing_time_ms,
          masterLufs: row.master_lufs,
          completedAt,
          created: false,
          pipelineAsync,
        })
        return { ok: true, created: false, alreadyCounted: true }
      }
      logBeta("completions session_id conflict — retrying with email-scoped id", {
        sessionId,
        email,
        existingEmail: existing?.email ?? null,
      })
      const scopedSessionId = `${sessionId}::${email}`
      const retry = await supabase.from(BETA_MASTER_COMPLETIONS_TABLE).insert({
        ...row,
        session_id: scopedSessionId,
      })
      if (retry.error) {
        if (/duplicate|unique/i.test(retry.error.message)) {
          await mirrorCompletionSideEffects({
            sessionId,
            email,
            trackName: row.track_name,
            masteringStyle: row.mastering_style,
            processingTimeMs: row.processing_time_ms,
            masterLufs: row.master_lufs,
            completedAt,
            created: false,
            pipelineAsync,
          })
          return { ok: true, created: false, alreadyCounted: true }
        }
        logBeta("completions scoped insert failed", { message: retry.error.message, email })
        return { error: retry.error.message }
      }
      statsDebug("master completed event recorded (scoped session)", {
        sessionId: scopedSessionId,
        email,
      })
      await mirrorCompletionSideEffects({
        sessionId: scopedSessionId,
        email,
        trackName: row.track_name,
        masteringStyle: row.mastering_style,
        processingTimeMs: row.processing_time_ms,
        masterLufs: row.master_lufs,
        completedAt,
        created: true,
        pipelineAsync,
      })
      const completionRow: BetaMasterCompletionRow = {
        session_id: scopedSessionId,
        email,
        track_name: row.track_name,
        mastering_style: row.mastering_style,
        processing_time_ms: row.processing_time_ms,
        master_lufs: row.master_lufs,
        completed_at: completedAt,
        created_at: completedAt,
      }
      return { ok: true, created: true, alreadyCounted: false, completionRow }
    }
    if (/does not exist|42P01/i.test(error.message)) {
      logBeta("completions table missing — apply beta_master_completions migration", {
        sessionId,
        email,
      })
    } else {
      logBeta("completions table insert failed", { message: error.message, sessionId, email })
    }
    return { error: error.message }
  }

  statsDebug("master completed event recorded", { sessionId, email, created: true })
  logBeta("master completed", { sessionId, email, tableWriteOk: true, pipelineAsync })

  const completionRow: BetaMasterCompletionRow = {
    session_id: sessionId,
    email,
    track_name: row.track_name,
    mastering_style: row.mastering_style,
    processing_time_ms: row.processing_time_ms,
    master_lufs: row.master_lufs,
    completed_at: completedAt,
    created_at: completedAt,
  }

  await mirrorCompletionSideEffects({
    sessionId,
    email,
    trackName: row.track_name,
    masteringStyle: row.mastering_style,
    processingTimeMs: row.processing_time_ms,
    masterLufs: row.master_lufs,
    completedAt,
    created: true,
    pipelineAsync,
  })

  return { ok: true, created: true, alreadyCounted: false, completionRow }
}

export type RecordBetaMasterDownloadInput = {
  email: string
  objectKey: string
  sessionId?: string | null
  trackTitle?: string | null
  expiresAt?: string | null
}

export type RecordBetaMasterDownloadResult =
  | { ok: true; created: true; alreadyCounted: false }
  | { ok: true; created: false; alreadyCounted: true }
  | { error: string }

async function isBetaDownloadRecorded(
  email: string,
  objectKey: string,
  sessionId: string,
): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return false

  const normalized = normalizeBetaEmail(email)

  const { data: exportRow } = await supabase
    .from(MASTERED_EXPORTS_TABLE)
    .select("id")
    .eq("email", normalized)
    .eq("object_key", objectKey)
    .maybeSingle()

  if (exportRow?.id) return true

  const sid = sessionId.trim()
  if (!sid) return false

  const sessionKey = `beta-session:${sid}`
  if (objectKey !== sessionKey) {
    const { data: sessionExport } = await supabase
      .from(MASTERED_EXPORTS_TABLE)
      .select("id")
      .eq("email", normalized)
      .eq("object_key", sessionKey)
      .maybeSingle()
    if (sessionExport?.id) return true
  }

  const { data: pipe } = await supabase
    .from(PIPELINE_EVENTS_TABLE)
    .select("id")
    .eq("event_type", PIPELINE_EVENT_DOWNLOAD)
    .eq("user_email", normalized)
    .eq("session_id", sid)
    .maybeSingle()

  return Boolean(pipe?.id)
}

export async function recordBetaMasterDownload(
  input: RecordBetaMasterDownloadInput,
): Promise<RecordBetaMasterDownloadResult> {
  const email = normalizeBetaEmail(input.email)
  const objectKey = input.objectKey.trim()
  const sessionId = input.sessionId?.trim() || ""
  if (!email.includes("@")) return { error: "email required" }
  if (!objectKey) return { error: "object_key required" }

  const alreadyCounted = await isBetaDownloadRecorded(email, objectKey, sessionId)
  if (alreadyCounted) {
    logBeta("download already counted", { email, objectKey, sessionId })
    return { ok: true, created: false, alreadyCounted: true }
  }

  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  let exportOk = false
  let exportError: string | null = null
  const exportRes = await supabase.from(MASTERED_EXPORTS_TABLE).insert({
    email,
    object_key: objectKey,
    track_title: input.trackTitle?.trim() || null,
    expires_at: input.expiresAt?.trim() || null,
  })

  if (!exportRes.error) {
    exportOk = true
  } else {
    exportError = exportRes.error.message
    if (/duplicate|unique/i.test(exportRes.error.message)) {
      statsDebug("mastered_exports insert skipped (idempotent)", { email, objectKey })
      exportOk = true
      exportError = null
    } else if (!/does not exist|42P01/i.test(exportRes.error.message)) {
      logBeta("mastered_exports insert failed", { message: exportRes.error.message })
    }
  }

  const pipelineOk =
    sessionId.length > 0
      ? await writePipelineDownload({ email, sessionId, trackTitle: input.trackTitle })
      : false

  if (!exportOk && !pipelineOk) {
    if (exportError && /does not exist|42P01/i.test(exportError)) {
      return { error: "mastered_exports table missing" }
    }
    return { error: exportError ?? "Could not record download" }
  }

  logBeta("download registered", { email, objectKey, exportOk, pipelineOk })
  return { ok: true, created: true, alreadyCounted: false }
}

function sessionIdFromExportObjectKey(objectKey: string): string | null {
  const match = objectKey.match(/^beta-session:(.+)$/i)
  return match?.[1]?.trim() || null
}

export async function countBetaDownloadsForEmail(email: string): Promise<number> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return 0

  const normalized = normalizeBetaEmail(email)
  const unique = new Set<string>()

  const [exportsRes, pipelineRes] = await Promise.all([
    supabase
      .from(MASTERED_EXPORTS_TABLE)
      .select("object_key")
      .eq("email", normalized)
      .limit(500),
    supabase
      .from(PIPELINE_EVENTS_TABLE)
      .select("session_id")
      .eq("event_type", PIPELINE_EVENT_DOWNLOAD)
      .eq("user_email", normalized)
      .limit(500),
  ])

  for (const row of exportsRes.data ?? []) {
    const key = String(row.object_key ?? "").trim()
    if (!key) continue
    const sid = sessionIdFromExportObjectKey(key)
    unique.add(sid ? `session:${sid}` : `export:${key}`)
  }

  for (const row of pipelineRes.data ?? []) {
    const sid = row.session_id ? String(row.session_id).trim() : ""
    if (sid) unique.add(`session:${sid}`)
  }

  return unique.size
}

export function resolveBetaDownloadObjectKey(
  objectKey: string | null | undefined,
  sessionId: string | null | undefined,
): string {
  const key = objectKey?.trim()
  if (key) return key
  const sid = sessionId?.trim()
  if (sid) return `beta-session:${sid}`
  return `beta-download:${Date.now()}`
}

/** Stable id for completion dedupe — prefers workflow session_id, falls back to master object key. */
export function resolveBetaMasterCompletionSessionId(
  sessionId: string | null | undefined,
  objectKey?: string | null | undefined,
): string {
  const sid = sessionId?.trim()
  if (sid) return sid
  const key = objectKey?.trim()
  if (key) return `master:${key}`
  return ""
}
