#!/usr/bin/env node
/**
 * Compare raw Supabase counts vs Admin export classification rules.
 * Usage: node scripts/verify-admin-kpis.mjs
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

const DEFAULT_PAID_EXPORT_CENTS = 900

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function distinctSessions(rows) {
  return new Set(rows.map((r) => r.session_id).filter(Boolean)).size
}

function isFreeExport(row, freeObjectKeys) {
  const cents = row.amount_cents
  if (cents != null && Number.isFinite(Number(cents))) return Number(cents) === 0
  const objectKey = row.object_key?.trim()
  if (objectKey && freeObjectKeys.has(objectKey)) return true
  return false
}

function isPaidExport(row, freeObjectKeys) {
  if (isFreeExport(row, freeObjectKeys)) return false
  const cents = row.amount_cents
  if (cents != null && Number.isFinite(Number(cents))) return Number(cents) > 0
  return true
}

function exportRevenueUsd(row, freeObjectKeys, legacyNullAsNine) {
  if (isFreeExport(row, freeObjectKeys)) return 0
  const cents = row.amount_cents
  if (cents != null && Number.isFinite(Number(cents))) return Math.max(0, Number(cents)) / 100
  return legacyNullAsNine ? DEFAULT_PAID_EXPORT_CENTS / 100 : 0
}

const today = startOfTodayIso()

const [eventsToday, completionsToday, exportsAll, freeRedemptions, eventsAll, completionsAll] =
  await Promise.all([
    supabase.from("admin_pipeline_events").select("event_type, session_id").gte("created_at", today).limit(5000),
    supabase
      .from("beta_master_completions")
      .select("session_id", { count: "exact", head: true })
      .gte("completed_at", today),
    supabase
      .from("mastered_exports")
      .select("id, email, amount_cents, object_key, stripe_session_id, created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("discount_redemptions").select("object_key").eq("final_amount_cents", 0),
    supabase.from("admin_pipeline_events").select("event_type, session_id, created_at").limit(5000),
    supabase.from("beta_master_completions").select("session_id", { count: "exact", head: true }),
  ])

const freeObjectKeys = new Set(
  (freeRedemptions.data ?? [])
    .map((r) => (typeof r.object_key === "string" ? r.object_key.trim() : ""))
    .filter(Boolean),
)

const allExports = exportsAll.data ?? []
const exportsToday = allExports.filter((e) => e.created_at >= today)

const uploadToday = distinctSessions((eventsToday.data ?? []).filter((e) => e.event_type === "upload"))
const mastersToday = completionsToday.count ?? 0

function legacyRevenueUsd(row) {
  const cents = row.amount_cents
  if (cents != null && Number.isFinite(Number(cents))) return Number(cents) / 100
  return DEFAULT_PAID_EXPORT_CENTS / 100
}

const legacyPaidToday = exportsToday.length
const legacyRevenueToday = exportsToday.reduce((sum, row) => sum + legacyRevenueUsd(row), 0)
const legacyAllRevenue = allExports.reduce((sum, row) => sum + legacyRevenueUsd(row), 0)

const newPaidToday = exportsToday.filter((row) => isPaidExport(row, freeObjectKeys)).length
const newRevenueToday = exportsToday.reduce(
  (sum, row) => sum + exportRevenueUsd(row, freeObjectKeys, true),
  0,
)

const allPaid = allExports.filter((row) => isPaidExport(row, freeObjectKeys)).length
const allFree = allExports.filter((row) => isFreeExport(row, freeObjectKeys)).length
const allRevenue = allExports.reduce(
  (sum, row) => sum + exportRevenueUsd(row, freeObjectKeys, true),
  0,
)
const andyfreeKeys = [
  "1789531279350-master.wav",
  "1789400910128-master.wav",
  "1789233555748-master.wav",
  "1789129692580-master.wav",
  "1789112738207-master.wav",
]
const andyfreeExports = allExports.filter((e) => andyfreeKeys.includes(e.object_key))

console.log("\n=== BEFORE (legacy: all exports = paid, null amount → $9) ===")
console.log(
  JSON.stringify(
    {
      paidDownloadsToday: legacyPaidToday,
      revenueTodayUsd: Math.round(legacyRevenueToday * 100) / 100,
      allExportsCount: allExports.length,
      allTreatedAsPaid: allExports.length,
      allRevenueLegacyUsd: Math.round(legacyAllRevenue * 100) / 100,
    },
    null,
    2,
  ),
)

console.log("\n=== AFTER (new rules: free redemptions + amount_cents=0 excluded from paid/revenue) ===")
console.log(
  JSON.stringify(
    {
      uploadsToday: uploadToday,
      mastersCompletedToday: mastersToday,
      paidDownloadsToday: newPaidToday,
      freeExportsToday: exportsToday.length - newPaidToday,
      revenueTodayUsd: Math.round(newRevenueToday * 100) / 100,
      allExportsCount: allExports.length,
      paidExportsAllTime: allPaid,
      freeExportsAllTime: allFree,
      revenueAllTimeUsd: Math.round(allRevenue * 100) / 100,
      funnelMasterAllTime: completionsAll.count ?? 0,
      funnelPaymentAllTime: allPaid,
      funnelDownloadAllTime: allExports.length,
    },
    null,
    2,
  ),
)

console.log("\n=== ANDYFREE production exports (5 expected) ===")
for (const row of andyfreeExports) {
  console.log(
    JSON.stringify({
      object_key: row.object_key,
      amount_cents: row.amount_cents,
      isFree: isFreeExport(row, freeObjectKeys),
      isPaid: isPaidExport(row, freeObjectKeys),
      revenueUsd: exportRevenueUsd(row, freeObjectKeys, true),
    }),
  )
}

console.log("\n=== Pipeline event breakdown (all-time) ===")
const byType = {}
for (const e of eventsAll.data ?? []) {
  byType[e.event_type] = (byType[e.event_type] ?? 0) + 1
}
console.log(byType)

console.log("\nDone.")
