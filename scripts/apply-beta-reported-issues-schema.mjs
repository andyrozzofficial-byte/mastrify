#!/usr/bin/env node
/**
 * Apply public.beta_reported_issues schema.
 *
 * Option A (recommended): Supabase Dashboard → SQL → paste supabase/beta_reported_issues.sql → Run
 * Option B: psql "$DATABASE_URL" -f supabase/beta_reported_issues.sql
 * Option C: supabase link && supabase db push
 */
import { spawnSync } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const sqlPath = path.join(root, "supabase", "beta_reported_issues.sql")

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
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL

if (!dbUrl) {
  console.log("No DATABASE_URL in .env.local — apply manually:")
  console.log(`  1. Open Supabase SQL Editor`)
  console.log(`  2. Paste: ${sqlPath}`)
  console.log(`  3. Run, then wait ~10s for schema cache refresh`)
  process.exit(0)
}

const result = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
  stdio: "inherit",
  encoding: "utf8",
})

process.exit(result.status ?? 1)
