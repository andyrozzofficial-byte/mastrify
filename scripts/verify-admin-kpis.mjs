#!/usr/bin/env node
/**
 * Compare raw Supabase counts vs computeAdminKpis() for admin dashboard integrity.
 * Usage: node scripts/verify-admin-kpis.mjs
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env (.env.local loaded via dotenv if present).
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!m) continue
    const key = m[1]
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"))
loadEnvFile(resolve(process.cwd(), ".env.production.local"))

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function distinctSessions(rows) {
  return new Set(rows.map((r) => r.session_id).filter(Boolean)).size
}

const today = startOfTodayIso()
const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

const tables = [
  "beta_master_completions",
  "admin_pipeline_events",
  "admin_master_jobs",
  "mastered_exports",
  "beta_master_feedback",
  "admin_support_inbox",
]

console.log("\n=== Table existence / row counts ===")
for (const table of tables) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true })
  console.log(`${table}: ${error ? `ERROR ${error.message}` : count ?? 0}`)
}

const [eventsToday, jobsToday, completionsToday, exportsToday, eventsAll, completionsAll] = await Promise.all([
  supabase.from("admin_pipeline_events").select("event_type, session_id").gte("created_at", today).limit(5000),
  supabase.from("admin_master_jobs").select("id, status, created_at").gte("created_at", today).limit(5000),
  supabase.from("beta_master_completions").select("session_id", { count: "exact", head: true }).gte("completed_at", today),
  supabase.from("mastered_exports").select("id, amount_cents, created_at").gte("created_at", today).limit(5000),
  supabase.from("admin_pipeline_events").select("event_type, session_id, created_at").limit(5000),
  supabase.from("beta_master_completions").select("session_id", { count: "exact", head: true }),
])

const uploadToday = distinctSessions((eventsToday.data ?? []).filter((e) => e.event_type === "upload"))
const jobsTodayCount = jobsToday.data?.length ?? 0
const mastersToday = completionsToday.count ?? 0
const paidToday = exportsToday.data?.length ?? 0
const revenueToday = (exportsToday.data ?? []).reduce((sum, row) => {
  const cents = row.amount_cents != null ? Number(row.amount_cents) : 900
  return sum + cents / 100
}, 0)

console.log("\n=== Raw DB KPIs (today, local TZ midnight) ===")
console.log("Uploads (pipeline distinct sessions):", uploadToday)
console.log("Uploads fallback (jobs created today):", jobsTodayCount)
console.log("Masters completed (beta_master_completions):", mastersToday)
console.log("Paid downloads (mastered_exports):", paidToday)
console.log("Revenue today (USD, null amount_cents → $9):", Math.round(revenueToday * 100) / 100)

const uploadAll = distinctSessions((eventsAll.data ?? []).filter((e) => e.event_type === "upload"))
const analyzeAll = distinctSessions((eventsAll.data ?? []).filter((e) => e.event_type === "analyze"))
const masterAll = completionsAll.count ?? 0
const exportsAll = await supabase.from("mastered_exports").select("id", { count: "exact", head: true })

console.log("\n=== Funnel (all-time, capped queries) ===")
console.log("Upload sessions (pipeline, max 5000 rows):", uploadAll)
console.log("Analyze sessions (pipeline):", analyzeAll)
console.log("Masters completed (completions table):", masterAll)
console.log("Paid exports (mastered_exports):", exportsAll.count ?? 0)

console.log("\n=== Pipeline event breakdown (all, max 5000) ===")
const byType = {}
for (const e of eventsAll.data ?? []) {
  byType[e.event_type] = (byType[e.event_type] ?? 0) + 1
}
console.log(byType)

console.log("\nDone. Compare these numbers to /admin dashboard after deploy.")
