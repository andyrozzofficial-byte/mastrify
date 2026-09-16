#!/usr/bin/env node
import { readFileSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!m) continue
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[m[1]]) process.env[m[1]] = val
  }
}

loadEnvFile(resolve(root, ".env.local"))

const { computeAdminKpis, fetchAdminAnalyticsExtended, fetchAdminCustomers } = await import(
  "../lib/adminData.ts"
)

const kpis = await computeAdminKpis()
const analytics = await fetchAdminAnalyticsExtended()
const customers = await fetchAdminCustomers()

console.log(JSON.stringify({ kpis, funnel: analytics.funnel, customers: customers.slice(0, 5) }, null, 2))
