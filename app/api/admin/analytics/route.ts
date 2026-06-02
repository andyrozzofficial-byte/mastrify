import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { fetchAdminAnalytics } from "../../../../lib/adminData"

export async function GET() {
  const auth = await requireAdminApi("/api/admin/analytics")
  if (auth.error) return auth.error

  const data = await fetchAdminAnalytics()
  if ("error" in data) {
    console.error("[admin-api] analytics failed", data.error)
    // Never white-screen admin: return safe empty analytics payload.
    return NextResponse.json({ error: data.error, series: [], totals: {}, points: [] }, { status: 200 })
  }
  return NextResponse.json(data)
}
