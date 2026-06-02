import { normalizeBetaEmail } from "./betaAccess"
import type { BetaIssuePriority, BetaIssueStatus, BetaReportedIssueRow } from "./betaIssueTypes"
import { isBetaIssuePriority, isBetaIssueStatus } from "./betaIssueTypes"
import {
  adminPageRange,
  buildAdminPaginationMeta,
  type AdminPaginationMeta,
} from "./adminPagination"
import { ingestDebug, ingestError, requireServiceRoleForAdminTable } from "./adminIngestDebug"
import {
  isTableMissingError,
  MAX_SCHEMA_DRIFT_ATTEMPTS,
  parseMissingColumn,
  removeSelectColumn,
  stripRowColumn,
} from "./schemaColumnDrift"
import { createSupabaseServerClient, getSupabaseKeySource } from "./supabaseServer"

export type BetaIssuesPaginated = {
  rows: BetaReportedIssueRow[]
  pagination: AdminPaginationMeta
}

export const BETA_REPORTED_ISSUES_TABLE = "beta_reported_issues"
const SCREENSHOT_BUCKET = "beta-issue-screenshots"

export const BETA_REPORTED_ISSUES_SETUP_HINT =
  "beta_reported_issues table missing — open Supabase SQL Editor, run supabase/beta_reported_issues.sql, wait ~10s, then redeploy"

function mapRow(row: Record<string, unknown>): BetaReportedIssueRow {
  const priority = String(row.priority ?? "medium")
  const status = String(row.status ?? "open")
  const reporter =
    row.reporter_email != null && String(row.reporter_email).trim()
      ? String(row.reporter_email)
      : String(row.user_id ?? "")
  return {
    id: String(row.id),
    action_id: row.action_id != null ? String(row.action_id) : "",
    user_id: reporter,
    title: String(row.title),
    description: String(row.description),
    expected_result: row.expected_result ? String(row.expected_result) : null,
    screenshot_url: row.screenshot_url ? String(row.screenshot_url) : null,
    priority: isBetaIssuePriority(priority) ? priority : "medium",
    status: isBetaIssueStatus(status) ? status : "open",
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  }
}

export const BETA_ISSUES_SELECT =
  "id, action_id, user_id, reporter_email, title, description, expected_result, screenshot_url, priority, status, created_at, updated_at, session_id"

async function queryBetaIssuesWithSelectDrift<T>(
  route: string,
  run: (select: string) => Promise<{ data: T | null; error: { message: string } | null; count?: number | null }>,
): Promise<{ data: T | null; error: { message: string } | null; count?: number | null; select: string }> {
  let select = BETA_ISSUES_SELECT
  let last: { data: T | null; error: { message: string } | null; count?: number | null } = {
    data: null,
    error: null,
  }

  for (let attempt = 0; attempt < MAX_SCHEMA_DRIFT_ATTEMPTS; attempt++) {
    last = await run(select)
    if (!last.error) return { ...last, select }
    const missing = parseMissingColumn(last.error.message, BETA_REPORTED_ISSUES_TABLE)
    if (!missing) break
    const next = removeSelectColumn(select, missing)
    if (next === select) break
    select = next
  }

  if (last.error) {
    ingestError(route, {
      stage: "query",
      table: BETA_REPORTED_ISSUES_TABLE,
      message: last.error.message,
      select,
    })
  }

  return { ...last, select }
}

async function insertIssueRow(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  record: Record<string, unknown>,
  selectId: boolean,
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  let payload = { ...record }

  for (let attempt = 0; attempt < MAX_SCHEMA_DRIFT_ATTEMPTS; attempt++) {
    const query = supabase.from(BETA_REPORTED_ISSUES_TABLE).insert(payload)
    const result = selectId ? await query.select("id").single() : await query

    if (!result.error) {
      const id =
        result.data && typeof result.data === "object" && "id" in result.data
          ? String((result.data as { id: string }).id)
          : null
      return { data: id ? { id } : null, error: null }
    }

    if (isTableMissingError(result.error.message)) {
      return { data: null, error: { message: result.error.message } }
    }

    const missing = parseMissingColumn(result.error.message, BETA_REPORTED_ISSUES_TABLE)
    if (missing && missing in payload) {
      payload = stripRowColumn(payload, missing)
      continue
    }

    return { data: null, error: { message: result.error.message } }
  }

  return { data: null, error: { message: "Insert failed after column retries" } }
}

