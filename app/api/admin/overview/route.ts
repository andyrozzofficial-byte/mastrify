import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { fetchAdminOverview } from "../../../../lib/adminData"
import { beginDbRoute, endDbRoute } from "../../../../lib/supabaseTimed"

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error

  beginDbRoute("GET /api/admin/overview")
  const t0 = Date.now()
  const data = await fetchAdminOverview()
  const dbStats = endDbRoute()

  if (process.env.NODE_ENV === "development" || process.env.MASTRIFY_PERF === "1") {
    console.log(`[admin-api] overview ${Date.now() - t0}ms`, dbStats)
  }
  if ("error" in data) {
    return NextResponse.json({ error: data.error }, { status: 500 })
  }
  return NextResponse.json(data)
}
