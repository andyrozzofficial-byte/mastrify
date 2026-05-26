import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { fetchAdminOverview } from "../../../../lib/adminData"

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error

  const t0 = Date.now()
  const data = await fetchAdminOverview()
  if (process.env.NODE_ENV === "development" || process.env.MASTRIFY_PERF === "1") {
    console.log(`[admin-api] overview ${Date.now() - t0}ms`)
  }
  if ("error" in data) {
    return NextResponse.json({ error: data.error }, { status: 500 })
  }
  return NextResponse.json(data)
}
