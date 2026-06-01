import { MASTERED_EXPORTS_TABLE, PIPELINE_EVENTS_TABLE } from "./adminData"
import { normalizeBetaEmail } from "./betaAccess"
import { BETA_FEEDBACK_TABLE } from "./betaFeedbackDb"
import { createSupabaseServerClient } from "./supabaseServer"
import { supabaseTimed } from "./supabaseTimed"

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
 * Batch load completions for many emails (admin beta-users list). No per-email backfill.
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

  const { data: pipelineRows, error: pipeErr } = await supabase
    .from(PIPELINE_EVENTS_TABLE)
    .select("session_id, created_at, track_name, user_email")
    .eq("event_type", PIPELINE_EVENT_MASTER_COMPLETE)
    .in("user_email", normalizedEmails)
    .order("created_at", { ascending: false })
    .limit(5000)

  if (!pipeErr) {
    for (const row of pipelineRows ?? []) {
      if (!row.session_id || !row.user_email) continue
      const mapped: BetaMasterCompletionRow = {
        session_id: String(row.session_id),
        email: normalizeBetaEmail(String(row.user_email)),
        track_name: row.track_name ?? null,
        mastering_style: null,
        processing_time_ms: null,
        master_lufs: null,
        completed_at: String(row.created_at),
        created_at: String(row.created_at),
      }
      mergeCompletionsByEmail(grouped, mapped.email, [mapped])
    }
  } else if (!/does not exist|42P01/i.test(pipeErr.message)) {
    console.warn("[beta] batch pipeline master_complete fetch failed:", pipeErr.message)
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
  const rows = await fetchBetaMasterCompletionsForEmail(email)
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

  if (!error && data?.session_id) return true

  const { data: pipe } = await supabase
    .from(PIPELINE_EVENTS_TABLE)
    .select("session_id")
    .eq("event_type", PIPELINE_EVENT_MASTER_COMPLETE)
    .eq("session_id", sid)
    .eq("user_email", normalized)
    .maybeSingle()

  return Boolean(pipe?.session_id)
}

async function writePipelineMasterComplete(input: {
  email: string
  sessionId: string
  trackName?: string | null
}): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return false

  const { error } = await supabase.from(PIPELINE_EVENTS_TABLE).insert({
    session_id: input.sessionId,
    event_type: PIPELINE_EVENT_MASTER_COMPLETE,
    user_email: normalizeBetaEmail(input.email),
    track_name: input.trackName?.trim() || null,
    metadata: {},
  })

  if (error) {
    logBeta("pipeline master_complete write failed", { message: error.message })
    return false
  }
  return true
}

async function writePipelineDownload(input: {
  email: string
  sessionId: string
  trackTitle?: string | null
}): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return false

  const { error } = await supabase.from(PIPELINE_EVENTS_TABLE).insert({
    session_id: input.sessionId,
    event_type: PIPELINE_EVENT_DOWNLOAD,
    user_email: normalizeBetaEmail(input.email),
    track_name: input.trackTitle?.trim() || null,
    metadata: {},
  })

  if (error) {
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
  | { ok: true; created: true; alreadyCounted: false }
  | { ok: true; created: false; alreadyCounted: true }
  | { error: string }

export type RecordBetaMasterCompletionOptions = {
  /** Skip pre-check reads; rely on insert / conflict handling (fewer queries). */
  fastPath?: boolean
  /** Write pipeline event without blocking the response. */
  pipelineAsync?: boolean
}

export async function recordBetaMasterCompletion(
  input: RecordBetaMasterCompletionInput,
  options?: RecordBetaMasterCompletionOptions,
): Promise<RecordBetaMasterCompletionResult> {
  const fastPath = options?.fastPath ?? true
  const pipelineAsync = options?.pipelineAsync ?? true

  const sessionId = resolveBetaMasterCompletionSessionId(input.sessionId, input.objectKey)
  const email = normalizeBetaEmail(input.email)
  if (!sessionId) return { error: "session_id required" }
  if (!email.includes("@")) return { error: "email required" }

  if (!fastPath) {
    const alreadyCounted = await isBetaMasterSessionCompleted(sessionId, email)
    if (alreadyCounted) {
      logBeta("master already counted", { sessionId, email })
      return { ok: true, created: false, alreadyCounted: true }
    }
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

  let tableWriteOk = false
  let alreadyCounted = false

  const { error } = await supabaseTimed(
    "complete:insert",
    () => supabase.from(BETA_MASTER_COMPLETIONS_TABLE).insert(row),
    { caller: "recordBetaMasterCompletion" },
  )

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      alreadyCounted = true
      if (!fastPath) {
        logBeta("master already counted", { sessionId, email })
        return { ok: true, created: false, alreadyCounted: true }
      }
      const { data: existing } = await supabase
        .from(BETA_MASTER_COMPLETIONS_TABLE)
        .select("email")
        .eq("session_id", sessionId)
        .maybeSingle()
      if (existing?.email && normalizeBetaEmail(String(existing.email)) === email) {
        logBeta("master already counted", { sessionId, email })
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
      if (!retry.error) {
        tableWriteOk = true
        logBeta("master completed (scoped session_id)", { sessionId: scopedSessionId, email })
      } else if (/duplicate|unique/i.test(retry.error.message)) {
        return { ok: true, created: false, alreadyCounted: true }
      } else {
        logBeta("completions scoped insert failed", { message: retry.error.message, email })
      }
    } else if (/does not exist|42P01/i.test(error.message)) {
      logBeta("completions table missing — apply beta_master_completions migration", {
        sessionId,
        email,
      })
    } else if (!tableWriteOk && !alreadyCounted) {
      logBeta("completions table insert failed", { message: error.message, sessionId, email })
    }
  } else {
    tableWriteOk = true
  }

  if (alreadyCounted && !tableWriteOk) {
    return { ok: true, created: false, alreadyCounted: true }
  }

  const pipelineWrite = () =>
    writePipelineMasterComplete({
      email,
      sessionId,
      trackName: input.trackName,
    })

  if (pipelineAsync) {
    void pipelineWrite().catch(() => undefined)
  } else {
    const pipelineOk = await pipelineWrite()
    if (!tableWriteOk && !pipelineOk) {
      return {
        error:
          "Could not record master completion. Apply supabase/migrations/20260528120000_beta_master_completions.sql or check pipeline events table.",
      }
    }
    logBeta("master completed", { sessionId, email, tableWriteOk, pipelineOk })
    return { ok: true, created: true, alreadyCounted: false }
  }

  if (!tableWriteOk) {
    return {
      error:
        "Could not record master completion. Apply supabase/migrations/20260528120000_beta_master_completions.sql.",
    }
  }

  logBeta("master completed", { sessionId, email, tableWriteOk, pipelineAsync: true })
  return { ok: true, created: true, alreadyCounted: false }
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
    if (!/does not exist|42P01/i.test(exportRes.error.message)) {
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
