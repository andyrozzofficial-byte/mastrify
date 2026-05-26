import { normalizeBetaEmail } from "./betaAccess"
import type { BetaIssuePriority, BetaIssueStatus, BetaReportedIssueRow } from "./betaIssueTypes"
import { isBetaIssuePriority, isBetaIssueStatus } from "./betaIssueTypes"
import {
  adminPageRange,
  buildAdminPaginationMeta,
  type AdminPaginationMeta,
} from "./adminPagination"
import { createSupabaseServerClient, getSupabaseKeySource } from "./supabaseServer"

export type BetaIssuesPaginated = {
  rows: BetaReportedIssueRow[]
  pagination: AdminPaginationMeta
}

export const BETA_REPORTED_ISSUES_TABLE = "beta_reported_issues"
const SCREENSHOT_BUCKET = "beta-issue-screenshots"

export const BETA_REPORTED_ISSUES_SETUP_HINT =
  "beta_reported_issues table missing — open Supabase SQL Editor, run supabase/beta_reported_issues.sql, wait ~10s, then redeploy"

function isTableMissingError(message: string): boolean {
  return /does not exist|42P01|schema cache/i.test(message)
}

function parseMissingColumn(message: string): string | null {
  const m = message.match(/column "([^"]+)" (?:of relation .+ )?does not exist/i)
  return m?.[1] ?? null
}

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

function ownerFilter(supabase: ReturnType<typeof createSupabaseServerClient>, email: string) {
  const e = normalizeBetaEmail(email)
  return supabase!
    .from(BETA_REPORTED_ISSUES_TABLE)
    .select("*")
    .or(`user_id.eq.${e},reporter_email.eq.${e}`)
}

async function insertIssueRow(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  record: Record<string, unknown>,
  selectId: boolean,
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  let payload = { ...record }
  const maxAttempts = 8

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
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

    const missing = parseMissingColumn(result.error.message)
    if (missing && missing in payload) {
      delete payload[missing]
      continue
    }

    return { data: null, error: { message: result.error.message } }
  }

  return { data: null, error: { message: "Insert failed after column retries" } }
}

export async function fetchBetaIssuesForEmail(email: string): Promise<BetaReportedIssueRow[]> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return []

  const { data, error } = await ownerFilter(supabase, email)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    if (isTableMissingError(error.message)) return []
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

  if (error) return 0
  return count ?? 0
}

export async function fetchAllBetaIssues(): Promise<BetaReportedIssueRow[] | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { data, error } = await supabase
    .from(BETA_REPORTED_ISSUES_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500)

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
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { from, to } = adminPageRange(page)
  const { data, error, count } = await supabase
    .from(BETA_REPORTED_ISSUES_TABLE)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    if (isTableMissingError(error.message)) {
      return { error: BETA_REPORTED_ISSUES_SETUP_HINT }
    }
    return { error: error.message }
  }

  const rows = (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
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
    console.error("[issue-db]", error)
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
    const missing = parseMissingColumn(error.message)
    if (missing && missing in body) {
      delete body[missing]
      if (Object.keys(body).length === 0) body = { status }
      continue
    }
    if (isTableMissingError(error.message)) return { error: BETA_REPORTED_ISSUES_SETUP_HINT }
    return { error: error.message }
  }

  return { error: "Could not update issue status" }
}