export async function fetchBetaIssuesForEmail(email: string): Promise<BetaReportedIssueRow[]> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return []

  const e = normalizeBetaEmail(email)
  const { data, error } = await queryBetaIssuesWithSelectDrift("fetchBetaIssuesForEmail", async (select) => {
    const res = await supabase
      .from(BETA_REPORTED_ISSUES_TABLE)
      .select(select)
      .or(`user_id.eq.${e},reporter_email.eq.${e}`)
      .order("created_at", { ascending: false })
      .limit(200)
    return { data: res.data, error: res.error }
  })

  if (error) {
    if (isTableMissingError(error.message)) {
      ingestError("fetchBetaIssuesForEmail", { stage: "query", error: BETA_REPORTED_ISSUES_SETUP_HINT })
    }
    return []
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

export async function countBetaIssuesForEmail(email: string): Promise<number> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return 0

  const e = normalizeBetaEmail(email)
  const { count, error } = await supabase
    .from(BETA_REPORTED_ISSUES_TABLE)
    .select("id", { count: "exact", head: true })
    .or(`user_id.eq.${e},reporter_email.eq.${e}`)

  if (error) {
    ingestError("countBetaIssuesForEmail", {
      stage: "query",
      table: BETA_REPORTED_ISSUES_TABLE,
      message: error.message,
    })
    return 0
  }
  return count ?? 0
}

