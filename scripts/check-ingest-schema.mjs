#!/usr/bin/env node
/** Verify admin_support_inbox + beta_reported_issues columns via Supabase REST. */
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq < 1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile(path.join(root, ".env.local"))
loadEnvFile(path.join(root, ".env"))

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(url, key)

const SUPPORT_SELECT =
  "id, created_at, updated_at, resolved_at, email, name, subject, message, status, priority, source, admin_notes, category, session_context, thread"

const ISSUES_SELECT =
  "id, action_id, user_id, reporter_email, title, description, expected_result, screenshot_url, priority, status, created_at, updated_at, session_id"

async function probe(table, select) {
  const { error } = await supabase.from(table).select(select).limit(0)
  if (error) {
    console.error(`FAIL ${table}:`, error.message)
    return false
  }
  console.log(`OK ${table}`)
  return true
}

const okSupport = await probe("admin_support_inbox", SUPPORT_SELECT)
const okIssues = await probe("beta_reported_issues", ISSUES_SELECT)

if (!okSupport || !okIssues) {
  console.error("\nApply: supabase/migrations/20260602230000_production_ingest_schema_repair.sql")
  process.exit(1)
}

console.log("Ingest schema OK.")
