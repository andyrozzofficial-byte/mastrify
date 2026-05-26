import { normalizeBetaEmail } from "./betaAccess"
import type { BetaIssuePriority, BetaIssueStatus, BetaReportedIssueRow } from "./betaIssueTypes"
import { isBetaIssuePriority, isBetaIssueStatus } from "./betaIssueTypes"
import { createSupabaseServerClient, getSupabaseKeySource } from "./supabaseServer"

export const BETA_REPORTED_ISSUES_TABLE = "beta_reported_issues"
const SCREENSHOT_BUCKET = "beta-issue-screenshots"

function mapRow(row: Record<string, unknown>): BetaReportedIssueRow {
  const priority = String(row.priority ?? "medium")
  const status = String(row.status ?? "open")
  return {
    id: String(row.id),
    action_id: String(row.action_id),
    user_id: String(row.user_id),
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

export async function fetchBetaIssuesForEmail(email: string): Promise<BetaReportedIssueRow[]> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return []

  const userId = normalizeBetaEmail(email)
  const { data, error } = await supabase
    .from(BETA_REPORTED_ISSUES_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    if (/does not exist|42P01/i.test(error.message)) return []
    return []
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

export async function countBetaIssuesForEmail(email: string): Promise<number> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return 0

  const userId = normalizeBetaEmail(email)
  const { count, error } = await supabase
    .from(BETA_REPORTED_ISSUES_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)

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
    if (/does not exist|42P01/i.test(error.message)) {
      return { error: "beta_reported_issues table missing — run supabase migration" }
    }
    return { error: error.message }
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
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
  if (!userId.includes("@")) return { error: "user_id required" }
  if (!title) return { error: "title required" }
  if (!description) return { error: "description required" }

  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const canRead = getSupabaseKeySource() === "service_role"

  if (canRead) {
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
  const row = {
    action_id: actionId,
    user_id: userId,
    reporter_email: userId,
    title,
    description,
    expected_result: expectedResult,
    screenshot_url: input.screenshotUrl?.trim() || null,
    priority: input.priority,
    status: "open" as const,
    created_at: now,
    updated_at: now,
  }

  const insertQuery = supabase.from(BETA_REPORTED_ISSUES_TABLE).insert(row)
  const { data, error } = canRead
    ? await insertQuery.select("id").single()
    : await insertQuery

  if (error) {
    console.error("[issue-db]", error)
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
    if (/does not exist|42P01|schema cache/i.test(error.message)) {
      return {
        error:
          "beta_reported_issues table missing — run supabase/beta_reported_issues.sql in the Supabase SQL Editor, then wait ~10s for schema cache refresh",
      }
    }
    if (/column .+ does not exist/i.test(error.message) && /reporter_email/i.test(error.message)) {
      const { reporter_email: _ignored, ...withoutReporter } = row
      const retryQuery = supabase.from(BETA_REPORTED_ISSUES_TABLE).insert(withoutReporter)
      const retry = canRead ? await retryQuery.select("id").single() : await retryQuery
      if (!retry.error) {
        const retryId =
          retry.data && typeof retry.data === "object" && "id" in retry.data
            ? String((retry.data as { id: string }).id)
            : actionId
        return { ok: true, id: retryId, created: true, alreadyCounted: false }
      }
    }
    return { error: error.message }
  }

  const id =
    data && typeof data === "object" && "id" in data ? String((data as { id: string }).id) : actionId
  return { ok: true, id, created: true, alreadyCounted: false }
}

export async function updateBetaIssueStatus(
  id: string,
  status: BetaIssueStatus,
): Promise<{ ok: true } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  if (!isBetaIssueStatus(status)) return { error: "Invalid status" }

  const { error } = await supabase
    .from(BETA_REPORTED_ISSUES_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return { error: error.message }
  return { ok: true }
}