export async function fetchAllBetaIssues(): Promise<BetaReportedIssueRow[] | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { data, error } = await queryBetaIssuesWithSelectDrift("fetchAllBetaIssues", async (select) => {
    const res = await supabase
      .from(BETA_REPORTED_ISSUES_TABLE)
      .select(select)
      .order("created_at", { ascending: false })
      .limit(500)
    return { data: res.data, error: res.error }
  })

  if (error) {
    if (isTableMissingError(error.message)) {
      return { error: BETA_REPORTED_ISSUES_SETUP_HINT }
    }
    return { error: error.message }
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

export async function fetchBetaIssuesPaginated(
  page = 1,
): Promise<BetaIssuesPaginated | { error: string }> {
  const roleCheck = requireServiceRoleForAdminTable("GET /api/admin/issues")
  if (!roleCheck.ok) return { error: roleCheck.error }

  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { from, to } = adminPageRange(page)
  const { data, error, count } = await queryBetaIssuesWithSelectDrift(
    "GET /api/admin/issues",
    async (select) => {
      const res = await supabase
        .from(BETA_REPORTED_ISSUES_TABLE)
        .select(select, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to)
      return { data: res.data, error: res.error, count: res.count }
    },
  )

  if (error) {
    if (isTableMissingError(error.message)) {
      return {
        error: `${BETA_REPORTED_ISSUES_SETUP_HINT} (${error.message})`,
      }
    }
    return { error: error.message }
  }

  const rows = (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
  ingestDebug("GET /api/admin/issues", {
    stage: "query_ok",
    table: BETA_REPORTED_ISSUES_TABLE,
    count: rows.length,
    total: count ?? rows.length,
    page,
  })
  return {
    rows,
    pagination: buildAdminPaginationMeta(count ?? rows.length, page),
  }
}

export async function uploadBetaIssueScreenshot(
  userId: string,
  actionId: string,
  file: File,
): Promise<string | null> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return null

  const ext = file.name.split(".").pop()?.toLowerCase() || "png"
  const safeExt = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext) ? ext : "png"
  const path = `${normalizeBetaEmail(userId)}/${actionId}.${safeExt}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const contentType = file.type || `image/${safeExt === "jpg" ? "jpeg" : safeExt}`

  const { error } = await supabase.storage.from(SCREENSHOT_BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  })

  if (error) {
    console.warn("[beta-issue] screenshot upload failed:", error.message)
    return null
  }

  const { data } = supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

export type CreateBetaIssueInput = {
  actionId: string
  userId: string
  title: string
  description: string
  expectedResult?: string | null
  screenshotUrl?: string | null
  priority: BetaIssuePriority
}

export type CreateBetaIssueResult =
  | { ok: true; id: string; created: true; alreadyCounted: false }
  | { ok: true; id: string; created: false; alreadyCounted: true }
  | { error: string }

export async function createBetaReportedIssue(
  input: CreateBetaIssueInput,
): Promise<CreateBetaIssueResult> {
  ingestDebug("POST /api/beta/issues", {
    stage: "create",
    table: BETA_REPORTED_ISSUES_TABLE,
    actionId: input.actionId,
    userId: input.userId,
    keySource: getSupabaseKeySource(),
  })

  const actionId = input.actionId.trim()
  const userId = normalizeBetaEmail(input.userId)
  const title = input.title.trim()
  const description = input.description.trim()
  const expectedResult = input.expectedResult?.trim() || null

  if (!actionId) return { error: "action_id required" }
  if (!userId.includes("@")) return { error: "reporter_email required" }
  if (!title) return { error: "title required" }
  if (!description) return { error: "description required" }

  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const canRead = getSupabaseKeySource() === "service_role"

  if (canRead && actionId) {
    const { data: existing } = await supabase
      .from(BETA_REPORTED_ISSUES_TABLE)
      .select("id")
      .eq("action_id", actionId)
      .maybeSingle()

    if (existing?.id) {
      return { ok: true, id: String(existing.id), created: false, alreadyCounted: true }
    }
  }

  const now = new Date().toISOString()
  const row: Record<string, unknown> = {
    reporter_email: userId,
    title,
    description,
    expected_result: expectedResult,
    screenshot_url: input.screenshotUrl?.trim() || null,
    priority: input.priority,
    status: "open",
    created_at: now,
    action_id: actionId,
    user_id: userId,
    updated_at: now,
  }

  const { data, error } = await insertIssueRow(supabase, row, canRead)

  if (error) {
    ingestError("POST /api/beta/issues", {
      stage: "insert",
      table: BETA_REPORTED_ISSUES_TABLE,
      message: error.message,
      actionId,
    })
    if (isTableMissingError(error.message)) {
      return { error: BETA_REPORTED_ISSUES_SETUP_HINT }
    }
    if (/duplicate|unique/i.test(error.message) && /action_id/i.test(error.message)) {
      if (canRead) {
        const { data: dup } = await supabase
          .from(BETA_REPORTED_ISSUES_TABLE)
          .select("id")
          .eq("action_id", actionId)
          .maybeSingle()
        if (dup?.id) {
          return { ok: true, id: String(dup.id), created: false, alreadyCounted: true }
        }
      }
      return { ok: true, id: actionId, created: false, alreadyCounted: true }
    }
    return { error: error.message }
  }

  const id = data?.id ?? actionId
  ingestDebug("POST /api/beta/issues", {
    stage: "create_ok",
    table: BETA_REPORTED_ISSUES_TABLE,
    id,
    keySource: getSupabaseKeySource(),
  })
  return { ok: true, id, created: true, alreadyCounted: false }
}

export async function updateBetaIssueStatus(
  id: string,
  status: BetaIssueStatus,
): Promise<{ ok: true } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  if (!isBetaIssueStatus(status)) return { error: "Invalid status" }

  let body: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase.from(BETA_REPORTED_ISSUES_TABLE).update(body).eq("id", id)
    if (!error) return { ok: true }
    const missing = parseMissingColumn(error.message, BETA_REPORTED_ISSUES_TABLE)
    if (missing && missing in body) {
      body = stripRowColumn(body, missing)
      if (Object.keys(body).length === 0) body = { status }
      continue
    }
    if (isTableMissingError(error.message)) return { error: BETA_REPORTED_ISSUES_SETUP_HINT }
    return { error: error.message }
  }

  return { error: "Could not update issue status" }
}
