#!/usr/bin/env node
/** Probe public.beta_master_feedback via Supabase REST (requires table + RLS). */
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

const url = process.env.SUPABASE_URL || "https://wyuxkmrnzqvlqshlqfiw.supabase.co"
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_j-if6EVRN-M3q-DS5s4q_w_5K0Tiw3n"

const supabase = createClient(url, key)

const { data, error } = await supabase
  .schema("public")
  .from("beta_master_feedback")
  .select("id")
  .limit(1)

if (error) {
  console.error("beta_master_feedback not reachable:", error.code, error.message)
  console.error("\nApply: supabase/beta_master_feedback.sql in Supabase SQL Editor")
  process.exit(1)
}

console.log("OK — public.beta_master_feedback exists.", data?.length ?? 0, "sample row(s)")
