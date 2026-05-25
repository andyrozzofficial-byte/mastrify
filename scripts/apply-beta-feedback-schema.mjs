#!/usr/bin/env node
/**
 * Apply public.beta_master_feedback schema.
 *
 * Option A (recommended): Supabase Dashboard → SQL → paste supabase/beta_master_feedback.sql → Run
 * Option B: psql "$DATABASE_URL" -f supabase/beta_master_feedback.sql
 * Option C: supabase link && supabase db push
 */
import { spawnSync } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const sqlPath = path.join(root, "supabase", "beta_master_feedback.sql")

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, "utf8")
  for (const line of raw.split("\n")) {
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

const dbUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  ""

if (!dbUrl) {
  console.log("No DATABASE_URL / SUPABASE_DB_URL in .env — apply SQL manually:\n")
  console.log(`  File: ${sqlPath}\n`)
  console.log("  Supabase Dashboard → SQL Editor → paste file contents → Run")
  console.log("  Then wait ~10s for schema cache reload (or run NOTIFY pgrst, 'reload schema';)\n")
  process.exit(0)
}

const psql = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
  stdio: "inherit",
  encoding: "utf8",
})

if (psql.status !== 0) {
  console.error("\npsql failed. Apply manually via Supabase SQL Editor:", sqlPath)
  process.exit(psql.status ?? 1)
}

console.log("\nSchema applied. Verify with: npm run db:beta-feedback:check")
