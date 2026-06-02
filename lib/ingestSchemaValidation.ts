import { ingestError } from "./adminIngestDebug"
import { isTableMissingError, parseMissingColumn } from "./schemaColumnDrift"
import { createSupabaseServerClient } from "./supabaseServer"

const SUPPORT_TABLE = "admin_support_inbox"
const BETA_REPORTED_ISSUES_TABLE = "beta_reported_issues"

/** Must match lib/adminData ADMIN_SUPPORT_SELECT and lib/betaIssues BETA_ISSUES_SELECT */
const ADMIN_SUPPORT_SELECT =
  "id, created_at, updated_at, resolved_at, email, name, subject, message, status, priority, source, admin_notes, category, session_context, thread"

const BETA_ISSUES_SELECT =
  "id, action_id, user_id, reporter_email, title, description, expected_result, screenshot_url, priority, status, created_at, updated_at, session_id"

export type IngestSchemaCheck = {
  table: string
  ok: boolean
  error?: string
  missingColumns?: string[]
}

let startupValidated = false

async function probeSelect(
  table: string,
  select: string,
): Promise<{ ok: true } | { ok: false; error: string; missingColumns: string[] }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) {
    return { ok: false, error: "no_supabase_client", missingColumns: [] }
  }

  let currentSelect = select
  const missingColumns: string[] = []

  for (let attempt = 0; attempt < 16; attempt++) {
    const { error } = await supabase.from(table).select(currentSelect).limit(0)
    if (!error) return { ok: true }

    if (isTableMissingError(error.message)) {
      return { ok: false, error: error.message, missingColumns }
    }

    const missing = parseMissingColumn(error.message, table)
    if (!missing) {
      return { ok: false, error: error.message, missingColumns }
    }

    missingColumns.push(missing)
    const next = currentSelect
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c && c !== missing)
      .join(", ")
    if (!next || next === currentSelect) {
      return { ok: false, error: error.message, missingColumns }
    }
    currentSelect = next
  }

  return {
    ok: false,
    error: "schema_probe_max_attempts",
    missingColumns,
  }
}

export async function validateIngestSchema(): Promise<IngestSchemaCheck[]> {
  const checks: IngestSchemaCheck[] = []

  const supportProbe = await probeSelect(SUPPORT_TABLE, ADMIN_SUPPORT_SELECT)
  checks.push({
    table: SUPPORT_TABLE,
    ok: supportProbe.ok,
    error: supportProbe.ok ? undefined : supportProbe.error,
    missingColumns: supportProbe.ok ? undefined : supportProbe.missingColumns,
  })

  const issuesProbe = await probeSelect(BETA_REPORTED_ISSUES_TABLE, BETA_ISSUES_SELECT)
  checks.push({
    table: BETA_REPORTED_ISSUES_TABLE,
    ok: issuesProbe.ok,
    error: issuesProbe.ok ? undefined : issuesProbe.error,
    missingColumns: issuesProbe.ok ? undefined : issuesProbe.missingColumns,
  })

  return checks
}

/** Run once per Node process on server startup. */
export async function validateIngestSchemaOnStartup(): Promise<void> {
  if (startupValidated) return
  if (process.env.NEXT_RUNTIME === "edge") return
  startupValidated = true

  const checks = await validateIngestSchema()
  for (const check of checks) {
    if (check.ok) continue
    ingestError("startup/schema-validation", {
      table: check.table,
      error: check.error,
      missingColumns: check.missingColumns,
      hint: "Apply supabase/migrations/20260602230000_production_ingest_schema_repair.sql",
    })
  }
}
