#!/usr/bin/env node
/**
 * Apply discount_codes RLS migration.
 *
 * Usage (pick one):
 *   DATABASE_URL='postgresql://...' node scripts/apply-discount-codes-rls.mjs
 *   — or paste supabase/migrations/20260916140000_discount_codes_rls.sql in Supabase SQL Editor
 */
import { readFileSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationPath = resolve(__dirname, "../supabase/migrations/20260916140000_discount_codes_rls.sql")

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

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  process.env.DIRECT_URL

if (!databaseUrl) {
  console.error(
    "No DATABASE_URL found. Apply manually in Supabase → SQL Editor:\n",
    migrationPath,
  )
  process.exit(1)
}

const sql = readFileSync(migrationPath, "utf8")
const statements = sql
  .split(";")
  .map((s) => s.replace(/^\s*--[^\n]*\n?/gm, "").trim())
  .filter((s) => s.length > 0 && !s.startsWith("notify"))

let pg
try {
  pg = await import("pg")
} catch {
  console.error("Install pg: npm install pg")
  process.exit(1)
}

const client = new pg.default.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  for (const statement of statements) {
    await client.query(statement)
    console.log("OK:", statement.split("\n")[0].slice(0, 80))
  }
  console.log("\nRLS migration applied successfully.")
} finally {
  await client.end()
}
